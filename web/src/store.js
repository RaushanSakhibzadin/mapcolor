import { DEPLOY_BLOCK, TURF_ADDRESS } from "./config.js";

const ZERO = "0x0000000000000000000000000000000000000000";
export const isConfigured = TURF_ADDRESS.toLowerCase() !== ZERO;

/**
 * Where claims live. Two implementations behind one interface so index.js
 * never branches on it:
 *   - onchain: every tap is a transaction, everyone's map converges on the
 *     Claimed event feed.
 *   - local:   same game, stored in this browser only. Lets the page be
 *     playable before the contract is deployed and lets you demo with no wallet.
 * Both call onClaim(osmWayId, team) for every claim, including your own.
 */
export async function createStore({ onClaim, onStatus = () => {} }) {
  return isConfigured
    ? onchainStore({ onClaim, onStatus })
    : localStore({ onClaim, onStatus });
}

async function onchainStore({ onClaim, onStatus }) {
  // Only pulled in when a contract is configured, so sandbox mode ships no
  // chain code at all.
  const { connect, loadClaims, sendClaim, watchClaims } = await import("./chain.js");

  onStatus("replaying claims…");
  const claims = await loadClaims(TURF_ADDRESS, DEPLOY_BLOCK);
  watchClaims(TURF_ADDRESS, (osmWayId, team) => {
    claims.set(osmWayId, team);
    onClaim(osmWayId, team);
  });

  let session = null;
  return {
    mode: "onchain",
    label: `onchain · ${TURF_ADDRESS.slice(0, 6)}…${TURF_ADDRESS.slice(-4)}`,
    claims,
    async claim(osmWayId, team) {
      if (!session) session = await connect();
      // The Claimed event repaints this building a moment later; index.js has
      // already painted it optimistically.
      await sendClaim({ ...session, address: TURF_ADDRESS, osmWayId, team });
    },
  };
}

const LOCAL_KEY = "mapcolor.claims";

function localStore({ onClaim, onStatus }) {
  let claims = new Map();
  try {
    claims = new Map(JSON.parse(localStorage.getItem(LOCAL_KEY) ?? "[]"));
  } catch {
    // Corrupt or unavailable storage: start the round fresh.
  }
  onStatus("local sandbox");

  return {
    mode: "local",
    label: "local sandbox · not onchain",
    claims,
    async claim(osmWayId, team) {
      claims.set(osmWayId, team);
      try {
        localStorage.setItem(LOCAL_KEY, JSON.stringify([...claims]));
      } catch {
        // Nothing to do; the round still plays, it just won't survive reload.
      }
      onClaim(osmWayId, team);
    },
  };
}
