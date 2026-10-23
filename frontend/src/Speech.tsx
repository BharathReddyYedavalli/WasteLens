import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Ear, Pause, Play, Square, Volume2, VolumeX } from "lucide-react";
import { useLanguage } from "./i18n";
import type { Language } from "./i18n";
import { naturalVoices, voiceGroup, hasLanguageVoice } from "./voiceQuality";
import { AI_VOICES, type AiVoiceName } from "./aiSpeechVoices";

export type SpeechCategory = "scan" | "steps" | "chat" | "journey";
type SpeechOptions = {
  enabled: boolean;
  scan: boolean;
  steps: boolean;
  chat: boolean;
  journey: boolean;
  rate: number;
  voiceURI: string;
  engine: "device" | "ai";
  aiVoice: AiVoiceName;
};
const defaults: SpeechOptions = {enabled:true,scan:true,steps:true,chat:true,journey:true,rate:0.9,voiceURI:"",engine:"device",aiVoice:"Aoede"};
const storageKey="wastelens-voice-preferences";
const locales: Record<Language,string>={en:"en-US",es:"es-ES",hi:"hi-IN"};
const categoryNames: Record<SpeechCategory,string>={scan:"Scan results",steps:"Sorting steps",chat:"Chat replies",journey:"Bottle journey"};

function getSaved(): SpeechOptions {
  try {
    const data=JSON.parse(localStorage.getItem(storageKey) || "{}") as Partial<SpeechOptions>;
    const rate=typeof data.rate==="number" && Number.isFinite(data.rate) ? Math.min(1.3,Math.max(0.7,data.rate)) : defaults.rate;
    return {...defaults,...Object.fromEntries(
      (["enabled","scan","steps","chat","journey"] as const).filter(key=>typeof data[key]==="boolean").map(key=>[key,data[key]])
    ),rate,voiceURI:typeof data.voiceURI==="string"?data.voiceURI:"",engine:data.engine==="ai"?"ai":"device",
      aiVoice:AI_VOICES.find(v=>v.id===data.aiVoice)?.id??defaults.aiVoice};
  } catch {return defaults;}
}
function splitSpeech(text:string,limit=165): string[] {
  const words=text.replace(/\s+/g," ").trim().split(" ");
  const chunks:string[]=[];
  let part="";
  for(const word of words){
    if(part && part.length+word.length+1>limit){chunks.push(part);part="";}
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
  errorId:string|null;
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
  const [errorId,setErrorId]=useState<string|null>(null);
  const version=useRef(0);
  const current=useRef<SpeechSynthesisUtterance|null>(null);
  const cloud=useRef<{context:AudioContext;abort:AbortController;source:AudioBufferSourceNode|null}|null>(null);
  const available=typeof window!=="undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;

  const update=useCallback((next:Partial<SpeechOptions>)=>setOptions(old=>({...old,...next})),[]);
  useEffect(()=>{try{localStorage.setItem(storageKey,JSON.stringify(options));}catch{/* Private browser */}},[options]);
  useEffect(()=>{
    if(!available)return;
    const synth=window.speechSynthesis;
    const refresh=()=>setVoices(synth.getVoices());
    refresh();
    // Safari sometimes exposes voices after mount without firing voiceschanged.
    // Retry a few times, and reload on user returning to the browser.
    const retries=[250,1000,2500].map(ms=>window.setTimeout(refresh,ms));
    synth.addEventListener("voiceschanged",refresh);
    window.addEventListener("focus",refresh);
    document.addEventListener("visibilitychange",refresh);
    return ()=>{
      retries.forEach(id=>window.clearTimeout(id));
      synth.removeEventListener("voiceschanged",refresh);
      window.removeEventListener("focus",refresh);
      document.removeEventListener("visibilitychange",refresh);
    };
  },[available]);

  const stop=useCallback(()=>{
    version.current+=1;
    if(available)window.speechSynthesis.cancel();
    const old=cloud.current;cloud.current=null;
    if(old){
      old.abort.abort();
      if(old.source){old.source.onended=null;try{old.source.stop();}catch{/* already ended */}}
      void old.context.close().catch(()=>{});
    }
    current.current=null;setActiveId(null);setPaused(false);
  },[available]);

  // Never continue reading old content in a different language or after audio is disabled.
  useEffect(()=>{stop();setError("");},[language,options.enabled,options.scan,options.steps,options.chat,options.journey,options.rate,options.voiceURI,options.engine,options.aiVoice,stop]);
  useEffect(()=>()=>{version.current+=1;if(available)window.speechSynthesis.cancel();
    const old=cloud.current;cloud.current=null;
    if(old){old.abort.abort();if(old.source)try{old.source.stop();}catch{/* ended */}
      void old.context.close().catch(()=>{});}
  },[available]);

  const speak=useCallback((id:string,source:string)=>{
    if(!options.enabled||(!available&&options.engine==="device")){
      setErrorId(id);
      setError(!options.enabled?"Enable read aloud in Accessibility settings.":"This browser does not support text-to-speech.");
      return;
    }
    const text=source.replace(/[*#_`]/g," ").replace(/\s+/g," ").trim();
    if(!text)return;
    if(options.engine==="ai"){
      // Unlock Safari audio DURING the click, before awaiting any network request.
      stop();setError("");setErrorId(null);
      if(typeof window.AudioContext==="undefined"){
        setErrorId(id);setError("Your browser cannot play natural AI voice audio.");return;
      }
      const ctx=new AudioContext();
      const state={context:ctx,abort:new AbortController(),source:null as AudioBufferSourceNode|null};
      cloud.current=state;
      const myVersion=version.current;
      setActiveId(id);
      void ctx.resume().catch(()=>{});
      const chunks=splitSpeech(text,480);
      let index=0;
      const next=async():Promise<void>=>{
        if(myVersion!==version.current||cloud.current!==state)return;
        if(index>=chunks.length){if(cloud.current===state)stop();return;}
        try{
          const response=await fetch("/api/speech/generate",{
            method:"POST",headers:{"Content-Type":"application/json","X-WasteLens-Request":"1"},
            credentials:"same-origin",signal:state.abort.signal,
            body:JSON.stringify({text:chunks[index++],voice:options.aiVoice,language})
          });
          if(!response.ok){
            const body=await response.json().catch(()=>({detail:"Natural speech isn't available right now."}));
            throw Error(typeof body.detail==="string"?body.detail:"Natural speech isn't available right now.");
          }
          const bytes=await response.arrayBuffer();
          if(myVersion!==version.current||cloud.current!==state)return;
          const audio=await ctx.decodeAudioData(bytes);
          if(myVersion!==version.current||cloud.current!==state)return;
          const source=ctx.createBufferSource();
          source.buffer=audio;
          source.playbackRate.value=options.rate;
          source.connect(ctx.destination);
          state.source=source;
          source.onended=()=>{if(myVersion===version.current)void next();};
          source.start();
        }catch(err){
          if(myVersion!==version.current||cloud.current!==state)return;
          const message=err instanceof Error?err.message:"Natural speech couldn't play.";
          stop();setErrorId(id);setError(message);
        }
      };
      void next();
      return;
    }
    // Refresh after an explicit click. Chrome can populate voices after the first getVoices call.
    const browserVoices=window.speechSynthesis.getVoices();
    const matching=naturalVoices(browserVoices,language);
    const preferred=matching.find(voice=>voice.voiceURI===options.voiceURI);
    // Use the browser's own default if it has not exposed a matching language
    // or has not populated the voice list yet. Never block reading on a filter.
    const localVoice=hasLanguageVoice(browserVoices,language)
      ? matching.find(voice=>voice.lang.toLowerCase().replace("_","-")===locales[language].toLowerCase())??matching[0]
      : undefined;
    const voice=preferred??localVoice;
    stop();setError("");setErrorId(null);
    const myVersion=version.current;
    const chunks=splitSpeech(text);
    let index=0;
    const next=()=>{
      if(myVersion!==version.current)return;
      if(index>=chunks.length){setActiveId(null);current.current=null;setPaused(false);return;}
      const utterance=new SpeechSynthesisUtterance(chunks[index++]);
      current.current=utterance;
      utterance.lang=voice?.lang??locales[language];
      if(voice)utterance.voice=voice; // Otherwise speechSynthesis chooses a system default.
      utterance.rate=options.rate;
      utterance.pitch=1;
      utterance.onstart=()=>{if(version.current===myVersion){setActiveId(id);setPaused(false);}};
      utterance.onend=()=>{if(version.current===myVersion)next();};
      utterance.onerror=event=>{
        if(myVersion!==version.current||event.error==="canceled"||event.error==="interrupted")return;
        setErrorId(id);setError(speechError(event.error,language));
        stop();
      };
      try{window.speechSynthesis.speak(utterance);}
      catch{setErrorId(id);setError("Speech could not start in this browser.");stop();}
    };
    setActiveId(id);
    next();
  },[available,language,options.enabled,options.rate,options.voiceURI,options.engine,options.aiVoice,stop]);

  const togglePause=useCallback(()=>{
    if(!activeId)return;
    if(cloud.current){
      const context=cloud.current.context;
      if(context.state==="suspended"){void context.resume();setPaused(false);}
      else{void context.suspend();setPaused(true);}
      return;
    }
    if(!available)return;
    const synth=window.speechSynthesis;
    if(synth.paused){synth.resume();setPaused(false);}
    else{synth.pause();setPaused(true);}
  },[activeId,available]);

  return <SpeechContext.Provider value={{
    options,update,available,voices,activeId,paused,error,errorId,speak,stop,togglePause,dismissError:()=>{setError("");setErrorId(null);}
  }}>{children}</SpeechContext.Provider>;
}

export function ReadAloudButton({id,text,category,className=""}:{
  id:string;text:string;category:SpeechCategory;className?:string;
}){
  const {t}=useLanguage();
  const {options,available,activeId,paused,speak,stop,togglePause,error,errorId}=useSpeech();
  const active=activeId===id;
  const activeRef=useRef(active);
  activeRef.current=active;
  useEffect(()=>()=>{if(activeRef.current)stop();},[stop]);
  if(!options.enabled||!options[category])return null;
  return <div className={"wl-listen-wrap "+className}>
    <button type="button" className={"wl-listen-button "+(active?"is-speaking":"")}
      disabled={(!available&&options.engine==="device")||!text.trim()} aria-pressed={active}
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
    {error && errorId===id && <span className="wl-listen-error" role="alert">{error}</span>}
  </div>;
}

export function SpeechSettingsPanel(){
  const {language,t}=useLanguage();
  const {options,update,available,voices,activeId,paused,error,speak,stop,togglePause,dismissError}=useSpeech();
  const matching=naturalVoices(voices,language);
  const aiSelected=options.engine==="ai";
  const groups=[
    {id:"female",label:language==="es"?"Voces femeninas":language==="hi"?"महिला आवाज़ें":"Female voices"},
    {id:"male",label:language==="es"?"Voces masculinas":language==="hi"?"पुरुष आवाज़ें":"Male voices"},
    {id:"other",label:language==="es"?"Otras voces disponibles":language==="hi"?"अन्य उपलब्ध आवाज़ें":"Other available voices"}
  ] as const;
  const testId="voice-settings-preview";
  const previewActive=useRef(false);
  previewActive.current=activeId===testId;
  useEffect(()=>()=>{if(previewActive.current)stop();},[stop]);
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
      <label className="wl-speech-field" htmlFor="wl-speech-engine">
        {language==="es"?"Origen de la voz":language==="hi"?"आवाज़ का स्रोत":"Voice source"}
      </label>
      <select id="wl-speech-engine" className="wl-speech-select"
        value={options.engine} onChange={e=>update({engine:e.target.value==="ai"?"ai":"device"})}>
        <option value="device">{language==="es"?"Voces del dispositivo (sin conexión)":language==="hi"?"डिवाइस की आवाज़ें (ऑफ़लाइन)":"Device voices (offline)"}</option>
        <option value="ai">{language==="es"?"Voces naturales de IA (Gemini)":language==="hi"?"स्वाभाविक AI आवाज़ें (Gemini)":"Natural AI voices (Gemini)"}</option>
      </select>
      <label className="wl-speech-field" htmlFor="wl-speech-voice">{t("Voice")}</label>
      {aiSelected?<select id="wl-speech-voice" className="wl-speech-select"
        value={options.aiVoice} onChange={e=>update({aiVoice:e.target.value as AiVoiceName})}>
        <optgroup label={language==="es"?"Voces femeninas":language==="hi"?"महिला आवाज़ें":"Female voices"}>
          {AI_VOICES.filter(v=>v.gender==="female").map(v=>
            <option key={v.id} value={v.id}>{v.id} — {v.style}</option>)}
        </optgroup>
        <optgroup label={language==="es"?"Voces masculinas":language==="hi"?"पुरुष आवाज़ें":"Male voices"}>
          {AI_VOICES.filter(v=>v.gender==="male").map(v=>
            <option key={v.id} value={v.id}>{v.id} — {v.style}</option>)}
        </optgroup>
      </select>:<select id="wl-speech-voice" className="wl-speech-select"
        disabled={!available} value={matching.some(v=>v.voiceURI===options.voiceURI)?options.voiceURI:""}
        onChange={e=>update({voiceURI:e.target.value})}>
        <option value="">{language==="es"?"Voz del sistema":language==="hi"?"सिस्टम की आवाज़":"System default"}{hasLanguageVoice(voices,language)&&matching[0]?" — "+matching[0].name:""}</option>
        {groups.map(group=>{
          const choices=matching.filter(voice=>voiceGroup(voice)===group.id);
          return choices.length>0?<optgroup key={group.id} label={group.label}>
            {choices.map(voice=><option key={voice.voiceURI} value={voice.voiceURI}>{voice.name} ({voice.lang})</option>)}
          </optgroup>:null;
        })}
      </select>}
      {aiSelected&&<p className="wl-speech-hint">
        {language==="es"?"Solo al pulsar Escuchar o Probar voz, el texto se envía a Google Gemini para generar audio. Requiere internet y una clave API de Gemini; puede consumir cuota o generar cargos.":
        language==="hi"?"Listen या Test voice दबाने पर ही पाठ ऑडियो बनाने के लिए Google Gemini को भेजा जाता है। इंटरनेट और Gemini API कुंजी चाहिए; कोटा या शुल्क लग सकता है।":
        "Only when you press Listen or Test voice, the text is sent to Google Gemini to generate audio. Requires internet and a Gemini API key; usage may count toward quotas or charges."}
      </p>}
      <div className="wl-speech-preview">
        <button type="button" disabled={!available&&!aiSelected}
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
    {!aiSelected&&available&&matching.length===0&&<p className="wl-speech-notice" role="status">
      {language==="en"?"Safari hasn't listed its voices yet. System default can still read aloud. Try Test voice.":
      language==="es"?"Safari aún no muestra voces. Puedes probar la voz predeterminada con Probar voz.":
      "Safari ने अभी आवाज़ों की सूची नहीं दी है। फिर भी सिस्टम की आवाज़ से सुनने का परीक्षण करें।"}
    </p>}
    {!aiSelected&&available&&matching.length>0&&!hasLanguageVoice(voices,language)&&<p className="wl-speech-notice" role="status">
      {language==="en"?"No English voice is listed yet. Other installed voices are shown; their pronunciation may not match English.":
      language==="es"?"No se encontró una voz española. Se muestran otras voces instaladas, pero quizá no pronuncien bien el español.":
      "हिंदी आवाज़ नहीं मिली। दूसरी उपलब्ध आवाज़ें दिख रही हैं, लेकिन वे हिंदी सही नहीं बोल सकतीं।"}
    </p>}
    {!aiSelected&&available&&<p className="wl-speech-hint">
      {language==="en"?"For more realistic voices: Mac System Settings → Accessibility → Read & Speak → System voice. Download a Premium or Enhanced voice, then refresh WasteLens.":
      language==="es"?"Para más voces naturales: Ajustes del Mac → Accesibilidad → Leer y hablar → Voz del sistema. Descarga una voz Premium o Enhanced y actualiza WasteLens.":
      "बेहतर आवाज़ों के लिए Mac System Settings → Accessibility → Read & Speak → System voice में Premium या Enhanced आवाज़ डाउनलोड करें, फिर WasteLens रिफ्रेश करें।"}
    </p>}
    {error&&<p className="wl-speech-notice" role="alert">{error}</p>}
    <p className="wl-speech-hint">{t("Audio plays only when you choose Listen. Voice availability depends on your device and browser.")}</p>
  </div>;
}
