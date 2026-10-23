import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const get=name=>readFileSync(new URL("../src/"+name,import.meta.url),"utf8");
const app=get("App.tsx"),account=get("AccountArea.tsx"),snapshot=get("HabitSnapshot.tsx");
const styles=get("my-activity.css"),entry=get("main.tsx"),strings=get("i18n.tsx");
test("My Activity is the signed-in personal page and keeps Scan and Audit paths",()=>{
  assert.match(account,/mode === "history"/);
  assert.match(account,/t\("My activity"\)/);
  assert.match(account,/onScan: \(\) => void/);
  assert.match(account,/onAudit: \(\) => void/);
  assert.match(app,/onScan=\{\(\) => openPage\("identifier"\)\}/);
  assert.match(app,/onAudit=\{\(\) => openPage\("audit"\)\}/);
});
test("saved scan history stays accessible but begins with six concise cards",()=>{
  assert.match(account,/showAllScans\?scans:scans\.slice\(0,6\)/);
  assert.match(account,/scans\.length>6/);
  assert.match(account,/showAllScans\?"Show fewer scans":"Show all saved scans"/);
  assert.match(account,/scan\.analysis\.disposal_steps\.map/);
  assert.match(account,/scan\.analysis\.reuse_ideas\.map/);
  assert.match(account,/scan\.feedback/);
  assert.match(account,/scan\.correction/);
});
test("personal stats distinguish all-time scans, seven-day user-logged actions, and XP",()=>{
  assert.match(snapshot,/fetch\("\/api\/habits"/);
  assert.match(snapshot,/fetch\("\/api\/leaderboard"/);
  assert.match(snapshot,/data\.total_scans/);
  assert.match(snapshot,/data\.seven_day_actions/);
  assert.match(snapshot,/progress\?\.xp/);
  assert.match(snapshot,/verified_impact:false/);
  assert.match(snapshot,/A scan is an identification attempt, not proof/);
  assert.doesNotMatch(snapshot,/carbon_kg|carbon saved|CO₂ saved|estimated emissions/i);
});
test("weekly activity chart and export remain data-driven and accessible",()=>{
  assert.match(snapshot,/data\.days\.map/);
  assert.match(snapshot,/role="list"/);
  assert.match(snapshot,/dateTime=\{day\.day\}/);
  assert.match(snapshot,/activity-bar-scans/);
  assert.match(snapshot,/activity-bar-actions/);
  assert.match(snapshot,/exportCSV/);
  assert.match(snapshot,/a\.download="wastelens-activity\.csv"/);
});
test("badges are earned badges and progress is real, not based on the visible scan cards",()=>{
  assert.match(snapshot,/progress\?\.badges\.filter\(b=>b\.unlocked\)/);
  assert.match(snapshot,/aria-valuenow=\{progress\.level_progress\}/);
  assert.match(snapshot,/progress\.level_goal-progress\.level_progress/);
  assert.match(snapshot,/userId:number/);
  assert.match(account,/<HabitSnapshot userId=\{user\.id\}\/>/);
});
test("style is contained, responsive, themed, and labels are translated",()=>{
  assert.ok(entry.indexOf('import "./my-activity.css";')>entry.indexOf('import "./guided-audit.css";'));
  assert.match(styles,/@media\(max-width:600px\)/);
  assert.match(styles,/:root\[data-wl-theme\]:not\(\[data-wl-theme="light"\]\)/);
  for(const k of ["Your activity summary","Actions you logged","Recent scans",
    "AI-suggested next step","Self-reported actions","Show all saved scans"])
    assert.ok(strings.includes(JSON.stringify(k)+":"),k);
});
