# Del: pre-family 50 s film, complete archive

Everything from before the three-family experiment. All files are copies; the originals are untouched.

## Main film
- `del-full-50s-jessica-natural-v3.mp4`: the previous 50 s film (Jessica, natural script rewrite).
  - Original: `/Users/ronish/.ao/data/artifacts/del-video-6/del-full-50s-jessica-natural-v3.mp4`
  - SHA-256 `a4550c464f77c86f2731ec315ce4d18b8214840f278c3729e4c60b1fb05e87e7` (matches the original)

## Earlier films (`earlier/`)
- `del-full-50s-jessica-piano-synth-v2.mp4`: the earlier full 50 s cut.
- `del-full-50s-jessica-piano-synth.mp4`: the v1 of that cut.
- `del-graphite-jessica-10s.mp4`: the old 10 s piece.

## Editable source (`source/`, HyperFrames projects)
- `del-natural/`: **primary** source for the main film. Its `assets/` holds the fonts, GSAP, Del UI and icons, lab modules, cue maps and `audio/natural-master.wav`.
- `del-full/`: source for the earlier 50 s piano-synth cut.
- `del-ten/`: the old 10 s project, kept for context.
- Renderer: `npx hyperframes@0.8.189` (pinned in each `package.json`). There is no lockfile because the projects have no npm dependencies. Nothing is installed.
- Removed from the copies: the editor caches (`.hyperframes`, `.thumbnails`, `.waveform-cache`). There was no `node_modules`, `.git` or `.env` to remove.
- `scripts/mix.py` is the **earlier 14-take recipe** and is historical. It reads paths under `/tmp/...` that now live here:
  - `/tmp/del-full-mix` → `raw-assets/tmp/del-full-mix/`
  - `/tmp/del-full-music/piano-synth-50s-raw.mp3` → `raw-assets/tmp/del-full-music/`
  - `/tmp/del-full-events.json` → `raw-assets/tmp/del-full-events.json`
- The mix recipe actually used for the natural rewrite is `raw-assets/tmp/del-script-rewrite/mix.py`.

## Raw assets (`raw-assets/`)
- `artifacts-del-video-6/`: the approved script rewrite (`script-rewrite/`) plus the music auditions in `audio-eureka/` and `audio-tech/`.
- `tmp/del-script-rewrite/`: natural-rewrite VO: `script-v2.txt`, `request.json`, `generate.py`, dry `raw.mp3`, `voice-treated.wav`, `premix.wav`, `mix.py`, ASR checks and `verification.json`.
- `tmp/del-script-paced/`: the earlier paced dry VO (`raw.mp3`, request, script).
- `tmp/del-full-mix/`: the voice stem, treated music and premix from the earlier cut.
- `tmp/del-full-music/`: the original score (`piano-synth-50s-raw.mp3`) and its request.
- `tmp/del-eureka-raw/` and `tmp/del-tech-raw/`: every original music audition MP3, with requests and treated WAVs.
- `jessica-earlier-takes/`: the earlier Jessica dry takes from del-video-1 `50s-demo`, kept as historical context.
- The `generate.py` scripts read `ELEVENLABS_API_KEY` from the environment; no keys are stored here.

## Procedural lab (`procedural-lab/lab/procedural/`)
- The whole runnable lab: the shell `index.html`, all 14 variants and the shared helper in `v/`.
- The variants are Bayer, Atkinson, halftone, ASCII, terminal streams, mux split, tabs, oscilloscope, pixel sort, cell growth, logo bars, search hit, butter glide and giant type.
- To run it: `cd procedural-lab/lab/procedural && python3 -m http.server 8743 --bind 127.0.0.1`
- Deep links: `?t=3&pause&seed=9&theme=paper#06`. Add `?bench` for per-tile timing and a determinism check.

## References (`references/`)
- `procedural-lab-screenshot.png`: the screenshot from the human.
- `REFERENCE-loved-v4-del-v4-draft-60fps-scratch-audio.mp4`: the earlier v4 draft from del-video-2, included as a reference only.

## Missing
Nothing. Every source path named in the task existed and was copied.

`INVENTORY.txt` lists every file with its size, and `SHA256SUMS.txt` has a checksum for each.
