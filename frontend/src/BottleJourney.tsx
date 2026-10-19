import { useEffect, useRef, useState } from "react";
import { Award, Leaf, RefreshCw } from "lucide-react";
import type { SessionUser, WasteLensBadge } from "./types";
import { useLanguage } from "./i18n";
import { actionHeaders } from "./AccountArea";
import DocumentaryStory from "./DocumentaryStory";

const quiz=[
  {id:"ca",question:"In California, how much is CRV for a regular 24 oz eligible bottle?",
    options:[["ca5","5 cents"],["ca10","10 cents"],["ca25","25 cents"]]},
  {id:"mi",question:"Can an ordinary still water bottle earn Michigan's 10¢ deposit?",
    options:[["mi_yes","Yes, every water bottle"],["mi_no","No, ordinary water isn't covered"],["mi_all","Only if it's blue"]]},
  {id:"or",question:"What is a special Oregon bottle bill rule?",
    options:[["or_all","All wine bottles qualify"],["or_can","Qualifying wine in a metal can may qualify"],["or_none","Wine is always excluded"]]},
  {id:"hi",question:"Does Hawaii refund its separate 1¢ container fee?",
    options:[["hi_yes","Yes, you get 6¢ back"],["hi_fee","No, only the 5¢ deposit is refundable"],["hi_none","There is no deposit"]]},
  {id:"state",question:"What's essential before returning a deposit bottle?",
    options:[["anywhere","Return it in any deposit state"],["same_state","Confirm the deposit was paid in that state"],["all_plastic","All plastic bottles qualify"]]},
];

const translatedQuiz: Record<"es"|"hi",{question:string;options:string[]}[]> = {
  es:[
    {question:"En California, ¿cuánto vale un envase elegible de 24 onzas?",options:["5 centavos","10 centavos","25 centavos"]},
    {question:"¿Una botella común de agua natural recibe 10¢ en Míchigan?",options:["Sí, todas","No, el agua natural no está incluida","Solo si es azul"]},
    {question:"¿Qué regla especial tiene Oregón?",options:["Toda botella de vino está incluida","Ciertos vinos en lata pueden estar incluidos","Ningún vino está incluido"]},
    {question:"¿Hawái devuelve la tarifa adicional de 1¢?",options:["Sí, devuelve 6¢","No, solo devuelve el depósito de 5¢","No existe ningún depósito"]},
    {question:"¿Qué debes comprobar antes de devolver una botella?",options:["Puedo devolverla en cualquier estado","Que se pagó el depósito en ese estado","Toda botella de plástico está incluida"]},
  ],
  hi:[
    {question:"कैलिफ़ोर्निया में 24 औंस की पात्र बोतल पर कितने सेंट मिलते हैं?",options:["5 सेंट","10 सेंट","25 सेंट"]},
    {question:"क्या मिशिगन में साधारण पानी की बोतल पर 10 सेंट मिलते हैं?",options:["हाँ, हर बोतल पर","नहीं, साधारण पानी शामिल नहीं है","सिर्फ नीली बोतल पर"]},
    {question:"ओरेगन का कौन सा नियम सही है?",options:["हर वाइन बोतल शामिल है","कुछ वाइन के धातु कैन पात्र हैं","कोई वाइन पात्र नहीं है"]},
    {question:"क्या हवाई अलग 1 सेंट शुल्क वापस करता है?",options:["हाँ, 6 सेंट वापस","नहीं, केवल 5 सेंट जमा राशि","कोई जमा शुल्क नहीं है"]},
    {question:"बोतल जमा करने से पहले क्या जाँचना चाहिए?",options:["किसी भी राज्य में लौटाएँ","उस राज्य में जमा राशि दी गई थी","हर प्लास्टिक बोतल पात्र है"]},
  ],
};

type QuizResult={score:number;total:number;passed:boolean;earned_xp:number;
  unlocked_badge:WasteLensBadge|null;signed_in:boolean;message:string};
export default function BottleJourney({user,onUnlock,onSignIn,onScan,onReturns}:{user:SessionUser|null;onUnlock:(badge:WasteLensBadge)=>void;onSignIn:()=>void;onScan:()=>void;onReturns:()=>void}){
  const { language,t } = useLanguage();
  const wrapper=useRef<HTMLDivElement>(null);
  const [progress,setProgress]=useState(0);
  const [selected,setSelected]=useState<Record<string,string>>({});
  const [result,setResult]=useState<QuizResult|null>(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [awarded,setAwarded]=useState(false);
  useEffect(()=>{
    let frame=0;
    const measure=()=>{
      cancelAnimationFrame(frame);
      frame=requestAnimationFrame(()=>{
        const el=wrapper.current;if(!el)return;
        const start=el.getBoundingClientRect().top;
        const length=Math.max(1,el.offsetHeight-window.innerHeight);
        setProgress(Math.min(100,Math.max(0,-start/length*100)));
      });
    };
    measure();window.addEventListener("scroll",measure,{passive:true});window.addEventListener("resize",measure);
    return ()=>{window.removeEventListener("scroll",measure);window.removeEventListener("resize",measure);cancelAnimationFrame(frame);};
  },[]);
  useEffect(()=>{
    let active=true;
    fetch("/api/deposit/quiz/progress",{credentials:"same-origin"})
      .then(r=>r.json()).then(d=>{if(active)setAwarded(Boolean(d.awarded))}).catch(()=>{});
    return ()=>{active=false;};
  },[user]);
  async function submit(){
    if(quiz.some(q=>!selected[q.id])||loading)return;
    setError("");setLoading(true);
    try{
      const response=await fetch("/api/deposit/quiz/submit",{
        method:"POST",credentials:"same-origin",headers:actionHeaders,
        body:JSON.stringify({answers:quiz.map(q=>selected[q.id])}),
      });
      const data=await response.json();
      if(!response.ok)throw new Error(typeof data.detail==="string"?data.detail:"Could not submit quiz.");
      setResult(data as QuizResult);
      if(data.unlocked_badge){setAwarded(true);onUnlock(data.unlocked_badge as WasteLensBadge);}
    }catch(e){setError(e instanceof Error?e.message:"Please try again.");}
    finally{setLoading(false);}
  }
  function retry(){setSelected({});setResult(null);setError("");}
  return <div className="journey-page" ref={wrapper}>
    <div className="journey-progress" aria-hidden="true"><span style={{width:progress+"%"}}/></div>
    <DocumentaryStory onScan={onScan} onReturns={onReturns}/>
    <section className="journey-quiz" id="bottle-quiz">
      <h2>{language==="en"?"Test what you've learned":language==="es"?"Pon a prueba lo aprendido":"जो सीखा उसे आज़माएँ"}</h2>
      {!user && <p className="journey-signin-reminder">{language==="en"?"Sign in before the quiz to save your badge and XP.":language==="es"?"Entra antes de jugar para guardar la insignia y los XP.":"बैज और XP पाने के लिए क्विज़ से पहले लॉग इन करें।"} <button type="button" onClick={onSignIn}>{t("Sign in")}</button></p>}
      <p className="journey-quiz-intro">{language==="en"?"5 questions. Get 4 right to earn the Bottle Explorer badge and 30 XP once.":language==="es"?"5 preguntas. Acertar 4 te da la insignia Bottle Explorer y 30 XP una vez.":"5 सवाल। 4 सही उत्तर पर Bottle Explorer बैज और 30 XP एक बार मिलेंगे।"}</p>
      <div className="journey-quiz-card">
        {quiz.map((q,index)=><fieldset key={q.id} className="journey-question" disabled={loading||Boolean(result?.passed)}>
          <legend><span>{String(index+1).padStart(2,"0")}</span>{language==="en"?q.question:translatedQuiz[language][index].question}</legend>
          <div className="journey-choices">
            {q.options.map(([answer,label],i)=><label key={answer} className={"journey-choice "+(selected[q.id]===answer?"picked":"")}>
              <input type="radio" name={q.id} checked={selected[q.id]===answer}
                onChange={()=>{setSelected(prev=>({...prev,[q.id]:answer}));setResult(null);}}/>
              <span>{language==="en"?label:translatedQuiz[language][index].options[i]}</span>
            </label>)}
          </div>
        </fieldset>)}
        {result&&<div className={"journey-quiz-outcome "+(result.passed?"passed":"")} role="status">
          <strong>{result.score} out of {result.total} correct</strong>
          <p>{language==="en"?result.message:result.unlocked_badge?(language==="es"?"¡Insignia desbloqueada!":"बैज मिला!") :result.passed?(language==="es"?"¡Excelente!":"बहुत बढ़िया!") :language==="es"?"Revisa las respuestas e inténtalo otra vez.":"जवाब जाँचें और फिर प्रयास करें।"}</p>
          {result.unlocked_badge&&<span className="journey-badge-earned"><Award size={19}/> Bottle Explorer · +30 XP</span>}
          {result.passed&&!result.signed_in&&<button type="button" className="journey-login" onClick={onSignIn}>{t("Sign in to earn the badge")}</button>}
        </div>}
        {error&&<p role="alert" className="journey-quiz-error">{error}</p>}
        <div className="journey-quiz-actions">
          <button type="button" className="journey-submit" disabled={loading||quiz.some(q=>!selected[q.id])||Boolean(result?.passed)}
            onClick={()=>void submit()}>{loading?"…":awarded?t("Check answers"):t("Finish quiz")}</button>
          {result&&!result.passed&&<button type="button" className="journey-retry" onClick={retry}><RefreshCw size={18}/> {t("Try again")}</button>}
        </div>
      </div>
    </section>
  </div>;
}
