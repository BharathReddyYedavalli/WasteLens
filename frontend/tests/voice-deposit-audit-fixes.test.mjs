import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=name=>readFileSync(new URL("../src/"+name,import.meta.url),"utf8");

test("accessibility keeps eight Gemini options but removes requested warning",()=>{
  const speech=read("Speech.tsx");
  assert.match(speech,/availableVoices\.filter\(v=>v\.gender==="female"\)/);
  assert.match(speech,/availableVoices\.filter\(v=>v\.gender==="male"\)/);
  assert.doesNotMatch(speech,/When you press Listen or Test voice, text is sent/);
  assert.doesNotMatch(speech,/Solo al pulsar Escuchar o Probar voz, enviamos/);
  assert.doesNotMatch(speech,/Listen या Test voice दबाने पर ही ऑडियो/);
  assert.match(speech,/onClick=\{\(\)=>\{[\s\S]*?speak\(testId,/);
});

test("repeated listening caches short clips in memory and avoids another Gemini call",()=>{
  const speech=read("Speech.tsx");
  assert.match(speech,/audioCache=useRef<Map<string,ArrayBuffer>>\(new Map\(\)\)/);
  assert.match(speech,/const cacheKey=JSON\.stringify\(\[activeVoice,language,chunk\]\)/);
  assert.match(speech,/let bytes=audioCache\.current\.get\(cacheKey\)/);
  assert.match(speech,/if\(!bytes\)\{\s*const response=await fetch\("\/api\/speech\/generate"/s);
  assert.match(speech,/cache\.set\(cacheKey,bytes\)/);
  assert.match(speech,/while\(cache\.size>8\)/);
  assert.match(speech,/audioCache\.current\.clear\(\)/);
  assert.match(speech,/splitSpeech\(text,580\)/);
  assert.match(speech,/decodeAudioData\(bytes\.slice\(0\)\)/);
  assert.match(speech,/signal:state\.abort\.signal/);
  assert.doesNotMatch(speech,/localStorage\.setItem\([^)]*audioCache/);
});

test("Bottle Returns visibly recalculates for changed size",()=>{
  const bottle=read("BottleReturns.tsx");
  assert.match(bottle,/setResult\(null\);\s*setError\(""\)/);
  assert.match(bottle,/window\.setTimeout\(\(\)=>\{\s*fetch\("\/api\/deposit\/calculate"/s);
  assert.match(bottle,/body:JSON\.stringify\(\{state,drink,material,ounces:size,count:amount,paid_in_state:paid,resin\}\)/);
  assert.match(bottle,/setResult\(\{\.\.\.data,ounces:size\}\)/);
  assert.match(bottle,/return \(\)=>\{window\.clearTimeout\(timer\);ctrl\.abort\(\);\}/);
  assert.match(bottle,/Calculated for \$\{result\.ounces\} fl oz per container/);
  assert.match(bottle,/California: under 24 fl oz = 5¢; 24 fl oz or more = 10¢/);
  assert.match(bottle,/calculating\?"…":"\?"/);
  assert.match(bottle,/value=\{ounces\}/);
});

test("requested Waste Audit About these numbers disclosure is gone",()=>{
  const audit=read("AuditKit.tsx");
  assert.doesNotMatch(audit,/About these numbers/);
  assert.doesNotMatch(audit,/Only the audit name and counts go to Gemini when you ask/);
  assert.match(audit,/Saved audits/);
  assert.match(audit,/ReadAloudButton/);
});
