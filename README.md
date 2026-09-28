# Hollow County

An original browser game: the linear, key-and-door level progression of classic **DOOM** (1993), played in the isometric look and survival systems of **Project Zomboid**.

> Lorne County, Kentucky — August 1993. Something got out of the Meridian Biologics campus on Route 9. You are Specialist Jordan Hale, a National Guard combat medic stranded inside the quarantine line. The last evacuation leaves the Route 9 bridge at dawn on the 17th. Seventy-two hours. Eleven miles.

## Play

**▶ Play in your browser: https://forfa.github.io/hollow-county/**


Open `index.html` in a desktop browser (Chrome, Edge, Firefox or Safari). No build step and no server are needed; it also works from `file://`.
Everything is self-contained, fonts included, so it works offline. Saves and settings stay in your own browser (`localStorage`) and are never sent anywhere.

| Key | Action |
| --- | --- |
| W A S D | Move (screen-relative) |
| Mouse / Left click | Aim / attack (hold for the rifle's automatic fire) |
| Right click (hold) | Steady aim: slower, much more accurate |
| Shift | Sprint (drains endurance, makes noise) |
| 1 2 3 4 · Q | Melee / pistol / shotgun / rifle · last weapon |
| R | Reload |
| E | Use doors, notes, switches, loose panels |
| F | Flashlight |
| B / V / G | Bandage / MX-7 antiviral / throw molotov |
| Tab | Automap (named rooms and areas; places the objective mentions pulse yellow) |
| Wheel | Zoom |
| Esc | Pause |

## What's in it

**Structure (from Doom).** Four levels (E1M1–E1M4), each with red/blue/yellow keys and locked doors, hidden stashes, "monster closet" ambushes and switch-driven set pieces. A boss (SSG Tully, EOD) ends the episode, followed by a holdout finale. Between levels there's an intermission with Kills/Items/Secrets/Time/Par and a hand-drawn county map, a diary page, and a Doom-style status bar with a reactive pixel-art face.

**Survival systems (from Project Zomboid).** The isometric view has roofs that lift when you go inside and walls that cut away around you. You only see what's in your line of sight, inside a forward vision cone. Moodles track bleeding, pain, panic, endurance and infection. Noise matters: gunfire draws zombies from far away, while melee is quiet. Zombies can't open doors but will break them down, and they smash windows. Melee weapons wear down. A bite can infect you, and the fever will kill you unless you inject MX-7. A day/night clock runs through each level, with flashlight tension at night, rain and fog. Radio broadcasts and readable notes carry the story, and a death reads "This is how you died."

**Everything is generated in the browser.** Textures, characters (3D "capsule" rigs projected isometrically), props, lighting, sound effects and adaptive music (a combat layer fades in as the horde closes) are all procedural. No assets from either game are used.

The ending depends on your state at the helicopter. Infection matters.

## Project layout

```
index.html, css/style.css
js/core.js        namespace, math, RNG/noise, input, settings/save
js/audio.js       WebAudio SFX synthesis, spatial mix, reverb, music sequencer
js/gfx.js         procedural textures, iso box renderer, wall/prop/tree/roof/item sprites
js/rig.js         character rig (player + zombie outfits, poses, deaths)
js/level.js       ASCII map parser, thin walls, doors/windows, rooms/buildings, map builder
js/levels/*.js    title backdrop + the four levels (built from fills and stamped blocks)
js/story.js       all narrative text
js/entities.js    collision/raycasts, decals, particles, pickups, fire, molotovs, helicopter
js/zombies.js     zombie types, perception, flow-field pursuit, door bashing
js/player.js      movement, weapons, items, moodles, infection
js/render.js      world rendering, line of sight, cutaways, lightmap, weather
js/hud.js         status bar, face, moodles, radio, objectives, automap
js/screens.js     DOM screens: boot, broadcast cold open, title/menus, cards, notes, intermission, endings
js/game.js        state machine, level flow, scripting, interaction, camera
tools/validate.js level validator
```

## Development

- `node tools/validate.js` loads every script in a stubbed DOM and parses each level. It then proves that every exit is reachable: it collects keys, flips switches, drops the boss's key and triggers the helicopter as it goes. It also reports unreachable items and notes that have no text.
- Place names: each level's `labels` list (format documented at `placeNames` in `js/level.js`) names its rooms and outdoor areas; building names come from `buildings[].name`. They drive the automap labels and the location line under the objective. Use the same wording as the objectives and notes. The validator fails on an enterable room with no name (hidden stashes are exempt), and it prints which places each objective points at.
- Test hooks in the URL hash skip the menus (they only work when the game runs locally, from `file://` or `localhost`; the published site ignores them), e.g. `index.html#test=3&x=30&y=25&god=1&arsenal=1&bot=1`. `test` takes `title`, `ebs`, or a level number `1`–`4`. `x`/`y` set the spawn tile, `clock` sets minutes past midnight, and `bot` auto-aims at the nearest zombie.

## License

MIT, see [LICENSE](LICENSE). Bundled fonts keep their own licenses (SIL OFL 1.1 / Apache 2.0) in `assets/fonts/`.
