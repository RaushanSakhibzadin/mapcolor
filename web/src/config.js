// --- Chain -------------------------------------------------------------
// Leave as the zero address to play in local sandbox mode: taps paint and
// persist in your browser only. Fill this in after `forge create` and the same
// page becomes the real onchain game.
export const TURF_ADDRESS = "0x0000000000000000000000000000000000000000";

// Block the contract was deployed in — replaying from 0 works but is slow.
export const DEPLOY_BLOCK = 0n;

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
