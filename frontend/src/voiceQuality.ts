import type { Language } from "./i18n";

/* Safari and other browsers provide voices without reliable quality or gender
   metadata. We can rank names, not promise that a voice sounds human.
   IMPORTANT: Never hide a device's only usable voices. */
type VoiceLike = Pick<SpeechSynthesisVoice,"name"|"voiceURI"|"lang">;
export type VoiceGroup = "female"|"male"|"other";

const qualityHint=/(?:premium|enhanced|neural|natural|siri|wavenet|studio|high[\s-]?quality)/i;
const novelty=/^(?:albert|bad news|bells|boing|bubbles|cellos|deranged|good news|hysterical|junior|kathy|pipe organ|princess|ralph|trinoids|whisper|zarvox|fred|organ|robot|novelty)(?:\b|$)/i;
const lowQuality=/(?:\bcompact\b|\bnovelty\b|\blegacy\b|\brobotic\b)/i;
const female=new Set(["allison","ava","fiona","karen","kate","moira","samantha","serena","susan","tessa","victoria","zoe","veena","lekha","lucia","lucía","monica","mónica","paulina","penelope","marisol","soledad","aria","jenny","emma","olivia","joanna","amy","zira","heera"]);
const male=new Set(["alex","aaron","daniel","evan","nathan","oliver","reed","tom","rishi","jorge","juan","diego","carlos","guy","david","ryan","brian","matthew"]);
function firstName(voice:VoiceLike):string{
  return voice.name.trim().split(/[\s(,-]/)[0].toLowerCase();
}
function isNovelty(voice:VoiceLike):boolean{
  return novelty.test(voice.name.trim())||lowQuality.test(voice.name+" "+voice.voiceURI);
}
function score(voice:VoiceLike):number{
  if(isNovelty(voice))return 0;
  if(qualityHint.test(voice.name+" "+voice.voiceURI))return 3;
  if(female.has(firstName(voice))||male.has(firstName(voice))||/^(?:Google|Microsoft)/i.test(voice.name))return 2;
  return 1; // Unknown voice names are NOT evidence of robotic audio.
}
function matchesLanguage(voice:VoiceLike,language:Language):boolean{
  const code=voice.lang.toLowerCase().replace(/_/g,"-");
  return code===language||code.startsWith(language+"-");
}

/* Prefer quality voices but never restrict to a hard-coded voice-name whitelist.
   If the requested language has no exposed voices, return every installed
   voice as a last-resort choice. If the browser reports none, callers should
   use native default speechSynthesis rather than blocking Listen. */
export function naturalVoices<T extends VoiceLike>(voices:readonly T[],language:Language):T[]{
  const localized=voices.filter(voice=>matchesLanguage(voice,language));
  const candidates=localized.length?localized:[...voices];
  const normal=candidates.filter(voice=>!isNovelty(voice));
  const preferred=normal.length?normal:candidates;
  const seen=new Set<string>();
  return [...preferred].sort((a,b)=>score(b)-score(a)||a.name.localeCompare(b.name))
    .filter(voice=>{
      const key=voice.voiceURI||voice.lang+"|"+voice.name;
      if(seen.has(key))return false;
      seen.add(key);return true;
    });
}
export function voiceGroup(voice:VoiceLike):VoiceGroup{
  const first=firstName(voice);
  if(female.has(first))return "female";
  if(male.has(first))return "male";
  return "other";
}
export function hasLanguageVoice<T extends VoiceLike>(voices:readonly T[],language:Language):boolean {
  return voices.some(voice=>matchesLanguage(voice,language));
}
