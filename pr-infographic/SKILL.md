---
name: pr-infographic
description: Use when the user asks to make, add, get or redo an infographic (or header image, header card, banner) for a pull request, given a PR URL, a PR number, or the PR being discussed in the chat or open for the current branch.
---

# PR infographic

A 1536×864 image at the top of a PR description that shows what the PR changes and why it matters, designed fresh for each PR. Satori lays out the elements and resvg renders the PNG, so text and diagrams come out crisp. Illustration doesn't come out well this way, so the infographic shows the change itself: no mascot, no fixed template.

`SKILL_DIR` below is the directory this file is in.

## Which PR

Use the PR URL or number if the user gave one (a URL also gives the repo). Otherwise use the PR this conversation has been about, and failing that `gh pr view --json number,url` on the current branch. If it's still unclear, ask.

## House style

The background, accent colour, product name and logo come from a style file. `render.mjs` reads `SKILL_DIR/style.json` by default; `--style <file>` uses another one. Without either, the canvas is white with a blue accent and no product mark. If the user describes a style in the request (a name, a logo file, a background or accent colour), write it to a style file in the scratchpad and pass `--style`. The fields are in `README.md`.

## Design it

1. Read the PR: `gh pr view <pr> --json title,body,files,additions,deletions,author,url`, then `gh pr diff <pr>`. The best material is usually in the diff, not the description: test fixtures, config labels, expected strings in tests, SQL, metrics, before-and-after numbers the body quotes.
2. Find the one idea a reviewer should get in five seconds: what changes, for whom, and why it's better. The headline states that outcome in about eight words. Leave the PR title off the image; GitHub already shows it right above.
3. Pick the visual form that shows that idea, and pick it fresh for each PR so infographics differ from each other. Some forms:
   - raw-to-readable transformation
   - request or data flow
   - before-and-after architecture
   - timeline or sequence
   - bar chart for a performance number
   - permission matrix
   - state machine
   - a mock of the new UI next to a timeline of what happens over time
   - a map of the parts that changed

   The canvas is the house-style background in `CANVAS` (spread it into the root style), with dark text: no dark mode, and no grid, pattern or texture behind the content. Vary the style through the content instead: editorial, blueprint-style diagrams, a clean UI mock. A dark element such as a code window is fine as an inset. Add a strip for secondary facts when they matter, such as who can use it, the deploy order, or size.
4. Every word and number must trace back to the PR. Example data comes from the PR's own fixtures and tests and is never invented. Leave out anything sensitive, even when it's in the fixtures.
5. Put `brand(color)` small in a corner; it renders the house-style logo and name, or nothing when the style has neither. `ACCENT` is the accent colour; the rest of the palette is up to you.

## Render it

Write the design to the scratchpad as an ES module whose default export receives the helpers and returns a Satori element tree:

```js
export default ({ h, svgImg, glyph, brand, W, H, ACCENT, CANVAS, NAME }) =>
  h("div", { display: "flex", position: "relative", width: W, height: H, ...CANVAS, fontFamily: "Inter" }, /* ... */);
```

- `h(type, style, ...children)` builds an element; children may be strings, elements, arrays or `null`.
- `svgImg(svgString, { width, height, ...style })` places inline SVG: icons, connectors, charts.
- `glyph(kind, color, size)` draws `check`, `cross`, `arrow` or `arrowDown`.
- `brand(color, size)` is the product mark; `NAME` is the product name or `null`.
- `W` × `H` is 1536 × 864. Fonts are `Inter` (400–900) and `Mono` (JetBrains Mono, 400/500/700).

Then:

```
node SKILL_DIR/render.mjs <design.mjs> <out.png> [--style style.json]
```

If `SKILL_DIR/node_modules` is missing, run `npm install --prefix SKILL_DIR` first.

Read the PNG and look at it before using it. Check for overlaps, text that wraps or overflows, missing glyphs, connectors that miss their targets and words that differ from the PR. Expect a few rounds.

## Put it on the PR

```
node SKILL_DIR/attach.mjs <pr> <out.png> [--repo owner/name] [--replace-existing]
```

The script uploads through `gh pr edit --attach`. It puts the image alone on the first line, replaces an infographic added earlier instead of stacking another, and fails if the rest of the description isn't byte-identical afterwards. It changes nothing else on the PR. If the PR's author isn't the signed-in `gh` user (`gh api user -q .login`), ask before editing someone else's description. If the description already starts with an image this skill didn't add, the script stops; replace it with `--replace-existing` when the user asked for that PR by name, and ask otherwise. If the user only asked to see the infographic, give them the PNG path and don't attach it.

## Satori and resvg gotchas

- Every `div` with more than one child needs `display: "flex"`. There is no CSS grid; build rows of flex boxes.
- Width and height don't include padding and border, so subtract them yourself or boxes overflow their panels.
- The fonts are latin subsets only. ✓ ✕ → and other symbols render as boxes, so use `glyph` or an inline SVG.
- Repeated spaces collapse, and so does a single trailing space at the end of a span that comes before a differently styled span. Use `" "` in the JS string, or `whiteSpace: "pre"` on a container.
- Chips and badges inside a row need `whiteSpace: "nowrap", flexShrink: 0`, or they wrap when the row gets tight.
- Curves, connectors, rings and glows go in one full-canvas `svgImg` overlay with absolute coordinates. Position the boxes they connect absolutely too, so the coordinates match. Later children paint over earlier ones, so put the overlay after any panel it sits on, or the panel's background dims it.
- Inside an SVG, resvg panics (`lighting.rs` assertion) when a lighting filter's region runs off the canvas. A filter region follows the bounding box of the path geometry, which ignores stroke width, so a straight stroke gets clipped unless you use `filterUnits="userSpaceOnUse"`.
