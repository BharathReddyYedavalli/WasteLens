import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const src=path=>readFileSync(new URL("../src/"+path,import.meta.url),"utf8");
const app=src("App.tsx");
const menu=src("AccountMenu.tsx");
const side=src("shell/SidebarNav.tsx");
const legacy=src("shell/LegacyNavigation.tsx");
const top=src("shell/HorizontalNav.tsx");
const stylesheet=readFileSync(new URL("../public/navigation-layout.css",import.meta.url),"utf8");

test("Personalization provides an accessible, saved left/top navigation switch",()=>{
  assert.match(menu,/wastelens-navigation-layout/);
  assert.match(menu,/export function useNavigationLayout/);
  assert.match(menu,/navigationLayout==="left"/);
  assert.match(menu,/navigationLayout==="top"/);
  assert.match(menu,/aria-pressed=\{navigationLayout==="top"\}/);
  assert.match(menu,/aria-pressed=\{navigationLayout==="left"\}/);
  assert.match(menu,/Navigation layout/);
  assert.match(menu,/Left sidebar/);
  assert.match(menu,/Top bar/);
  assert.match(app,/data-navigation-layout=\{navigationLayout\}/);
  assert.match(app,/<HorizontalNav/);
  assert.match(app,/<SidebarNav/);
  assert.match(app,/<LegacyNavigation/);
});

test("Horizontal rail reaches every visible page and retains account, language and theme controls",()=>{
  for(const id of ["identifier","chat","journey","finder","deposits","audit","history","leaderboard","about"]){
    assert.ok(top.includes('{ id: "'+id+'"'),id);
  }
  assert.match(top,/aria-current=\{view===id\?"page":undefined\}/);
  assert.match(top,/onNavigate\(id\)/);
  assert.match(top,/<nav ref=\{links\}/);
  assert.match(top,/aria-label=\{t\("WasteLens pages"\)\}/);
  assert.match(top,/<AccountMenu/);
  assert.match(top,/onNavigationLayoutChange=\{onNavigationLayoutChange\}/);
  assert.match(top,/LANGUAGES.map/);
  assert.match(side,/onNavigationLayoutChange=\{onNavigationLayoutChange\}/);
  assert.match(legacy,/onNavigationLayoutChange=\{onNavigationLayoutChange\}/);
});

test("Top layout expands real content pages and preserves Scan stage without changing animation source",()=>{
  assert.match(app,/\/navigation-layout.css/);
  assert.ok(app.indexOf("/navigation-layout.css")>app.indexOf("/kiosk-readability-fixes.css"));
  assert.match(stylesheet,/\.site\.is-sidebar-experiment\[data-navigation-layout="top"\] main\.shell/);
  assert.match(stylesheet,/\.site\.is-legacy-ui\[data-navigation-layout="top"\] \.legacy-layout/);
  assert.match(stylesheet,/\.site\.is-sidebar-experiment\.is-stage\[data-navigation-layout="top"\] \.stage-wrap/);
  assert.match(stylesheet,/\.site\.is-sidebar-experiment\.is-classic-page\[data-navigation-layout="top"\] main \.finder-screen \.map-explorer/);
  assert.match(stylesheet,/\.site\.is-sidebar-experiment\.is-classic-page\[data-navigation-layout="top"\] main \.deposit-layout/);
  assert.match(stylesheet,/\.site\.is-sidebar-experiment\.is-classic-page\[data-navigation-layout="top"\] main \.audit-options/);
  assert.match(stylesheet,/\.site\.is-sidebar-experiment\.is-classic-page\[data-navigation-layout="top"\] main \.history-grid/);
  assert.match(stylesheet,/@media\(max-width:620px\)/);
  assert.match(stylesheet,/overflow-x:auto/);
  assert.match(stylesheet,/wl-navigation-preference\{\s*grid-column:1\/-1/);
  assert.doesNotMatch(stylesheet,/\.es-canvas\{|\.es-note\{|\.es-pip\{/);
});

test("Navigation choice is independent from all existing theme and admin visual modes",()=>{
  for(const theme of ["light","dark","ocean","beach","forest","sunset"]){
    assert.ok(menu.includes('id: "'+theme+'"'),theme);
  }
  assert.match(menu,/visualStyle === "legacy"/);
  assert.match(app,/visualStyle === "legacy"/);
});
