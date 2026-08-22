import maplibregl from "https://esm.sh/maplibre-gl@4.7.1";
import {
  BELGRADE,
  BUILDING_SOURCE,
  BUILDING_SOURCE_LAYER,
  DEPLOY_BLOCK,
  OSM_ID_PROPERTY,
  STYLE_URL,
  TURF_ADDRESS,
} from "./config.js";
import { connect, loadClaims, sendClaim, watchClaims } from "./chain.js";
import { paintAll, paintClaim, turfLayer } from "./paint.js";
import { TEAMS } from "./teams.js";

const ids = { source: BUILDING_SOURCE, sourceLayer: BUILDING_SOURCE_LAYER };
const claims = new Map();
let session = null;
let myTeam = 1;

const map = new maplibregl.Map({
  container: "map",
  style: STYLE_URL,
  ...BELGRADE,
  // Without this the building features have no id and setFeatureState is a no-op.
  transformStyle: (_previous, next) => {
    next.sources[BUILDING_SOURCE] = {
      ...next.sources[BUILDING_SOURCE],
      promoteId: { [BUILDING_SOURCE_LAYER]: OSM_ID_PROPERTY },
    };
    return next;
  },
});

map.on("load", async () => {
  map.addLayer(turfLayer({ source: BUILDING_SOURCE, sourceLayer: BUILDING_SOURCE_LAYER }));

  for (const [id, team] of await loadClaims(TURF_ADDRESS, DEPLOY_BLOCK)) {
    claims.set(id, team);
  }
  paintAll(map, ids, claims);

  // Every player's map recolors off the same event feed, so the room watches
  // buildings flip as taps land — no polling, no backend.
  watchClaims(TURF_ADDRESS, (osmWayId, team) => {
    claims.set(osmWayId, team);
    paintClaim(map, ids, osmWayId, team);
  });
});

map.on("click", "turf", async (e) => {
  const osmWayId = e.features[0]?.id;
  if (osmWayId == null) return;
  if (!session) session = await connect();

  // Paint first, confirm later: the tap has to feel instant. The Claimed event
  // repaints the same building a moment later, and if the tx fails the next
  // event for that building corrects us.
  paintClaim(map, ids, osmWayId, myTeam);
  try {
    await sendClaim({ ...session, address: TURF_ADDRESS, osmWayId, team: myTeam });
  } catch (err) {
    paintClaim(map, ids, osmWayId, claims.get(osmWayId) ?? 0);
    console.warn("claim failed", err);
  }
});

map.on("mouseenter", "turf", () => (map.getCanvas().style.cursor = "crosshair"));
map.on("mouseleave", "turf", () => (map.getCanvas().style.cursor = ""));

const picker = document.getElementById("teams");
for (const team of TEAMS) {
  const button = document.createElement("button");
  button.textContent = team.name;
  button.style.background = team.color;
  button.onclick = () => {
    myTeam = team.id;
    for (const other of picker.children) other.classList.remove("active");
    button.classList.add("active");
  };
  picker.append(button);
}
picker.firstChild.classList.add("active");
