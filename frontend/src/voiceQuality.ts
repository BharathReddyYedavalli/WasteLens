import type { Language } from "./i18n";

/* Browser speech voices do not expose quality scores or gender metadata.
   This is a conservative, name-based shortlist, never a quality guarantee.
   Only voices actually reported by speechSynthesis.getVoices() can appear. */
type VoiceLike = Pick<SpeechSynthesisVoice, "name"|"voiceURI"|"lang">;
export type VoiceGroup = "female"|"male"|"other";

const expressive = /(?:premium|enhanced|neural|natural|siri|wavenet|studio|high[\s-]?quality)/i;
const novelty = /^(?:albert|bad news|bells|boing|bubbles|cellos|deranged|good news|hysterical|junior|kathy|pipe organ|princess|ralph|trinoids|whisper|zarvox|fred|organ|robot|novelty)(?:\b|$)/i;
const lowQuality = /(?:\bcompact\b|\bnovelty\b|\blegacy\b|\brobotic\b)/i;
/* Common conventional voices; available voice identity and sound quality vary
   by Mac/version. Prefer the truly Premium/Enhanced voices above these. */
const conventional = new Set([
  "alex","aaron","allison","ava","daniel","evan","fiona","karen",
  "kate","moira","nathan","oliver","reed","samantha","serena",
  "susan","tessa","tom","victoria","zoe","rishi","veena","lekha",
  "jorge","juan","diego","lucia","lucía","monica","mónica",
  "paulina","penelope","marisol","carlos","soledad",
  "aria","jenny","guy","david","ryan","emma","olivia",
  "joanna","amy","brian","matthew","zira","heera"
]);

const female = new Set([
  "allison","ava","fiona","karen","kate","moira","samantha","serena",
  "susan","tessa","victoria","zoe","veena","lekha","lucia","lucía",
  "monica","mónica","paulina","penelope","marisol","soledad",
  "aria","jenny","emma","olivia","joanna","amy","zira","heera"
]);
const male = new Set([
  "alex","aaron","daniel","evan","nathan","oliver","reed","tom",
  "rishi","jorge","juan","diego","carlos","guy","david","ryan",
  "brian","matthew"
]);

function firstName(voice:VoiceLike):string {
  return voice.name.trim().split(/[\s(,-]/)[0].toLocaleLowerCase();
}
function soundsNatural(voice:VoiceLike):number {
  const name=voice.name.trim();
  const detail=name+" "+voice.voiceURI;
  if(novelty.test(name)||lowQuality.test(detail))return 0;
  if(expressive.test(detail))return 3;
  if(/^(?:Google (?:US|UK|Australian|Indian) English|Microsoft .* Online)/i.test(name))return 2;
  return conventional.has(firstName(voice))?1:0;
}
function matchesLanguage(voice:VoiceLike,language:Language):boolean {
  const code=voice.lang.toLowerCase().replace("_","-");
  return code===language||code.startsWith(language+"-");
}

/* If a device has enhanced/premium/neural voices, avoid the inferior standard
   voices entirely. Otherwise present only the small conventional shortlist. */
export function naturalVoices<T extends VoiceLike>(voices:readonly T[],language:Language):T[] {
  const candidates=voices
    .filter(voice=>matchesLanguage(voice,language))
    .map(voice=>({voice,score:soundsNatural(voice)}))
    .filter(entry=>entry.score>0);
  const highest=Math.max(0,...candidates.map(entry=>entry.score));
  const threshold=highest>=2?2:1;
  const seen=new Set<string>();
  return candidates.filter(entry=>entry.score>=threshold)
    .sort((a,b)=>b.score-a.score||a.voice.name.localeCompare(b.voice.name))
    .map(entry=>entry.voice)
    .filter(voice=>{
      if(seen.has(voice.voiceURI))return false;
      seen.add(voice.voiceURI);return true;
    });
}

/* Descriptive group labels are based only on established voice identities.
   The Web Speech API itself supplies no gender attribute. */
export function voiceGroup(voice:VoiceLike):VoiceGroup {
  const name=firstName(voice);
  if(female.has(name))return "female";
  if(male.has(name))return "male";
  return "other";
}
