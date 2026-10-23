import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";

const src=name=>readFileSync(new URL("../src/"+name,import.meta.url),"utf8");
/* Execute the real TypeScript voice filter under Node, not a copied algorithm. */
const compiled=ts.transpileModule(src("voiceQuality.ts"),{
  compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020}
}).outputText;
const {naturalVoices,voiceGroup,hasLanguageVoice}=await import(
  "data:text/javascript;base64,"+Buffer.from(compiled).toString("base64")
);
const voice=(name,lang="en-US",uri=name)=>({name,lang,voiceURI:uri});

test("prioritizes installed premium/enhanced male and female voices",()=>{
  const available=[
    voice("Fred"),voice("Trinoids"),voice("Samantha"),voice("Alex"),
    voice("Ava (Premium)"),voice("Daniel (Enhanced)"),
    voice("Google US English"),voice("Lucia (Premium)","es-ES")
  ];
  const list=naturalVoices(available,"en");
  assert.deepEqual(list.map(v=>v.name),["Ava (Premium)","Daniel (Enhanced)","Alex","Google US English","Samantha"]);
  assert.equal(voiceGroup(list[0]),"female");
  assert.equal(voiceGroup(list[1]),"male");
  assert.equal(voiceGroup(list[3]),"other");
});

test("falls back to a short conventional list if no premium voice installed",()=>{
  const list=naturalVoices([
    voice("Boing"),voice("Zarvox"),voice("Compact Voice"),
    voice("Alex"),voice("Samantha"),voice("Unknown Legacy"),
  ],"en");
  assert.deepEqual(list.map(v=>v.name),["Alex","Samantha"]);
});

test("never invents voice options and respects selected language",()=>{
  const list=naturalVoices([
    voice("Jorge","es-MX"),voice("Monica (Enhanced)","es-ES"),
    voice("Lekha","hi-IN"),voice("Ava (Premium)","en-US")
  ],"es");
  assert.deepEqual(list.map(v=>v.name),["Monica (Enhanced)","Jorge"]);
  assert.deepEqual(naturalVoices([voice("Lekha","hi_IN")],"hi").map(v=>v.name),["Lekha"]);
  assert.deepEqual(naturalVoices([voice("Robot")],"hi"),[]);
});

test("excludes novelty voices even when their URI suggests enhanced",()=>{
  const list=naturalVoices([
    voice("Bubbles (Enhanced)","en-US","com.apple.voice.bubbles.enhanced"),
    voice("Whisper","en-US","com.apple.voice.whisper.premium"),
    voice("Neural Example","en-US","example.neural")
  ],"en");
  assert.deepEqual(list.map(v=>v.name),["Neural Example"]);
  assert.equal(voiceGroup(list[0]),"other");
});

test("deduplicates URI and uses the same shortlist in speech and dropdown",()=>{
  const list=naturalVoices([
    voice("Ava (Premium)","en-US","ava-123"),
    voice("Ava (Premium)","en-US","ava-123")
  ],"en");
  assert.equal(list.length,1);
  const speech=src("Speech.tsx");
  assert.equal((speech.match(/naturalVoices\(/g)||[]).length,2);
  assert.match(speech,/matching\.filter\(voice=>voiceGroup\(voice\)===group\.id\)/);
  assert.match(speech,/<optgroup key=\{group\.id\}/);
  assert.match(speech,/<option value="">\{language==="es"/);
  assert.match(speech,/disabled=\{!available\}/);
  assert.doesNotMatch(speech,/disabled=\{!available\|\|matching\.length===0\}/);
  assert.match(speech,/speechSynthesis\.getVoices\(\)/);
  assert.match(speech,/Test voice/);
});

test("unknown and generic Safari voices remain available instead of empty dropdown",()=>{
  const list=naturalVoices([
    voice("Eddy","en-US","com.apple.speech.synthesis.voice.eddy"),
    voice("Flo","en-US","com.apple.voice.flo"),
    voice("Novel Mac Voice","en_US","com.apple.speech.synthesis.voice.novel")
  ],"en");
  assert.equal(list.length,3);
  assert.deepEqual(list.map(v=>v.name),["Eddy","Flo","Novel Mac Voice"]);
  assert.ok(hasLanguageVoice(list,"en"));
});

test("never empties a nonempty language-appropriate voice set",()=>{
  assert.deepEqual(naturalVoices([voice("Fred")],"en").map(v=>v.name),["Fred"]);
  assert.deepEqual(naturalVoices([voice("Zarvox")],"en").map(v=>v.name),["Zarvox"]);
  assert.deepEqual(naturalVoices([voice("Eddy","fr-FR")],"en").map(v=>v.name),["Eddy"]);
  assert.deepEqual(naturalVoices([],"en"),[]);
  assert.equal(hasLanguageVoice([voice("Eddy","fr-FR")],"en"),false);
});

test("browser default speech works even if Safari has not exposed voices",()=>{
  const speech=src("Speech.tsx");
  assert.match(speech,/const voice=preferred\?\?localVoice/);
  assert.match(speech,/if\(voice\)utterance\.voice=voice/);
  assert.match(speech,/utterance\.lang=voice\?\.lang\?\?locales\[language\]/);
  assert.match(speech,/const retries=\[250,1000,2500\]/);
  assert.match(speech,/window\.addEventListener\("focus",refresh\)/);
  assert.match(speech,/document\.addEventListener\("visibilitychange",refresh\)/);
  assert.doesNotMatch(speech,/No suitable English voice is available/);
  assert.match(speech,/System default/);
});
