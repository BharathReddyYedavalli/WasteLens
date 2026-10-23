import {createContext,useCallback,useContext,useEffect,useRef,useState} from "react";
import type {ReactNode} from "react";
import {Ear,Pause,Play,Square,Volume2,VolumeX} from "lucide-react";
import {useLanguage} from "./i18n";
import {AI_VOICES,LANGUAGE_VOICES,selectedVoice,type AiVoiceName} from "./aiSpeechVoices";

export type SpeechCategory="scan"|"steps"|"chat"|"journey";
type SpeechOptions={
  enabled:boolean;
  scan:boolean;
  steps:boolean;
  chat:boolean;
  journey:boolean;
  rate:number;
  aiVoice:AiVoiceName;
};
const defaults:SpeechOptions={
  enabled:true,scan:true,steps:true,chat:true,journey:true,rate:0.9,aiVoice:"Aoede"
};
const storageKey="wastelens-voice-preferences";
const categoryNames:Record<SpeechCategory,string>={
  scan:"Scan results",steps:"Sorting steps",chat:"Chat replies",journey:"Bottle journey"
};

function getSaved():SpeechOptions{
  try{
    // Ignore obsolete saved "device" engine and voiceURI values.
    // All existing users now use Gemini speech, with no local playback path.
    const data=JSON.parse(localStorage.getItem(storageKey)||"{}") as Partial<SpeechOptions>;
    const rate=typeof data.rate==="number"&&Number.isFinite(data.rate)
      ?Math.min(1.3,Math.max(0.7,data.rate)):defaults.rate;
    return {
      ...defaults,
      ...Object.fromEntries(
        (["enabled","scan","steps","chat","journey"] as const)
          .filter(key=>typeof data[key]==="boolean").map(key=>[key,data[key]])
      ),
      rate,
      aiVoice:AI_VOICES.find(v=>v.id===data.aiVoice)?.id??defaults.aiVoice
    };
  }catch{return defaults;}
}

function splitSpeech(text:string,limit=480):string[]{
  const words=text.replace(/\s+/g," ").trim().split(" ");
  const chunks:string[]=[];
  let part="";
  for(const word of words){
    if(part&&part.length+word.length+1>limit){chunks.push(part);part="";}
    part=part?part+" "+word:word;
  }
  if(part)chunks.push(part);
  return chunks;
}

type ReadingContext={
  options:SpeechOptions;
  update:(next:Partial<SpeechOptions>)=>void;
  available:boolean;
  activeId:string|null;
  paused:boolean;
  loadingId:string|null;
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
  const [activeId,setActiveId]=useState<string|null>(null);
  const [paused,setPaused]=useState(false);
  const [loadingId,setLoadingId]=useState<string|null>(null);
  const [error,setError]=useState("");
  const [errorId,setErrorId]=useState<string|null>(null);
  const version=useRef(0);
  const cloud=useRef<{context:AudioContext;abort:AbortController;source:AudioBufferSourceNode|null}|null>(null);
  // Small session-only audio cache. Replaying an answer doesn't call Gemini again.
  // Nothing is written to localStorage, indexedDB or the backend.
  const audioCache=useRef<Map<string,ArrayBuffer>>(new Map());
  const available=typeof window!=="undefined"&&"AudioContext" in window;
  const activeVoice=selectedVoice(language,options.aiVoice);
  const update=useCallback((next:Partial<SpeechOptions>)=>setOptions(old=>({...old,...next})),[]);

  useEffect(()=>{
    try{localStorage.setItem(storageKey,JSON.stringify(options));}
    catch{/* Private browser mode */}
  },[options]);

  const stop=useCallback(()=>{
    version.current+=1;
    const old=cloud.current;
    cloud.current=null;
    if(old){
      old.abort.abort();
      if(old.source){
        old.source.onended=null;
        try{old.source.stop();}catch{/* already stopped */}
      }
      void old.context.close().catch(()=>{});
    }
    setActiveId(null);
    setLoadingId(null);
    setPaused(false);
  },[]);

  // Do not continue speaking in the old language or with old preferences.
  useEffect(()=>{
    stop();
    setError("");
    setErrorId(null);
  },[language,options.enabled,options.scan,options.steps,options.chat,options.journey,
      options.rate,options.aiVoice,stop]);

  useEffect(()=>()=>{stop();audioCache.current.clear();},[stop]);

  const speak=useCallback((id:string,source:string)=>{
    if(!options.enabled||!available){
      setErrorId(id);
      setError(!options.enabled
        ?"Enable read aloud in Accessibility settings."
        :"Natural speech playback is not supported in this browser.");
      return;
    }
    const text=source.replace(/[*#_\x60]/g," ").replace(/\s+/g," ").trim();
    if(!text)return;
    stop();
    setError("");
    setErrorId(null);

    // Create and unlock AudioContext on the user click for Safari.
    const ctx=new AudioContext();
    const state={
      context:ctx,
      abort:new AbortController(),
      source:null as AudioBufferSourceNode|null
    };
    cloud.current=state;
    const myVersion=version.current;
    setActiveId(id);
    setLoadingId(id);
    void ctx.resume().catch(()=>{});
    // Slightly larger chunks mean fewer provider calls for longer chat answers.
    const chunks=splitSpeech(text,580);
    let index=0;

    const next=async():Promise<void>=>{
      if(myVersion!==version.current||cloud.current!==state)return;
      if(index>=chunks.length){stop();return;}
      try{
        const chunk=chunks[index++];
        const cacheKey=JSON.stringify([activeVoice,language,chunk]);
        let bytes=audioCache.current.get(cacheKey);
        const cacheHit=Boolean(bytes);
        if(!bytes){
          const response=await fetch("/api/speech/generate",{
            method:"POST",
            headers:{"Content-Type":"application/json","X-WasteLens-Request":"1"},
            credentials:"same-origin",
            signal:state.abort.signal,
            body:JSON.stringify({text:chunk,voice:activeVoice,language})
          });
          if(!response.ok){
            const body=await response.json().catch(()=>({detail:"Natural speech is not available right now."}));
            throw Error(typeof body.detail==="string"?body.detail:"Natural speech is not available right now.");
          }
          bytes=await response.arrayBuffer();
        }
        if(myVersion!==version.current||cloud.current!==state)return;
        // Safari may detach an ArrayBuffer on decode, so pass a copy.
        const audio=await ctx.decodeAudioData(bytes.slice(0));
        if(myVersion!==version.current||cloud.current!==state)return;
        if(!cacheHit){
          const cache=audioCache.current;
          cache.set(cacheKey,bytes);
          // LRU-style eviction keeps at most 8 short clips in memory.
          while(cache.size>8){const first=cache.keys().next().value;if(first===undefined)break;cache.delete(first);}
        }else{
          // Move recently played material to the back of the eviction queue.
          audioCache.current.delete(cacheKey);
          audioCache.current.set(cacheKey,bytes);
        }
        const source=ctx.createBufferSource();
        source.buffer=audio;
        source.playbackRate.value=options.rate;
        source.connect(ctx.destination);
        state.source=source;
        source.onended=()=>{if(myVersion===version.current)void next();};
        source.start();
        setLoadingId(null);
      }catch(err){
        if(myVersion!==version.current||cloud.current!==state)return;
        const message=err instanceof Error?err.message:"Gemini speech could not play.";
        stop();
        setErrorId(id);
        setError(message);
      }
    };
    void next();
  },[available,language,options.enabled,options.rate,activeVoice,stop]);

  const togglePause=useCallback(()=>{
    const context=cloud.current?.context;
    if(!context||!activeId)return;
    if(context.state==="suspended"){
      void context.resume().then(()=>setPaused(false)).catch(()=>{});
    }else{
      void context.suspend().then(()=>setPaused(true)).catch(()=>{});
    }
  },[activeId]);

  return <SpeechContext.Provider value={{
    options,update,available,activeId,paused,loadingId,error,errorId,speak,stop,togglePause,
    dismissError:()=>{setError("");setErrorId(null);}
  }}>{children}</SpeechContext.Provider>;
}

export function ReadAloudButton({id,text,category,className=""}:{
  id:string;text:string;category:SpeechCategory;className?:string;
}){
  const {language,t}=useLanguage();
  const {options,available,activeId,paused,loadingId,speak,stop,togglePause,error,errorId}=useSpeech();
  const active=activeId===id;
  const loading=loadingId===id;
  const activeRef=useRef(active);
  activeRef.current=active;
  useEffect(()=>()=>{if(activeRef.current)stop();},[stop]);
  if(!options.enabled||!options[category])return null;
  return <div className={"wl-listen-wrap "+className}>
    <button type="button" className={"wl-listen-button "+(active?"is-speaking":"")}
      disabled={!available||!text.trim()} aria-pressed={active}
      title={!available?t("Speech is not available in this browser"):undefined}
      onClick={()=>active?stop():speak(id,text)}>
      {active?<Square size={15}/>:<Volume2 size={16}/>}
      {loading?(language==="es"?"Generando audio…":language==="hi"?"ऑडियो बन रहा है…":"Generating audio…"):t(active?"Stop reading":"Listen")}
    </button>
    {active&&!loading&&<button type="button" className="wl-listen-pause" onClick={togglePause}
      aria-label={t(paused?"Resume reading":"Pause reading")}
      title={t(paused?"Resume reading":"Pause reading")}>
      {paused?<Play size={15}/>:<Pause size={15}/>}
    </button>}
    {error&&errorId===id&&<span className="wl-listen-error" role="alert">{error}</span>}
  </div>;
}

export function SpeechSettingsPanel(){
  const {language,t}=useLanguage();
  const {options,update,available,activeId,paused,loadingId,error,errorId,speak,stop,togglePause,dismissError}=useSpeech();
  const testId="voice-settings-preview";
  const previewLoading=loadingId===testId;
  const availableVoices=LANGUAGE_VOICES[language];
  const activeVoice=selectedVoice(language,options.aiVoice);
  const previewActive=useRef(false);
  previewActive.current=activeId===testId;
  useEffect(()=>()=>{if(previewActive.current)stop();},[stop]);

  return <div className="wl-accessibility-settings">
    <div className="wl-speech-head"><Ear size={18}/><strong>{t("Read aloud")}</strong></div>
    <label className="wl-speech-toggle">
      <input type="checkbox" checked={options.enabled} onChange={e=>update({enabled:e.target.checked})}/>
      <span>{t("Show listening buttons")}</span>
    </label>
    {options.enabled&&<>
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
      <input id="wl-speech-speed" className="wl-speech-rate" type="range"
        min="0.7" max="1.3" step="0.1"
        value={options.rate} onChange={e=>update({rate:Number(e.target.value)})}/>
      <label className="wl-speech-field" htmlFor="wl-speech-voice">{t("Voice")}</label>
      <select id="wl-speech-voice" className="wl-speech-select"
        value={activeVoice} onChange={e=>update({aiVoice:e.target.value as AiVoiceName})}>
        <optgroup label={language==="es"?"Voces femeninas — español":language==="hi"?"महिला आवाज़ — हिंदी":"Female voices"}>
          {availableVoices.filter(v=>v.gender==="female").map(v=>
            <option key={v.id} value={v.id}>{v.id} — {v.style}</option>)}
        </optgroup>
        <optgroup label={language==="es"?"Voces masculinas — español":language==="hi"?"पुरुष आवाज़ — हिंदी":"Male voices"}>
          {availableVoices.filter(v=>v.gender==="male").map(v=>
            <option key={v.id} value={v.id}>{v.id} — {v.style}</option>)}
        </optgroup>
      </select>
      {error&&errorId===testId&&<p className="wl-speech-notice" role="alert" aria-live="assertive">
        {error}
      </p>}
      <div className="wl-speech-preview">
        <button type="button" disabled={!available}
          onClick={()=>{
            if(activeId===testId){stop();return;}
            dismissError();
            speak(testId,language==="es"?"Hola. Esta es la voz de WasteLens."
              :language==="hi"?"नमस्ते। यह WasteLens की पढ़ने की आवाज़ है।"
              :"Hello. This is the WasteLens reading voice.");
          }}>
          {activeId===testId?<VolumeX size={16}/>:<Volume2 size={16}/>}
          {previewLoading
            ?(language==="es"?"Generando voz…":language==="hi"?"आवाज़ बन रही है…":"Generating voice…")
            :errorId===testId&&error
              ?(language==="es"?"Reintentar voz":language==="hi"?"फिर से आवाज़ जाँचें":"Retry voice")
              :t(activeId===testId?"Stop reading":"Test voice")}
        </button>
        {activeId===testId&&!previewLoading&&<button type="button" onClick={togglePause}>
          {t(paused?"Resume":"Pause")}
        </button>}
      </div>
      {previewLoading&&<p className="wl-speech-notice" role="status">
        {language==="es"?"Preparando el audio con Gemini…":language==="hi"?"Gemini से ऑडियो तैयार हो रहा है…":"Preparing audio with Gemini…"}
      </p>}
    </>}
    {!available&&<p className="wl-speech-notice" role="status">
      {t("Speech is not available in this browser")}
    </p>}
    {error&&errorId!==testId&&<p className="wl-speech-notice" role="alert">{error}</p>}
  </div>;
}
