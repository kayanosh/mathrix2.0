# KS2 hero illustrations

Drop a PNG here named after the topic id, **and** add that id to
`ILLUSTRATION_IDS` in `lib/ks2-visuals.ts`. Until both exist, topic cards use
the coloured icon badge only (so the browser never 404s on missing PNGs).

Naming: `<topicId>.png` — for example:

- `y5m-fractions.png` (Year 5 Maths — Fractions)
- `y6s-light.png` (Year 6 Science — Light and Reflection)
- `11-geometry.png` (11+ Maths — Geometry & Measures)

Topic ids are defined in `lib/ks2.ts`.

Recommended style: flat, friendly, colourful vector illustrations on a light
background, roughly 800x400 (2:1), consistent across the set.
