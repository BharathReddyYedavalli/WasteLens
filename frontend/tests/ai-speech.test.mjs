import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";

const src=name=>readFileSync(new URL("../src/"+name,import.meta.url),"utf8");
const compiled=ts.transpileModule(src("aiSpeechVoices.ts"),{
  compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020}
}).outputText;
const {AI_VOICES,LANGUAGE_VOICES,selectedVoice}=await import("data:text/javascript;base64,"+
  Buffer.from(compiled).toString("base64"));

test("all eight existing Gemini male/female voices remain selectable",()=>{
  assert.equal(AI_VOICES.length,8);
  assert.equal(AI_VOICES.filter(v=>v.gender==="female").length,4);
  assert.equal(AI_VOICES.filter(v=>v.gender==="male").length,4);
  assert.equal(new Set(AI_VOICES.map(v=>v.id)).size,8);
});

test("Gemini is the only speech engine and is always the default",()=>{
  const code=src("Speech.tsx");
  assert.match(code,/const defaults:SpeechOptions=\{[\s\S]*?aiVoice:"Aoede"/);
  assert.match(code,/Ignore obsolete saved "device" engine and voiceURI values/);
  assert.match(code,/aiVoice:AI_VOICES\.find\(v=>v\.id===data\.aiVoice\)\?\.id\?\?defaults\.aiVoice/);
  assert.doesNotMatch(code,/<select id="wl-speech-engine"/);
  assert.doesNotMatch(code,/Device voices \(offline\)|System default|speechSynthesis|SpeechSynthesisUtterance|naturalVoices|\bvoiceURI\s*:/);
  assert.match(code,/<select id="wl-speech-voice"/);
  assert.match(code,/availableVoices\.filter\(v=>v\.gender==="female"\)/);
  assert.match(code,/availableVoices\.filter\(v=>v\.gender==="male"\)/);
});

test("Gemini request is user-initiated and API key stays on the backend",()=>{
  const code=src("Speech.tsx");
  assert.match(code,/onClick=\{\(\)=>active\?stop\(\):speak\(id,text\)\}/);
  assert.match(code,/onClick=\{\(\)=>\{[\s\S]*?speak\(testId,/);
  assert.match(code,/fetch\("\/api\/speech\/generate"/);
  assert.match(code,/"X-WasteLens-Request":"1"/);
  assert.match(code,/voice:activeVoice,language/);
  assert.doesNotMatch(code,/GEMINI_API_KEY|AIza[0-9A-Za-z_-]+/);
  // The user specifically requested removing the quota paragraph from the voice settings.
  assert.doesNotMatch(code,/When you press Listen or Test voice, text is sent/);
});

test("Safari AI audio playback is unlocked on click and cancellable",()=>{
  const code=src("Speech.tsx");
  assert.match(code,/const ctx=new AudioContext\(\)/);
  assert.match(code,/ctx\.resume\(\)/);
  assert.match(code,/ctx\.decodeAudioData\(bytes\.slice\(0\)\)/);
  assert.match(code,/old\.abort\.abort\(\)/);
  assert.match(code,/source\.onended=\(\)=>/);
  assert.match(code,/context\.suspend\(\)/);
  assert.match(code,/context\.resume\(\)/);
  assert.match(code,/old\.context\.close\(\)/);
  assert.match(code,/setError\(message\)/);
  assert.match(code,/role="alert"/);
});

test("original read-aloud preferences, categories and controls remain",()=>{
  const code=src("Speech.tsx");
  assert.match(code,/const storageKey="wastelens-voice-preferences"/);
  assert.match(code,/read.*aloud/i);
  assert.match(code,/options\.rate\.toFixed\(1\)/);
  assert.match(code,/Pause reading/);
  assert.match(code,/Resume reading/);
  assert.match(code,/options\[category\]/);
  for(const name of ["scan","steps","chat","journey"])
    assert.ok(code.includes(name),name);
});

test("Spanish and Hindi each show one male and one female voice",()=>{
  for(const language of ["es","hi"]){
    assert.equal(LANGUAGE_VOICES[language].length,2);
    assert.equal(LANGUAGE_VOICES[language].filter(v=>v.gender==="female").length,1);
    assert.equal(LANGUAGE_VOICES[language].filter(v=>v.gender==="male").length,1);
    assert.ok(LANGUAGE_VOICES[language].some(v=>v.id===selectedVoice(language,"Aoede")));
  }
  assert.equal(LANGUAGE_VOICES.en.length,8);
  assert.equal(selectedVoice("hi","Aoede"),"Kore");
  assert.equal(selectedVoice("es","Kore"),"Aoede");
});
