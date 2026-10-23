import {useState} from "react";
import {ClipboardCopy,Printer} from "lucide-react";
import {useLanguage} from "./i18n";
import type {ItemAnalysis} from "./types";

// Compact actions for the steps already shown above.
// No second "What to do with it" heading or duplicate checklist.
export default function ScanStepTools({analysis}:{analysis:ItemAnalysis}){
  const {t}=useLanguage();
  const [copied,setCopied]=useState(false);
  const needsRules=["check_recycling","check_compost","special_dropoff"].includes(analysis.route);
  const steps=[...analysis.disposal_steps,...(needsRules?[t("Check local rules")]:[])];
  const fullText=[analysis.item_name,...steps.map((step,i)=>`${i+1}. ${step}`)].join("\n");
  return <div className="scan-step-tools">
    <button type="button" onClick={async()=>{
      try {await navigator.clipboard.writeText(fullText);setCopied(true);}
      catch {setCopied(false);}
    }}>
      <ClipboardCopy size={16}/>{t(copied?"Copied!":"Copy steps")}
    </button>
    <button type="button" onClick={()=>window.print()}>
      <Printer size={16}/>{t("Save or print")}
    </button>
  </div>;
}
