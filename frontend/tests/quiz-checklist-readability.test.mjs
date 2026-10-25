import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const src = name => readFileSync(new URL("../src/"+name,import.meta.url),"utf8");
const styles = readFileSync(new URL("../public/kiosk-type-system.css",import.meta.url),"utf8");
const doc = src("DocumentaryStory.tsx");
const quiz = src("BottleJourney.tsx");
const app = src("App.tsx");

test("Checklist retains its four real interactive pledges while aligning inputs and labels",()=>{
  assert.match(doc,/className="documentary-action"/);
  assert.match(doc,/type="checkbox" checked=\{pledged\.includes\(item\.key\)\}/);
  assert.match(doc,/onChange=\{e=>setPledged/);
  assert.match(styles,/\.documentary-final \.documentary-action \{/);
  assert.match(styles,/grid-template-columns:42px minmax\(0,1fr\)/);
  assert.match(styles,/align-items:center!important/);
  assert.match(styles,/\.documentary-action input\[type="checkbox"\]:checked::after/);
  assert.match(styles,/\.documentary-action input\[type="checkbox"\]:focus-visible/);
  assert.match(styles,/\.documentary-quiz-link \{/);
  assert.match(styles,/font-size:clamp\(20px,1\.55vw,25px\)!important/);
  assert.match(doc,/href="#bottle-quiz"/);
});
test("Quiz questions use a stable numbered grid inside a semantic legend",()=>{
  assert.match(quiz,/<fieldset key=\{q\.id\} className="journey-question"/);
  assert.match(quiz,/<legend><span className="journey-question-prompt">/);
  assert.match(quiz,/className="journey-question-number"/);
  assert.match(quiz,/className="journey-question-text"/);
  assert.match(styles,/\.journey-question legend > \.journey-question-prompt/);
  assert.match(styles,/grid-template-columns:58px minmax\(0,1fr\)/);
  assert.match(styles,/\.journey-question \.journey-question-number \{/);
  assert.match(styles,/aspect-ratio:1!important/);
  assert.match(quiz,/type="radio" name=\{q\.id\}/);
  assert.match(quiz,/fetch\("\/api\/deposit\/quiz\/submit"/);
  assert.match(quiz,/onUnlock\(data\.unlocked_badge/);
});
test("Warm quiz surfaces have matching accessible text and background in all themes",()=>{
  assert.match(styles,/\.journey-page \.journey-quiz \{/);
  assert.match(styles,/color-scheme:light!important/);
  assert.match(styles,/background:radial-gradient\(circle at 50% 0,#ffdf99/);
  assert.match(styles,/\.journey-page \.journey-quiz>h2 \{/);
  assert.match(styles,/color:#173e34!important;-webkit-text-fill-color:#173e34!important/);
  assert.match(styles,/\.journey-page \.journey-quiz-card \{/);
  assert.match(styles,/background:#fffdf7!important/);
  assert.match(styles,/\.journey-question \.journey-question-text \{/);
  assert.match(styles,/\.journey-choice>span \{/);
  assert.match(styles,/\.journey-choice input\[type="radio"\]/);
  assert.match(app,/kiosk-type-system\.css\?v=20261024-2/);
});
test("Immersive scene and quiz functionality stay present",()=>{
  const scan=src("scan/ScanStage.tsx");
  assert.match(scan,/className="es-canvas"/);
  assert.match(doc,/className="documentary-final"/);
  assert.match(quiz,/onClick=\{\(\)=>void submit\(\)\}/);
  assert.match(quiz,/onClick=\{retry\}/);
});
