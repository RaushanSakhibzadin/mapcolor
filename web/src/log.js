// The log buffer is created by the inline boot script in index.html, before any
// module loads — so a failure to even fetch this file still gets recorded.
const entries = globalThis.__mcLog ?? (globalThis.__mcLog = []);

/** Record a stage. Keep these coarse: what happened, with the number that matters. */
export function log(...parts) {
  const line = parts
    .map((p) => (typeof p === "string" ? p : JSON.stringify(p)))
    .join(" ");
  entries.push({ t: Math.round(performance.now()), line });
  globalThis.__mcRender?.();
  return line;
}

/** Attach a live map so style/tile errors land in the same log as everything else. */
export function logMapErrors(map) {
  map.on("error", (e) => {
    const source = e.sourceId ? ` [source:${e.sourceId}]` : "";
    log(`map error${source}:`, e.error?.message ?? String(e.error ?? e));
  });
  map.on("styledata", () => log("style loaded"));
}
