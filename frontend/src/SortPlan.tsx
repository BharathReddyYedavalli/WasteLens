import { useEffect, useState } from "react";
import { Check, ClipboardCopy, Printer, Volume2, VolumeX } from "lucide-react";
import type { ItemAnalysis } from "./types";
import { useLanguage } from "./i18n";

export default function SortPlan({ analysis }: { analysis: ItemAnalysis }) {
  const { language, t } = useLanguage();
  const [speaking, setSpeaking] = useState(false);
  useEffect(() => {
    return () => {
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, [language]);
  const [done, setDone] = useState<number[]>([]);
  const [copied, setCopied] = useState(false);
  const safetyCheck = ["check_recycling", "check_compost", "special_dropoff"].includes(analysis.route);
  const steps = [
    ...analysis.disposal_steps,
    ...(safetyCheck ? [t("Check local rules")] : []),
  ];
  const count = steps.length;
  function toggleSpeech() {
    if (!("speechSynthesis" in window)) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    window.speechSynthesis.cancel();
    const phrase = new SpeechSynthesisUtterance([analysis.item_name, ...steps].join(". "));
    phrase.lang = language === "hi" ? "hi-IN" : language === "es" ? "es-US" : "en-US";
    phrase.rate = 0.9;
    phrase.onend = () => setSpeaking(false);
    phrase.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(phrase);
  }
  async function copyPlan() {
    const text = [analysis.item_name, ...steps.map((step, index) => (index + 1) + ". " + step)].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }
  return <article className="sort-plan" aria-label={t("Sort plan")}>
    <div className="sort-plan-top">
      <div><span className="eyebrow">01  /  {t("Sort plan")}</span>
        <h3>{t("What to do with it")}</h3>
        <p>{t("Check each step as you go")}</p>
      </div>
      <span className="sort-plan-counter"><Check size={16}/>{done.length}/{count}</span>
    </div>
    <div className="sort-plan-progress" aria-hidden="true"><span style={{width: count ? done.length / count * 100 + "%" : "0%"}}/></div>
    <div className="sort-plan-steps">
      {steps.map((step,index) => <label key={index} className={"sort-step " + (done.includes(index) ? "complete" : "")}>
        <input type="checkbox" checked={done.includes(index)}
          onChange={event => setDone(previous => event.target.checked
            ? [...previous, index]
            : previous.filter(x => x !== index))}/>
        <span className="sort-step-number">{index + 1}</span>
        <span>{step}</span>
      </label>)}
    </div>
    <div className="sort-plan-tools">
      <button type="button" onClick={() => void copyPlan()}><ClipboardCopy size={16}/>{copied ? t("Copied!") : t("Copy steps")}</button>
      <button type="button" onClick={() => window.print()}><Printer size={16}/>{t("Save or print")}</button>
      {"speechSynthesis" in window && <button type="button" aria-pressed={speaking}
        onClick={toggleSpeech}>{speaking ? <VolumeX size={16}/> : <Volume2 size={16}/>}
        {speaking ? t("Stop reading") : t("Listen")}
      </button>}
    </div>
  </article>;
}
