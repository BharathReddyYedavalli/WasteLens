import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, ExternalLink, MapPin, ShieldAlert } from "lucide-react";
import { useLanguage } from "./i18n";

type Category = { id: string; label: string };
type Program = {
  id: string; name: string; city: string; state: string;
  source_url: string; postal_area_match: boolean;
};
type Catalog = {
  zip_code: string; postal_area: string; notice: string;
  programs: Program[]; categories: Category[];
};
type RuleResult = {
  item_name: string;
  status: "recycle" | "trash" | "dropoff" | "special" | "unverified";
  status_label: string;
  direction: string;
  source_url: string;
  program: string;
  scope: string;
};
type Props = {
  zipCode: string;
  onZipChange: (value: string) => void;
};

async function readJson<T>(response: Response): Promise<T> {
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = data && typeof data === "object" && "detail" in data
      ? (data as {detail?: unknown}).detail : null;
    throw new Error(typeof detail === "string" ? detail : "Could not check local policies right now.");
  }
  return data as T;
}

export default function LocalRulesGuide({ zipCode, onZipChange }: Props) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [selectedProgram, setSelectedProgram] = useState("");
  const [selectedItem, setSelectedItem] = useState("");
  const [collectionType, setCollectionType] = useState<"residential" | "school" | "commercial">("residential");
  const [confirmed, setConfirmed] = useState(false);
  const [result, setResult] = useState<RuleResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const validZip = /^\d{5}$/.test(zipCode.trim());

  useEffect(() => {
    // Reset the source and confirmation when the ZIP changes. A previous
    // city's result must never follow the user into another postal area.
    setCatalog(null);
    setResult(null);
    setSelectedProgram("");
    setSelectedItem("");
    setConfirmed(false);
    setError("");
    if (!open || !validZip) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    fetch("/api/local-rules/programs?zip_code=" + encodeURIComponent(zipCode.trim()),
      { signal: controller.signal })
      .then(response => readJson<Catalog>(response))
      .then(data => { if (!controller.signal.aborted) setCatalog(data); })
      .catch(e => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Local rules are unavailable."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [open, zipCode, validZip]);

  const matches = useMemo(
    () => catalog?.programs.filter(p => p.postal_area_match) ?? [], [catalog]
  );
  async function check() {
    if (!validZip || !catalog || !selectedProgram || !selectedItem || !confirmed
      || collectionType !== "residential" || checking) return;
    setChecking(true);
    setError("");
    setResult(null);
    try {
      const query = new URLSearchParams({
        zip_code: zipCode.trim(),
        program_id: selectedProgram,
        category: selectedItem,
        context: collectionType,
        service_confirmed: "true",
      });
      setResult(await readJson<RuleResult>(
        await fetch("/api/local-rules/check?" + query.toString())
      ));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not check local policy.");
    } finally {
      setChecking(false);
    }
  }

  const selected = matches.find(p => p.id === selectedProgram);
  return <details className="local-rules-checker" open={open}
    onToggle={event => setOpen(event.currentTarget.open)}>
    <summary><MapPin size={19}/>{t("Check local recycling rules")}
      <ChevronDown size={17} className="local-rules-chevron"/></summary>
    <div className="local-rules-body">
      <p className="local-rules-scope">
        {t("WasteLens works nationwide. Verified municipal rules are available for selected residential programs only.")}
      </p>
      <div className="local-rules-controls">
        <label htmlFor="local-rule-zip">{t("Your ZIP code")}
          <input id="local-rule-zip" inputMode="numeric" autoComplete="postal-code"
            maxLength={5} pattern="[0-9]{5}" placeholder="e.g. 75070 or 94103"
            value={zipCode} onChange={event=>onZipChange(event.target.value.replace(/\D/g,"").slice(0,5))}/>
        </label>
        <label htmlFor="local-rule-context">{t("Where is the waste collected?")}
          <select id="local-rule-context" value={collectionType}
            onChange={event => {
              setCollectionType(event.target.value as "residential"|"school"|"commercial");
              setConfirmed(false);setSelectedProgram("");setResult(null);
            }}>
            <option value="residential">{t("At home (residential)")}</option>
            <option value="school">{t("At school")}</option>
            <option value="commercial">{t("At a business")}</option>
          </select>
        </label>
      </div>
      {!validZip&&<p className="local-rules-scope">{t("Enter a five-digit ZIP code to look for a covered collection program.")}</p>}
      {loading&&<p className="local-rules-scope" role="status">{t("Looking up your postal area…")}</p>}
      {catalog&&<p className="local-rules-postal">
        <MapPin size={15}/>{t("ZIP postal area")}: <strong>{catalog.postal_area}</strong>
        <span>{t("A ZIP code does not prove which city or collection service covers your address.")}</span>
      </p>}
      {validZip&&catalog&&collectionType!=="residential"&&
        <p className="local-rules-scope" role="status">{t("School and business waste services use site-specific contracts. Ask your facility or hauler for its accepted-material list.")}</p>}
      {validZip&&catalog&&collectionType==="residential"&&matches.length===0&&
        <div className="local-rule-result local-rule-unverified" role="status">
          <div className="local-rule-result-head"><ShieldAlert size={19}/>
            <strong>{t("No verified residential program for this ZIP yet")}</strong></div>
          <p>{t("You can still scan items and find nearby collection locations. Check the rules directly with your city or waste provider before using a bin.")}</p>
          <a href="https://www.epa.gov/recycle" target="_blank" rel="noopener noreferrer">
            {t("General EPA recycling guidance")} <ExternalLink size={15}/></a>
        </div>}
      {validZip&&catalog&&collectionType==="residential"&&matches.length>0&&<>
        <div className="local-rules-controls">
          <label htmlFor="local-rule-program">{t("Confirm your collection program")}
            <select id="local-rule-program" value={selectedProgram} onChange={event=>{
              setSelectedProgram(event.target.value);setConfirmed(false);setResult(null);setError("");
            }}>
              <option value="">{t("Select your actual service")}</option>
              {matches.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <label htmlFor="local-rule-category">{t("Confirm the item type")}
            <select id="local-rule-category" value={selectedItem} onChange={event=>{
              setSelectedItem(event.target.value);setResult(null);setError("");
            }}>
              <option value="">{t("Choose an item")}</option>
              {catalog.categories.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </label>
        </div>
        <label className="local-rules-confirm">
          <input type="checkbox" checked={confirmed} disabled={!selectedProgram}
            onChange={event=>{setConfirmed(event.target.checked);setResult(null);}}/>
          <span>{t("I confirm this city residential collection program serves my address.")}</span>
        </label>
        <button type="button" className="local-rule-check-button" onClick={()=>void check()}
          disabled={!selected||!selectedItem||!confirmed||checking}>
          {checking?t("Checking…"):t("Check the official rule")}
        </button>
        {selected&&<p className="local-rules-scope">{t("Guidance is for this selected residential service, not school, commercial, or neighboring city bins.")}</p>}
      </>}
      {error&&<p role="alert" className="local-rules-error">{error}</p>}
      {result&&<div className={"local-rule-result local-rule-"+result.status} role="status">
        <div className="local-rule-result-head">
          {result.status==="recycle"?<CheckCircle2 size={20}/>:<ShieldAlert size={20}/>}
          <strong>{result.status_label}</strong>
        </div>
        <p><strong>{result.program}</strong></p>
        <p>{result.direction}</p>
        <a href={result.source_url} target="_blank" rel="noopener noreferrer">
          {t("View the official collection guidance")} <ExternalLink size={15}/>
        </a>
      </div>}
    </div>
  </details>;
}
