import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Ear, Pause, Play, Square, Volume2, VolumeX } from "lucide-react";
import { useLanguage } from "./i18n";
import type { Language } from "./i18n";

export type SpeechCategory = "scan" | "steps" | "chat" | "journey";
type SpeechOptions = {
  enabled: boolean;
  scan: boolean;
  steps: boolean;
  chat: boolean;
  journey: boolean;
  rate: number;
  voiceURI: string;
};
const defaults: SpeechOptions = {enabled:true,scan:true,steps:true,chat:true,journey:true,rate:0.9,voiceURI:""};
const storageKey="wastelens-voice-preferences";
const locales: Record<Language,string>={en:"en-US",es:"es-ES",hi:"hi-IN"};
const categoryNames: Record<SpeechCategory,string>={scan:"Scan results",steps:"Sorting steps",chat:"Chat replies",journey:"Bottle journey"};

function getSaved(): SpeechOptions {
  try {
    const data=JSON.parse(localStorage.getItem(storageKey) || "{}") as Partial<SpeechOptions>;
    const rate=typeof data.rate==="number" && Number.isFinite(data.rate) ? Math.min(1.3,Math.max(0.7,data.rate)) : defaults.rate;
    return {...defaults,...Object.fromEntries(
      (["enabled","scan","steps","chat","journey"] as const).filter(key=>typeof data[key]==="boolean").map(key=>[key,data[key]])
    ),rate,voiceURI:typeof data.voiceURI==="string"?data.voiceURI:""};
  } catch {return defaults;}
}
function splitSpeech(text:string): string[] {
  const words=text.replace(/\s+/g," ").trim().split(" ");
  const chunks:string[]=[];
  let part="";
  for(const word of words){
    if(part && part.length+word.length+1>165){chunks.push(part);part="";}
    part=part?part+" "+word:word;
  }
  if(part)chunks.push(part);
  return chunks;
}
function speechError(error:string, language:Language): string {
  if(error==="language-unavailable")return language==="es"
    ? "No Spanish reading voice is installed. Add one in your device's speech settings."
    :language==="hi"?"No Hindi reading voice is installed. Add one in your device's speech settings."
    :"No English reading voice is installed. Check your device's speech settings.";
  if(error==="not-allowed")return "Your browser blocked speech. Click Listen again or check your browser permissions.";
  if(error==="audio-busy")return "Another app is using speech audio. Try again.";
  return "Speech could not start. Check your sound output and installed voices, then try again.";
}
type ReadingContext = {
  options:SpeechOptions;
  update:(next:Partial<SpeechOptions>)=>void;
  available:boolean;
  voices:SpeechSynthesisVoice[];
  activeId:string|null;
  paused:boolean;
  error:string;
  speak:(id:string,text:string)=>void;
  stop:()=>void;
  togglePause:()=>void;
  dismissError:()=>void;
};
const SpeechContext=createContext<ReadingContext|null>(null);
export function useSpeech():ReadingContext{
  const context=useContext(SpeechContext);
  if(!context)throw new Error("SpeechProvider is missing");
  return context;
}
export function SpeechProvider({children}:{children:ReactNode}){
  const {language}=useLanguage();
  const [options,setOptions]=useState<SpeechOptions>(getSaved);
  const [voices,setVoices]=useState<SpeechSynthesisVoice[]>([]);
  const [activeId,setActiveId]=useState<string|null>(null);
  const [paused,setPaused]=useState(false);
  const [error,setError]=useState("");
  const version=useRef(0);
  const current=useRef<SpeechSynthesisUtterance|null>(null);
  const available=typeof window!=="undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;

  const update=useCallback((next:Partial<SpeechOptions>)=>setOptions(old=>({...old,...next})),[]);
  useEffect(()=>{try{localStorage.setItem(storageKey,JSON.stringify(options));}catch{/* Private browser */}},[options]);
  useEffect(()=>{
    if(!available)return;
    const synth=window.speechSynthesis;
    const refresh=()=>setVoices(synth.getVoices());
    refresh();
    synth.addEventListener("voiceschanged",refresh);
    return ()=>synth.removeEventListener("voiceschanged",refresh);
  },[available]);

  const stop=useCallback(()=>{
    version.current+=1;
    if(available)window.speechSynthesis.cancel();
    current.current=null;setActiveId(null);setPaused(false);
  },[available]);

  // Never continue reading old content in a different language or after audio is disabled.
  useEffect(()=>{stop();setError("");},[language,options.enabled,stop]);
  useEffect(()=>()=>{version.current+=1;if(available)window.speechSynthesis.cancel();},[available]);

  const speak=useCallback((id:string,source:string)=>{
    if(!options.enabled||!available){
      setError(!options.enabled?"Enable read aloud in Accessibility settings.":"This browser does not support text-to-speech.");
      return;
    }
    const text=source.replace(/[*#_`]/g," ").replace(/\s+/g," ").trim();
    if(!text)return;
    // Refresh after an explicit click. Chrome can populate voices after the first getVoices call.
    const browserVoices=window.speechSynthesis.getVoices();
    const matching=browserVoices.filter(voice=>voice.lang.toLowerCase().startsWith(language+"-")||voice.lang.toLowerCase()===language);
    const preferred=matching.find(voice=>voice.voiceURI===options.voiceURI);
    const voice=preferred??matching.find(voice=>voice.lang.toLowerCase()===locales[language].toLowerCase())??matching[0];
    if(!voice && language!=="en"){
      stop();setError(speechError("language-unavailable",language));return;
    }
    stop();setError("");
    const myVersion=version.current;
    const chunks=splitSpeech(text);
    let index=0;
    const next=()=>{
      if(myVersion!==version.current)return;
      if(index>=chunks.length){setActiveId(null);current.current=null;setPaused(false);return;}
      const utterance=new SpeechSynthesisUtterance(chunks[index++]);
      current.current=utterance;
      utterance.lang=voice?.lang??locales[language];
      if(voice)utterance.voice=voice;
      utterance.rate=options.rate;
      utterance.pitch=1;
      utterance.onstart=()=>{if(version.current===myVersion){setActiveId(id);setPaused(false);}};
      utterance.onend=()=>{if(version.current===myVersion)next();};
      utterance.onerror=event=>{
        if(myVersion!==version.current||event.error==="canceled"||event.error==="interrupted")return;
        setError(speechError(event.error,language));
        stop();
      };
      try{window.speechSynthesis.speak(utterance);}
      catch{setError("Speech could not start in this browser.");stop();}
    };
    setActiveId(id);
    next();
  },[available,language,options.enabled,options.rate,options.voiceURI,stop]);

  const togglePause=useCallback(()=>{
    if(!available||!activeId)return;
    const synth=window.speechSynthesis;
    if(synth.paused){synth.resume();setPaused(false);}
    else{synth.pause();setPaused(true);}
  },[activeId,available]);

  return <SpeechContext.Provider value={{
    options,update,available,voices,activeId,paused,error,speak,stop,togglePause,dismissError:()=>setError("")
  }}>{children}</SpeechContext.Provider>;
}

export function ReadAloudButton({id,text,category,className=""}:{
  id:string;text:string;category:SpeechCategory;className?:string;
}){
  const {t}=useLanguage();
  const {options,available,activeId,paused,speak,stop,togglePause,error}=useSpeech();
  useEffect(()=>()=>{if(activeId===id)stop();},[id,activeId,stop]);
  if(!options.enabled||!options[category])return null;
  const active=activeId===id;
  return <div className={"wl-listen-wrap "+className}>
    <button type="button" className={"wl-listen-button "+(active?"is-speaking":"")}
      disabled={!available||!text.trim()} aria-pressed={active}
      title={!available?t("Speech is not available in this browser"):undefined}
      onClick={()=>active?stop():speak(id,text)}>
      {active?<Square size={15}/>:<Volume2 size={16}/>}
      {t(active?"Stop reading":"Listen")}
    </button>
    {active && <button type="button" className="wl-listen-pause" onClick={togglePause}
      aria-label={t(paused?"Resume reading":"Pause reading")}
      title={t(paused?"Resume reading":"Pause reading")}>
      {paused?<Play size={15}/>:<Pause size={15}/>}
    </button>}
    {error && <span className="wl-listen-error" role="alert">{error}</span>}
  </div>;
}

export function SpeechSettingsPanel(){
  const {language,t}=useLanguage();
  const {options,update,available,voices,activeId,paused,error,speak,stop,togglePause,dismissError}=useSpeech();
  const matching=voices.filter(voice=>voice.lang.toLowerCase().startsWith(language+"-")||voice.lang.toLowerCase()===language);
  const testId="voice-settings-preview";
  return <div className="wl-accessibility-settings">
    <div className="wl-speech-head"><Ear size={18}/><strong>{t("Read aloud")}</strong></div>
    <label className="wl-speech-toggle">
      <input type="checkbox" checked={options.enabled} onChange={e=>update({enabled:e.target.checked})}/>
      <span>{t("Show listening buttons")}</span>
    </label>
    {options.enabled && <>
      <div className="wl-voice-categories">
        {(["scan","steps","chat","journey"] as SpeechCategory[]).map(category=>
          <label key={category} className="wl-speech-toggle">
            <input type="checkbox" checked={options[category]}
              onChange={e=>update({[category]:e.target.checked})}/>
            <span>{t(categoryNames[category])}</span>
          </label>)}
      </div>
      <label className="wl-speech-field" htmlFor="wl-speech-speed">
        {t("Reading speed")} <strong>{options.rate.toFixed(1)}×</strong>
      </label>
      <input id="wl-speech-speed" className="wl-speech-rate" type="range" min="0.7" max="1.3" step="0.1"
        value={options.rate} onChange={e=>update({rate:Number(e.target.value)})}/>
      <label className="wl-speech-field" htmlFor="wl-speech-voice">{t("Voice")}</label>
      <select id="wl-speech-voice" className="wl-speech-select"
        disabled={!available||matching.length===0} value={matching.some(v=>v.voiceURI===options.voiceURI)?options.voiceURI:""}
        onChange={e=>update({voiceURI:e.target.value})}>
        <option value="">{t("Automatic voice")}</option>
        {matching.map(voice=><option key={voice.voiceURI} value={voice.voiceURI}>{voice.name} ({voice.lang})</option>)}
      </select>
      <div className="wl-speech-preview">
        <button type="button" disabled={!available}
          onClick={()=>{
            if(activeId===testId){stop();return;}
            dismissError();
            speak(testId,language==="es"?"Hola. Esta es la voz de WasteLens.":language==="hi"?"नमस्ते। यह WasteLens की पढ़ने की आवाज़ है।":"Hello. This is the WasteLens reading voice.");
          }}>
          {activeId===testId?<VolumeX size={16}/>:<Volume2 size={16}/>}
          {t(activeId===testId?"Stop reading":"Test voice")}
        </button>
        {activeId===testId&&<button type="button" onClick={togglePause}>{t(paused?"Resume":"Pause")}</button>}
      </div>
    </>}
    {!available && <p className="wl-speech-notice" role="status">{t("Speech is not available in this browser")}</p>}
    {available&&matching.length===0&&<p className="wl-speech-notice" role="status">
      {language==="en"?t("Your device will try its default voice."):
      language==="es"?"No hay una voz en español instalada. Instálala en los ajustes de voz de tu dispositivo.":
      "इस डिवाइस पर हिंदी आवाज़ नहीं है। बोलने की सेटिंग में हिंदी आवाज़ जोड़ें।"}
    </p>}
    {error&&<p className="wl-speech-notice" role="alert">{error}</p>}
    <p className="wl-speech-hint">{t("Audio plays only when you choose Listen. Voice availability depends on your device and browser.")}</p>
  </div>;
}
