import { useEffect, useState } from "react";
import { CheckCircle2, ChevronDown, ExternalLink, MapPin, ShieldAlert } from "lucide-react";
import { useLanguage } from "./i18n";

type Category = { id: string; label: string };
type Catalog = { program: string; scope: string; categories: Category[] };
type RuleResult = {
  category: string;
  item_name: string;
  status: "recycle" | "trash" | "dropoff" | "special" | "unverified";
  status_label: string;
  direction: string;
  source_url: string;
  scope: string;
  contact: string;
};

const statusText: Record<RuleResult["status"], string> = {
  recycle: "Residential blue cart",
  trash: "Not accepted in blue cart",
  dropoff: "Separate city drop-off",
  special: "Special collection",
  unverified: "Not confirmed",
};

async function jsonOrThrow<T>(response: Response): Promise<T> {
  if (!response.ok) throw new Error("Couldn't load city recycling rules. Try again.");
  return await response.json() as T;
}

/** Opt-in local policy check: item category is always confirmed by the person. */
export default function LocalRulesGuide() {
  const { language } = useLanguage();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [selected, setSelected] = useState("");
  const [result, setResult] = useState<RuleResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open || catalog) return;
    let active = true;
    fetch("/api/local-rules/frisco/categories")
      .then(response => jsonOrThrow<Catalog>(response))
      .then(data => { if (active) setCatalog(data); })
      .catch(e => { if (active) setError(e instanceof Error ? e.message : "Couldn't load local rules."); });
    return () => { active = false; };
  }, [open, catalog]);

  async function check() {
    if (!selected || busy) return;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const url = "/api/local-rules/frisco/check?context=residential&category=" + encodeURIComponent(selected);
      setResult(await jsonOrThrow<RuleResult>(await fetch(url)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't check the rule.");
    } finally {
      setBusy(false);
    }
  }

  const heading = language === "es" ? "Consultar normas de reciclaje de Frisco" :
    language === "hi" ? "Frisco के रीसायक्लिंग नियम जाँचें" : "Check Frisco recycling rules";
  const note = language === "es"
    ? "Solo para contenedores domésticos de Frisco. Las escuelas tienen normas distintas."
    : language === "hi"
      ? "केवल Frisco के घरों के लिए। स्कूलों के नियम अलग हो सकते हैं।"
      : "For Frisco home recycling only. School and business bins may follow different rules.";
  const prompt = language === "es" ? "Confirma el tipo de objeto" :
    language === "hi" ? "वस्तु का प्रकार पक्का करें" : "Confirm the item type";
  const lookup = language === "es" ? "Consultar" : language === "hi" ? "नियम देखें" : "Check rule";
  const source = language === "es" ? "Normas oficiales de la ciudad" :
    language === "hi" ? "शहर के आधिकारिक नियम" : "Official city rules";

  return <details className="local-rules-checker" open={open}
    onToggle={event => setOpen(event.currentTarget.open)}>
    <summary><MapPin size={19}/>{heading}<ChevronDown size={17} className="local-rules-chevron"/></summary>
    <div className="local-rules-body">
      <p className="local-rules-scope">{note}</p>
      <div className="local-rules-controls">
        <label htmlFor="local-rule-category">{prompt}
          <select id="local-rule-category" value={selected} disabled={!catalog || busy}
            onChange={event => { setSelected(event.target.value); setResult(null); setError(""); }}>
            <option value="">{language === "es" ? "Elige un objeto" : language === "hi" ? "वस्तु चुनें" : "Choose an item"}</option>
            {catalog?.categories.map(category =>
              <option key={category.id} value={category.id}>{category.label}</option>)}
          </select>
        </label>
        <button type="button" onClick={() => void check()} disabled={!selected || busy}>
          {busy ? "…" : lookup}
        </button>
      </div>
      {error && <p className="local-rules-error" role="alert">{error}</p>}
      {result && <div className={"local-rule-result local-rule-" + result.status} role="status">
        <div className="local-rule-result-head">
          {result.status === "recycle" ? <CheckCircle2 size={20}/> : <ShieldAlert size={20}/>}
          <strong>{statusText[result.status]}</strong>
        </div>
        <p>{result.direction}</p>
        <a href={result.source_url} target="_blank" rel="noopener noreferrer">
          {source}<ExternalLink size={15}/>
        </a>
      </div>}
    </div>
  </details>;
}
