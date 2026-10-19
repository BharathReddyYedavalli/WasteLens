import { Fragment, useEffect, useRef, useState } from "react";
import { ArrowDown, Award, ExternalLink, Leaf, RefreshCw, Sparkles, Waves } from "lucide-react";
import type { SessionUser, WasteLensBadge } from "./types";
import { useLanguage } from "./i18n";
import { actionHeaders } from "./AccountArea";
import { JourneyCheckpoint, JourneyVignette } from "./JourneyExperiences";
import { ReadAloudButton } from "./Speech";

const chapters=[
  {id:"begin",year:"START",eyebrow:"THE BIG QUESTION",title:"Where does your bottle go?",description:"A little container has a surprisingly long story. Scroll down and follow the trail.",fact:"You might have already paid a refundable deposit when you bought your drink.",color:"mint",symbol:"bottle",source:"https://www.bottlebill.org/compare-all-states/"},
  {id:"cash",year:"01",eyebrow:"AT THE STORE",title:"That extra nickel has a job.",description:"In a deposit state, the drink price and the refundable deposit are separate. The deposit is there to encourage you to bring the container back.",fact:"Ten U.S. states currently run beverage deposit programs.",color:"yellow",symbol:"money",source:"https://www.bottlebill.org/compare-all-states/"},
  {id:"oregon",year:"1971",eyebrow:"A SMALL IDEA, A BIG FIRST",title:"Oregon starts a bottle revolution.",description:"Cars, coastlines, and roadsides had a litter problem. Oregon passed the first U.S. bottle bill in 1971 to encourage returns.",fact:"Oregon's modern refund value is 10¢ per eligible container.",color:"blue",symbol:"road",source:"https://www.oregon.gov/deq/recycling/Pages/Bottle-Bill.aspx"},
  {id:"california",year:"05 / 10 / 25",eyebrow:"SAME IDEA, DIFFERENT NUMBERS",title:"Not every bottle earns the same refund.",description:"California uses 5¢ below 24 ounces and 10¢ at 24 ounces or more. Special wine and spirits boxes and pouches can carry 25¢.",fact:"Bottle size and the kind of packaging matter.",color:"peach",symbol:"sizes",source:"https://calrecycle.ca.gov/bevcontainer/"},
  {id:"michigan",year:"10¢",eyebrow:"THE TWIST",title:"A water bottle can be worth nothing.",description:"Michigan has a 10¢ deposit on covered drinks, but ordinary still water and juice bottles are excluded. That's why a photo alone can't promise money.",fact:"A state's refund rate doesn't apply to every container.",color:"purple",symbol:"question",source:"https://www.michigan.gov/egle/faqs/recycling/general-recycling-information"},
  {id:"hawaii",year:"5¢ + 1¢",eyebrow:"TWO VERY DIFFERENT CENTS",title:"One coin comes back. One doesn't.",description:"Hawaii charges a refundable 5¢ deposit plus a separate 1¢ container fee. Only the 5¢ part comes back at redemption.",fact:"The extra fee helps support the recycling program.",color:"aqua",symbol:"coins",source:"https://health.hawaii.gov/hi5/consumers/"},
  {id:"sort",year:"CHECK",eyebrow:"BEFORE THE TRIP",title:"Give the bottle a quick check.",description:"Make sure it's the right beverage, size and material. Look for the refund message and check where it was bought. Keep it empty and follow your return center's instructions.",fact:"In New York, a container bought outside New York is not eligible for a New York refund.",color:"lime",symbol:"check",source:"https://dec.ny.gov/environmental-protection/recycling-composting/bottle-bill"},
  {id:"return",year:"RETURN",eyebrow:"AT THE RETURN COUNTER",title:"Back into the system.",description:"Eligible containers can go to participating stores or redemption centers. In some places, a machine counts them for you. You get the eligible deposit back.",fact:"Vermont has a separate 15¢ refund on eligible spirits containers.",color:"orange",symbol:"machine",source:"https://dec.vermont.gov/waste-management/solid/product-stewardship/vermonts-bottle-bill"},
  {id:"after",year:"NEXT",eyebrow:"AFTER THE RETURN",title:"What happens next?",description:"Collected containers are sorted for recycling. Glass, metal and plastic take different paths. A deposit increases the incentive to recover materials, but no single return proves an exact amount of carbon saved.",fact:"Oregon includes qualifying wine in a metal can starting in 2025.",color:"navy",symbol:"arrows",source:"https://www.oregon.gov/olcc/Pages/Bottle-Bill-Wine-In-A-Can.aspx"},
  {id:"yourturn",year:"YOU",eyebrow:"THE GOOD PART",title:"Small returns. Bigger habits.",description:"Think of every container as a choice. Refill what you can. Return what qualifies. Recycle the rest based on your local rules. Then teach someone else.",fact:"Ready to put your bottle knowledge to the test?",color:"sunset",symbol:"earth",source:"https://www.bottlebill.org/compare-all-states/"},
] as const;

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

type ChapterTranslation = {title:string; description:string; fact:string};
const translatedChapters: Record<"es"|"hi",ChapterTranslation[]> = {
  es: [
    {title:"¿A dónde va tu botella?",description:"Un envase pequeño tiene una historia muy larga. Desliza para seguir el camino.",fact:"Tal vez ya pagaste un depósito reembolsable al comprar tu bebida."},
    {title:"Esas monedas tienen una misión.",description:"En ciertos estados, pagas el precio de la bebida y un depósito separado. Si devuelves el envase, puedes recuperar ese depósito.",fact:"Diez estados de EE. UU. tienen programas de depósito para bebidas."},
    {title:"Oregón comienza una revolución.",description:"La basura en playas y carreteras era un problema. Oregón aprobó la primera ley de devolución de envases de EE. UU. en 1971.",fact:"Hoy Oregón devuelve 10¢ por cada envase elegible."},
    {title:"No todos los envases valen lo mismo.",description:"California devuelve 5¢ por envases de menos de 24 onzas y 10¢ por los más grandes. Ciertas cajas y bolsas de vino o licor valen 25¢.",fact:"Importan el tamaño y el tipo de envase."},
    {title:"Una botella de agua puede valer cero.",description:"Míchigan tiene un depósito de 10¢ para bebidas elegibles, pero excluye el agua natural y los jugos comunes. Una foto no garantiza dinero.",fact:"La tarifa del estado no se aplica a todos los envases."},
    {title:"Una moneda vuelve. Otra no.",description:"Hawái cobra un depósito reembolsable de 5¢ y una tarifa separada de 1¢ que no se devuelve.",fact:"La tarifa extra ayuda a financiar el sistema de reciclaje."},
    {title:"Antes de ir, revisa el envase.",description:"Comprueba la bebida, el tamaño y el material. Busca la marca de reembolso y confirma dónde se compró. Vacía el envase antes de devolverlo.",fact:"Nueva York no reembolsa un depósito que no se pagó en Nueva York."},
    {title:"De vuelta al sistema.",description:"Puedes llevar los envases elegibles a comercios o centros de devolución participantes. Algunas máquinas los cuentan por ti.",fact:"Vermont devuelve 15¢ por envases elegibles de bebidas espirituosas."},
    {title:"¿Qué sucede después?",description:"Los envases se clasifican para reciclar vidrio, metal y plástico por separado. Un retorno no demuestra un ahorro exacto de carbono.",fact:"En Oregón, ciertos vinos en lata son elegibles desde 2025."},
    {title:"Pequeños retornos. Mejores hábitos.",description:"Rellena lo que puedas. Devuelve lo que sea elegible. Recicla lo demás siguiendo las normas locales. Y comparte lo aprendido.",fact:"¿Listo para poner a prueba lo que sabes?"},
  ],
  hi: [
    {title:"आपकी बोतल कहाँ जाती है?",description:"एक छोटी बोतल की कहानी बहुत लंबी हो सकती है। नीचे जाकर इसकी यात्रा देखें।",fact:"हो सकता है आपने पेय खरीदते समय वापसी योग्य जमा राशि पहले ही दी हो।"},
    {title:"उस छोटे सिक्के का काम है।",description:"जमा शुल्क वाले राज्यों में पेय की कीमत के साथ अलग राशि ली जाती है। पात्र बोतल लौटाने पर वह राशि वापस मिल सकती है।",fact:"अमेरिका के 10 राज्यों में बोतल जमा कार्यक्रम हैं।"},
    {title:"ओरेगन से एक नई शुरुआत।",description:"सड़कों और समुद्र तटों पर कचरा बड़ी समस्या था। ओरेगन ने 1971 में अमेरिका का पहला बोतल जमा कानून पारित किया।",fact:"आज ओरेगन में पात्र बोतल पर 10 सेंट मिलते हैं।"},
    {title:"हर बोतल की रकम समान नहीं होती।",description:"कैलिफ़ोर्निया में 24 औंस से छोटी पात्र बोतल पर 5 सेंट और बड़ी पर 10 सेंट मिलते हैं। शराब के कुछ बॉक्स और पाउच पर 25 सेंट मिलते हैं।",fact:"बोतल का आकार और पैकेजिंग मायने रखते हैं।"},
    {title:"पानी की बोतल पर शून्य भी मिल सकता है।",description:"मिशिगन में कुछ पेयों पर 10 सेंट जमा है, लेकिन साधारण पानी और जूस की बोतलें शामिल नहीं हैं। फोटो से वापसी की गारंटी नहीं मिलती।",fact:"राज्य की जमा दर हर बोतल पर लागू नहीं होती।"},
    {title:"एक सिक्का लौटता है, दूसरा नहीं।",description:"हवाई में 5 सेंट वापसी योग्य जमा और अलग 1 सेंट शुल्क लगता है। केवल 5 सेंट वापस मिलते हैं।",fact:"अतिरिक्त शुल्क रीसायकल कार्यक्रम चलाने में मदद करता है।"},
    {title:"जमा करने से पहले जाँचें।",description:"पेय, आकार और सामग्री देखें। लेबल पर वापसी चिह्न खोजें और पता करें कहाँ खरीदा था। बोतल खाली रखें।",fact:"न्यूयॉर्क में दूसरे राज्य में खरीदी बोतल पर वापसी नहीं मिलती।"},
    {title:"बोतल वापस सिस्टम में।",description:"पात्र बोतलें भाग लेने वाली दुकानों या जमा केंद्रों में लौटाई जा सकती हैं। कुछ मशीनें बोतलें गिनती हैं।",fact:"वर्मोंट में पात्र स्पिरिट बोतलों पर 15 सेंट मिलते हैं।"},
    {title:"इसके बाद क्या होता है?",description:"जमा की गई बोतलों को रीसायकल के लिए छाँटा जाता है। काँच, धातु और प्लास्टिक के रास्ते अलग हैं। केवल जमा करने से कार्बन बचत की सही मात्रा पता नहीं चलती।",fact:"ओरेगन में कुछ वाइन कैन 2025 से पात्र हैं।"},
    {title:"छोटी वापसी, अच्छी आदतें।",description:"जो चीज़ दोबारा भर सकते हैं, भरें। पात्र बोतलें लौटाएँ। बाकी स्थानीय नियमों के अनुसार रीसायकल करें। दूसरों को भी सिखाएँ।",fact:"क्या आप अपना ज्ञान जाँचना चाहेंगे?"},
  ],
};
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

function Illustrated({kind}:{kind:string}){
  return <div className={"journey-art scene-"+kind} aria-hidden="true">
    <span className="journey-orbit orbit-one"/><span className="journey-orbit orbit-two"/>
    <svg viewBox="0 0 420 420" className="journey-svg" role="presentation">
      <circle cx="210" cy="205" r="158" fill="currentColor" opacity=".10"/>
      {kind==="road"&&<><path d="M0 305 Q170 240 420 300V420H0Z" fill="#478165" opacity=".5"/>
        <path d="M190 185L270 420" stroke="#fff3ce" strokeWidth="10" strokeDasharray="25 18"/></>}
      {kind==="machine"&&<><rect x="77" y="95" width="265" height="271" rx="36" fill="#264e63"/>
        <rect x="103" y="120" width="210" height="105" rx="22" fill="#d7f5ed"/>
        <rect x="138" y="255" width="143" height="35" rx="18" fill="#0f2731"/></>}
      {kind==="earth"&&<><circle cx="210" cy="216" r="138" fill="#5dbbc2"/>
        <path d="M118 136Q169 112 178 176L158 217Q193 244 173 292Q148 334 106 277Q83 207 118 136ZM247 93Q334 120 340 220L294 222L271 180L240 155Z" fill="#79b96e"/></>}
      {(kind==="money"||kind==="coins"||kind==="sizes")&&<><circle cx="120" cy="118" r="51" fill="#ffc451" stroke="#ffeed0" strokeWidth="9"/>
        <text x="120" y="134" textAnchor="middle" fill="#83570b" fontSize="42" fontWeight="900">¢</text>
        <circle cx="318" cy="293" r="57" fill="#ffc451" stroke="#ffeed0" strokeWidth="9"/>
        <text x="318" y="309" textAnchor="middle" fill="#83570b" fontSize="44" fontWeight="900">¢</text></>}
      {kind==="check"&&<><circle cx="208" cy="200" r="132" fill="#b4e8b2"/><path d="m131 210 55 60 111-125" fill="none" stroke="#1b775a" strokeWidth="29" strokeLinecap="round" strokeLinejoin="round"/></>}
      {kind==="question"&&<text x="210" y="285" fontSize="260" fontWeight="900" textAnchor="middle" fill="#8768ad">?</text>}
      {kind==="arrows"&&<><path d="M92 160Q235 40 316 174" fill="none" stroke="#fff" strokeWidth="28" strokeLinecap="round"/>
        <path d="m303 120 20 65 47-47" fill="none" stroke="#fff" strokeWidth="22" strokeLinecap="round"/>
        <path d="M330 250Q190 375 100 240" fill="none" stroke="#fff" strokeWidth="28" strokeLinecap="round"/>
        <path d="m130 291-40-58-28 55" fill="none" stroke="#fff" strokeWidth="22" strokeLinecap="round"/></>}
      {["bottle","money","road","sizes","coins","machine","return"].includes(kind)&&<>
        <rect x="179" y="83" width="64" height="44" rx="10" fill="#315e68"/>
        <path d="M167 120Q167 140 137 161Q126 171 126 202V311Q126 336 149 337H273Q294 337 294 312V201Q294 172 280 161Q251 142 251 120" fill="#fffdf2" stroke="#315e68" strokeWidth="13" strokeLinejoin="round"/>
        <rect x="150" y="213" width="121" height="86" rx="10" fill="#78d2ac"/>
        <path d="m185 258 20 23 45-50" fill="none" stroke="#1d7467" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round"/>
      </>}
    </svg>
    <span className="journey-art-sparkle s1">✦</span><span className="journey-art-sparkle s2">✧</span>
  </div>;
}
type QuizResult={score:number;total:number;passed:boolean;earned_xp:number;
  unlocked_badge:WasteLensBadge|null;signed_in:boolean;message:string};
export default function BottleJourney({user,onUnlock,onSignIn}:{user:SessionUser|null;onUnlock:(badge:WasteLensBadge)=>void;onSignIn:()=>void}){
  const { language,t } = useLanguage();
  const wrapper=useRef<HTMLDivElement>(null);
  const [progress,setProgress]=useState(0);
  const [selected,setSelected]=useState<Record<string,string>>({});
  const [result,setResult]=useState<QuizResult|null>(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [awarded,setAwarded]=useState(false);
  const [discoveries,setDiscoveries]=useState<Record<number,boolean>>({});
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
  useEffect(()=>{
    const root=wrapper.current;
    if(!root || !("IntersectionObserver" in window)) {
      root?.querySelectorAll("[data-journey-reveal]").forEach(node=>node.classList.add("in-view"));
      return;
    }
    const observer=new IntersectionObserver(entries=>{
      entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add("in-view");observer.unobserve(entry.target);}});
    },{threshold:0.12,rootMargin:"0px 0px -5% 0px"});
    root.querySelectorAll("[data-journey-reveal]").forEach(node=>observer.observe(node));
    return ()=>observer.disconnect();
  },[]);

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
    <div className="journey-passport"><span><Sparkles size={14}/> {Object.values(discoveries).filter(Boolean).length} / 5 {language==="en"?"discoveries":language==="es"?"descubrimientos":"खोज"}</span></div>
    <div className="journey-intro">
      <div className="journey-intro-stars" aria-hidden="true">✦　✧　✦</div>
      <span className="journey-tag"><Waves size={18}/> A WASTELENS SCROLL STORY</span>
      <h1>{language==="en"?<>The secret life<br/>of a <i>bottle.</i></>:language==="es"?<>La vida secreta<br/>de una <i>botella.</i></>:<>एक बोतल की<br/><i>अनकही कहानी।</i></>}</h1>
      <p>{language==="en"?"One bottle. Ten states. A surprisingly big adventure.":language==="es"?"Una botella. Diez estados. Una gran aventura.":"एक बोतल। दस राज्य। एक लंबी यात्रा।"}</p>
      <span className="journey-scroll"><ArrowDown size={22}/> {t("Scroll to begin")}</span>
      <a href="#bottle-quiz" className="journey-skip">{language==="en"?"Already explored? Go to quiz":language==="es"?"¿Ya exploraste? Ir al cuestionario":"पहले पढ़ चुके हैं? क्विज़ खोलें"}</a>
    </div>
    {chapters.map((chapter,index)=><Fragment key={chapter.id}><section id={"journey-"+chapter.id} data-journey-reveal className={"journey-chapter chapter-"+chapter.color}>
      <div className="journey-chapter-inner">
        <div className="journey-copy">
          <span className="journey-step">CHAPTER {String(index+1).padStart(2,"0")} / {chapter.eyebrow}</span>
          <div className="journey-year">{chapter.year}</div>
          <h2>{language==="en"?chapter.title:translatedChapters[language][index].title}</h2>
          <p>{language==="en"?chapter.description:translatedChapters[language][index].description}</p>
          <div className="journey-fact"><Sparkles size={20}/><strong>{language==="en"?chapter.fact:translatedChapters[language][index].fact}</strong></div>
          <ReadAloudButton id={"journey-chapter-"+chapter.id} category="journey" className="wl-journey-read"
            text={[language==="en"?chapter.title:translatedChapters[language][index].title,
              language==="en"?chapter.description:translatedChapters[language][index].description,
              language==="en"?chapter.fact:translatedChapters[language][index].fact].join(". ")}/>
          <a href={chapter.source} target="_blank" rel="noopener noreferrer" className="journey-source">
            {t("From the official source")} <ExternalLink size={15}/>
          </a>
        </div>
        <Illustrated kind={chapter.symbol}/>
      </div>
    </section>
    {index % 2 === 0 && <JourneyVignette index={Math.floor(index/2)}/>}
    {index % 2 === 1 && <JourneyCheckpoint index={Math.floor(index/2)}
      solved={Boolean(discoveries[Math.floor(index/2)])}
      onSolved={()=>setDiscoveries(previous=>({...previous,[Math.floor(index/2)]:true}))}
      nextId={index===chapters.length-1?"bottle-quiz":chapters[index+1].id}/>}
    </Fragment>)}
    <section className="journey-quiz" id="bottle-quiz">
      <span className="journey-quiz-halo" aria-hidden="true">✷</span>
      <span className="journey-tag"><Award size={19}/> {t("YOU MADE IT!")}</span>
      <h2>{language==="en"?<>You've traveled with the bottle.<br/><i>Now it's your turn.</i></>:language==="es"?<>Seguiste el viaje de la botella.<br/><i>Ahora te toca a ti.</i></>:<>आपने बोतल की यात्रा देख ली।<br/><i>अब आपकी बारी है।</i></>}</h2>
      {!user && <p className="journey-signin-reminder">{language==="en"?"Sign in before the quiz to save your badge and XP.":language==="es"?"Entra antes de jugar para guardar la insignia y los XP.":"बैज और XP पाने के लिए क्विज़ से पहले लॉग इन करें।"} <button type="button" onClick={onSignIn}>{t("Sign in")}</button></p>}
      <p className="journey-quiz-intro">{language==="en"?"Answer five quick questions. Get at least four right to earn the Bottle Explorer badge and 30 XP once.":language==="es"?"Responde cinco preguntas. Con cuatro respuestas correctas ganas una sola vez la insignia Explorador de botellas y 30 XP.":"पाँच छोटे सवालों के जवाब दें। कम से कम चार सही होने पर एक बार बोतल खोजकर्ता बैज और 30 XP मिलेंगे।"}</p>
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
      <div className="journey-end"><Leaf size={26}/><span>{language==="en"?"That's the journey. The next bottle is yours.":language==="es"?"Hasta aquí el viaje. La próxima botella depende de ti.":"यात्रा पूरी हुई। अगली बोतल आपके हाथ में है।"}</span></div>
    </section>
  </div>;
}
