import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const themeCSS = readFileSync(new URL("../src/themes.css", import.meta.url), "utf8");
const fixes = readFileSync(new URL("../src/theme-readability.css", import.meta.url), "utf8");
const entry = readFileSync(new URL("../src/main.tsx", import.meta.url), "utf8");
const ids = ["dark", "ocean", "beach", "forest", "sunset"];
const hexColor = (v) => /^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i.test(v);
function brightness(hex) {
  let value = hex.slice(1);
  if (value.length === 3) value = [...value].map(c => c + c).join("");
  const channels = [0, 2, 4].map(i => parseInt(value.slice(i, i + 2), 16) / 255)
    .map(c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
function contrast(a, b) {
  const [bright, dark] = [brightness(a), brightness(b)].sort((x, y) => y - x);
  return (bright + 0.05) / (dark + 0.05);
}
function palette(id) {
  const vars = {};
  const re = /:root\[data-wl-theme="([^"]+)"\]\s*\{([^}]+)\}/g;
  for (const match of themeCSS.matchAll(re)) {
    if (match[1] !== id) continue;
    for (const declaration of match[2].split(";")) {
      const found = declaration.trim().match(/^(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8})$/);
      if (found) vars[found[1]] = found[2];
    }
  }
  return vars;
}

test("Light mode remains outside the Stage 2 overrides", () => {
  assert.ok(entry.includes('import "./theme-readability.css";'));
  assert.ok(entry.indexOf('import "./theme-readability.css";') > entry.indexOf('import "./workflow-links.css";'));
  const withoutComments = fixes.replace(/\/\*[\s\S]*?\*\//g, "");
  const selectors = [...withoutComments.matchAll(/([^{}]+)\{/g)].map(m => m[1].trim());
  assert.ok(selectors.length >= 15);
  for (const selector of selectors) {
    for (const part of selector.split(/,\s*(?=:root\[data-wl-theme)/)) {
      assert.match(part.trim(), /:root\[data-wl-theme(?:="dark")?\]/);
      if (!part.includes('data-wl-theme="dark"')) {
        assert.ok(part.includes(':not([data-wl-theme="light"])'), part);
      }
    }
  }
});

for (const id of ids) {
  test(id + " text and selected-navigation contrast meet WCAG AA", () => {
    const vars = palette(id);
    const values = ["--wl-paper", "--wl-surface", "--wl-copy", "--wl-subcopy", "--wl-accent"];
    for (const name of values) assert.ok(hexColor(vars[name] || ""), id + " missing " + name);
    for (const surface of ["--wl-paper", "--wl-surface"]) {
      for (const ink of ["--wl-copy", "--wl-subcopy"]) {
        const actual = contrast(vars[surface], vars[ink]);
        assert.ok(actual >= 4.5, id + " " + ink + " on " + surface + " = " + actual.toFixed(2));
      }
    }
    const activeInk = id === "dark" ? vars["--wl-inverted"] : "#ffffff";
    assert.ok(hexColor(activeInk || ""));
    const navContrast = contrast(vars["--wl-accent"], activeInk);
    assert.ok(navContrast >= 4.5, id + " active navigation = " + navContrast.toFixed(2));
  });
}
