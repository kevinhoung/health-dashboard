# Health dashboard

Plain static site. index.html loads styles.css, charts.js, and app.js in order. charts.js owns shared SVG rendering, time scales, ticks, buckets, and scrub interactions; app.js fetches only ./data.json, computes metrics, and handles hash routes. data.json in this repo is fake sample data with the real schema (no real readings); regenerate it with python3 scripts/generate_sample_data.py. vercel.json preserves private/noindex headers. No build step or dependencies.

1. "Cut taglines, helper text and secondary labels. If a screen needs them to make sense, fix the layout."
2. "Make the best decision that will elevate all three: the user experience (UX), developer experience (DX), and agent experience (AX) always, without breaking anything."
