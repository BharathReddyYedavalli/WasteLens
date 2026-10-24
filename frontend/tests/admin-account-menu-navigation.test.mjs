import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = file => readFileSync(new URL("../src/" + file, import.meta.url), "utf8");
const app = read("App.tsx");
const nav = read("shell/TopNav.tsx");
const menu = read("AccountMenu.tsx");
const account = read("AccountArea.tsx");
const i18n = read("i18n.tsx");
const backend = readFileSync(new URL("../../backend/app/accounts.py", import.meta.url), "utf8");

test("all product features remain reachable in the new editorial navigation", () => {
  for (const item of ["Scan","Ask","Find a place","Bottle returns","Waste audit","Bottle journey","My activity","Leaderboard","About"]) {
    assert.ok(nav.includes('label: "' + item + '"'),item);
  }
  assert.match(nav,/user\?\.role === "admin"/);
  assert.match(nav,/onNavigate\(next\)/);
  assert.match(app, /<TopNav view=\{view\} user=\{user\}/);
  assert.match(app, /onNavigate=\{next => openPage\(next\)\}/);
  assert.match(app, /mode=\{view\}/);
});

test("Administrator-only account menu item is clickable and goes to Admin dashboard", () => {
  assert.match(menu, /onNavigate: \(view: "account" \| "admin"\) => void/);
  assert.match(menu, /user\?\.role === "admin" && <button/);
  assert.match(menu, /onClick=\{\(\) => navigate\("admin"\)\}/);
  assert.match(menu, /<ShieldCheck size=\{19\}\/>\{t\("Admin dashboard"\)\}/);
  assert.match(menu, /view === "admin" && user\?\.role !== "admin"/);
  assert.match(menu, /onNavigate\(view\)/);
  assert.match(menu, /navigate\("account"\)/);
});

test("Admin data authorization is still enforced independently of where the link appears", () => {
  assert.match(account, /if \(user\.role !== "admin"\) return <section/);
  assert.match(backend, /def require_admin\(request: Request\):/);
  assert.match(backend, /@router\.get\("\/admin\/overview"\)/);
  assert.match(backend, /@router\.get\("\/admin\/users"\)/);
  assert.match(backend, /@router\.get\("\/admin\/feedback"\)/);
  assert.match(i18n, /"Admin dashboard": \{ es:/);
  assert.match(nav, /<select id="wastelens-lang"/);
});
