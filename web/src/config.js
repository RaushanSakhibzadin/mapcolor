// Deployed Turf address (fill in after `forge create`).
export const TURF_ADDRESS = "0x0000000000000000000000000000000000000000";

// Block the contract was deployed in — replaying from 0 works but is slow.
export const DEPLOY_BLOCK = 0n;

// Basemap. Any OpenMapTiles-schema vector source works; what matters is that
// the building features keep their OSM way id (see promoteId below).
export const STYLE_URL = "https://api.maptiler.com/maps/dataviz-dark/style.json?key=YOUR_KEY";

// Source + source-layer that hold building polygons in that style.
export const BUILDING_SOURCE = "openmaptiles";
export const BUILDING_SOURCE_LAYER = "building";

// Property on each building feature carrying its OSM way id. OpenMapTiles ships
// this as `osm_id` only when the tiles were built with `--include-osm-ids`;
// self-hosted planetiler/tippecanoe tiles from a Belgrade extract always have it.
export const OSM_ID_PROPERTY = "osm_id";

export const BELGRADE = { center: [20.4573, 44.8125], zoom: 15.5 };
