import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";

const read=name=>readFileSync(new URL("../src/"+name,import.meta.url),"utf8");
const compiled=ts.transpileModule(read("aiSpeechVoices.ts"),{
  compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020}
}).outputText;
const {LANGUAGE_VOICES,selectedVoice}=await import(
  "data:text/javascript;base64,"+Buffer.from(compiled).toString("base64")
);

test("English, Spanish and Hindi selections always map to a playable Gemini voice",()=>{
  for(const language of ["en","es","hi"]){
    assert.ok(LANGUAGE_VOICES[language].length>=2);
    for(const voice of LANGUAGE_VOICES[language]){
      assert.equal(selectedVoice(language,voice.id),voice.id);
    }
    const fallback=selectedVoice(language,"Algieba");
    assert.ok(LANGUAGE_VOICES[language].some(v=>v.id===fallback));
  }
});

test("Test voice is never a dummy: it calls the shared real speech generator",()=>{
  const speech=read("Speech.tsx");
  assert.match(speech,/speak\(testId,language==="es"\?"Hola/);
  assert.match(speech,/language==="hi"\?"नमस्ते/);
  assert.match(speech,/fetch\("\/api\/speech\/generate"/);
  assert.match(speech,/body:JSON\.stringify\(\{text:chunk,voice:activeVoice,language\}\)/);
  assert.match(speech,/response\.arrayBuffer\(\)/);
  assert.match(speech,/decodeAudioData\(bytes\.slice\(0\)\)/);
  assert.match(speech,/source\.start\(\)/);
});

test("shows a pending state and never displays Pause before audio starts",()=>{
  const speech=read("Speech.tsx");
  assert.match(speech,/setLoadingId\(id\)/);
  assert.match(speech,/setLoadingId\(null\)/);
  assert.match(speech,/source\.start\(\);\s*setLoadingId\(null\)/s);
  assert.match(speech,/previewLoading=loadingId===testId/);
  assert.match(speech,/Generating voice…/);
  assert.match(speech,/Preparando el audio con Gemini…/);
  assert.match(speech,/Gemini से ऑडियो तैयार हो रहा है…/);
  assert.match(speech,/activeId===testId&&!previewLoading/);
  assert.match(speech,/active&&!loading/);
});

test("failed requests display an accessible visible error next to Test voice",()=>{
  const speech=read("Speech.tsx");
  assert.match(speech,/setErrorId\(id\);\s*setError\(message\)/s);
  assert.match(speech,/error&&errorId===testId&&<p className="wl-speech-notice" role="alert">/);
  assert.match(speech,/error&&errorId!==testId/);
  assert.match(speech,/signal:state\.abort\.signal/);
});

test("changing voice or language cancels an outdated pending request",()=>{
  const speech=read("Speech.tsx");
  assert.match(speech,/options\.aiVoice,stop\]\)/);
  assert.match(speech,/old\.abort\.abort\(\)/);
  assert.match(speech,/myVersion!==version\.current\|\|cloud\.current!==state/);
});
