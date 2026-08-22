import { CHAIN_ID, CHAIN_NAME, EXPLORER_URL, RPC_URL } from "./config.js";
import { log } from "./log.js";
import {
  createPublicClient,
  createWalletClient,
  custom,
  defineChain,
  http,
} from "https://esm.sh/viem@2.21.54";

export const monadChain = defineChain({
  id: CHAIN_ID,
  name: CHAIN_NAME,
  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: RPC_URL ? [RPC_URL] : [] } },
  blockExplorers: { default: { name: "MonadScan", url: EXPLORER_URL } },
});

export const TURF_ABI = [
  {
    type: "function",
    name: "claim",
    stateMutability: "nonpayable",
    inputs: [
      { name: "osmWayId", type: "uint256" },
      { name: "team", type: "uint8" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "claimMany",
    stateMutability: "nonpayable",
    inputs: [
      { name: "osmWayIds", type: "uint256[]" },
      { name: "team", type: "uint8" },
    ],
    outputs: [],
  },
  {
    type: "event",
    name: "Claimed",
    inputs: [
      { name: "osmWayId", type: "uint256", indexed: true },
      { name: "team", type: "uint8", indexed: true },
      { name: "previousTeam", type: "uint8", indexed: false },
      { name: "player", type: "address", indexed: true },
    ],
  },
];

// Monad blocks are fast; poll faster than viem's 4s default or the room sees
// the map lag behind the taps.
const POLLING = 400;

// Two ways to read the chain, tried in order. The wallet's own provider goes
// first because it already knows a working RPC for the network it is on —
// which is how the deploy succeeded while our RPC constant was unreachable.
const injected = globalThis.ethereum;
const readers = [
  injected && {
    name: "wallet",
    client: createPublicClient({ chain: monadChain, transport: custom(injected), pollingInterval: POLLING }),
  },
  RPC_URL && {
    name: RPC_URL,
    client: createPublicClient({ chain: monadChain, transport: http(RPC_URL), pollingInterval: POLLING }),
  },
].filter(Boolean);

// Whichever reader last worked; the live watch follows the replay. There may be
// none at all — no wallet and no ?rpc — and that has to stay a readable error
// rather than a crash on import.
let preferred = readers[0] ?? null;

export const publicClient = preferred?.client ?? null;

// What the log can honestly say about the connection. A wallet never exposes
// the RPC URL behind it — only its chain id — so the endpoint is named for our
// own reader and reported as "wallet" for the injected one.
log(`chain readers: ${readers.map((r) => r.name).join(" then ") || "none — open this in a wallet browser, or add ?rpc=https://…"}`);
log(`configured chain: ${CHAIN_NAME} (${CHAIN_ID})${RPC_URL ? `, rpc ${RPC_URL}` : ", no fallback rpc"}`);
if (injected) {
  injected
    .request({ method: "eth_chainId" })
    .then((id) => {
      const chainId = Number.parseInt(id, 16);
      log(`wallet chain: ${chainId}${chainId === CHAIN_ID ? "" : ` — expected ${CHAIN_ID}`}`);
    })
    .catch((error) => log("wallet chain unknown:", error.message));
}

export async function connect() {
  if (!window.ethereum) throw new Error("No injected wallet found");
  const wallet = createWalletClient({
    chain: monadChain,
    transport: custom(window.ethereum),
  });
  const [account] = await wallet.requestAddresses();
  await ensureMonad(wallet);
  return { wallet, account };
}

/** Offer to move the wallet to Monad; never insist, the board reports the chain. */
async function ensureMonad(wallet) {
  try {
    await wallet.switchChain({ id: monadChain.id });
  } catch (error) {
    if (error.code !== 4902 && error.name !== "ChainNotConfiguredError") throw error;
    await wallet.addChain({ chain: monadChain });
  }
}

/** Replay every claim from deployment, newest write wins. */
export async function loadClaims(address, fromBlock = 0n) {
  let lastError;
  for (const reader of readers) {
    try {
      const events = await reader.client.getContractEvents({
        address,
        abi: TURF_ABI,
        eventName: "Claimed",
        fromBlock,
        toBlock: "latest",
      });
      preferred = reader;
      log(`replayed ${events.length} claims via ${reader.name}`);
      const claims = new Map();
      for (const entry of events) {
        claims.set(Number(entry.args.osmWayId), Number(entry.args.team));
      }
      return claims;
    } catch (error) {
      lastError = error;
      log(`replay via ${reader.name} failed:`, error.shortMessage ?? error.message);
    }
  }
  throw lastError ?? new Error("no way to read the chain — open this in a wallet browser, or add ?rpc=https://… to the URL");
}

/** Tail new claims. Returns an unwatch function. */
export function watchClaims(address, onClaim) {
  if (!preferred) {
    log("no chain reader: the board will show your own taps but not anyone else's");
    return () => {};
  }
  return preferred.client.watchContractEvent({
    address,
    abi: TURF_ABI,
    eventName: "Claimed",
    onLogs: (logs) => {
      for (const entry of logs) {
        onClaim(Number(entry.args.osmWayId), Number(entry.args.team));
      }
    },
    // A dropped poll must not become an unhandled rejection mid-demo.
    onError: (error) => log("claim watch error:", error.shortMessage ?? error.message),
  });
}

export function sendClaim({ wallet, account, address, osmWayId, team }) {
  return wallet.writeContract({
    account,
    address,
    abi: TURF_ABI,
    functionName: "claim",
    args: [BigInt(osmWayId), team],
  });
}
