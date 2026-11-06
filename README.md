# padshed

A focused, browser-based practice room for the 40 Percussive Arts Society International Drum Rudiments.

padshed combines live snare notation, a synchronized sticking strip, a Web Audio metronome, a tempo challenge, and a MusicXML score room in one static site.

## Project scope

The application has two workspaces:

- **Trainer** — repeat a single rudiment or rotate a combination, follow eight bars of notation and the centered upcoming R/L sequence, and optionally vary tempo or distinguish hands by sound.
- **Score Room** — generate a short rudiment score or open a MusicXML file, then follow its cursor with a metronome. It supports looping and a separate scrollable score view.

Everything runs in the browser. There is no backend, account system, build step, or package installation required to use the site. Preferences stay in the current browser; there is no practice-history sync, microphone input, or performance grading.

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

### Windows / PowerShell

Open PowerShell in the repository folder and run:

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

If your installation uses the Python launcher, use `py` in place of `python`. Keep this terminal open while using <http://127.0.0.1:4173/>; press **Ctrl+C** to stop the server.

If the browser says the site cannot be reached, check that the terminal shows the server running and that the URL uses the same port. If port 4173 is already in use, start the server with `4174` instead and open <http://127.0.0.1:4174/>. A directory listing usually means the server was started outside the folder containing `index.html`.

Start practice plays four count-in clicks at the starting BPM before the first written stroke. The count-in uses quarter-note beats in /4 meters and dotted-quarter beats in 6/8, 9/8, and 12/8, regardless of the selected note value. Stop cancels the count-in; starting again begins a fresh count. Practice time and bar counting begin with the first written stroke.

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

The suite covers sticking across all 40 rudiments, eight-bar sequences and combination boundaries, simple and compound meter timing, MusicXML durations and beaming, tempo challenges, R/L tone scheduling, score cursor timing, and controller-to-HTML wiring. These automated checks do not replace browser checks of notation layout, contrast, or audible playback.

## MusicXML

The Score Room creates MusicXML from the selected rudiment and current subdivision. It includes percussion clef, sticking lyrics, accents, grace notes, tuplets, and buzz tremolos. Use **Download** to save the generated score or **Open MusicXML** to load your own file.

Generated scores use a standard snare drum part and the selected time signature and note value. Imported scores use the first time signature found in the score.

### Current score and audio scope

- Generated MusicXML contains one or two bars of the selected rudiment. It does not export the Trainer's eight-bar display, combination rotation, or tempo challenge. **Download** generates this rudiment score even when an imported score is currently displayed.
- Score Room playback moves the cursor alongside a beat metronome; it does not synthesize the instruments or individual notes in an imported score. Playback uses the selected BPM and initial meter throughout, rather than following later tempo or meter changes in the file.
- **R/L tones** is a Trainer setting, disabled by default. It follows the main stroke's hand in the sticking pattern, including repeated hands, for all three click sounds. Grace notes and buzz markings are shown in notation but are not separately synthesized as drum articulations.

## Deploy to GitHub Pages

1. Push the repository to GitHub with `main` as the default branch.
2. Open **Settings → Pages** in the repository.
3. Set **Source** to **GitHub Actions**.
4. Run the **Deploy static site to GitHub Pages** workflow, or push to `main`.

The workflow publishes the repository root. All application paths are relative, so the site works from a project subpath such as `https://username.github.io/DrumRT/`.

The configured repository remote is [okkhoy/RudimentRoom](https://github.com/okkhoy/RudimentRoom); its default project Pages address would be <https://okkhoy.github.io/RudimentRoom/> once Pages is enabled and deployment succeeds. The workflow deploys on pushes to `main` or manual dispatch and currently has no test job, so run the checks above before pushing changes.

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

### Module responsibilities

| File | Responsibility |
| --- | --- |
| `index.html` | Trainer and Score Room markup, controls, and application entry point |
| `css/styles.css` | Responsive layout, paper and dark themes, notation and control styling |
| `js/main.js` | UI events, saved settings, workspace switching, and coordination of rendering and playback |
| `js/rudiments.js` | Rudiment catalog, families, and sticking-pattern parsing |
| `js/meter.js` | Shared time-signature definitions, beat grouping, and note-value calculations |
| `js/practice.js` | Practice sequences, combination rotations, and repeating tempo curves |
| `js/notation.js` | VexFlow notation rendering and synchronized Trainer playhead |
| `js/metronome.js` | Audio scheduling, beat/bar events, accents, and hand-tone selection |
| `js/audio.js` | Web Audio context, volume, and click/wood/stick synthesis |
| `js/scores.js` | MusicXML generation, downloads, and meter detection |
| `js/score-player.js` | OSMD loading/rendering, score cursor timing, looping, and beat playback |
| `js/visualizer.js` | Earlier canvas stroke visualizer, retained in the repository but not imported by the current UI |
| `tests/practice.test.mjs` | Dependency-free Node.js regression checks |
| `.github/workflows/pages.yml` | Static GitHub Pages deployment |

Additional root files include this `README.md`, the MIT `LICENSE`, `.gitignore`, `.nojekyll` for static hosting, and `2026-11-01-FirstCut.md`, a historical implementation-session record. Local server logs are ignored by Git.

For changes, start with `main.js` for control behavior, `meter.js` and `practice.js` for rhythm rules, or `notation.js` and `scores.js` for the two notation outputs. Shared meter calculations keep Trainer timing, MusicXML, and Score Room playback consistent.

## Credits and disclaimer

Rudiment names and traditional stickings follow the Percussive Arts Society
International Drum Rudiments. This is an independent practice tool and is not
affiliated with PAS.

The tool was developed using Codex running GPT-6 Astra model.

## License

MIT. See [LICENSE](LICENSE).
