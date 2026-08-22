import {
  createPublicClient,
  createWalletClient,
  custom,
  defineChain,
  http,
} from "https://esm.sh/viem@2.21.54";

// Double-check chainId/RPC against the Blitz organisers' handout before demoing.
export const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: ["https://testnet-rpc.monad.xyz"] } },
  blockExplorers: {
    default: { name: "Monad Explorer", url: "https://testnet.monadexplorer.com" },
  },
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

export const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(),
  // Monad blocks are fast; poll faster than viem's 4s default or the room
  // sees the map lag behind the taps.
  pollingInterval: 400,
});

export async function connect() {
  if (!window.ethereum) throw new Error("No injected wallet found");
  const wallet = createWalletClient({
    chain: monadTestnet,
    transport: custom(window.ethereum),
  });
  const [account] = await wallet.requestAddresses();
  return { wallet, account };
}

/** Replay every claim from deployment, newest write wins. */
export async function loadClaims(address, fromBlock = 0n) {
  const logs = await publicClient.getContractEvents({
    address,
    abi: TURF_ABI,
    eventName: "Claimed",
    fromBlock,
    toBlock: "latest",
  });
  const claims = new Map();
  for (const log of logs) {
    claims.set(Number(log.args.osmWayId), Number(log.args.team));
  }
  return claims;
}

/** Tail new claims. Returns an unwatch function. */
export function watchClaims(address, onClaim) {
  return publicClient.watchContractEvent({
    address,
    abi: TURF_ABI,
    eventName: "Claimed",
    onLogs: (logs) => {
      for (const log of logs) {
        onClaim(Number(log.args.osmWayId), Number(log.args.team));
      }
    },
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
