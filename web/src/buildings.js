import { AREA, OVERPASS_URLS } from "./config.js";
import { log } from "./log.js";

const CACHE_KEY = `mapcolor.buildings.${AREA.bbox.join(",")}`;

const query = ([s, w, n, e]) => `
[out:json][timeout:60];
way["building"](${s},${w},${n},${e});
out geom;`;

/** Overpass `out geom` ways -> a GeoJSON FeatureCollection keyed by OSM way id. */
function toGeoJSON(elements) {
  const features = [];
  for (const el of elements) {
    if (el.type !== "way" || !el.geometry || el.geometry.length < 4) continue;
    const ring = el.geometry.map((p) => [p.lon, p.lat]);
    // Overpass returns open ways for some buildings; GeoJSON wants them closed.
    const [first] = ring;
    const last = ring[ring.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) ring.push(first);
    features.push({
      type: "Feature",
      // This id is the uint256 we claim onchain. Everything hangs off it.
      id: el.id,
      properties: { osm_id: el.id, name: el.tags?.name ?? "" },
      geometry: { type: "Polygon", coordinates: [ring] },
    });
  }
  return { type: "FeatureCollection", features };
}

/**
 * Load the board. Cached in localStorage after the first success, because
 * hackathon wifi is the single most likely thing to break the demo.
 */
export async function loadBuildings({ onStatus = () => {} } = {}) {
  const cached = readCache();
  if (cached) {
    onStatus(`${cached.features.length} buildings (cached)`);
    return cached;
  }

  let lastError;
  for (const url of OVERPASS_URLS) {
    try {
      onStatus("loading buildings from OpenStreetMap…");
      log("overpass request", url);
      const response = await fetch(url, {
        method: "POST",
        body: new URLSearchParams({ data: query(AREA.bbox) }),
      });
      if (!response.ok) throw new Error(`${url} -> HTTP ${response.status}`);
      const { elements = [] } = await response.json();
      const geojson = toGeoJSON(elements);
      if (geojson.features.length === 0) throw new Error("no buildings in bbox");
      writeCache(geojson);
      onStatus(`${geojson.features.length} buildings`);
      return geojson;
    } catch (error) {
      lastError = error;
      log("overpass failed:", `${url} ${error.message}`);
    }
  }
  throw lastError ?? new Error("could not load buildings");
}

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeCache(geojson) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(geojson));
  } catch {
    // Over quota — the board still works, it just refetches next reload.
  }
}
