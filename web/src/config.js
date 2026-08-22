// --- Chain -------------------------------------------------------------
// Leave as the zero address to play in local sandbox mode: taps paint and
// persist in your browser only. Deploy the contract (deploy.html, or one of the
// scripts) and the same page becomes the real onchain game.
const DEFAULT_ADDRESS = "0x4c99EC68D83392769041F12de8dA930F365d63F3";
const DEFAULT_BLOCK = 55969461n;

// ?turf=0x…&from=<block> points the board at a contract without a commit, so a
// deploy made on a phone is shareable as a link straight away.
const params = new URLSearchParams(location.search);
const override = params.get("turf");

export const TURF_ADDRESS = /^0x[0-9a-fA-F]{40}$/.test(override ?? "") ? override : DEFAULT_ADDRESS;
export const DEPLOY_BLOCK = override && /^\d+$/.test(params.get("from") ?? "")
  ? BigInt(params.get("from"))
  : DEFAULT_BLOCK;

// Monad mainnet, as MetaMask reports it: chain 143 (0x8f), explorer monadscan.
// Taps here cost real MON, which is exactly what the pitch claims.
export const CHAIN_ID = 143;
export const CHAIN_NAME = "Monad";
export const EXPLORER_URL = "https://monadscan.com";

// No public mainnet RPC is configured: MetaMask's own default is Infura, which
// needs an API key, and nothing unauthenticated has been verified. So the board
// reads through the wallet's provider, and ?rpc=https://… supplies a fallback
// for anyone opening the link outside a wallet browser.
export const RPC_URL = params.get("rpc") ?? "";

// --- Map ---------------------------------------------------------------
// OpenFreeMap needs no API key and no signup. Swap in MapTiler/your own tiles
// by changing this one URL.
export const STYLE_URL = "https://tiles.openfreemap.org/styles/positron";

export const BELGRADE = { center: [20.4573, 44.8155], zoom: 15.5 };

// --- Turf --------------------------------------------------------------
// The playfield. Buildings come from Overpass as GeoJSON, which guarantees
// every polygon carries its real OSM way id as the feature id — that id is the
// key we claim onchain. Keep the box small: it is the whole board, and it has
// to fit in one screen for the room to see the map flip.
export const AREA = {
  name: "Stari grad",
  // [south, west, north, east]
  bbox: [44.8095, 20.4490, 44.8215, 20.4655],
};

export const OVERPASS_URLS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];
