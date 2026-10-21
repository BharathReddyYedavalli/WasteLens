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
        "WasteLens is a web prototype for the moment you decide where something goes. Scan an item, check local rules and choose your next step. A school bin-side kiosk is a future use we are exploring, not a device already installed.",
        "WasteLens es un prototipo web para decidir dónde va cada objeto. Escanéalo, consulta las reglas locales y elige qué hacer. Un quiosco junto a los contenedores escolares es una idea futura, no un dispositivo ya instalado.",
        "WasteLens एक वेब प्रोटोटाइप है जो किसी वस्तु को कहाँ डालना है, यह तय करने में मदद करता है। वस्तु स्कैन करें, स्थानीय नियम जाँचें और अगला कदम चुनें। स्कूल के कूड़ेदान के पास कियोस्क लगाना एक भविष्य की योजना है, अभी कोई उपकरण स्थापित नहीं है।"
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
