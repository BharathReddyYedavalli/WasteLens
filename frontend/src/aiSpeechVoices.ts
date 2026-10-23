/* Gemini studio voices are multilingual (English, Hindi, Spanish).
   Named language profiles reuse supported studio IDs with a smaller,
   easy-to-choose female/male list. Quality/accent must be checked by listening. */
export const AI_VOICES = [
  {id:"Kore",gender:"female",style:"Firm"},
  {id:"Aoede",gender:"female",style:"Breezy"},
  {id:"Sulafat",gender:"female",style:"Warm"},
  {id:"Zephyr",gender:"female",style:"Bright"},
  {id:"Puck",gender:"male",style:"Upbeat"},
  {id:"Charon",gender:"male",style:"Informative"},
  {id:"Achird",gender:"male",style:"Friendly"},
  {id:"Algieba",gender:"male",style:"Smooth"}
] as const;
export type AiVoiceName = typeof AI_VOICES[number]["id"];
export type SpeechLanguage = "en"|"es"|"hi";

const spanish=new Set<AiVoiceName>(["Aoede","Charon"]);
const hindi=new Set<AiVoiceName>(["Kore","Puck"]);
export const LANGUAGE_VOICES:Record<SpeechLanguage,readonly typeof AI_VOICES[number][]> = {
  en:AI_VOICES,
  es:AI_VOICES.filter(v=>spanish.has(v.id)),
  hi:AI_VOICES.filter(v=>hindi.has(v.id))
};
export const LANGUAGE_DEFAULTS:Record<SpeechLanguage,AiVoiceName>={
  en:"Aoede",es:"Aoede",hi:"Kore"
};
export function selectedVoice(language:SpeechLanguage,preferred:AiVoiceName):AiVoiceName{
  return LANGUAGE_VOICES[language].some(v=>v.id===preferred)
    ?preferred:LANGUAGE_DEFAULTS[language];
}
