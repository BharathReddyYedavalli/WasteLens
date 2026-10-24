import { BookOpen, HeartHandshake, Leaf, MapPin, Recycle, Sparkles } from "lucide-react";
import { useLanguage } from "./i18n";

export default function AboutWasteLens({onScan,onAudit,onJourney}:{
  onScan:()=>void;onAudit:()=>void;onJourney:()=>void
}){
  const {language}=useLanguage();
  const tr=(en:string,es:string,hi:string)=>language==="es"?es:language==="hi"?hi:en;
  return <section className="community-about" aria-label={tr("About WasteLens","Acerca de WasteLens","WasteLens के बारे में")}>
    <div className="community-about-hero">
      <div className="community-about-mark"><HeartHandshake size={36}/></div>
      <h1>{tr("Better recycling starts at the bin.","Reciclar mejor empieza frente al contenedor.","बेहतर रीसायक्लिंग की शुरुआत कूड़ेदान के पास होती है।")}</h1>
      <p>{tr(
        "WasteLens helps you scan an item, check local recycling rules and decide what to do next. A school bin-side kiosk is a future use we are exploring, not a device already installed.",
        "WasteLens te ayuda a escanear objetos, consultar las reglas locales y decidir qué hacer. Un quiosco escolar es una idea futura, no un dispositivo instalado.",
        "WasteLens किसी वस्तु को स्कैन करने, स्थानीय नियम जाँचने और अगला कदम चुनने में मदद करता है। स्कूल का कियोस्क अभी भविष्य की योजना है; ऐसा उपकरण स्थापित नहीं किया गया है।"
      )}</p>
    </div>
    <div className="community-about-grid">
      <article><Leaf size={24}/><h2>{tr("Identify the item","Identifica el objeto","वस्तु पहचानें")}</h2>
        <p>{tr(
          "Take a photo for a suggested next step. Check the material if the result is uncertain.",
          "Haz una foto para recibir una sugerencia. Comprueba el material si hay dudas.",
          "फोटो से अगला कदम सुझाया जाता है। परिणाम अनिश्चित हो तो सामग्री की पुष्टि करें।"
        )}</p></article>
      <article><MapPin size={24}/><h2>{tr("Check local rules","Consulta las reglas locales","स्थानीय नियम जाँचें")}</h2>
        <p>{tr(
          "Programs differ by location and provider. Confirm your actual service before choosing a bin or drop-off.",
          "Las normas cambian según el lugar y el proveedor. Confirma tu servicio antes de elegir un contenedor o punto de entrega.",
          "नियम स्थान और सेवा प्रदाता के अनुसार बदलते हैं। डिब्बा या संग्रह केंद्र चुनने से पहले अपनी सेवा के नियम जाँचें।"
        )}</p></article>
      <article><Sparkles size={24}/><h2>{tr("Improve your bins","Mejora la separación","बेहतर छँटाई करें")}</h2>
        <p>{tr(
          "Schools and offices can tally observed waste to spot sorting patterns and improve signs or collection plans.",
          "Las escuelas y oficinas pueden contar residuos observados, detectar patrones y mejorar los carteles o la recogida.",
          "स्कूल और कार्यालय देखी गई वस्तुओं की गिनती करके छँटाई के रुझान पहचान सकते हैं और संकेतों या संग्रह व्यवस्था में सुधार कर सकते हैं।"
        )}</p></article>
    </div>
    <div className="community-about-footer">
      <div className="community-about-links">
        <button type="button" onClick={onScan}><Recycle size={17}/>{tr("Scan an item","Escanear un objeto","वस्तु स्कैन करें")}</button>
        <button type="button" onClick={onAudit}><MapPin size={17}/>{tr("Start a waste audit","Iniciar una auditoría","कचरा ऑडिट शुरू करें")}</button>
        <button type="button" onClick={onJourney}><BookOpen size={17}/>{tr("Explore the Bottle Journey","Explorar el viaje de una botella","बोतल की यात्रा देखें")}</button>
      </div>
    </div>
  </section>;
}
