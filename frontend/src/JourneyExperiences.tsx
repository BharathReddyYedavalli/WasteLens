import { useState } from "react";
import { ArrowDown, Check, Compass, ExternalLink, Sparkles } from "lucide-react";
import { useLanguage } from "./i18n";
import type { Language } from "./i18n";
import { ReadAloudButton } from "./Speech";

type Words = Record<Language, string>;
const say = (en: string, es: string, hi: string): Words => ({ en, es, hi });

type Checkpoint = {
  kicker: Words; title: Words; scene: "receipt" | "sizes" | "coins" | "return" | "sort";
  prompt: Words; choices: Words[]; correct: number; why: Words; hint: Words; source: string;
};

const checkpoints: Checkpoint[] = [
  {
    kicker: say("CHECKOUT COUNTER", "EN LA CAJA", "दुकान की चेकआउट"),
    title: say("Your receipt has a secret.", "Tu recibo tiene un secreto.", "आपकी रसीद में एक राज़ है।"),
    scene: "receipt",
    prompt: say("Three eligible Oregon cans. Each has a 10¢ deposit. How much could you get back?",
      "Tres latas elegibles en Oregón. Cada una tiene un depósito de 10¢. ¿Cuánto recuperas?",
      "ओरेगन में तीन पात्र कैन हैं। प्रत्येक पर 10¢ जमा है। कितना वापस मिल सकता है?"),
    choices: [say("10¢","10¢","10¢"),say("30¢","30¢","30¢"),say("$3.00","$3.00","$3.00")],
    correct: 1,
    why: say("Three returns × 10¢ = 30¢. The deposit was money you paid first.",
      "Tres devoluciones × 10¢ = 30¢. Primero pagaste ese depósito.",
      "तीन कैन × 10¢ = 30¢। जमा राशि आपने खरीदते समय दी थी।"),
    hint: say("Multiply the deposit by the number of eligible cans.","Multiplica el depósito por el número de latas.","जमा राशि को पात्र कैन की संख्या से गुणा करें।"),
    source: "https://www.oregon.gov/deq/recycling/Pages/Bottle-Bill.aspx"
  },
  {
    kicker: say("SHELF DETECTIVE", "DETECTIVE DE ENVASES", "बोतल की जाँच"),
    title: say("Two bottles. Different values.", "Dos botellas. Diferente valor.", "दो बोतलें, अलग कीमत।"),
    scene: "sizes",
    prompt: say("In California, both bottles are eligible. One is 12 oz and one is 24 oz. What's their combined CRV?",
      "En California, ambas botellas son elegibles. Una es de 12 oz y otra de 24 oz. ¿Cuál es su CRV total?",
      "कैलिफ़ोर्निया में दोनों बोतलें पात्र हैं। एक 12 औंस, दूसरी 24 औंस। कुल CRV कितना है?"),
    choices: [say("10¢","10¢","10¢"),say("15¢","15¢","15¢"),say("25¢","25¢","25¢")],
    correct: 1,
    why: say("5¢ for the 12 oz bottle + 10¢ for the 24 oz bottle = 15¢.",
      "5¢ por la de 12 oz + 10¢ por la de 24 oz = 15¢.",
      "12 औंस पर 5¢ और 24 औंस पर 10¢, कुल 15¢।"),
    hint: say("California changes the regular refund at 24 oz.","En California, el valor cambia a partir de 24 oz.","कैलिफ़ोर्निया में 24 औंस पर दर बदलती है।"),
    source: "https://calrecycle.ca.gov/bevcontainer/"
  },
  {
    kicker: say("THE COIN TRICK", "EL TRUCO DE LAS MONEDAS", "सिक्के का रहस्य"),
    title: say("Six cents in. How much out?", "Pagas seis centavos. ¿Cuántos vuelven?", "छह सेंट दिए। कितने लौटेंगे?"),
    scene: "coins",
    prompt: say("An eligible Hawaii container has a 5¢ refundable deposit and a separate 1¢ fee. How much is refunded?",
      "Un envase elegible en Hawái tiene 5¢ de depósito reembolsable y 1¢ de tarifa. ¿Cuánto se devuelve?",
      "हवाई में पात्र कंटेनर पर 5¢ वापसी योग्य जमा और अलग 1¢ शुल्क है। कितना वापस मिलेगा?"),
    choices: [say("1¢","1¢","1¢"),say("5¢","5¢","5¢"),say("6¢","6¢","6¢")],
    correct: 1,
    why: say("You get the 5¢ deposit back. The separate 1¢ container fee is not refunded.",
      "Se devuelven los 5¢ del depósito. La tarifa de 1¢ no es reembolsable.",
      "5¢ जमा वापस मिलता है। अलग 1¢ शुल्क वापस नहीं मिलता।"),
    hint: say("Only one of those charges is a deposit.","Solo uno de esos importes es un depósito.","इन दोनों राशियों में से एक ही जमा है।"),
    source: "https://health.hawaii.gov/hi5/consumers/"
  },
  {
    kicker: say("THE RETURN MACHINE", "LA MÁQUINA DE DEVOLUCIÓN", "वापसी मशीन"),
    title: say("Pick the right destination.", "Elige el destino correcto.", "सही जगह चुनें।"),
    scene: "return",
    prompt: say("You paid a New York bottle deposit. Where should you try to redeem the eligible container?",
      "Pagaste un depósito en Nueva York. ¿Dónde deberías intentar devolver el envase?",
      "आपने न्यूयॉर्क में बोतल का जमा शुल्क दिया। पात्र बोतल कहाँ लौटाएँगे?"),
    choices: [
      say("A New York return location","Un punto de devolución de Nueva York","न्यूयॉर्क के वापसी केंद्र में"),
      say("Any deposit state","Cualquier estado con depósitos","किसी भी जमा राशि वाले राज्य में"),
      say("A trash can","Un bote de basura","कूड़ेदान में")
    ],
    correct: 0,
    why: say("Deposits belong to the state where you paid them. Check the store or redemption center's acceptance rules.",
      "El depósito corresponde al estado donde lo pagaste. Comprueba las reglas del centro.",
      "जमा उसी राज्य से जुड़ा होता है जहाँ आपने भुगतान किया था। केंद्र के नियम भी देखें।"),
    hint: say("The machine needs a container covered by its state's program.","El envase debe pertenecer al programa de ese estado.","बोतल उस राज्य के कार्यक्रम के तहत पात्र होनी चाहिए।"),
    source: "https://dec.ny.gov/environmental-protection/recycling-composting/bottle-bill"
  },
  {
    kicker: say("INSIDE THE RECYCLING PLANT", "DENTRO DE LA PLANTA", "रीसाइक्लिंग केंद्र के अंदर"),
    title: say("The bottle gets another life.", "La botella comienza otra vida.", "बोतल को एक नया जीवन मिलता है।"),
    scene: "sort",
    prompt: say("An aluminum can is collected and sorted for recycling. Which process can make it into new metal products?",
      "Una lata de aluminio llega a reciclarse. ¿Qué proceso permite fabricar nuevos productos de metal?",
      "एल्यूमिनियम कैन को रीसाइक्लिंग के लिए छाँटा गया। किस प्रक्रिया से नया धातु उत्पाद बन सकता है?"),
    choices: [
      say("Melt and reform the metal","Fundir y volver a formar el metal","धातु को पिघलाकर नया आकार देना"),
      say("Bury it with food scraps","Enterrarla con restos de comida","खाने के कचरे के साथ दबा देना"),
      say("Leave it on the roadside","Dejarla junto a la carretera","सड़क के किनारे छोड़ देना")
    ],
    correct: 0,
    why: say("Sorted aluminum can be remelted and used again. It's a new chapter for the same material.",
      "El aluminio clasificado puede fundirse y utilizarse de nuevo.",
      "छँटे एल्यूमिनियम को पिघलाकर दोबारा उपयोग किया जा सकता है।"),
    hint: say("Metals can be melted and reshaped.","Los metales se pueden fundir y moldear.","धातुओं को पिघलाकर दोबारा ढाला जा सकता है।"),
    source: "https://www.epa.gov/recycle/how-do-i-recycle-common-recyclables"
  }
];

const vignettes = [
  {
    eyebrow: say("LOOK CLOSER","MIRA MÁS DE CERCA","ध्यान से देखें"),
    title: say("Every bottle starts with a decision.","Cada botella empieza con una decisión.","हर बोतल की शुरुआत एक निर्णय से होती है।"),
    description: say("A refillable bottle might never need a return machine. A disposable one might carry a deposit. What matters is the next choice you make.",
      "Una botella reutilizable quizá nunca necesite una máquina. Una desechable puede tener depósito. Importa lo que hagas después.",
      "दोबारा भरी जा सकने वाली बोतल को शायद वापसी मशीन की ज़रूरत ही न पड़े। अगला निर्णय मायने रखता है।"),
    image: "/themes/light.svg",
    callout: say("REFILL · RETURN · RECYCLE","RELLENAR · DEVOLVER · RECICLAR","फिर भरें · लौटाएँ · रीसायकल करें")
  },
  {
    eyebrow: say("BACK IN TIME","VIAJE AL PASADO","समय में पीछे"),
    title: say("Imagine the roadside in 1971.","Imagina las carreteras de 1971.","1971 की सड़क की कल्पना करें।"),
    description: say("Before the first U.S. bottle bill, Oregon had a litter problem. The idea was simple: make empty containers worth bringing back.",
      "Antes de la primera ley de depósitos de EE. UU., Oregón tenía un problema de basura. La idea era que valiera la pena devolver los envases.",
      "अमेरिका के पहले बोतल कानून से पहले ओरेगन में कचरे की समस्या थी। विचार सरल था: खाली डिब्बों को लौटाना लाभदायक बनाओ।"),
    image: "/themes/forest.svg",
    callout: say("A SMALL INCENTIVE. A NEW HABIT.","UN PEQUEÑO INCENTIVO. UN NUEVO HÁBITO.","छोटा प्रोत्साहन। नई आदत।")
  },
  {
    eyebrow: say("THE LABEL LAB","EL LABORATORIO","लेबल की जाँच"),
    title: say("The label is a clue, not the whole answer.","La etiqueta es una pista, no toda la respuesta.","लेबल एक सुराग है, पूरा उत्तर नहीं।"),
    description: say("Drink type, size, material and purchase state can all matter. A visible refund marking is helpful, but eligibility follows the state's rules.",
      "La bebida, el tamaño, el material y el estado de compra pueden importar. La etiqueta ayuda, pero mandan las reglas estatales.",
      "पेय, आकार, सामग्री और खरीद का राज्य मायने रख सकते हैं। लेबल सहायक है, लेकिन पात्रता राज्य के नियम तय करते हैं।"),
    image: "/themes/sunset.svg",
    callout: say("LOOK · CHECK · CONFIRM","MIRA · REVISA · CONFIRMA","देखें · जाँचें · पुष्टि करें")
  },
  {
    eyebrow: say("THE TWO-SECOND CHECK","LA COMPROBACIÓN RÁPIDA","दो सेकंड की जाँच"),
    title: say("Empty it. Check it. Bring it back.","Vacíalo. Revísalo. Devuélvelo.","खाली करें। जाँचें। वापस करें।"),
    description: say("Return locations may have their own handling instructions. A little preparation makes your trip easier and helps keep the collected materials usable.",
      "Los centros pueden tener instrucciones propias. Prepararse facilita la devolución y ayuda a aprovechar los materiales.",
      "वापसी केंद्र के अपने निर्देश हो सकते हैं। थोड़ी तैयारी आपकी यात्रा आसान बना सकती है।"),
    image: "/themes/beach.svg",
    callout: say("READY FOR THE RETURN TRIP","LISTO PARA LA DEVOLUCIÓN","वापसी के लिए तैयार")
  },
  {
    eyebrow: say("THE NEXT CHAPTER","EL PRÓXIMO CAPÍTULO","अगला अध्याय"),
    title: say("This is where the story branches.","Aquí la historia toma otro rumbo.","यहीं कहानी नया रास्ता चुनती है।"),
    description: say("An aluminum can, a glass bottle and a plastic bottle won't all take the same recycling path. Sorting is how the story begins again.",
      "Una lata, una botella de vidrio y una de plástico no siguen el mismo proceso. La clasificación inicia su nueva historia.",
      "धातु कैन, काँच और प्लास्टिक की बोतल अलग रीसाइक्लिंग रास्तों पर जाती हैं। छँटाई से नई शुरुआत होती है।"),
    image: "/themes/ocean.svg",
    callout: say("THREE MATERIALS. MANY POSSIBILITIES.","TRES MATERIALES. MUCHAS POSIBILIDADES.","तीन सामग्री। कई संभावनाएँ।")
  }
] as const;

export function JourneyVignette({ index }: { index: number }) {
  const { language } = useLanguage();
  const vignette = vignettes[index];
  if (!vignette) return null;
  return <section className={"journey-vignette journey-vignette-" + index} data-journey-reveal>
    <img className="journey-vignette-landscape" src={vignette.image} alt="" loading="lazy"/>
    <div className="journey-vignette-shade"/>
    <div className="journey-vignette-content">
      <span className="journey-vignette-kicker"><Compass size={19}/> {vignette.eyebrow[language]}</span>
      <h2>{vignette.title[language]}</h2>
      <p>{vignette.description[language]}</p>
      <span className="journey-vignette-callout">{vignette.callout[language]}</span>
      <ReadAloudButton id={"journey-scene-"+index} category="journey" className="wl-vignette-read"
        text={[vignette.title[language],vignette.description[language]].join(". ")}/>
      <ArrowDown size={28} className="journey-vignette-down" aria-hidden="true"/>
    </div>
  </section>;
}

function SceneSketch({kind}:{kind:Checkpoint["scene"]}) {
  return <svg className="journey-checkpoint-drawing" viewBox="0 0 420 320" aria-hidden="true" focusable="false">
    <circle cx="215" cy="152" r="136" fill="#ffffff4d"/>
    {kind==="receipt" && <>
      <path d="M117 30H303V275l-16-11-17 11-17-11-17 11-17-11-17 11-17-11-18 11-17-11-17 11Z" fill="#fff9e7" stroke="#315f5c" strokeWidth="6"/>
      <path d="M150 80H268M150 113H258M150 151H242M150 183H270" stroke="#7d9c98" strokeWidth="10" strokeLinecap="round"/>
      <text x="209" y="233" textAnchor="middle" fontSize="38" fontWeight="900" fill="#087b71">+30¢</text>
    </>}
    {kind==="sizes" && <>
      <rect x="92" y="117" width="98" height="167" rx="22" fill="#9adcd2" stroke="#286e71" strokeWidth="7"/>
      <rect x="116" y="93" width="50" height="30" rx="7" fill="#286e71"/>
      <rect x="223" y="73" width="114" height="211" rx="24" fill="#fbe6b8" stroke="#286e71" strokeWidth="7"/>
      <rect x="251" y="47" width="58" height="32" rx="7" fill="#286e71"/>
      <text x="142" y="214" textAnchor="middle" fontSize="24" fontWeight="900" fill="#2a6263">12</text>
      <text x="281" y="206" textAnchor="middle" fontSize="28" fontWeight="900" fill="#2a6263">24</text>
    </>}
    {kind==="coins" && <>
      <circle cx="171" cy="140" r="73" fill="#f8c663" stroke="#ffedb5" strokeWidth="12"/>
      <text x="171" y="164" textAnchor="middle" fontSize="65" fontWeight="900" fill="#996027">5¢</text>
      <circle cx="268" cy="211" r="58" fill="#e4a9ae" stroke="#fff0dd" strokeWidth="10"/>
      <text x="268" y="230" textAnchor="middle" fontSize="42" fontWeight="900" fill="#7b4b59">1¢</text>
    </>}
    {kind==="return" && <>
      <rect x="101" y="42" width="218" height="238" rx="29" fill="#315c72"/>
      <rect x="122" y="66" width="177" height="85" rx="13" fill="#bbf1ed"/>
      <path d="m200 97 27 25 37-43" stroke="#228677" strokeWidth="10" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="142" y="180" width="136" height="25" rx="12" fill="#152e45"/>
      <rect x="177" y="225" width="66" height="27" rx="9" fill="#f1bd7c"/>
    </>}
    {kind==="sort" && <>
      <path d="M85 233L156 71 225 233Z" fill="#77c4b0" stroke="#25745e" strokeWidth="7"/>
      <rect x="175" y="134" width="139" height="123" rx="20" fill="#f4bfa1" stroke="#9c6a5d" strokeWidth="7"/>
      <path d="M182 155h124M178 221h142" stroke="#fff0dc" strokeWidth="9"/>
      <path d="m105 278 70-26 70 27 68-25" fill="none" stroke="#2f6971" strokeWidth="11" strokeLinecap="round"/>
    </>}
  </svg>;
}

export function JourneyCheckpoint({index, solved, onSolved, nextId}:{
  index:number;solved:boolean;onSolved:()=>void;nextId:string;
}) {
  const { language }=useLanguage();
  const [attempt,setAttempt]=useState<number|null>(null);
  const current=checkpoints[index];
  if(!current)return null;
  const correct=solved || attempt===current.correct;
  return <section className={"journey-checkpoint journey-checkpoint-" + current.scene} data-journey-reveal>
    <div className="journey-checkpoint-content">
      <div className="journey-checkpoint-copy">
        <span className="journey-checkpoint-kicker"><Sparkles size={18}/> {language==="en"?"DISCOVERY":language==="es"?"DESCUBRIMIENTO":"खोज"} {index+1} / {checkpoints.length}</span>
        <h2>{current.title[language]}</h2>
        <p className="journey-checkpoint-prompt">{current.prompt[language]}</p>
        <ReadAloudButton id={"journey-discovery-"+index} category="journey"
          text={[current.title[language],current.prompt[language],...current.choices.map((choice,i)=>String.fromCharCode(65+i)+". "+choice[language]),...(attempt===null?[]:[correct?current.why[language]:current.hint[language]])].join(". ")}/>
        <div className="journey-checkpoint-choices">
          {current.choices.map((choice,i)=><button type="button" key={i}
            className={"journey-checkpoint-choice "+(attempt===i?(i===current.correct?"is-right":"is-wrong"):"")}
            aria-pressed={attempt===i} disabled={correct}
            onClick={()=>{setAttempt(i);if(i===current.correct && !solved)onSolved();}}>
            <span aria-hidden="true">{String.fromCharCode(65+i)}</span>{choice[language]}
            {attempt===i && i===current.correct && <Check size={20} aria-hidden="true"/>}
          </button>)}
        </div>
        {attempt!==null && <p className={"journey-checkpoint-feedback "+(correct?"good":"")} role="status">
          {correct ? current.why[language] : current.hint[language]}
        </p>}
        {correct && <a href={nextId==="bottle-quiz"?"#bottle-quiz":"#journey-"+nextId} className="journey-continue">
          {language==="en"?"Next stop":language==="es"?"Siguiente parada":"अगला पड़ाव"} <ArrowDown size={19}/>
        </a>}
        <a className="journey-checkpoint-source" href={current.source} target="_blank" rel="noopener noreferrer">
          {language==="en"?"Check the source":language==="es"?"Consultar fuente":"स्रोत देखें"} <ExternalLink size={14}/>
        </a>
      </div>
      <div className="journey-checkpoint-scene">
        <span className="journey-checkpoint-scene-label">{current.kicker[language]}</span>
        <SceneSketch kind={current.scene}/>
        <div className="journey-checkpoint-sparkles" aria-hidden="true">✦ · ✧ · ✦</div>
      </div>
    </div>
  </section>;
}
