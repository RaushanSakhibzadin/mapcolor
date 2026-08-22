import { NEUTRAL, TEAMS } from "./teams.js";

// The whole rendering trick: the style is written once, and every claim after
// that is a feature-state write. MapLibre re-paints the changed feature without
// re-parsing the style or re-reading the source, so a tap recolors in the same
// frame the claim lands. Nothing here touches geometry.
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
// still looks like a map at the start of a round.
export const teamFillOpacity = [
  "case",
  [">", ["coalesce", ["feature-state", "team"], 0], 0], 0.8,
  0.3,
];

/** Fill + outline layers for the board. `sourceLayer` is only for vector tiles. */
export function turfLayers({ source, sourceLayer }) {
  const sourceLayerKey = sourceLayer ? { "source-layer": sourceLayer } : {};
  return [
    {
      id: "turf",
      type: "fill",
      source,
      ...sourceLayerKey,
      paint: { "fill-color": teamFillColor, "fill-opacity": teamFillOpacity },
    },
    {
      id: "turf-outline",
      type: "line",
      source,
      ...sourceLayerKey,
      paint: { "line-color": teamFillColor, "line-width": 0.6, "line-opacity": 0.9 },
    },
  ];
}

/** Apply one claim. `osmWayId` must be the feature id, not a property. */
export function paintClaim(map, { source, sourceLayer }, osmWayId, team) {
  map.setFeatureState({ source, sourceLayer, id: osmWayId }, { team });
}

/** Replay a whole snapshot (Map of osmWayId -> team). */
export function paintAll(map, ids, claims) {
  for (const [osmWayId, team] of claims) paintClaim(map, ids, osmWayId, team);
}

/**
 * Fallback for vector tile sources that do NOT carry usable feature ids, where
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
