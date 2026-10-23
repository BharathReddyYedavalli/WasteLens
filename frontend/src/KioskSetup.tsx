import { useEffect, useState } from "react";
import { ClipboardCheck, Plus, Save, Trash2 } from "lucide-react";
import { KIOSK_ITEMS, type KioskBin, type KioskProfile, type KioskRule, type KioskItem } from "./kioskTypes";
import { useLanguage } from "./i18n";

const startingBins:KioskBin[]=[{id:"bin_1",name:"Recycling"},{id:"bin_2",name:"Trash"}];

export default function KioskSetup(){
  const {t}=useLanguage();
  const [organization,setOrganization]=useState("");
  const [source,setSource]=useState("");
  const [bins,setBins]=useState<KioskBin[]>(startingBins);
  const [rules,setRules]=useState<KioskRule[]>([]);
  const [checked,setChecked]=useState(false);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");
  const [message,setMessage]=useState("");

  useEffect(()=>{
    let active=true;
    fetch("/api/kiosk/profile",{cache:"no-store"}).then(async response=>{
      if(!response.ok)throw Error("Could not load kiosk rules.");
      return await response.json() as KioskProfile;
    }).then(profile=>{
      if(!active)return;
      if(profile.configured){
        setOrganization(profile.organization);
        setSource(profile.source);
        setBins(profile.bins);
        setRules(profile.rules);
      }
    }).catch(e=>{if(active)setError(String(e.message||e));})
      .finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  },[]);

  function editRule(item_type:KioskItem,bin_id:string){
    setChecked(false);setMessage("");
    setRules(old=>[...old.filter(r=>r.item_type!==item_type),
      ...(bin_id?[{item_type,bin_id}]:[])]);
  }
  function addBin(){
    const available=[1,2,3,4].find(i=>!bins.some(bin=>bin.id==="bin_"+i));
    if(!available)return;
    setBins(old=>[...old,{id:"bin_"+available,name:""}]);
    setChecked(false);setMessage("");
  }
  function removeBin(id:string){
    setBins(old=>old.filter(b=>b.id!==id));
    setRules(old=>old.filter(rule=>rule.bin_id!==id));
    setChecked(false);setMessage("");
  }
  async function save(){
    if(saving||loading)return;
    setError("");setMessage("");
    if(!checked){setError(t("Confirm you checked the actual collection rules before saving."));return;}
    setSaving(true);
    try {
      const response=await fetch("/api/kiosk/profile",{
        method:"PUT",credentials:"same-origin",
        headers:{"Content-Type":"application/json","X-WasteLens-Request":"1"},
        body:JSON.stringify({organization,source,bins,rules,rules_checked:checked})
      });
      const data=await response.json();
      if(!response.ok)throw Error(typeof data.detail==="string"?data.detail:t("Please check the bin names and assignments."));
      setMessage(t("Kiosk bin rules saved. Open Kiosk Mode to test them."));
      setChecked(false);
    }catch(e){setError(e instanceof Error?e.message:String(e));}
    finally{setSaving(false);}
  }

  return <section className="wl-kiosk-setup" aria-label={t("Kiosk bin setup")}>
    <div className="wl-kiosk-setup-heading"><ClipboardCheck size={22}/>
      <div><h2>{t("Kiosk bin setup")}</h2>
        <p>{t("Set up the bins at this school or office. Only an administrator can save these rules.")}</p>
      </div>
    </div>
    {loading?<p role="status">{t("Loading kiosk rules…")}</p>:<>
      <div className="wl-kiosk-setup-fields">
        <label>{t("School or office name")}
          <input maxLength={80} value={organization} placeholder="Example: Main cafeteria"
            onChange={e=>{setOrganization(e.target.value);setChecked(false);setMessage("");}}/>
        </label>
        <label>{t("Where did you check the accepted materials?")}
          <textarea maxLength={300} rows={2} value={source}
            placeholder="Example: Our facilities manager's approved sorting guide, checked this week"
            onChange={e=>{setSource(e.target.value);setChecked(false);setMessage("");}}/>
        </label>
      </div>
      <div className="wl-kiosk-setup-section">
        <div className="wl-kiosk-setup-row"><h3>{t("Bin names")}</h3>
          <button type="button" disabled={bins.length>=4} onClick={addBin}>
            <Plus size={17}/>{t("Add bin")}</button></div>
        {bins.map(bin=><label className="wl-kiosk-bin-input" key={bin.id}>
          <span>{t("Bin name")}</span>
          <input maxLength={40} value={bin.name} placeholder="Example: Recycling"
            onChange={e=>{
              setBins(old=>old.map(b=>b.id===bin.id?{...b,name:e.target.value}:b));
              setChecked(false);setMessage("");
            }}/>
          <button type="button" disabled={bins.length<=2}
            aria-label={t("Remove bin")+" "+bin.name} onClick={()=>removeBin(bin.id)}><Trash2 size={17}/></button>
        </label>)}
      </div>
      <div className="wl-kiosk-setup-section">
        <h3>{t("What goes in each bin?")}</h3>
        <p>{t("Choose a bin only for items your site actually accepts. Leave uncertain items unassigned.")}</p>
        <div className="wl-kiosk-rule-grid">{KIOSK_ITEMS.map(item=><label key={item.id}>
          <span>{t(item.label)}</span>
          <select value={rules.find(rule=>rule.item_type===item.id)?.bin_id??""}
            onChange={e=>editRule(item.id,e.target.value)}>
            <option value="">{t("Not confirmed")}</option>
            {bins.filter(bin=>bin.name.trim()).map(bin=><option key={bin.id} value={bin.id}>{bin.name}</option>)}
          </select>
        </label>)}</div>
      </div>
      <label className="wl-kiosk-confirmation">
        <input type="checkbox" checked={checked} onChange={e=>setChecked(e.target.checked)}/>
        <span>{t("I checked our actual facility or waste hauler rules for these items. I understand these entries are staff-provided, not verified by WasteLens.")}</span>
      </label>
      <button type="button" className="wl-kiosk-setup-save" disabled={saving} onClick={()=>void save()}>
        <Save size={17}/>{saving?t("Saving…"):t("Save kiosk rules")}
      </button>
      {error&&<p role="alert" className="wl-kiosk-setup-error">{error}</p>}
      {message&&<p role="status" className="wl-kiosk-setup-success">{message}</p>}
    </>}
  </section>;
}
