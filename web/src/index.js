import maplibregl from "https://esm.sh/maplibre-gl@4.7.1";
import { AREA, BELGRADE, STYLE_URL } from "./config.js";
import { loadBuildings } from "./buildings.js";
import { paintAll, paintClaim, turfLayers } from "./paint.js";
import { createStore } from "./store.js";
import { TEAMS, colorOf } from "./teams.js";

const ids = { source: "turf" };
const el = (id) => document.getElementById(id);
const setStatus = (text) => (el("status").textContent = text);

let myTeam = 1;
let store = null;

const map = new maplibregl.Map({
  container: "map",
  style: STYLE_URL,
  ...BELGRADE,
  maxBounds: [
    [AREA.bbox[1] - 0.01, AREA.bbox[0] - 0.01],
    [AREA.bbox[3] + 0.01, AREA.bbox[2] + 0.01],
  ],
});
map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

map.on("load", async () => {
  try {
    const buildings = await loadBuildings({ onStatus: setStatus });
    map.addSource("turf", { type: "geojson", data: buildings });
    for (const layer of turfLayers(ids)) map.addLayer(layer);

    store = await createStore({
      onClaim: (osmWayId, team) => {
        paintClaim(map, ids, osmWayId, team);
        renderScores();
      },
      onStatus: setStatus,
    });

    paintAll(map, ids, store.claims);
    renderScores();
    el("mode").textContent = store.label;
    setStatus(`${buildings.features.length} buildings · tap one to claim it`);
  } catch (error) {
    setStatus(`could not start: ${error.message}`);
    console.error(error);
  }
});

map.on("click", "turf", async (e) => {
  const osmWayId = e.features[0]?.id;
  if (osmWayId == null || !store) return;

  // Paint first, confirm later: the tap has to feel instant. If the claim
  // fails we put the building back to whatever the store still believes.
  const previous = store.claims.get(osmWayId) ?? 0;
  paintClaim(map, ids, osmWayId, myTeam);
  try {
    await store.claim(osmWayId, myTeam);
  } catch (error) {
    paintClaim(map, ids, osmWayId, previous);
    setStatus(`claim failed: ${error.shortMessage ?? error.message}`);
  }
});

map.on("mouseenter", "turf", () => (map.getCanvas().style.cursor = "crosshair"));
map.on("mouseleave", "turf", () => (map.getCanvas().style.cursor = ""));

function renderScores() {
  const counts = new Map(TEAMS.map((t) => [t.id, 0]));
  for (const team of store.claims.values()) {
    counts.set(team, (counts.get(team) ?? 0) + 1);
  }
  for (const team of TEAMS) {
    el(`score-${team.id}`).textContent = counts.get(team.id);
  }
}

const picker = el("teams");
for (const team of TEAMS) {
  const button = document.createElement("button");
  button.type = "button";
  button.style.background = team.color;
  button.innerHTML = `${team.name} <span id="score-${team.id}">0</span>`;
  button.onclick = () => selectTeam(team.id);
  picker.append(button);
}

function selectTeam(id) {
  myTeam = id;
  [...picker.children].forEach((button, index) => {
    button.classList.toggle("active", TEAMS[index].id === id);
  });
  el("map").style.setProperty("--team", colorOf(id));
}

selectTeam(myTeam);
// Number keys switch teams — faster than aiming at a button mid-scrum.
addEventListener("keydown", (e) => {
  const n = Number(e.key);
  if (TEAMS.some((t) => t.id === n)) selectTeam(n);
});
