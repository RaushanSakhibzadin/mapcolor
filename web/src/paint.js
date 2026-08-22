import { NEUTRAL, TEAMS } from "./teams.js";

// The whole rendering trick: the style is written once, and every claim after
// that is a feature-state write. MapLibre re-paints the changed feature without
// re-parsing the style or the tiles, so a tap recolors in the same frame the
// event lands. Nothing here touches geometry.
//
// `["feature-state", "team"]` is null until we set it, so coalesce to 0 and let
// `match` fall through to NEUTRAL.
export const teamFillColor = [
  "match",
  ["coalesce", ["feature-state", "team"], 0],
  ...TEAMS.flatMap((t) => [t.id, t.color]),
  NEUTRAL,
];

// Claimed buildings read as solid; neutral ones stay washed out so the map
// still looks like a map at the start of the round.
export const teamFillOpacity = [
  "case",
  [">", ["coalesce", ["feature-state", "team"], 0], 0], 0.85,
  0.25,
];

/** The layer to add above the basemap's own building layer. */
export function turfLayer({ id = "turf", source, sourceLayer }) {
  return {
    id,
    type: "fill",
    source,
    "source-layer": sourceLayer,
    filter: ["==", ["geometry-type"], "Polygon"],
    paint: {
      "fill-color": teamFillColor,
      "fill-opacity": teamFillOpacity,
      "fill-outline-color": "rgba(0,0,0,0.35)",
    },
  };
}

/**
 * Apply one claim. `osmWayId` is the feature id, which requires the source to
 * expose OSM way IDs as feature ids — see promoteId in index.js.
 */
export function paintClaim(map, { source, sourceLayer }, osmWayId, team) {
  map.setFeatureState(
    { source, sourceLayer, id: osmWayId },
    { team },
  );
}

/** Replay a whole snapshot (Map of osmWayId -> team) after tiles first load. */
export function paintAll(map, ids, claims) {
  for (const [osmWayId, team] of claims) paintClaim(map, ids, osmWayId, team);
}

/**
 * Fallback for tile sources that do NOT carry usable feature ids, where
 * setFeatureState has nothing to attach to. This bakes the claims straight into
 * the paint property — correct, but it re-evaluates the expression for every
 * feature in view on each update, so only reach for it if promoteId fails.
 */
export function claimsToMatchExpression(claims) {
  const byTeam = new Map();
  for (const [osmWayId, team] of claims) {
    if (!team) continue;
    if (!byTeam.has(team)) byTeam.set(team, []);
    byTeam.get(team).push(osmWayId);
  }
  const branches = [];
  for (const [team, ids] of byTeam) {
    branches.push(ids, TEAMS.find((t) => t.id === team)?.color ?? NEUTRAL);
  }
  if (branches.length === 0) return NEUTRAL;
  return ["match", ["id"], ...branches, NEUTRAL];
}
