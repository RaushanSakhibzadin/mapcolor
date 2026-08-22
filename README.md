# mapcolor

Onchain turf war on a live OpenStreetMap of Belgrade. Tap a building, claim it for your team — every tap is a real transaction on Monad. Vector map, no pixels. Built at Monad Blitz Belgrade.

**Play:** _<QR / deploy link goes here>_ — pick a team at the bottom of the screen, tap any building to paint it. Tapping someone else's building takes it. There is no cooldown.

## How it works

- **Buildings are OSM way IDs.** No geometry onchain. `Turf` is a `mapping(uint256 => uint8)` from way ID to team plus a claim function, so the contract never has to know where anything is.
- **The map is the index.** Every claim emits `Claimed`. The frontend replays the log on load and tails it live, so all clients converge on the same colors without a backend.
- **Recolors are feature-state writes.** The paint expression is written once; a claim only calls `setFeatureState`, which repaints that one building without re-parsing the style. Taps land visibly during the demo.
- **Claims overwrite.** Re-tapping your own building is a no-op; taking one from another team is not. A settled map is a boring demo.

## Layout

```
contracts/src/Turf.sol   ~60 lines: teamOf, scoreOf, claim, claimMany, Claimed
web/src/paint.js         the MapLibre paint expression + setFeatureState helpers
web/src/chain.js         viem client, log replay, live watch, claim tx
web/src/index.js         map wiring, optimistic paint on tap
web/src/config.js        contract address, style URL, source layer  ← edit this first
```

## Run

```sh
cd contracts
forge create src/Turf.sol:Turf --rpc-url monad_testnet --private-key $PK --constructor-args 4

cd ../web
# put the deployed address, deploy block and your basemap key in src/config.js
python3 -m http.server 5173     # http://localhost:5173
```

Everything loads from ESM CDNs, so there is no build step to break at 3am.

## The one thing that can bite you

`setFeatureState` needs the building features to carry their OSM way ID as the
feature id. `config.js` sets `promoteId` to the `osm_id` property, but hosted
OpenMapTiles basemaps only include `osm_id` when the tiles were built with
`--include-osm-ids`. If claims land onchain but nothing recolors, that is why.
Two ways out:

1. Build your own tiles from a Belgrade extract (planetiler or tippecanoe both
   keep OSM IDs) and point `STYLE_URL` at them. Best answer — a city-sized
   extract is small and it makes the demo work offline.
2. Fall back to `claimsToMatchExpression()` in `paint.js`, which bakes claims
   into `fill-color` via a `["match", ["id"], …]` and needs no feature ids.
   Slower per update, fine at hackathon scale.

To go 3D, switch `turfLayer` to `type: "fill-extrusion"` and move the paint keys
to `fill-extrusion-color` / `fill-extrusion-opacity` with
`"fill-extrusion-height": ["get", "render_height"]`.

## License

MIT
