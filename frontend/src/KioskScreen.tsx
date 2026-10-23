import { useEffect, useState } from "react";
import type { ChangeEvent, RefObject } from "react";
import { AlertTriangle, Camera, CheckCircle2, CircleHelp, MapPin, RotateCcw, ScanLine, Search, ShieldAlert, Sparkles, Upload, RefreshCcw } from "lucide-react";
import type { ItemAnalysis } from "./types";
import LocalRulesGuide from "./LocalRulesGuide";
import { ReadAloudButton } from "./Speech";
import { useLanguage } from "./i18n";
import { KIOSK_ITEMS, type KioskProfile, type KioskItem } from "./kioskTypes";
import { kioskCopy, ITEM_SYNONYMS } from "./kioskCopy";
import { useKioskIdleReset } from "./useKioskIdleReset";

type Props = {
  videoRef: RefObject<HTMLVideoElement | null>;
  uploadRef: RefObject<HTMLInputElement | null>;
  camera: boolean;
  preview: {file:File;src:string}|null;
  busy: boolean;
  aiReady: boolean;
  cameraError: string;
  error: string;
  statusError: string;
  analysis: ItemAnalysis|null;
  zipCode: string;
  onZipChange: (value:string)=>void;
  rulesOpenRequest: number;
  onShowLocalRules: ()=>void;
  onStartCamera: ()=>void;
  onStopCamera: ()=>void;
  onCapture: ()=>void;
  onUpload: (event:ChangeEvent<HTMLInputElement>)=>void;
  onAnalyze: ()=>void;
  onNextItem: ()=>void;
};

export default function KioskScreen({
  videoRef,uploadRef,camera,preview,busy,aiReady,cameraError,error,statusError,
  analysis,zipCode,onZipChange,rulesOpenRequest,onShowLocalRules,
  onStartCamera,onStopCamera,onCapture,onUpload,onAnalyze,onNextItem
}:Props){
  const {t,language}=useLanguage();
  const k=(text:string)=>kioskCopy(language,text);
  const [mode,setMode]=useState<"scan"|"search">("scan");
  const [query,setQuery]=useState("");
  const [profileReload,setProfileReload]=useState(0);
  const [profile,setProfile]=useState<KioskProfile|null>(null);
  const [profileError,setProfileError]=useState(false);
  const [selectedType,setSelectedType]=useState<KioskItem| "">("");
  useEffect(()=>{
    let active=true;
    setProfileError(false);
    fetch("/api/kiosk/profile",{cache:"no-store"}).then(async response=>{
      if(!response.ok)throw Error("Kiosk rules unavailable");
      return await response.json() as KioskProfile;
    }).then(data=>{if(active)setProfile(data);})
      .catch(()=>{if(active)setProfileError(true);});
    return()=>{active=false;};
  },[profileReload]);
  useEffect(()=>setSelectedType(""),[analysis]);
  function clearSession() {
    setMode("scan");
    setQuery("");
    setSelectedType("");
    onNextItem();
    setProfileReload(current=>current+1);
  }
  function switchMode(next:"scan"|"search") {
    if(next===mode)return;
    onNextItem();
    onStopCamera();
    setQuery("");
    setSelectedType("");
    setMode(next);
    setProfileReload(current=>current+1);
  }
  const {warning,extendSession}=useKioskIdleReset(clearSession);
  const matchingItems=KIOSK_ITEMS.filter(item=>
    (t(item.label)+" "+item.label+" "+(ITEM_SYNONYMS[item.id]??""))
      .toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const isSearching=mode==="search";
  const showSiteHelp=isSearching||Boolean(analysis);
  useEffect(()=>{
    if(isSearching&&selectedType)document.querySelector<HTMLElement>(".wl-kiosk-site-guidance")?.scrollIntoView({block:"start"});
  },[isSearching,selectedType]);

  const selection=profile?.rules.find(rule=>rule.item_type===selectedType);
  const selectedBin=profile?.bins.find(bin=>bin.id===selection?.bin_id);
  const uncertain=Boolean(analysis&&(analysis.identification!=="likely"||analysis.route==="needs_identification"));
  useEffect(()=>{
    if(analysis)document.querySelector<HTMLElement>(".wl-kiosk-results")?.scrollIntoView({block:"start"});
    else window.scrollTo(0,0);
  },[analysis]);
  return <section className="wl-kiosk-page" aria-label={t("Kiosk Mode")}>
    <div className="wl-kiosk-heading">
      <span className="wl-kiosk-eyebrow"><ScanLine size={18}/>{t("Kiosk Mode")}</span>
      <h1>{t("Where does this go?")}</h1>
      <p>{k("Start with a photo or item search")}</p>
      {profile?.configured&&<p className="wl-kiosk-site-current"><MapPin size={16}/>{profile.organization}</p>}
    </div>
    <div className="wl-kiosk-tabs" role="tablist" aria-label={k("Start with a photo or item search")}>
      <button type="button" role="tab" id="kiosk-scan-tab" aria-controls="kiosk-scan-panel"
        aria-selected={!isSearching} className={!isSearching?"selected":""} onClick={()=>switchMode("scan")}>
        <Camera size={21}/>{k("Scan with camera")}
      </button>
      <button type="button" role="tab" id="kiosk-search-tab" aria-controls="kiosk-search-panel"
        aria-selected={isSearching} className={isSearching?"selected":""} onClick={()=>switchMode("search")}>
        <Search size={21}/>{k("Find an item")}
      </button>
    </div>
    {warning&&<div className="wl-kiosk-timeout" role="alert"
      aria-label={k("Your session will clear soon.")}>
      <CircleHelp size={26}/>
      <div><strong>{k("Your session will clear soon.")}</strong>
        <p>{k("This shared kiosk clears after two minutes without activity.")}</p></div>
      <button type="button" onClick={extendSession}>{k("Stay here")}</button>
      <button type="button" onClick={clearSession}>{k("Clear now")}</button>
    </div>}
    {!isSearching&&<div className="wl-kiosk-capture" role="tabpanel" id="kiosk-scan-panel" aria-labelledby="kiosk-scan-tab">
      <div className="wl-kiosk-camera" aria-label={t("Item camera")}>
        {camera?<video ref={videoRef} autoPlay muted playsInline aria-label={t("Live camera preview")}/>:
         preview?<img src={preview.src} alt={t("Your selected item photograph")}/>:
         <div className="wl-kiosk-camera-empty">
           <Camera size={46} strokeWidth={1.5}/>
           <p>{t("Hold up one item or choose its photo.")}</p>
         </div>}
      </div>
      <div className="wl-kiosk-controls">
        <input hidden type="file" ref={uploadRef} accept="image/jpeg,image/png,image/webp"
          onChange={onUpload} aria-label={t("Upload item photo")}/>
        {!camera&&!preview&&<>
          <button type="button" className="wl-kiosk-primary" onClick={onStartCamera}>
            <Camera size={22}/>{t("Use camera")}
          </button>
          <button type="button" className="wl-kiosk-secondary" onClick={()=>uploadRef.current?.click()}>
            <Upload size={20}/>{t("Choose a photo")}
          </button>
        </>}
        {camera&&<>
          <button type="button" className="wl-kiosk-primary" onClick={onCapture}><Camera size={21}/>{t("Take picture")}</button>
          <button type="button" className="wl-kiosk-secondary" onClick={onStopCamera}>{t("Close camera")}</button>
        </>}
        {preview&&!analysis&&<>
          <button type="button" className="wl-kiosk-primary" disabled={!aiReady||busy} onClick={onAnalyze}>
            <Sparkles size={21}/>{busy?t("Looking at it…"):t("Identify item")}
          </button>
          <button type="button" className="wl-kiosk-secondary" disabled={busy} onClick={onNextItem}>
            <RotateCcw size={19}/>{t("Try another photo")}
          </button>
        </>}
      </div>
      {!aiReady&&<p role="status" className="wl-kiosk-message"><AlertTriangle size={17}/>{t("AI scanning is unavailable. Check the backend and API key.")} {k("No internet or AI? Use item search.")}</p>}
      {statusError&&<p role="alert" className="wl-kiosk-message">{statusError}</p>}
      {cameraError&&<p role="alert" className="wl-kiosk-message">{cameraError}</p>}
      {error&&<p role="alert" className="wl-kiosk-message">{error}</p>}
      {!analysis&&<p className="wl-kiosk-privacy">{t("Photos are sent to Google Gemini when you choose Identify. Free-tier content may be used to improve Google's products.")} {k("Use a private item photo. Do not photograph people.")}</p>}
    </div>}
    {isSearching&&<section role="tabpanel" id="kiosk-search-panel" aria-labelledby="kiosk-search-tab"
      className="wl-kiosk-finder">
      <div className="wl-kiosk-finder-head">
        <h2><Search size={22}/>{k("Find an item")}</h2>
        <p>{k("Search for a common item or choose one below.")} <strong>{k("No camera or AI needed")}</strong></p>
      </div>
      <label htmlFor="wl-kiosk-quick-search">{k("Search by name")}</label>
      <input id="wl-kiosk-quick-search" type="search" autoComplete="off" spellCheck={false} maxLength={80}
        value={query} onChange={e=>{setQuery(e.target.value);setSelectedType("");}}
        placeholder={k("Search for a bottle, cup, fork…")}/>
      <div className="wl-kiosk-finder-title">{k("Common items")}</div>
      {matchingItems.length===0?<div className="wl-kiosk-no-match" role="status">
        <strong>{k("No matching items")}</strong>
        <p>{k("Try another word or ask staff.")}</p>
      </div>:<div className="wl-kiosk-item-grid">
        {matchingItems.map(item=><button key={item.id} type="button"
          aria-pressed={selectedType===item.id} className={selectedType===item.id?"chosen":""}
          onClick={()=>setSelectedType(item.id)}>
          {t(item.label)} <CheckCircle2 size={17}/>
        </button>)}
      </div>}
      {selectedType&&<div className="wl-kiosk-finder-result" role="status">
        <div><span>{k("Item selected")}</span><strong>{t(KIOSK_ITEMS.find(item=>item.id===selectedType)?.label??selectedType)}</strong></div>
        <button type="button" onClick={()=>setSelectedType("")}>{k("Change item")}</button>
      </div>}
    </section>}
    {analysis&&!isSearching&&<div className="wl-kiosk-results" aria-live="polite">
      <section className="wl-kiosk-answer">
        <div className="wl-kiosk-answer-label">
          {uncertain?<ShieldAlert size={21}/>:<CheckCircle2 size={21}/>}
          {t(uncertain?"Please check the item first":"Suggested next action")}
        </div>
        <h2>{uncertain?t("Confirm the item before sorting"):analysis.route_title}</h2>
        <p className="wl-kiosk-item">{analysis.item_name} · {analysis.material_guess}</p>
        {uncertain&&<p className="wl-kiosk-caution">{analysis.follow_up_question||analysis.visual_description}</p>}
        <p className="wl-kiosk-disclaimer">{t("AI suggestion, not a confirmed local bin rule.")}</p>
        <ReadAloudButton id="kiosk-result" category="scan"
          text={[analysis.item_name,analysis.route_title,analysis.material_guess,
            analysis.follow_up_question,...analysis.cautions].filter(Boolean).join(". ")}/>
        <button className="wl-kiosk-rule-button" type="button" onClick={onShowLocalRules}>
          <MapPin size={21}/>{t("Check local rules")}
        </button>
      </section>
    </div>}
    {showSiteHelp&&<div className="wl-kiosk-site-guidance">
      {profile?.configured&&<section className="wl-kiosk-site-panel" aria-label={t("Your location's bins")}>
        <div className="wl-kiosk-site-name"><MapPin size={20}/>
          <strong>{profile.organization}</strong></div>
        <h3>{k("Your organization's bin")}</h3>
        <p>{k("Only staff-confirmed materials can have a bin recommendation.")} {t("Choose the item type only if it matches what you are holding. Check its material and condition.")}</p>
        <label className="wl-kiosk-site-select">
          <span>{t("Confirm item type")}</span>
          <select value={selectedType} onChange={e=>setSelectedType(e.target.value as KioskItem|"")}>
            <option value="">{t("Choose an item (or ask staff)")}</option>
            {KIOSK_ITEMS.map(item=><option key={item.id} value={item.id}>{t(item.label)}</option>)}
          </select>
        </label>
        {selectedType&&selectedBin&&<div className="wl-kiosk-site-decision" role="status">
          <span>{t("Staff-provided bin")}</span>
          <strong>{selectedBin.name}</strong>
          <p>{t("This is based on the site's manually entered collection rules, not automatic verification.")} {k("The item must match the listed type and condition.")}</p>
        </div>}
        {selectedType&&!selectedBin&&<div className="wl-kiosk-site-unknown" role="status">
          <ShieldAlert size={23}/><strong>{k("No confirmed bin for this item")}</strong>
          <p>{k("Please ask staff or check the sign on the physical bin.")}</p>
        </div>}
        <p className="wl-kiosk-site-source">{t("Rule source")}: {profile.source}</p>
        <p className="wl-kiosk-site-source">{t("Last reviewed")}: {profile.reviewed_at?.slice(0,10)}</p>
        <p className="wl-kiosk-site-warning">{t("If the item is different or the rules are uncertain, ask staff instead of guessing.")}</p>
      </section>}
      {(!profile?.configured||profileError)&&<div className="wl-kiosk-rule-context">
        <p><ShieldAlert size={16}/>{t("This kiosk does not yet have verified rules for your school or office. Confirm the correct bin with staff.")} {k("You can identify an item, but WasteLens cannot confirm a physical bin here yet.")}</p>
      </div>}
      {profileError&&<p role="alert" className="wl-kiosk-message">{k("Could not load this location's bin rules. Ask staff.")}</p>}
      <button className="wl-kiosk-refresh" type="button" onClick={()=>setProfileReload(n=>n+1)}>
        <RefreshCcw size={16}/>{k("Refresh bin rules")}
      </button>
      {analysis&&!isSearching&&<LocalRulesGuide zipCode={zipCode} onZipChange={onZipChange} openRequest={rulesOpenRequest}/>}
      <button type="button" className="wl-kiosk-next" onClick={clearSession}>
        <RotateCcw size={22}/>{k("Done — next person")}
      </button>
      <p className="wl-kiosk-clearing">{t("Use Next item when finished. This screen does not save kiosk scans to a personal account.")} {k("This shared kiosk clears after two minutes without activity.")}</p>
    </div>}
  </section>;
}
