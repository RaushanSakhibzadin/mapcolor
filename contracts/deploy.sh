#!/usr/bin/env bash
# Deploy Turf and point the frontend at it. One command from funded key to a
# live board: it writes the address and deploy block into web/src/config.js.
set -euo pipefail

cd "$(dirname "$0")"
[ -f .env ] || { echo "no contracts/.env — cp .env.example .env and fill it in"; exit 1; }
set -a; . ./.env; set +a
: "${PRIVATE_KEY:?set PRIVATE_KEY in contracts/.env}"
RPC_URL="${RPC_URL:-https://testnet-rpc.monad.xyz}"
TEAM_COUNT="${TEAM_COUNT:-4}"

address=$(cast wallet address --private-key "$PRIVATE_KEY")
balance=$(cast balance "$address" --rpc-url "$RPC_URL")
echo "deployer $address — $(cast from-wei "$balance") MON"
if [ "$balance" = "0" ]; then echo "no MON: fund $address from the faucet first"; exit 1; fi

out=$(forge create src/Turf.sol:Turf \
  --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY" \
  --constructor-args "$TEAM_COUNT" --broadcast --json)

deployed=$(echo "$out" | jq -r .deployedTo)
tx=$(echo "$out" | jq -r .transactionHash)
block=$(cast receipt "$tx" blockNumber --rpc-url "$RPC_URL")
echo "deployed $deployed in block $block"

config=../web/src/config.js
sed -i.bak -E \
  -e "s|^export const TURF_ADDRESS = \".*\";|export const TURF_ADDRESS = \"$deployed\";|" \
  -e "s|^export const DEPLOY_BLOCK = .*;|export const DEPLOY_BLOCK = ${block}n;|" \
  "$config"
rm -f "$config.bak"
echo "wrote $config — commit and push to put it live on Pages"
