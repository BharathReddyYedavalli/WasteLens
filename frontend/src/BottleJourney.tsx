import { useEffect, useRef, useState } from "react";
import { ArrowDown, Award, CheckCircle2, Coins, ExternalLink, Leaf, RefreshCw, Sparkles, Waves } from "lucide-react";
import type { SessionUser, WasteLensBadge } from "./types";
import { actionHeaders } from "./AccountArea";

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
    <div className="journey-intro">
      <div className="journey-intro-stars" aria-hidden="true">✦　✧　✦</div>
      <span className="journey-tag"><Waves size={18}/> A WASTELENS SCROLL STORY</span>
      <h1>The secret life<br/>of a <i>bottle.</i></h1>
      <p>One bottle. Ten states. A surprisingly big adventure.</p>
      <span className="journey-scroll"><ArrowDown size={22}/> Scroll to begin</span>
    </div>
    {chapters.map((chapter,index)=><section key={chapter.id} className={"journey-chapter chapter-"+chapter.color}>
      <div className="journey-chapter-inner">
        <div className="journey-copy">
          <span className="journey-step">CHAPTER {String(index+1).padStart(2,"0")} / {chapter.eyebrow}</span>
          <div className="journey-year">{chapter.year}</div>
          <h2>{chapter.title}</h2>
          <p>{chapter.description}</p>
          <div className="journey-fact"><Sparkles size={20}/><strong>{chapter.fact}</strong></div>
          <a href={chapter.source} target="_blank" rel="noopener noreferrer" className="journey-source">
            From the official source <ExternalLink size={15}/>
          </a>
        </div>
        <Illustrated kind={chapter.symbol}/>
      </div>
    </section>)}
    <section className="journey-quiz" id="bottle-quiz">
      <span className="journey-quiz-halo" aria-hidden="true">✷</span>
      <span className="journey-tag"><Award size={19}/> YOU MADE IT!</span>
      <h2>You've traveled with the bottle.<br/><i>Now it's your turn.</i></h2>
      <p className="journey-quiz-intro">Answer five quick questions. Get at least four right to earn the Bottle Explorer badge and 30 XP once.</p>
      <div className="journey-quiz-card">
        {quiz.map((q,index)=><fieldset key={q.id} className="journey-question" disabled={loading||Boolean(result?.passed)}>
          <legend><span>{String(index+1).padStart(2,"0")}</span>{q.question}</legend>
          <div className="journey-choices">
            {q.options.map(([answer,label])=><label key={answer} className={"journey-choice "+(selected[q.id]===answer?"picked":"")}>
              <input type="radio" name={q.id} checked={selected[q.id]===answer}
                onChange={()=>{setSelected(prev=>({...prev,[q.id]:answer}));setResult(null);}}/>
              <span>{label}</span>
            </label>)}
          </div>
        </fieldset>)}
        {result&&<div className={"journey-quiz-outcome "+(result.passed?"passed":"")} role="status">
          <strong>{result.score} out of {result.total} correct</strong>
          <p>{result.message}</p>
          {result.unlocked_badge&&<span className="journey-badge-earned"><Award size={19}/> Bottle Explorer · +30 XP</span>}
          {result.passed&&!result.signed_in&&<button type="button" className="journey-login" onClick={onSignIn}>Sign in to earn the badge</button>}
        </div>}
        {error&&<p role="alert" className="journey-quiz-error">{error}</p>}
        <div className="journey-quiz-actions">
          <button type="button" className="journey-submit" disabled={loading||quiz.some(q=>!selected[q.id])||Boolean(result?.passed)}
            onClick={()=>void submit()}>{loading?"Checking…":awarded?"Check answers":"Finish quiz"}</button>
          {result&&!result.passed&&<button type="button" className="journey-retry" onClick={retry}><RefreshCw size={18}/> Try again</button>}
        </div>
      </div>
      <div className="journey-end"><Leaf size={26}/><span>That's the journey. The next bottle is yours.</span></div>
    </section>
  </div>;
}
