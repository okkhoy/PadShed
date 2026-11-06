# Rudiment Room

A focused, browser-based practice room for the 40 Percussive Arts Society International Drum Rudiments.

Rudiment Room combines live snare notation, a synchronized sticking strip, a Web Audio metronome, a tempo challenge, and a MusicXML score room in one static site.

## Features

- All 40 PAS rudiments grouped into Rolls, Diddles, Flams, and Drags.
- Hand-specific sticking with accents, flams, drags, and buzz strokes.
- Eight bars of VexFlow notation: four bars on each of two lines, with a synchronized playhead.
- Selectable time signatures: 2/4, 3/4, 4/4, 5/4, 6/4, 7/4, 6/8, 9/8, and 12/8.
- Selectable notes: quarter, eighth, triplet eighth, and sixteenth.
- Live right/left sticking strip and beat indicators that follow the selected meter.
- Combination practice: select up to four rudiments and rotate every bar.
- Web Audio click with click, wood, and stick sounds.
- Optional R/L tones for practice: right-hand strokes sound higher and left-hand strokes lower, with the selected sound and accents preserved. The setting is saved and can change during playback.
- Accent controls for downbeats and written accents.
- Tempo challenge that climbs and descends between a minimum and maximum BPM, with configurable steps and bars between changes.
- Built-in MusicXML generation, download, and OSMD score playback.
- MusicXML upload support for `.xml`, `.musicxml`, and `.mxl` files.
- Keyboard controls: Space starts or stops, arrow keys adjust tempo.
- Paper-colored interface with a persistent, high-contrast dark-mode toggle, including notation.
- Viewport-sized practice layout; long lists and imported scores scroll inside their panels.

## Run locally

The site is fully static. Serve the repository root with any static file server:

```bash
python3 -m http.server 4173
```

Then open <http://127.0.0.1:4173/>.

Opening `index.html` directly from the filesystem is not recommended because the app uses ES modules and fetches VexFlow and OpenSheetMusicDisplay from a CDN.

## Controls

| Control | Action |
| --- | --- |
| Space | Start or stop practice, or score playback in the Score Room |
| Arrow Up / Down | Raise or lower tempo by 5 BPM |
| Left / Right on tabs | Move between Trainer and Score Room |

The metronome starts only after a user gesture, as required by browser audio policies. Practice settings are stored in `localStorage` under `rudimentRoom.settings.v1`.

Theme preference is stored under `rudimentRoom.theme`. Basic practice repeats one rudiment; Combination practice changes rudiments every bar in the selected time signature. In /4 meters, tempo counts quarter-note beats; the Notes selector determines how many strokes fit into each beat. The tempo challenge can be used with either mode, starts at its minimum BPM, and repeatedly climbs to the maximum and descends again.

In 6/8, 9/8, and 12/8, BPM counts dotted-quarter beats: respectively 2, 3, or 4 per bar. Eighth notes beam in groups of three; sixteenths beam in groups of six. Each group gets a stronger click, with the first group accented when downbeat accents are enabled. The Notes selector offers dotted quarters, eighths, and sixteenths in these meters; switching from triplet eighths selects regular eighths. Beat lights, combination changes, tempo challenges, and Score Room playback follow these grouped beats. MusicXML exports include the compound meter, beam groups, dotted-quarter tempo marking, and equivalent quarter-note MIDI tempo.

## Checks

Run the dependency-free logic and DOM wiring checks with a recent Node.js version:

```bash
node --test tests/practice.test.mjs
```

## MusicXML

The Score Room creates MusicXML from the selected rudiment and current subdivision. It includes percussion clef, sticking lyrics, accents, grace notes, tuplets, and buzz tremolos. Use **Download** to save the generated score or **Open MusicXML** to load your own file.

Generated scores use a standard snare drum part and the selected time signature and note value. Imported scores use the first time signature found in the score.

## Deploy to GitHub Pages

1. Push the repository to GitHub with `main` as the default branch.
2. Open **Settings → Pages** in the repository.
3. Set **Source** to **GitHub Actions**.
4. Run the **Deploy static site to GitHub Pages** workflow, or push to `main`.

The workflow publishes the repository root. All application paths are relative, so the site works from a project subpath such as `https://username.github.io/DrumRT/`.

## Technology

- [VexFlow 5](https://www.vexflow.com/) for trainer notation.
- [OpenSheetMusicDisplay 2.2.1](https://opensheetmusicdisplay.org/) for MusicXML score rendering.
- Web Audio API for the metronome and click synthesis.
- Native ES modules, HTML, and CSS. No bundler or runtime dependencies are installed in the repository.

VexFlow, OSMD, and Google Fonts are loaded from public CDNs, so the first visit requires an internet connection.

## Project layout

```text
.
├── index.html
├── assets/
│   └── favicon.svg
├── css/
│   └── styles.css
├── js/
│   ├── audio.js
│   ├── main.js
│   ├── metronome.js
│   ├── meter.js
│   ├── notation.js
│   ├── practice.js
│   ├── rudiments.js
│   ├── score-player.js
│   ├── scores.js
│   └── visualizer.js
├── tests/practice.test.mjs
└── .github/workflows/pages.yml
```

## Credits and disclaimer

Rudiment names and traditional stickings follow the Percussive Arts Society
International Drum Rudiments. This is an independent practice tool and is not
affiliated with PAS.

The tool was developed using Codex running GPT-6 Astra model.

## License

MIT. See [LICENSE](LICENSE).
