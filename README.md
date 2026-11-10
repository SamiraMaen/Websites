# SHAABI MUSIC · The Sound of the Streets

An interactive editorial site about Egyptian Shaabi music, from the cassette era to Mahraganat, and how economic opening, class, technology, transport and cinema shaped it.

Plain HTML, CSS and JavaScript, with no build step.

## Run locally

```bash
python3 -m http.server 5178
```

Then open http://localhost:5178

## Structure

- `index.html`: the page (Arabic, right to left)
- `css/style.css`: styles and colour tokens
- `js/main.js`: scroll effects, image scroller, era timeline, polaroid footer
- `js/cassette3d.js`: interactive 3D cassette (three.js from jsDelivr)
- `js/sound.js`: era sound sketches generated in the browser (no recordings)
- `js/data.js`: era content
- `assets/img/`: images from the "Shaabi music" Figma file and supplied artwork
