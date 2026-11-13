// Usage: node render.mjs <design.mjs> <out.png> [--style style.json]
// A design module default-exports (lib) => Satori element tree; lib is below.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";

const W = 1536, H = 864;
const root = path.dirname(new URL(import.meta.url).pathname);

const args = process.argv.slice(2);
const styleIdx = args.indexOf("--style");
const stylePath = styleIdx >= 0 ? path.resolve(args.splice(styleIdx, 2)[1]) : path.join(root, "style.json");
const style = fs.existsSync(stylePath) ? JSON.parse(fs.readFileSync(stylePath, "utf8")) : {};
const styleDir = path.dirname(stylePath);

const ACCENT = style.accent ?? "#2563eb";
const CANVAS = {
  backgroundColor: style.background ?? "#ffffff",
  ...(style.backgroundImage ? { backgroundImage: style.backgroundImage } : {}),
};

const h = (type, style, ...children) => ({
  type,
  props: { style, children: children.flat().filter((c) => c !== null && c !== undefined && c !== false) },
});

const dataUri = (mime, buf) => `data:${mime};base64,${Buffer.from(buf).toString("base64")}`;
const svgImg = (svg, style) => ({
  type: "img",
  props: { src: dataUri("image/svg+xml", svg), width: style.width, height: style.height, style },
});

const GLYPHS = {
  check: "M5 12.5l4.5 4.5L19 7.5",
  cross: "M6.5 6.5l11 11M17.5 6.5l-11 11",
  arrow: "M4 12h15M13 6l6 6-6 6",
  arrowDown: "M12 4v15M6 13l6 6 6-6",
};
const glyph = (kind, color, size = 16, weight = 2.8) =>
  svgImg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="${GLYPHS[kind]}" fill="none" stroke="${color}" stroke-width="${weight}" stroke-linecap="round" stroke-linejoin="round"/></svg>`, { width: size, height: size });

// Satori needs both dimensions of an image, so the logo's aspect ratio is read from the file.
const aspectOf = (buf, ext) => {
  if (ext === ".png") return buf.readUInt32BE(16) / buf.readUInt32BE(20);
  const svg = buf.toString("utf8");
  const vb = svg.match(/viewBox="\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/);
  if (vb) return Number(vb[1]) / Number(vb[2]);
  const w = svg.match(/\bwidth="([\d.]+)/), hh = svg.match(/\bheight="([\d.]+)/);
  return w && hh ? Number(w[1]) / Number(hh[1]) : 1;
};
const logo = (() => {
  if (!style.logo) return null;
  const file = path.resolve(styleDir, style.logo);
  const ext = path.extname(file).toLowerCase();
  if (ext !== ".svg" && ext !== ".png") throw new Error(`logo must be .svg or .png: ${style.logo}`);
  const buf = fs.readFileSync(file);
  return { src: dataUri(ext === ".svg" ? "image/svg+xml" : "image/png", buf), aspect: aspectOf(buf, ext) };
})();

// The product mark: logo and name from the house style, or nothing when neither is set.
const brand = (color = "#111111", size = 22) => {
  if (!logo && !style.name) return null;
  const width = logo ? Math.round(size * logo.aspect) : 0;
  return h("div", { display: "flex", alignItems: "center", gap: 8, fontSize: Math.round(size * 0.9), fontWeight: 800, color },
    logo ? { type: "img", props: { src: logo.src, width, height: size, style: { width, height: size } } } : null,
    style.name ?? null);
};

const font = (pkg, file, name, weight) => ({
  name, weight, style: "normal",
  data: fs.readFileSync(path.join(root, "node_modules/@fontsource", pkg, "files", file)),
});
const fonts = [
  ...[400, 500, 600, 700, 800, 900].map((w) => font("inter", `inter-latin-${w}-normal.woff`, "Inter", w)),
  ...[400, 500, 700].map((w) => font("jetbrains-mono", `jetbrains-mono-latin-${w}-normal.woff`, "Mono", w)),
];

const [designPath, outPng] = args;
if (!designPath || !outPng) throw new Error("usage: node render.mjs <design.mjs> <out.png> [--style style.json]");
const { default: design } = await import(pathToFileURL(path.resolve(designPath)).href);
const tree = await design({ h, svgImg, glyph, brand, W, H, ACCENT, CANVAS, NAME: style.name ?? null });
const svg = await satori(tree, { width: W, height: H, fonts });
fs.writeFileSync(outPng, new Resvg(svg, { fitTo: { mode: "width", value: W } }).render().asPng());
console.log(path.resolve(outPng));
