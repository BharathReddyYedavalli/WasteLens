import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read = p=>readFileSync(new URL("../src/"+p,import.meta.url),"utf8");
const app=read("App.tsx"), account=read("AccountArea.tsx"), nav=read("shell/LegacyNavigation.tsx"), entry=read("main.tsx");
const theme=readFileSync(new URL("../public/claude-theme.css",import.meta.url),"utf8");
test("Admin dashboard offers Current UI and Legacy UI without affecting saved data",()=>{
 assert.ok(account.includes('user.role !== "admin"'));
 assert.ok(account.includes('onVisualStyleChange("legacy")'));
 assert.ok(account.includes('onVisualStyleChange("claude")'));
 assert.ok(app.includes("wastelens-visual-style"));
 assert.ok(app.includes('link.media = visualStyle === "claude"'));
});
test("Both visual modes use the same newest application logic",()=>{
 for(const term of ['<LegacyNavigation','<SidebarNav','<RecyclingResults','<LocalRulesGuide','<BottleJourney','<AuditKit','<AccountArea','scanItemName={analysis.item_name}','scanMaterial={analysis.material_guess}','onClick={capture}','onClick={() => void analyze()}']){
  assert.ok(app.includes(term),term);
 }
 assert.ok(nav.includes("<AccountMenu"));
 assert.ok(!nav.includes('navigate("admin")'));
 assert.ok(app.includes('visualStyle === "claude" && view === "identifier"'));
});
test("Legacy CSS is imported, new Current UI CSS preserves source order",()=>{
 assert.ok(entry.includes('import "./legacy-ui.css";'));
 assert.ok(!entry.includes('import "./editorial.css";'));
 const styles=["editorial","google-map-polish","sidebar-editorial","kiosk-visual-polish","texas-demo-rules","kiosk-first-refresh"];
 for(let i=1;i<styles.length;i++){
  assert.ok(theme.indexOf("/* --- frontend/src/"+styles[i]+".css --- */") > theme.indexOf("/* --- frontend/src/"+styles[i-1]+".css --- */"));
 }
});
