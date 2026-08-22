// Deploy Turf without Foundry: node + viem only, against the committed build
// artifact in contracts/out. Same job as contracts/deploy.sh — use whichever
// toolchain the machine in front of you already has.
//
//   npm install && node scripts/deploy.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { createPublicClient, createWalletClient, defineChain, formatEther, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const root = new URL("..", import.meta.url).pathname;
const env = { ...readEnv(`${root}contracts/.env`), ...process.env };
const rpcUrl = env.RPC_URL || "https://testnet-rpc.monad.xyz";
const chainId = Number(env.CHAIN_ID || 10143);
const teamCount = Number(env.TEAM_COUNT || 4);

if (!env.PRIVATE_KEY || env.PRIVATE_KEY === "0x") {
  bail("no PRIVATE_KEY — cp contracts/.env.example contracts/.env and fill it in");
}

const chain = defineChain({
  id: chainId,
  name: "Monad Testnet",
  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: [rpcUrl] } },
});

const artifact = JSON.parse(readFileSync(`${root}web/turf.json`, "utf8"));
const account = privateKeyToAccount(env.PRIVATE_KEY);
const publicClient = createPublicClient({ chain, transport: http() });
const wallet = createWalletClient({ account, chain, transport: http() });

const balance = await publicClient.getBalance({ address: account.address })
  .catch((error) => bail(`cannot reach ${rpcUrl}: ${error.shortMessage ?? error.message}`));
console.log(`deployer ${account.address} — ${formatEther(balance)} MON on chain ${chainId}`);
if (balance === 0n) bail(`no MON: fund ${account.address} from the faucet first`);

console.log("deploying Turf…");
const hash = await wallet.deployContract({
  abi: artifact.abi,
  bytecode: artifact.bytecode,
  args: [teamCount],
});
const receipt = await publicClient.waitForTransactionReceipt({ hash });
if (receipt.status !== "success") bail(`deploy reverted: ${hash}`);
console.log(`deployed ${receipt.contractAddress} in block ${receipt.blockNumber}`);

const configPath = `${root}web/src/config.js`;
writeFileSync(configPath, readFileSync(configPath, "utf8")
  .replace(/^export const TURF_ADDRESS = ".*";$/m, `export const TURF_ADDRESS = "${receipt.contractAddress}";`)
  .replace(/^export const DEPLOY_BLOCK = .*;$/m, `export const DEPLOY_BLOCK = ${receipt.blockNumber}n;`));
console.log("wrote web/src/config.js — commit and push to put it live on Pages");

function readEnv(path) {
  try {
    return Object.fromEntries(readFileSync(path, "utf8").split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const at = line.indexOf("=");
        return [line.slice(0, at).trim(), line.slice(at + 1).trim()];
      }));
  } catch {
    return {};
  }
}

function bail(message) {
  console.error(message);
  process.exit(1);
}
