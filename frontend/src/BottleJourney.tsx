import { useEffect, useRef, useState } from "react";
import { Award, RefreshCw } from "lucide-react";
import type { SessionUser, WasteLensBadge } from "./types";
import { useLanguage } from "./i18n";
import { actionHeaders } from "./AccountArea";
import DocumentaryStory from "./DocumentaryStory";

const quiz=[
  {id:"reuse",question:"What's an easy way to use fewer single-use bottles?",
    options:[["refill","Use a refillable bottle"],["more_bottles","Buy extra single-use bottles"],["throw_away","Throw bottles away sooner"]]},
  {id:"symbol",question:"Does the recycling symbol guarantee an item is accepted near you?",
    options:[["symbol_yes","Yes, everywhere"],["check_rules","No, check local collection rules"],["only_green","Only if the bottle is green"]]},
  {id:"ocean",question:"What can happen to plastic litter left outdoors?",
    options:[["disappear","It disappears quickly"],["rivers","It can reach rivers and oceans"],["become_food","It turns into food for wildlife"]]},
  {id:"deposit",question:"Why return an eligible deposit bottle?",
    options:[["return_deposit","You may get a deposit refund"],["return_all","Every bottle earns money everywhere"],["bury","It is better to bury it"]]},
  {id:"prevention",question:"What helps stop waste before it reaches a beach or river?",
    options:[["leave_it","Leave it for a cleanup team"],["prevent_litter","Reuse items and dispose of waste responsibly"],["ocean_dump","Put unwanted plastic in the water"]]},
];

const translatedQuiz: Record<"es"|"hi",{question:string;options:string[]}[]> = {
  es:[
    {question:"¿Cómo puedes usar menos botellas desechables?",options:["Usa una botella rellenable","Compra más botellas desechables","Tira las botellas antes"]},
    {question:"¿El símbolo de reciclaje garantiza que acepten un objeto cerca de ti?",options:["Sí, en todas partes","No, consulta las reglas locales","Solo si la botella es verde"]},
    {question:"¿Qué puede pasar con el plástico tirado al aire libre?",options:["Desaparece enseguida","Puede llegar a ríos y océanos","Se convierte en comida para animales"]},
    {question:"¿Por qué devolver una botella elegible con depósito?",options:["Puedes recuperar el depósito","Todas las botellas pagan en cualquier lugar","Es mejor enterrarla"]},
    {question:"¿Qué ayuda a evitar que la basura llegue a ríos o playas?",options:["Déjala para una limpieza","Reutiliza y desecha correctamente","Tira el plástico al agua"]},
  ],
  hi:[
    {question:"कम डिस्पोज़ेबल बोतलें इस्तेमाल करने का आसान तरीका क्या है?",options:["दोबारा भरी जा सकने वाली बोतल इस्तेमाल करें","और डिस्पोज़ेबल बोतलें खरीदें","बोतलें जल्दी फेंक दें"]},
    {question:"क्या रीसायक्लिंग का चिन्ह साबित करता है कि स्थानीय सेवा वस्तु लेगी?",options:["हाँ, हर जगह","नहीं, स्थानीय नियम जाँचें","सिर्फ हरी बोतल के लिए"]},
    {question:"बाहर फेंके गए प्लास्टिक कचरे का क्या हो सकता है?",options:["जल्दी गायब हो जाता है","नदी और समुद्र तक पहुँच सकता है","जानवरों का भोजन बन जाता है"]},
    {question:"पात्र जमा वाली बोतल वापस क्यों करें?",options:["जमा राशि वापस मिल सकती है","हर बोतल से हर जगह पैसे मिलते हैं","उसे दबाना बेहतर है"]},
    {question:"कचरा नदी या समुद्र तट तक पहुँचने से कैसे रोकें?",options:["सफ़ाई टीम के लिए छोड़ दें","दोबारा उपयोग करें और कचरा सही जगह डालें","प्लास्टिक पानी में डाल दें"]},
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
          <strong>{language==="es"?`${result.score} de ${result.total} correctas`:language==="hi"?`${result.total} में से ${result.score} सही`:`${result.score} out of ${result.total} correct`}</strong>
          <p>{language==="en"?result.message:result.unlocked_badge?(language==="es"?"¡Insignia desbloqueada!":"बैज मिला!") :result.passed?(language==="es"?"¡Excelente!":"बहुत बढ़िया!") :language==="es"?"Revisa las respuestas e inténtalo otra vez.":"जवाब जाँचें और फिर प्रयास करें।"}</p>
          {result.unlocked_badge&&<span className="journey-badge-earned"><Award size={19}/> {t("Bottle Explorer · +30 XP")}</span>}
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
