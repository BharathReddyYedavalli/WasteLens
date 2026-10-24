import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, ChevronDown, ExternalLink, MapPin, ShieldAlert } from "lucide-react";
import { useLanguage } from "./i18n";
import TexasDemoRules from "./TexasDemoRules";

type CollectionContext = "residential" | "school" | "commercial";

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
type DiscoveryLink = { label: string; url: string; kind: "official_reference" | "unverified_web_search" };
type Discovery = {
  zip_code: string; postal_area: string; item_name: string; status: "unverified";
  local_acceptance_verified: false; next_step: string; disclaimer: string;
  official_links: DiscoveryLink[]; local_search: DiscoveryLink;
};
type Props = {
  zipCode: string;
  onZipChange: (value: string) => void;
  openRequest?: number;
  scanItemName?: string;
  scanMaterial?: string;
  scanIdentified?: boolean;
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

export default function LocalRulesGuide({
  zipCode, onZipChange, openRequest = 0,
  scanItemName = "", scanMaterial = "", scanIdentified = false,
}: Props) {
  const { t, language } = useLanguage();
  const [open, setOpen] = useState(false);
  const checkerRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (openRequest <= 0) return;
    setOpen(true);
    checkerRef.current?.scrollIntoView({block: "start"});
    checkerRef.current?.querySelector("summary")?.focus();
  }, [openRequest]);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [selectedProgram, setSelectedProgram] = useState("");
  const [selectedItem, setSelectedItem] = useState("");
  const [discoveryItem, setDiscoveryItem] = useState("");
  const [showOtherProvider, setShowOtherProvider] = useState(false);
  const [discovery, setDiscovery] = useState<Discovery | null>(null);
  const [discovering, setDiscovering] = useState(false);
  const pendingDiscovery = useRef<AbortController | null>(null);
  const [collectionType, setCollectionType] = useState<CollectionContext>("residential");
  const [showOtherServices, setShowOtherServices] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [result, setResult] = useState<RuleResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const pendingCheck = useRef<AbortController | null>(null);
  const [error, setError] = useState("");
  const validZip = /^\d{5}$/.test(zipCode.trim());

  function clearPendingRuleCheck() {
    pendingCheck.current?.abort();
    pendingCheck.current = null;
    setChecking(false);
    setResult(null);
  }

  function clearDiscovery() {
    pendingDiscovery.current?.abort();
    pendingDiscovery.current = null;
    setDiscovering(false);
    setDiscovery(null);
  }

  function updateZipCode(value: string) {
    clearDiscovery();
    clearPendingRuleCheck();
    setConfirmed(false);
    onZipChange(value.replace(/\D/g, "").slice(0, 5));
  }

  function updateCollectionType(nextType: CollectionContext) {
    clearPendingRuleCheck();
    clearDiscovery();
    setCollectionType(nextType);
    setConfirmed(false);
    setSelectedProgram("");
  }

  function updateProgram(programId: string) {
    clearPendingRuleCheck();
    clearDiscovery();
    setSelectedProgram(programId);
    setConfirmed(false);
    setError("");
  }

  function updateItem(itemId: string) {
    clearPendingRuleCheck();
    setSelectedItem(itemId);
    setError("");
  }

  function updateConfirmation(isConfirmed: boolean) {
    clearPendingRuleCheck();
    setConfirmed(isConfirmed);
  }

  useEffect(() => {
    // Reset the source and confirmation when the ZIP changes. A previous
    // city's result must never follow the user into another postal area.
    pendingCheck.current?.abort();
    pendingCheck.current = null;
    setChecking(false);
    setCatalog(null);
    setResult(null);
    setSelectedProgram("");
    setSelectedItem("");
    setDiscoveryItem("");
    setShowOtherProvider(false);
    pendingDiscovery.current?.abort();
    pendingDiscovery.current = null;
    setDiscovery(null);
    setDiscovering(false);
    setConfirmed(false);
    setError("");
    if (!open || !showOtherServices || !validZip) {
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
  }, [open, showOtherServices, zipCode, validZip]);

  const matchingPrograms = useMemo(
    () => catalog?.programs.filter(program => program.postal_area_match) ?? [],
    [catalog]
  );

  async function checkSelectedRule() {
    if (!validZip || !catalog || !selectedProgram || !selectedItem || !confirmed
      || collectionType !== "residential" || checking) return;
    pendingCheck.current?.abort();
    const controller = new AbortController();
    pendingCheck.current = controller;
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
      const data = await readJson<RuleResult>(
        await fetch("/api/local-rules/check?" + query.toString(), {signal: controller.signal})
      );
      if (!controller.signal.aborted) setResult(data);
    } catch (e) {
      if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Could not check local policy.");
    } finally {
      if (!controller.signal.aborted) setChecking(false);
    }
  }

  async function findGuidance() {
    if (!validZip || !catalog || !discoveryItem || discovering) return;
    clearDiscovery();
    const controller = new AbortController();
    pendingDiscovery.current = controller;
    setDiscovering(true);
    setError("");
    try {
      const query = new URLSearchParams({
        zip_code: zipCode.trim(), category: discoveryItem, context: collectionType,
      });
      const data = await readJson<Discovery>(
        await fetch("/api/local-rules/discovery?" + query.toString(), {signal: controller.signal})
      );
      if (!controller.signal.aborted) setDiscovery(data);
    } catch (e) {
      if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Could not load guidance.");
    } finally {
      if (!controller.signal.aborted) setDiscovering(false);
    }
  }

  const currentProgram = matchingPrograms.find(program => program.id === selectedProgram);
  const canDiscover = validZip && catalog &&
    (collectionType !== "residential" || matchingPrograms.length === 0 || showOtherProvider);
  return <details id="scan-local-rules" ref={checkerRef} className="local-rules-checker" open={open}
    onToggle={event => setOpen(event.currentTarget.open)}>
    <summary><MapPin size={19}/>{t("Check local recycling rules")}
      <ChevronDown size={17} className="local-rules-chevron"/></summary>
    <div className="local-rules-body">
      <div className="local-rules-controls local-location-row">
        <label htmlFor="local-rule-zip">{t("Your ZIP code")}
          <input id="local-rule-zip" inputMode="numeric" autoComplete="postal-code"
            maxLength={5} pattern="[0-9]{5}" placeholder="e.g. 75070 or 94103"
            value={zipCode} onChange={event => updateZipCode(event.target.value)}/>
        </label>
        <label htmlFor="local-rule-context">{t("Where are you?")}
          <select id="local-rule-context" value={collectionType}
            onChange={event => updateCollectionType(event.target.value as CollectionContext)}>
            <option value="residential">{t("At home (residential)")}</option>
            <option value="school">{t("At school")}</option>
            <option value="commercial">{t("At a business")}</option>
          </select>
        </label>
      </div>
      <TexasDemoRules collectionType={collectionType} itemName={scanItemName}
        materialGuess={scanMaterial} isIdentified={scanIdentified}/>
      <button type="button" className="local-other-toggle"
        aria-expanded={showOtherServices} aria-controls="local-other-services"
        onClick={()=>setShowOtherServices(current=>!current)}>
        {t("My location isn't listed")} <ChevronDown size={17} aria-hidden="true"/>
      </button>
      {showOtherServices&&<div id="local-other-services" className="local-other-services">
        <p className="local-rules-scope">{t("For other services, check your provider's published rules.")}</p>
      {!validZip&&<p className="local-rules-scope">{t("Enter a five-digit ZIP code to look for a covered collection program.")}</p>}
      {loading&&<p className="local-rules-scope" role="status">{t("Looking up your postal area…")}</p>}
      {validZip&&catalog&&collectionType==="residential"&&matchingPrograms.length===0&&
        <div className="local-rule-result local-rule-unverified" role="status">
          <div className="local-rule-result-head"><ShieldAlert size={19}/>
            <strong>{t("No verified residential program for this ZIP yet")}</strong></div>
          <p>{t("You can still scan items and find nearby collection locations. Check the rules directly with your city or waste provider before using a bin.")}</p>

        </div>}
      {validZip&&catalog&&collectionType==="residential"&&matchingPrograms.length>0&&<>
        <div className="local-rules-controls">
          <label htmlFor="local-rule-program">{t("Confirm your collection program")}
            <select id="local-rule-program" value={selectedProgram} onChange={event => updateProgram(event.target.value)}>
              <option value="">{t("Select your actual service")}</option>
              {matchingPrograms.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <label htmlFor="local-rule-category">{t("Confirm the item type")}
            <select id="local-rule-category" value={selectedItem} onChange={event => updateItem(event.target.value)}>
              <option value="">{t("Choose an item")}</option>
              {catalog.categories.map(item=><option key={item.id} value={item.id}>{t(item.label)}</option>)}
            </select>
          </label>
        </div>
        <label className="local-rules-confirm">
          <input type="checkbox" checked={confirmed} disabled={!selectedProgram}
            onChange={event => updateConfirmation(event.target.checked)}/>
          <span>{t("I confirm this city residential collection program serves my address.")}</span>
        </label>
        <button type="button" className="local-rule-check-button" onClick={()=>void checkSelectedRule()}
          disabled={!currentProgram||!selectedItem||!confirmed||checking}>
          {checking?t("Checking…"):t("Check the official rule")}
        </button>
        <button type="button" className="local-discovery-toggle" aria-expanded={showOtherProvider}
          onClick={() => {clearDiscovery();setShowOtherProvider(current=>!current);}}>
          {showOtherProvider?t("Hide other options"):t("My collection provider isn't listed")}
        </button>
      </>}
      {canDiscover&&<section className="local-discovery" aria-label={t("Find local recycling guidance")}>
        <label htmlFor="local-discovery-item">{t("What item are you checking?")}
          <select id="local-discovery-item" value={discoveryItem} onChange={event=>{
            clearDiscovery();setDiscoveryItem(event.target.value);
          }}>
            <option value="">{t("Choose an item")}</option>
            {catalog?.categories.map(item=><option key={item.id} value={item.id}>{t(item.label)}</option>)}
          </select>
        </label>
        <button className="local-rule-check-button" type="button" disabled={!discoveryItem||discovering}
          onClick={()=>void findGuidance()}>
          {discovering?t("Checking…"):t("Find guidance and contacts")}
        </button>
        {discovery&&<div className="local-discovery-result" role="status">
          <strong><ShieldAlert size={18}/>{t("Local acceptance not confirmed")}</strong>
          <p>{discovery.next_step}</p>
          {language!=="en"&&<p className="local-rules-language-note">{t("Source-based disposal instructions are currently provided in English; follow the official link for precise requirements.")}</p>}
          <div className="local-discovery-links">
            {discovery.official_links.map(link=>
              <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer">
                {link.label}<ExternalLink size={14}/>
              </a>)}
            <a href={discovery.local_search.url} target="_blank" rel="noopener noreferrer">
              {t("Search for your local waste provider")} <ExternalLink size={14}/>
            </a>
          </div>
          <p className="local-discovery-caveat">{discovery.disclaimer}</p>
        </div>}
      </section>}
      {error&&<p role="alert" className="local-rules-error">{error}</p>}
      {result&&<div className={"local-rule-result local-rule-"+result.status} role="status">
        <div className="local-rule-result-head">
          {result.status==="recycle"?<CheckCircle2 size={20}/>:<ShieldAlert size={20}/>}
          <strong>{t(result.status_label)}</strong>
        </div>
        <p><strong>{result.program}</strong></p>
        {language!=="en"&&<p className="local-rules-language-note">{t("Source-based disposal instructions are currently provided in English; follow the official link for precise requirements.")}</p>}
        <p>{result.direction}</p>
        <a href={result.source_url} target="_blank" rel="noopener noreferrer">
          {t("View the official collection guidance")} <ExternalLink size={15}/>
        </a>
      </div>}

      </div>}
    </div>
  </details>;
}
