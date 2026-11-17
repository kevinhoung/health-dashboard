# Health dashboard

All data in this repo is generated sample data. It is not real health data.

A private-style personal health dashboard with Overview, Body, Activity, Sleep, Heart, and Mood pages using hash routes. It is a static HTML, CSS, and JavaScript site with SVG charts and light/dark styling.

## Run locally

```sh
python3 -m http.server 8000
```

Open http://localhost:8000. The fetch of `data.json` needs a server; opening the page with `file://` will not work.

## Deploy

Use any static host. For Vercel, import the repo with no build command and the repo root as the output directory. `vercel.json` sends noindex and private cache headers.

## Use your own data

There is no Apple Health importer included; you produce `data.json` yourself. Set `sample` to `false` for your own data. Dates below are strings in `YYYY-MM-DD` format; numbers are JSON numbers. The app skips missing or null numeric readings in charts. Keep arrays in `daily` aligned by index with `d`; use `null` for a missing reading.

- `generated`: timestamp string; `primaryScale`: string identifying the primary scale; `sample`: boolean.
- `daily`: object containing `d` (array of dates) and arrays of numbers or null: `steps` (steps), `activeKcal` (kcal), `exerciseMin` (minutes), `distanceMi` (miles), `flights` (flights), `restingHR` (bpm), `hrv` (ms), `walkingHR` (bpm), `respRate` (breaths/min), `spo2` (%), and `vo2` (mL/kg/min).
- `body`: array of objects with `d`, `src` (string), `weight` (lb), `bodyFat` (%), and `leanMass` (lb). Readings may be missing or null. Body rows only chart when `src === primaryScale`.
- `sleep`: array of objects with `d` (wake date), `src` (string), `total`, `inBed`, `deep`, `rem`, `core`, `awake` (minutes), and `score` (number). Readings may be missing or null.
- `workouts`: array of objects with `d`, `type` (string), `min` (minutes), `mi` (miles), `kcal` (kcal), and `hr` (bpm, may be null).
- `vitality`: array of objects with `d` and numeric `vitality`, `recovery`, and `fitness` scores.
- `meds`: array of objects with `ref` and `name` strings, `archived` and `scheduled` booleans, `first` and `last` dates, `days` (array of dates), and `effects` (object with `steps`, `restingHR`, and `hrv` arrays of two numbers, in steps, bpm, and ms respectively).
- `mood`: array of objects with `d`, `kind` and `label` strings, numeric `valence`, and `emotions` (string or array of strings).
- `insights`: array of objects with `tone`, `section`, and `text` strings.

Some fields are retained for the data format even though the current pages do not display them. To regenerate fictional data:

```sh
python3 scripts/generate_sample_data.py --end 2026-11-15 --days 540
```

The script accepts `--seed` (default 42), `--days` (default 540), `--end` (default today), and `--out` (default `data.json`). For a fixed seed, end date, and day count, its output is deterministic.

If you put real readings in `data.json`, keep the repo private or keep that file out of git, for example by adding this line to `.gitignore` before adding it to git:

```gitignore
/data.json
```

Ignoring a file does not remove it from git if it is already tracked; remove it from the index and history as appropriate before publishing.

This dashboard is not medical advice.

## License

[MIT](LICENSE)
