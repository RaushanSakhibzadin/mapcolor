# mapcolor

Onchain turf war on a live OpenStreetMap of Belgrade. Tap a building, claim it for your team — every tap is a real transaction on Monad. Vector map, no pixels. Built at Monad Blitz Belgrade.

**Play:** https://raushansakhibzadin.github.io/mapcolor/ — pick a team at the bottom, tap any building to paint it. Tapping someone else's building takes it. There is no cooldown, and number keys 1–4 switch teams.

Until a contract address is set in `web/src/config.js`, the live page runs in **local sandbox mode**: the game is real but claims stay in your browser. Fill in the address and the same page is the onchain game.

## How it works

- **Buildings are OSM way IDs.** No geometry onchain. `Turf` is a `mapping(uint256 => uint8)` from way ID to team plus a claim function, so the contract never has to know where anything is.
- **The map is the index.** Every claim emits `Claimed`. The frontend replays the log on load and tails it live, so all clients converge on the same colors without a backend.
- **Recolors are feature-state writes.** The paint expression is written once; a claim only calls `setFeatureState`, which repaints that one building without re-parsing the style. Taps land visibly during the demo.
- **Claims overwrite.** Re-tapping your own building is a no-op; taking one from another team is not. A settled map is a boring demo.

## Layout

```
contracts/src/Turf.sol   ~60 lines: teamOf, scoreOf, claim, claimMany, Claimed
web/src/config.js        contract address, playfield bbox, basemap  ← edit this first
web/src/buildings.js     Overpass -> GeoJSON, feature id = OSM way id, cached
web/src/paint.js         the MapLibre paint expression + setFeatureState helpers
web/src/store.js         claims live onchain, or locally when no contract is set
web/src/chain.js         viem client, log replay, live watch, claim tx
web/src/index.js         map wiring, optimistic paint on tap, scoreboard
```

## Run

```sh
cd web && python3 -m http.server 5173     # http://localhost:5173
```

That is the whole frontend build: static files, ESM straight from a CDN,
nothing to break at 3am. Pushing to `main` publishes `web/` to GitHub Pages.

## Going onchain

```sh
cd contracts
forge create src/Turf.sol:Turf --rpc-url monad_testnet --private-key $PK --constructor-args 4
```

Put the address and its deploy block in `web/src/config.js`. The page picks up
the chain path automatically, prompts to add Monad testnet on the first tap, and
every player's board then converges on the `Claimed` event feed.

## Why the buildings come from Overpass

`setFeatureState` is what makes a recolor cheap, and it needs each building to
carry its OSM way ID as the *feature id*. Hosted vector basemaps mostly drop OSM
IDs, so instead of fighting `promoteId` against someone else's tiles, the board
is fetched once from Overpass as GeoJSON — ids guaranteed — cached in
localStorage, and drawn over a plain OpenFreeMap basemap. It also keeps the
playfield deliberately small, which is what you want on a projector.

If you later switch to your own vector tiles (planetiler and tippecanoe both
keep OSM IDs), pass `sourceLayer` to `turfLayers()` and set
`promoteId: { building: "osm_id" }` on the source. `claimsToMatchExpression()`
in `paint.js` is the fallback for tiles with no usable feature ids.

To go 3D, switch the `turf` layer to `type: "fill-extrusion"` and move the paint
keys to `fill-extrusion-color` / `fill-extrusion-opacity`.

## License

MIT
