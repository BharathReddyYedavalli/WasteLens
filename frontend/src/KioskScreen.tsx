import { useEffect, useState } from "react";
import type { ChangeEvent, RefObject } from "react";
import { AlertTriangle, Camera, CheckCircle2, MapPin, RotateCcw, ScanLine, ShieldAlert, Sparkles, Upload } from "lucide-react";
import type { ItemAnalysis } from "./types";
import LocalRulesGuide from "./LocalRulesGuide";
import { ReadAloudButton } from "./Speech";
import { useLanguage } from "./i18n";
import { KIOSK_ITEMS, type KioskProfile, type KioskItem } from "./kioskTypes";

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
  const {t}=useLanguage();
  const [profile,setProfile]=useState<KioskProfile|null>(null);
  const [profileError,setProfileError]=useState(false);
  const [selectedType,setSelectedType]=useState<KioskItem| "">("");
  useEffect(()=>{
    let active=true;
    fetch("/api/kiosk/profile",{cache:"no-store"}).then(async response=>{
      if(!response.ok)throw Error("Kiosk rules unavailable");
      return await response.json() as KioskProfile;
    }).then(data=>{if(active)setProfile(data);})
      .catch(()=>{if(active)setProfileError(true);});
    return()=>{active=false;};
  },[]);
  useEffect(()=>setSelectedType(""),[analysis]);
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
      <p>{t("Show one item to the camera. Get a suggestion, then check the collection rules before using a bin.")}</p>
    </div>
    <div className="wl-kiosk-capture">
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
      {!aiReady&&<p role="status" className="wl-kiosk-message"><AlertTriangle size={17}/>{t("AI scanning is unavailable. Check the backend and API key.")}</p>}
      {statusError&&<p role="alert" className="wl-kiosk-message">{statusError}</p>}
      {cameraError&&<p role="alert" className="wl-kiosk-message">{cameraError}</p>}
      {error&&<p role="alert" className="wl-kiosk-message">{error}</p>}
      {!analysis&&<p className="wl-kiosk-privacy">{t("Photos are sent to Google Gemini when you choose Identify. Free-tier content may be used to improve Google's products.")}</p>}
    </div>
    {analysis&&<div className="wl-kiosk-results" aria-live="polite">
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

      {profile?.configured&&<section className="wl-kiosk-site-panel" aria-label={t("Your location's bins")}>
        <div className="wl-kiosk-site-name"><MapPin size={20}/>
          <strong>{profile.organization}</strong></div>
        <h3>{t("Find your site's bin")}</h3>
        <p>{t("Choose the item type only if it matches what you are holding. Check its material and condition.")}</p>
        <label className="wl-kiosk-site-select">
          <span>{t("Confirm item type")}</span>
          <select value={selectedType} onChange={e=>setSelectedType(e.target.value as KioskItem|"")}>
            <option value="">{t("Choose an item (or ask staff)")}</option>
            {KIOSK_ITEMS.filter(item=>profile.rules.some(rule=>rule.item_type===item.id))
              .map(item=><option key={item.id} value={item.id}>{t(item.label)}</option>)}
          </select>
        </label>
        {selectedType&&selectedBin&&<div className="wl-kiosk-site-decision" role="status">
          <span>{t("Staff-provided bin")}</span>
          <strong>{selectedBin.name}</strong>
          <p>{t("This is based on the site's manually entered collection rules, not automatic verification.")}</p>
        </div>}
        <p className="wl-kiosk-site-source">{t("Rule source")}: {profile.source}</p>
        <p className="wl-kiosk-site-source">{t("Last reviewed")}: {profile.reviewed_at?.slice(0,10)}</p>
        <p className="wl-kiosk-site-warning">{t("If the item is different or the rules are uncertain, ask staff instead of guessing.")}</p>
      </section>}
      {(!profile?.configured||profileError)&&<div className="wl-kiosk-rule-context">
        <p><ShieldAlert size={16}/>{t("This kiosk does not yet have verified rules for your school or office. Confirm the correct bin with staff.")}</p>
      </div>}
      <LocalRulesGuide zipCode={zipCode} onZipChange={onZipChange} openRequest={rulesOpenRequest}/>
      <button type="button" className="wl-kiosk-next" onClick={onNextItem}>
        <RotateCcw size={22}/>{t("Next item — clear screen")}
      </button>
      <p className="wl-kiosk-clearing">{t("Use Next item when finished. This screen does not save kiosk scans to a personal account.")}</p>
    </div>}
  </section>;
}
