import { useEffect, useRef, useState } from "react";
import { ChevronDown, MapPin } from "lucide-react";
import { useLanguage } from "./i18n";
import TexasDemoRules from "./TexasDemoRules";

type Props={
  zipCode:string;onZipChange:(value:string)=>void;openRequest?:number;
  scanItemName?:string;scanMaterial?:string;scanIdentified?:boolean;
};

/** One action: apply the selected school's, office's or business's documented
 * collection instructions to the scanned item. ZIP searching belongs in Finder.
 */
export default function LocalRulesGuide({
  openRequest=0,scanItemName="",scanMaterial="",scanIdentified=false,
}:Props){
  const {t}=useLanguage();
  const [open,setOpen]=useState(false);
  const checkerRef=useRef<HTMLDetailsElement>(null);
  useEffect(()=>{
    if(openRequest<=0)return;
    setOpen(true);
    checkerRef.current?.scrollIntoView({block:"start"});
    checkerRef.current?.querySelector("summary")?.focus();
  },[openRequest]);
  return <details id="scan-local-rules" className="local-rules-checker"
    ref={checkerRef} open={open} onToggle={e=>setOpen(e.currentTarget.open)}>
    <summary><MapPin size={19}/>{t("Check local recycling rules")}
      <ChevronDown size={17} className="local-rules-chevron"/></summary>
    <div className="local-rules-body">
      <TexasDemoRules itemName={scanItemName} materialGuess={scanMaterial}
        isIdentified={scanIdentified}/>
    </div>
  </details>;
}
