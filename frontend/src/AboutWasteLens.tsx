import { BookOpen, CircleHelp, HeartHandshake, Leaf, MapPin, Recycle, ShieldCheck, Sparkles, Users } from "lucide-react";
import { useLanguage } from "./i18n";

export default function AboutWasteLens({onScan,onAudit,onJourney}:{
  onScan:()=>void;onAudit:()=>void;onJourney:()=>void
}){
  const {language}=useLanguage();
  const tr=(en:string,es:string,hi:string)=>language==="es"?es:language==="hi"?hi:en;
  return <section className="community-about" aria-label={tr("About WasteLens","Acerca de WasteLens","WasteLens के बारे में")}>
    <div className="community-about-hero">
      <div className="community-about-mark"><HeartHandshake size={36}/></div>
      <p className="community-about-eyebrow">{tr("A COMMUNITY SERVICE PROJECT","UN PROYECTO DE SERVICIO COMUNITARIO","सामुदायिक सेवा परियोजना")}</p>
      <h1>{tr("A cleaner community starts with what we do next.","Una comunidad más limpia empieza con nuestra siguiente acción.","स्वच्छ समुदाय की शुरुआत हमारे अगले कदम से होती है।")}</h1>
      <p>{tr(
        "WasteLens helps neighbors, students and volunteers turn everyday waste decisions into practical community action. Identify an item, learn what to do, find help nearby and measure what your group observes.",
        "WasteLens ayuda a estudiantes, vecinos y voluntarios a convertir las decisiones sobre residuos en acciones útiles. Identifica objetos, aprende, busca ayuda local y mide lo que observa tu comunidad.",
        "WasteLens छात्रों, पड़ोसियों और स्वयंसेवकों को कचरे के बारे में अच्छे फैसले लेकर समुदाय के लिए काम करने में मदद करता है। चीज़ पहचानें, सही तरीका जानें, आसपास मदद खोजें और समूह के अवलोकन दर्ज करें।"
      )}</p>
    </div>
    <div className="community-about-grid">
      <article><Leaf size={24}/><h2>{tr("Understand","Comprender","समझें")}</h2>
        <p>{tr("Use AI-assisted scanning and clear guides to learn about reuse and responsible disposal.",
        "Escanea con ayuda de IA y descubre cómo reutilizar y desechar correctamente.",
        "AI की मदद से वस्तुओं को पहचानें और दोबारा उपयोग या सही निपटान जानें।")}</p></article>
      <article><Users size={24}/><h2>{tr("Take action","Actuar","कदम उठाएँ")}</h2>
        <p>{tr("Find local programs, check container deposits and make responsible choices as a team.",
        "Encuentra programas locales, consulta depósitos y actúa con tu grupo.",
        "स्थानीय कार्यक्रम खोजें, बोतलों की वापसी जाँचें और मिलकर कदम उठाएँ।")}</p></article>
      <article><Sparkles size={24}/><h2>{tr("Measure and improve","Medir y mejorar","मापें और सुधारें")}</h2>
        <p>{tr("Record cleanup and school-waste audits, spot patterns and plan a better next event.",
        "Registra auditorías de limpieza, identifica patrones y mejora la próxima actividad.",
        "सफ़ाई और स्कूल-कचरा सर्वेक्षण दर्ज करें, रुझान देखें और अगला कार्यक्रम बेहतर बनाएँ।")}</p></article>
    </div>
    <div className="community-about-footer">
      <p><ShieldCheck size={20}/>{tr(
        "Real impact requires real action. Scans and estimated counts are learning tools, not proof that an item was recycled or emissions were saved.",
        "El impacto real exige acciones reales. Escaneos y conteos no prueban reciclaje ni emisiones evitadas.",
        "वास्तविक असर के लिए वास्तविक काम चाहिए। स्कैन और गिनती, रीसायक्लिंग या कार्बन बचत का प्रमाण नहीं हैं।"
      )}</p>
      <div className="community-about-links">
        <button type="button" onClick={onScan}><Recycle size={17}/>{tr("Start with a scan","Empezar a escanear","स्कैन करें")}</button>
        <button type="button" onClick={onAudit}><MapPin size={17}/>{tr("Plan a cleanup audit","Preparar una auditoría","सफ़ाई सर्वेक्षण शुरू करें")}</button>
        <button type="button" onClick={onJourney}><BookOpen size={17}/>{tr("Explore the story","Explorar la historia","कहानी पढ़ें")}</button>
      </div>
    </div>
    <p className="community-about-disclaimer"><CircleHelp size={14}/>
      {tr("Built to support community education and service. Local recycling rules vary; always confirm with your local program.",
      "Creado para apoyar la educación y el servicio comunitario. Confirma las normas locales.",
      "सामुदायिक शिक्षा और सेवा के लिए बनाया गया। स्थानीय रीसायक्लिंग नियम अलग हैं; हमेशा जाँच करें।")}
    </p>
  </section>;
}
