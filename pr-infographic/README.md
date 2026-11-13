# pr-infographic

Ask Claude to "make an infographic for this PR" and it reads the pull request and its diff, designs a diagram of what changed and why it matters, renders it as a 1536×864 PNG and puts it at the top of the PR description. Each image is designed for its own PR (a timeline for a fix, a dependency map for a refactor, a mock of a new control), and every word and number comes from the PR.

No image-generation service is involved. Claude writes the layout as code; [Satori](https://github.com/vercel/satori) turns it into SVG and [resvg](https://github.com/yisibl/resvg-js) into PNG, so text is always crisp.

## Install

Requires Node 18+ and the [GitHub CLI](https://cli.github.com/) (`gh`) signed in, at 2.100 or later for `gh pr edit --attach`.

```sh
cp -r pr-infographic ~/.claude/skills/
npm install --prefix ~/.claude/skills/pr-infographic
```

Then ask for it in Claude Code: "make an infographic for this PR", "add an infographic to #123", or give a PR URL.

## House style

Put a `style.json` next to `SKILL.md` to give every infographic your background, accent colour, product name and logo:

```json
{
  "name": "Acme",
  "logo": "logo.svg",
  "background": "#f8fafc",
  "backgroundImage": "linear-gradient(160deg, #f8fafc 0%, #f8fafc 55%, #eef2ff 100%)",
  "accent": "#2563eb"
}
```

| Field | What it sets | Default |
|---|---|---|
| `name` | Product name shown next to the logo in a corner | none |
| `logo` | SVG or PNG file, relative to `style.json` | none |
| `background` | Canvas colour | `#ffffff` |
| `backgroundImage` | Optional CSS `linear-gradient(...)` or `radial-gradient(...)` over the colour | none |
| `accent` | Highlight colour for headlines, badges and connectors | `#2563eb` |

Every field is optional; with no `name` and no `logo` the corner mark is left out. Keep the background light: the skill designs dark text on a light canvas. `style.json` is git-ignored, so your branding stays out of the repository.

To use a different style for one image, say so in the request ("use our docs style in `~/brand/docs-style.json`") or describe it ("logo `~/brand/mark.svg`, name Acme, accent `#0f766e`"); Claude writes or passes the file with `--style`.

## Files

| File | Purpose |
|---|---|
| `SKILL.md` | How Claude picks the PR, designs the image and checks it |
| `render.mjs` | `node render.mjs <design.mjs> <out.png> [--style style.json]`: renders a design module with the house style |
| `attach.mjs` | `node attach.mjs <pr> <out.png> [--repo owner/name] [--replace-existing]`: uploads the image to the top of the PR description, replaces one it added earlier, and checks the rest of the description is unchanged |
