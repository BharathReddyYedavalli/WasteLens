import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";

const src=name=>readFileSync(new URL("../src/"+name,import.meta.url),"utf8");
const compiled=ts.transpileModule(src("aiSpeechVoices.ts"),{
  compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020}
}).outputText;
const {AI_VOICES}=await import("data:text/javascript;base64,"+
  Buffer.from(compiled).toString("base64"));

test("Gemini studio voices provide curated female and male options",()=>{
  assert.equal(AI_VOICES.length,8);
  assert.equal(AI_VOICES.filter(v=>v.gender==="female").length,4);
  assert.equal(AI_VOICES.filter(v=>v.gender==="male").length,4);
  assert.equal(new Set(AI_VOICES.map(v=>v.id)).size,8);
});

test("Natural AI voice playback is opt-in and uses server side key only",()=>{
  const code=src("Speech.tsx");
  assert.match(code,/engine:"device",aiVoice:"Aoede"/);
  assert.match(code,/Natural AI voices \(Gemini\)/);
  assert.match(code,/options\.engine==="ai"/);
  assert.match(code,/fetch\("\/api\/speech\/generate"/);
  assert.match(code,/"X-WasteLens-Request":"1"/);
  assert.match(code,/voice:options\.aiVoice,language/);
  assert.doesNotMatch(code,/GEMINI_API_KEY|AIza[0-9A-Za-z_-]+/);
});

test("Safari cloud audio playback is unlocked on click and cancellable",()=>{
  const code=src("Speech.tsx");
  assert.match(code,/const ctx=new AudioContext\(\)/);
  assert.match(code,/ctx\.resume\(\)/);
  assert.match(code,/ctx\.decodeAudioData\(bytes\)/);
  assert.match(code,/state\.abort\.abort\(\)/); // old.abort happens through stop
  assert.match(code,/source\.onended=\(\)=>/);
  assert.match(code,/void context\.suspend\(\)/);
  assert.match(code,/void context\.resume\(\)/);
  assert.match(code,/old\.abort\.abort\(\)/);
  assert.match(code,/old\.context\.close\(\)/);
});

test("Existing device voices stay selectable with no changes to feature components",()=>{
  const code=src("Speech.tsx");
  assert.match(code,/naturalVoices\(voices,language\)/);
  assert.match(code,/voiceGroup\(voice\)/);
  assert.match(code,/onChange=\{e=>update\(\{voiceURI:e\.target\.value\}\)\}/);
  assert.match(code,/const synth=window\.speechSynthesis/);
  assert.match(code,/You choose Listen|when you press Listen/i);
});
