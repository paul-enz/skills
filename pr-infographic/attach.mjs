// Usage: node attach.mjs <pr-number-or-url> <image.png> [--repo owner/name] [--replace-existing]
// Puts the image alone on the first line of the PR description, replacing an
// infographic this skill added before, and leaves the rest byte-identical.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const args = process.argv.slice(2);
const repoIdx = args.indexOf("--repo");
const repo = repoIdx >= 0 ? args.splice(repoIdx, 2)[1] : null;
const replaceExisting = args.includes("--replace-existing");
const [pr, image] = args.filter((a) => a !== "--replace-existing");
if (!pr || !image) throw new Error("usage: node attach.mjs <pr> <image.png> [--repo owner/name] [--replace-existing]");

const gh = (...a) => execFileSync("gh", [...a, ...(repo ? ["--repo", repo] : [])], { encoding: "utf8" });
const ALT = "PR infographic";
const OURS = /^!\[PR infographic\]\(https:\/\/github\.com\/user-attachments\/assets\/[^)]+\)\n\n/;

const original = JSON.parse(gh("pr", "view", pr, "--json", "body")).body ?? "";
const LEADING_IMAGE = /^(!\[[^\]]*\]\([^)]+\)|<img\b[^>]*>)[ \t]*(\r?\n)+/;
let rest = original.replace(OURS, "");
if (LEADING_IMAGE.test(rest)) {
  if (!replaceExisting) throw new Error("description starts with an image this skill did not add; rerun with --replace-existing to replace it");
  rest = rest.replace(LEADING_IMAGE, "");
}

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pr-infographic-"));
const file = `infographic${path.extname(image)}`;
fs.copyFileSync(image, path.join(dir, file));
fs.writeFileSync(path.join(dir, "body.md"), `![${ALT}](./${file})\n\n${rest}`);
execFileSync("gh", ["pr", "edit", pr, ...(repo ? ["--repo", repo] : []), "--body-file", "body.md", "--attach", `./${file}#${ALT}`], { cwd: dir, stdio: "inherit" });

const after = JSON.parse(gh("pr", "view", pr, "--json", "body,url"));
const m = after.body.match(/^!\[PR infographic\]\((https:\/\/github\.com\/user-attachments\/assets\/[^)]+)\)\n\n/);
if (!m) throw new Error("image line missing from the top of the description");
if (after.body.slice(m[0].length) !== rest) throw new Error("rest of the description changed; compare by hand");
console.log(JSON.stringify({ url: after.url, image: m[1], replacedPrevious: rest !== original }));
