import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowRight, BookOpen, CheckCircle2, ChevronDown, ExternalLink, Leaf, Recycle, Waves } from "lucide-react";
import { useLanguage } from "./i18n";
import type { Language } from "./i18n";
import { ReadAloudButton } from "./Speech";

type Line = Record<Language,string>;
const line=(en:string,es:string,hi:string):Line=>({en,es,hi});
type Photo={url:string;alt:Line;caption:Line;credit:string;page:string;position?:string;license?:string;licenseUrl?:string};
type Chapter={id:string;eyebrow:Line;heading:Line;copy:Line;bridge:Line;photo:Photo;data:string;unit:Line;statExplain:Line;statSource:string;factYear:string;kind:"problem"|"impact"|"solution";};
const photos:Record<string,Photo>={
  bottle:{
    url:"https://marinedebris.noaa.gov/live/s3fs-public/20160423_NOAA_CREP_050.jpg",
    alt:line("Plastic beverage bottles collected in a blue crate during a NOAA cleanup.","Botellas de plástico recogidas en una caja azul durante una limpieza.","NOAA सफ़ाई के दौरान नीली टोकरी में जमा की गई प्लास्टिक की बोतलें।"),
    caption:line("Bottles recovered during a 2016 cleanup in the Northwestern Hawaiian Islands.","Botellas recuperadas en una limpieza de 2016 en las islas hawaianas del noroeste.","उत्तर-पश्चिमी हवाई द्वीपों में 2016 की सफ़ाई में मिली बोतलें।"),
    credit:"NOAA CREP",
    page:"https://marinedebris.noaa.gov/multimedia/images/plastic-beverage-bottles-nwhi"
  },
  shore:{
    url:"https://marinedebris.noaa.gov/live/s3fs-public/28.jpg",
    alt:line("Debris scattered along a sandy island shoreline with seabirds and ocean beyond.","Residuos esparcidos por una playa con aves marinas.","समुद्री पक्षियों वाले रेतीले तट पर फैला हुआ कचरा।"),
    caption:line("Eastern Island shoreline before a NOAA marine-debris removal mission in 2016.","Playa de Eastern Island antes de una limpieza de NOAA en 2016.","2016 के NOAA सफ़ाई अभियान से पहले ईस्टर्न आइलैंड का तट।"),
    credit:"NOAA PIFSC Coral Reef Ecosystem Program",
    page:"https://marinedebris.noaa.gov/multimedia/images/debris-found-along-shoreline",position:"50% 48%"
  },
  waves:{
    url:"https://marinedebris.noaa.gov/live/s3fs-public/24.jpg",
    alt:line("Large tangled mass of plastic film being washed by waves on a remote beach.","Un gran montón de plástico enredado en las olas de una playa remota.","दूरस्थ समुद्र तट पर लहरों में फँसा हुआ प्लास्टिक का बड़ा ढेर।"),
    caption:line("A 270 kg bundle of thin plastic film on Eastern Island, photographed by NOAA.","270 kg de plástico delgado en Eastern Island, fotografiados por NOAA.","ईस्टर्न आइलैंड पर 270 किलोग्राम प्लास्टिक का ढेर, NOAA द्वारा खींची तस्वीर।"),
    credit:"NOAA PIFSC Coral Reef Ecosystem Program",
    page:"https://marinedebris.noaa.gov/multimedia/images/thin-plastic-film-shoreline"
  },
  removal:{
    url:"https://marinedebris.noaa.gov/live/s3fs-public/debris_removal.jpg",
    alt:line("Three members of a NOAA marine-debris team cutting and gathering a mass of plastic on the beach.","Tres miembros de un equipo de NOAA retirando plástico de una playa.","NOAA की तीन सदस्यीय टीम समुद्र तट से प्लास्टिक हटा रही है।"),
    caption:line("NOAA crews removing plastic film debris from an island shoreline.","Un equipo de NOAA retira residuos plásticos de una playa.","NOAA की टीम द्वीप के तट से प्लास्टिक कचरा हटाती हुई।"),
    credit:"NOAA PIFSC Coral Reef Ecosystem Program",
    page:"https://marinedebris.noaa.gov/multimedia/images/cutting-thin-plastic-film-debris"
  },
  facility:{
    url:"https://upload.wikimedia.org/wikipedia/commons/8/80/Materials_recovery_facility.jpg",
    alt:line("Large piles of mixed plastic awaiting sorting outside a materials recovery facility in Olomouc, Czech Republic.","Grandes montones de plástico esperando su clasificación en un centro de recuperación en Chequia.","चेक गणराज्य के ओलोमौत्स में छँटाई की प्रतीक्षा करता प्लास्टिक कचरे का बड़ा ढेर।"),
    caption:line("Plastics awaiting sorting at a recovery facility in Olomouc, Czech Republic (2012).","Plásticos que esperan clasificación en Olomouc, Chequia (2012).","चेक गणराज्य में छँटाई की प्रतीक्षा करता प्लास्टिक (2012)।"),
    credit:"Michal Maňas · CC BY 3.0",
    license:"CC BY 3.0",
    licenseUrl:"https://creativecommons.org/licenses/by/3.0/",
    page:"https://commons.wikimedia.org/wiki/File:Materials_recovery_facility.jpg"
  },
  machine:{
    url:"https://upload.wikimedia.org/wikipedia/commons/2/20/Reverse_Vending_Machine_for_Victoria%27s_Container_Deposit_Scheme_in_Sunshine.jpg",
    alt:line("Real reverse vending station for beverage container returns in Victoria, Australia.","Máquina real para devolver envases en Victoria, Australia.","ऑस्ट्रेलिया के विक्टोरिया में वास्तविक बोतल-वापसी मशीन।"),
    caption:line("Reverse-vending station in Victoria, Australia (2023). Example only, not an Oregon station.","Máquina de devolución en Victoria, Australia (2023). Es un ejemplo, no una estación de Oregón.","विक्टोरिया, ऑस्ट्रेलिया की वापसी मशीन (2023)। यह ओरेगन की तस्वीर नहीं है।"),
    credit:"Sgroey · CC BY 4.0",
    license:"CC BY 4.0",
    licenseUrl:"https://creativecommons.org/licenses/by/4.0/",
    page:"https://commons.wikimedia.org/wiki/File:Reverse_Vending_Machine_for_Victoria%27s_Container_Deposit_Scheme_in_Sunshine.jpg"
  },
  coral:{
    url:"https://marinedebris.noaa.gov/live/s3fs-public/20160501_NOAA_PIFSCCoralReefEcosystemProgram_106.jpg",
    alt:line("NOAA crew examining coral damaged by a large discarded fishing net.","Un equipo de NOAA examina corales dañados por una red abandonada.","NOAA टीम फेंके हुए मछली पकड़ने के जाल से क्षतिग्रस्त मूंगे की जाँच कर रही है।"),
    caption:line("NOAA team examines coral damaged by a derelict fishing net. A marine-debris example, not bottle-specific.","Equipo de NOAA examina coral dañado por una red abandonada; no es un caso de botella.","NOAA की टीम पुराने जाल से हुए मूंगे के नुकसान की जाँच करती है; यह बोतल का उदाहरण नहीं है।"),
    credit:"NOAA CREP",
    page:"https://marinedebris.noaa.gov/multimedia/images/coral-removed-derelict-net"
  },
  pile:{
    url:"https://marinedebris.noaa.gov/live/s3fs-public/debris_pile_0418_2016.jpg",
    alt:line("Separate piles of marine debris collected from a coral island shoreline with clear blue sea behind.","Montones de residuos marinos recogidos de una costa junto a un mar azul.","नीले समुद्र के किनारे एकत्र किए गए समुद्री कचरे के अलग-अलग ढेर।"),
    caption:line("Debris gathered from two 300-metre shoreline sections in the Northwestern Hawaiian Islands.","Residuos recogidos en dos tramos de costa de 300 metros cada uno.","उत्तर-पश्चिमी हवाई द्वीपों में तट के दो 300 मीटर हिस्सों से जमा कचरा।"),
    credit:"NOAA PIFSC Coral Reef Ecosystem Program",
    page:"https://marinedebris.noaa.gov/multimedia/solutions/images/debris-shoreline-cleanup-northwestern-hawaiian-islands"
  }
};

const chapters:Chapter[]=[
  {
    id:"scale",kind:"problem",photo:photos.shore,
    eyebrow:line("01 / THE SCALE","01 / LA ESCALA","01 / समस्या का आकार"),
    heading:line("One bottle is easy to forget. Millions are not.","Una botella se olvida. Millones, no.","एक बोतल भूलना आसान है। लाखों को नहीं।"),
    copy:line("You finish a drink, toss the bottle, and move on. But a discarded container enters a much bigger system of collection, transport, sorting and disposal. What happens next is anything but automatic.",
      "Terminas una bebida y tiras la botella. Pero entra en un enorme sistema de recolección, transporte y eliminación. Lo que sucede después no es automático.",
      "आप पेय खत्म करके बोतल फेंक देते हैं। लेकिन वह संग्रह, परिवहन और कचरा प्रबंधन के बड़े तंत्र का हिस्सा बन जाती है। आगे क्या होगा, यह तय नहीं है।"),
    bridge:line("The scale changes everything.","La escala lo cambia todo.","समस्या का आकार सब कुछ बदल देता है।"),
    data:"353",unit:line("million tonnes","millones de toneladas","मिलियन टन"),
    statExplain:line("Plastic waste generated worldwide in 2019. Not all of this was bottles.","Residuos plásticos generados en el mundo en 2019. No eran solo botellas.","2019 में विश्व का प्लास्टिक कचरा। यह केवल बोतलों का नहीं था।"),
    statSource:"https://www.oecd.org/en/publications/global-plastics-outlook_de747aef-en.html",factYear:"OECD · 2019"
  },
  {
    id:"recycled",kind:"problem",photo:photos.facility,
    eyebrow:line("02 / THE MYTH","02 / EL MITO","02 / गलत धारणा"),
    heading:line("The recycling symbol isn't a promise.","El símbolo de reciclaje no es una promesa.","रीसायक्लिंग का चिन्ह कोई गारंटी नहीं है।"),
    copy:line("A container can be recyclable in theory and still never become a new product. Collection is only the beginning. Material type, local facilities, contamination and demand all affect what gets recovered.",
      "Un envase puede ser reciclable y aun así no convertirse en otro producto. Importan el material, las instalaciones, la contaminación y la demanda.",
      "कोई वस्तु सैद्धांतिक रूप से रीसायकल हो सकती है, फिर भी नया उत्पाद न बने। सामग्री, स्थानीय सुविधाएँ और छँटाई मायने रखती हैं।"),
    bridge:line("So where does the rest go?","¿Dónde acaba el resto?","बाकी प्लास्टिक कहाँ जाता है?"),
    data:"9%",unit:line("actually recycled","realmente reciclado","वास्तव में रीसायकल"),
    statExplain:line("Share of all global plastic waste ultimately recycled in 2019, after processing losses. This is not the recycling rate of bottles alone.","Porcentaje de todos los residuos plásticos del mundo reciclados realmente en 2019, tras pérdidas del proceso. No es solo la tasa de botellas.","2019 में विश्व के कुल प्लास्टिक कचरे का हिस्सा जो अंत में रीसायकल हुआ। यह केवल बोतलों का आँकड़ा नहीं है।"),
    statSource:"https://www.oecd.org/en/publications/global-plastics-outlook_de747aef-en.html",factYear:"OECD · 2019"
  },
  {
    id:"escape",kind:"impact",photo:photos.waves,
    eyebrow:line("03 / WHERE IT ESCAPES","03 / DONDE ESCAPA","03 / प्लास्टिक कहाँ पहुँचता है"),
    heading:line("Far from our bins. Not far from the damage.","Lejos de nuestros botes. No del daño.","हमारे कूड़ेदान से दूर, लेकिन नुकसान से नहीं।"),
    copy:line("When waste escapes collection, wind, rain and waterways can carry it far from where it was used. Large pieces can harm wildlife. Sunlight and abrasion can also break some plastics into smaller fragments.",
      "Si los residuos escapan de la recolección, el viento, la lluvia y los ríos pueden llevarlos lejos. Los animales pueden sufrir daños y algunos plásticos se fragmentan.",
      "जब कचरा ठीक से एकत्र नहीं होता, तो हवा, बारिश और नदियाँ उसे दूर तक पहुँचा सकती हैं। इससे जीव-जंतुओं को नुकसान होता है और प्लास्टिक छोटे टुकड़ों में टूट सकता है।"),
    bridge:line("A problem on land becomes a problem in water.","Un problema en tierra llega al agua.","जमीन की समस्या पानी तक पहुँच जाती है।"),
    data:"11M",unit:line("tonnes per year","toneladas por año","टन प्रति वर्ष"),
    statExplain:line("Estimated plastic entering the ocean annually in UNEP's 2021 global assessment. Different estimates use different methods and years.","Estimación anual del plástico que llega al océano según UNEP en 2021. Las estimaciones varían según método y año.","UNEP के 2021 आकलन में प्रति वर्ष समुद्र में पहुँचने वाला अनुमानित प्लास्टिक। अलग तरीकों से अनुमान अलग हो सकते हैं।"),
    statSource:"https://www.unep.org/interactives/pollution-to-solution/",factYear:"UNEP · 2021 assessment"
  },
  {
    id:"consequence",kind:"impact",photo:photos.coral,
    eyebrow:line("04 / THE COST","04 / EL COSTO","04 / असर"),
    heading:line("A dirty beach is only what we can see.","Una playa sucia es solo lo que vemos.","गंदा समुद्र तट केवल दिखाई देने वाला हिस्सा है।"),
    copy:line("Marine debris can entangle animals, be mistaken for food and damage habitats. It also affects communities that depend on clean coastlines. Cleanup helps, but removing existing debris does not stop new waste from arriving.",
      "Los residuos marinos pueden enredar animales, ser confundidos con comida y dañar hábitats. También afectan a comunidades costeras. Limpiar no detiene nuevos residuos.",
      "समुद्री कचरे में जीव फँस सकते हैं या उसे भोजन समझ सकते हैं। इससे आवास और तटीय समुदाय भी प्रभावित होते हैं। सफ़ाई नए कचरे को आने से नहीं रोकती।"),
    bridge:line("The answer has to start upstream.","La respuesta debe empezar antes.","समाधान की शुरुआत स्रोत से करनी होगी।"),
    data:"700",unit:line("wildlife species","especies silvestres","वन्यजीव प्रजातियाँ"),
    statExplain:line("Estimated number of wildlife species affected by marine debris, according to NOAA. This refers to marine debris broadly, not bottles alone.","Número estimado de especies afectadas por residuos marinos, según NOAA. No se refiere solo a botellas.","NOAA के अनुसार समुद्री कचरे से प्रभावित अनुमानित प्रजातियाँ। यह केवल बोतलों का आँकड़ा नहीं है।"),
    statSource:"https://oceanservice.noaa.gov/education/tutorial-coastal/marine-debris/md06.html",factYear:"NOAA · marine debris impacts"
  },
  {
    id:"cleanup",kind:"solution",photo:photos.removal,
    eyebrow:line("05 / THE TURNING POINT","05 / EL CAMBIO","05 / बदलाव की शुरुआत"),
    heading:line("People are already changing the story.","La gente ya está cambiando la historia.","लोग पहले से कहानी बदल रहे हैं।"),
    copy:line("Crews pull trash from remote beaches. Communities organize collections. Those efforts matter, but doing the cleanup forever isn't a plan. Preventing waste and making returns convenient can keep more material in use.",
      "Los equipos limpian playas remotas y las comunidades organizan recolecciones. Importa mucho, pero limpiar para siempre no basta. Hay que prevenir residuos.",
      "टीमें दूर के समुद्र तट साफ करती हैं और समुदाय मिलकर संग्रह करते हैं। यह महत्वपूर्ण है, लेकिन हमेशा सफ़ाई करते रहना काफी नहीं। हमें कचरा पैदा होने से रोकना होगा।"),
    bridge:line("What if returning a container were the easiest choice?","¿Y si devolver el envase fuera lo más fácil?","अगर बोतल लौटाना सबसे आसान विकल्प हो तो?"),
    data:"1,468",unit:line("bottles recovered","botellas recuperadas","बोतलें एकत्र"),
    statExplain:line("Plastic beverage bottles removed by NOAA teams during one 2016 Northwestern Hawaiian Islands cleanup.","Botellas retiradas por equipos de NOAA en una limpieza de las islas hawaianas del noroeste en 2016.","NOAA की टीमों ने 2016 में उत्तर-पश्चिमी हवाई द्वीपों की एक सफ़ाई में इतनी बोतलें निकालीं।"),
    statSource:"https://marinedebris.noaa.gov/multimedia/images/plastic-beverage-bottles-nwhi",factYear:"NOAA · 2016 cleanup"
  },
  {
    id:"proof",kind:"solution",photo:photos.machine,
    eyebrow:line("06 / A SYSTEM THAT WORKS","06 / UN SISTEMA QUE FUNCIONA","06 / काम करने वाला तरीका"),
    heading:line("Give a bottle a reason to come home.","Dale a la botella un motivo para volver.","बोतल को वापस आने की वजह दें।"),
    copy:line("Some states charge a deposit when an eligible drink is sold and refund it when the empty container comes back. Oregon shows how powerful that incentive can be. Deposit-return systems are only one tool, and recycling still requires processing.",
      "Algunos estados cobran un depósito que se devuelve cuando regresa el envase. Oregón demuestra lo útil que puede ser. Aun así, los envases necesitan procesamiento.",
      "कुछ राज्यों में पात्र पेय खरीदते समय जमा राशि दी जाती है, जो बोतल लौटाने पर वापस मिलती है। ओरेगन में यह तरीका सफल रहा है। फिर भी लौटाई गई सामग्री को प्रक्रिया से गुजरना पड़ता है।"),
    bridge:line("The return is the beginning of a second life.","Devolver es el inicio de otra vida.","वापसी एक नए जीवन की शुरुआत हो सकती है।"),
    data:"87.41%",unit:line("returned","devuelto","वापसी दर"),
    statExplain:line("Oregon's reported statewide beverage-container redemption rate for 2024. This is NOT the global recycling rate.","Tasa estatal de devolución de envases de bebidas en Oregón en 2024. NO es la tasa mundial de reciclaje.","ओरेगन की 2024 की पात्र पेय कंटेनर वापसी दर। यह विश्व की रीसायक्लिंग दर नहीं है।"),
    statSource:"https://www.oregon.gov/olcc/Docs/bottle_bill/2024-BeverageContainerReturnData.pdf",factYear:"Oregon OLCC · 2024"
  },
  {
    id:"better",kind:"solution",photo:photos.bottle,
    eyebrow:line("07 / THE REAL SOLUTION","07 / LA SOLUCIÓN REAL","07 / असली समाधान"),
    heading:line("But the best bottle is the one we never throw away.","Pero la mejor botella es la que no tiramos.","सबसे अच्छी बोतल वह है जिसे हम फेंकते ही नहीं।"),
    copy:line("Recycling saves resources. Making a new aluminum can from recycled metal uses far less energy than making one from raw ore. Still, the EPA's preferred order begins with using less and reusing more. Refill first, return eligible containers, then recycle correctly.",
      "Reciclar ahorra recursos. Fabricar latas con aluminio reciclado requiere menos energía que usar mineral nuevo. Pero la EPA prioriza reducir y reutilizar antes de reciclar.",
      "रीसायक्लिंग से संसाधन बचते हैं। पुराने एल्यूमिनियम से नई कैन बनाने में कम ऊर्जा लगती है। फिर भी EPA पहले कम इस्तेमाल और दोबारा उपयोग को प्राथमिकता देता है।"),
    bridge:line("The next chapter is a choice you make.","El siguiente capítulo depende de ti.","अगला अध्याय आपके चुनाव से शुरू होता है।"),
    data:"95%",unit:line("less energy","menos energía","कम ऊर्जा"),
    statExplain:line("Energy saved when making new aluminum cans from recycled aluminum rather than bauxite ore. This statistic is about aluminum cans, not plastic bottles.","Ahorro de energía al fabricar latas de aluminio reciclado en vez de mineral nuevo. No se refiere a botellas de plástico.","नई कैन बनाने में पुनर्चक्रित एल्यूमिनियम का उपयोग करने से बची ऊर्जा। यह प्लास्टिक बोतलों का आँकड़ा नहीं है।"),
    statSource:"https://www.eia.gov/energyexplained/energy-and-the-environment/recycling-and-energy.php",factYear:"U.S. EIA · aluminum"
  }
];

function RealPhoto({photo,hero=false}:{photo:Photo;hero?:boolean}){
  const {language}=useLanguage();
  const [failed,setFailed]=useState(false);
  return <figure className={"documentary-photo "+(hero?"documentary-photo-hero":"")}>
    {!failed?<img src={photo.url} alt={photo.alt[language]} style={photo.position?{objectPosition:photo.position}:undefined}
      loading={hero?"eager":"lazy"} onError={()=>setFailed(true)}/>:<div className="documentary-photo-fallback" role="img" aria-label={photo.alt[language]}>
      {language==="en"?"Photo unavailable — open original":language==="es"?"Foto no disponible — ver original":"फोटो उपलब्ध नहीं — मूल चित्र खोलें"}
    </div>}
    <figcaption><span>{photo.caption[language]}</span><span className="documentary-photo-credits"><a href={photo.page} target="_blank" rel="noopener noreferrer">{photo.credit} <ExternalLink size={12}/></a>{photo.licenseUrl&&<a href={photo.licenseUrl} target="_blank" rel="noopener noreferrer" title={photo.license+"; photograph cropped for layout"}>License</a>}</span></figcaption>
  </figure>;
}

export default function DocumentaryStory({onScan,onReturns}:{onScan:()=>void;onReturns:()=>void}){
  const {language}=useLanguage();
  const root=useRef<HTMLDivElement>(null);
  const [visited,setVisited]=useState<string[]>([]);
  const [choice,setChoice]=useState<"refill"|"return"|"recycle"|null>(null);
  const [pledged,setPledged]=useState<string[]>([]);
  useEffect(()=>{
    const node=root.current;if(!node)return;
    const sections=[...node.querySelectorAll<HTMLElement>("[data-documentary-section]")];
    if(!("IntersectionObserver" in window)){
      sections.forEach(section=>section.classList.add("documentary-visible"));
      return;
    }
    const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
      if(entry.isIntersecting){
        entry.target.classList.add("documentary-visible");
        if(entry.target.id)setVisited(prev=>prev.includes(entry.target.id)?prev:[...prev,entry.target.id]);
      }
    }),{threshold:.17,rootMargin:"0px 0px -9% 0px"});
    sections.forEach(section=>observer.observe(section));
    return ()=>observer.disconnect();
  },[]);

  const actions=[
    {key:"refill",text:line("Bring a refillable bottle when you can.","Lleva una botella rellenable cuando puedas.","जब संभव हो दोबारा भरने वाली बोतल साथ रखें।")},
    {key:"return",text:line("Return eligible bottles and cans for their deposits.","Devuelve los envases elegibles para recuperar depósitos.","पात्र बोतलें और कैन जमा राशि के लिए लौटाएँ।")},
    {key:"check",text:line("Check local rules rather than guessing from the symbol.","Consulta las reglas locales; no adivines por el símbolo.","सिर्फ चिन्ह देखकर अनुमान न लगाएँ; स्थानीय नियम जाँचें।")},
    {key:"share",text:line("Make one less-waste change at school or at home.","Haz un cambio para reducir residuos en casa o la escuela.","घर या स्कूल में कचरा कम करने की एक आदत अपनाएँ।")}
  ] as const;
  const consequence={
    refill:line("A durable refillable bottle, reused many times, can avoid a stream of single-use containers. Wash and maintain it as directed.","Una botella resistente reutilizada muchas veces evita nuevos envases desechables.","टिकाऊ बोतल को बार-बार इस्तेमाल करने से कई एकल-उपयोग बोतलें बच सकती हैं।"),
    return:line("Where deposit laws apply, returning eligible containers can recover your deposit and keep materials in an organized collection stream.","Donde existen depósitos, devolver envases elegibles recupera dinero y mantiene materiales en recolección.","जहाँ जमा कानून हैं, पात्र बोतल लौटाने से पैसे वापस मिलते हैं और सामग्री सही संग्रह में पहुँचती है।"),
    recycle:line("Put accepted materials in the correct local stream. A recycling symbol alone does not establish local acceptance.","Deposita solo materiales aceptados en el sistema local. El símbolo no garantiza aceptación.","केवल स्थानीय रूप से स्वीकृत सामग्री को सही रीसायक्लिंग संग्रह में डालें। चिन्ह अकेले पात्रता नहीं बताता।")
  };
  return <div className="documentary" ref={root}>
    <header className="documentary-opening" data-documentary-section id="doc-opening">
      <div className="documentary-opening-media"><RealPhoto photo={photos.bottle} hero/></div>
      <div className="documentary-opening-shade"/>
      <div className="documentary-opening-content">
        <p className="documentary-eyebrow"><Waves size={17}/> WASTELENS ORIGINAL STORY</p>
        <h1>{line("We used it for minutes. It may stay for generations.","La usamos unos minutos. Puede quedarse por generaciones.","हमने कुछ मिनट इस्तेमाल किया। यह पीढ़ियों तक रह सकती है।")[language]}</h1>
        <p className="documentary-opening-sub">{line("The real journey of our waste. What goes wrong, what works, and what happens if we change the ending.","La historia real de nuestros residuos: los daños, las soluciones y cómo cambiar el final.","कचरे की असली कहानी: क्या गलत होता है, क्या काम करता है, और हम अंत कैसे बदल सकते हैं।")[language]}</p>
        <a className="documentary-explore" href="#doc-scale">{line("Follow the evidence","Sigue las pruebas","तथ्यों की यात्रा देखें")[language]} <ArrowDown size={18}/></a>
        <p className="documentary-reading-note">{line("Real photographs · independently sourced data · about 5 minutes","Fotografías reales · datos con fuentes · unos 5 minutos","वास्तविक तस्वीरें · स्रोत-समर्थित आँकड़े · लगभग 5 मिनट")[language]}</p>
      </div>
      <div className="documentary-opening-credit">{photos.bottle.credit} · <a href={photos.bottle.page} target="_blank" rel="noopener noreferrer">{line("Original photo","Foto original","मूल चित्र")[language]}</a></div>
    </header>

    <nav className="documentary-minimap" aria-label={line("Journey chapters","Capítulos","अध्याय")[language]}>
      <span className="documentary-minimap-heading">{line("THE STORY","LA HISTORIA","कहानी")[language]}</span>
      {chapters.map((chapter,i)=><a key={chapter.id} href={"#doc-"+chapter.id} className={visited.includes("doc-"+chapter.id)?"seen":""}
        aria-label={chapter.heading[language]} title={chapter.heading[language]}><span>{String(i+1).padStart(2,"0")}</span></a>)}
      <a href="#doc-action" aria-label={line("Take action","Actúa","कार्रवाई करें")[language]}><CheckCircle2 size={16}/></a>
    </nav>
    <div className="documentary-chapters">
      {chapters.map((chapter,index)=><section data-documentary-section id={"doc-"+chapter.id} className={"documentary-chapter documentary-"+chapter.kind} key={chapter.id}>
        <div className="documentary-chapter-photo"><RealPhoto photo={chapter.photo}/></div>
        <div className="documentary-chapter-body">
          <div className="documentary-chapter-number">{chapter.eyebrow[language]}</div>
          <h2>{chapter.heading[language]}</h2>
          <p className="documentary-chapter-copy">{chapter.copy[language]}</p>
          {chapter.id==="recycled"&&<div className="documentary-fate" aria-label={line("Nine percent of global plastic waste recycled in 2019","9 % de residuos plásticos mundiales reciclados en 2019","2019 में विश्व का 9% प्लास्टिक कचरा रीसायकल हुआ")[language]}>
            <div className="documentary-fate-track"><span className="documentary-fate-recycled" style={{width:"9%"}}/><span className="documentary-fate-other" style={{width:"91%"}}/></div>
            <div className="documentary-fate-key"><span><i className="recycled"/>9% {line("recycled","reciclado","रीसायकल")[language]}</span><span><i/>91% {line("not recycled","no reciclado","रीसायकल नहीं")[language]}</span></div>
          </div>}
          <div className="documentary-stat">
            <div className="documentary-stat-value">{chapter.data}</div>
            <div className="documentary-stat-text"><strong>{chapter.unit[language]}</strong><p>{chapter.statExplain[language]}</p></div>
          </div>
          <div className="documentary-chapter-footer">
            <a href={chapter.statSource} target="_blank" rel="noopener noreferrer"><BookOpen size={15}/>{chapter.factYear}<ExternalLink size={13}/></a>
            <ReadAloudButton id={"documentary-"+chapter.id} category="journey"
              text={[chapter.heading[language],chapter.copy[language],chapter.data+" "+chapter.unit[language],chapter.statExplain[language]].join(". ")}/>
          </div>
          <p className="documentary-bridge">{chapter.bridge[language]} <ArrowDown size={19}/></p>
        </div>
        {index===3&&<div className="documentary-interlude">
          <div><span>{line("THE QUESTION","LA PREGUNTA","सवाल")[language]}</span>
            <h3>{line("What if the story doesn't have to end here?","¿Y si la historia no tuviera que terminar así?","अगर कहानी का अंत यहाँ न हो तो?")[language]}</h3>
            <p>{line("The photographs are real. So are the people doing something about them.","Las fotos son reales. También quienes están actuando.","ये तस्वीरें असली हैं। इन्हें बदलने के लिए काम कर रहे लोग भी असली हैं।")[language]}</p>
          </div>
          <RealPhoto photo={photos.removal}/>
        </div>}
      </section>)}
    </div>
    <section className="documentary-decision" data-documentary-section id="doc-decision">
      <div className="documentary-decision-label">{line("YOU DECIDE","TÚ DECIDES","आप तय करें")[language]}</div>
      <h2>{line("Three possible endings. Pick one.","Tres finales posibles. Elige uno.","तीन संभावित अंत। एक चुनें।")[language]}</h2>
      <p>{line("There's no magic bin. The best next step depends on the container and where you live.","No hay un bote mágico. El mejor paso depende del envase y de dónde vives.","कोई जादुई कूड़ेदान नहीं है। सही कदम वस्तु और आपके स्थानीय नियमों पर निर्भर है।")[language]}</p>
      <div className="documentary-decision-options">
        {(["refill","return","recycle"] as const).map((c,i)=><button type="button" key={c} className={choice===c?"active":""}
          aria-pressed={choice===c} onClick={()=>setChoice(c)}>
          {i===0?<Leaf size={24}/>:i===1?<ArrowRight size={24}/>:<Recycle size={24}/>}
          <span>{({refill:line("REFILL IT","RELLENAR","फिर भरें"),return:line("RETURN IT","DEVOLVER","लौटाएँ"),recycle:line("RECYCLE IT","RECICLAR","रीसायकल करें")})[c][language]}</span>
          <ChevronDown size={15}/>
        </button>)}
      </div>
      {choice&&<div className="documentary-decision-answer" role="status"><CheckCircle2 size={22}/>{consequence[choice][language]}</div>}
    </section>
    <section className="documentary-final" data-documentary-section id="doc-action">
      <div className="documentary-final-photo"><RealPhoto photo={photos.removal}/></div>
      <div className="documentary-final-content">
        <p className="documentary-eyebrow">{line("THE STORY ISN'T OVER","LA HISTORIA SIGUE","कहानी अभी बाकी है")[language]}</p>
        <h2>{line("The next chapter is yours.","El siguiente capítulo es tuyo.","अगला अध्याय आपका है।")[language]}</h2>
        <p>{line("You don't have to fix the whole planet today. Start with the next bottle. Then make the better choice a habit.","No tienes que arreglar el planeta hoy. Empieza con la próxima botella. Luego conviértelo en costumbre.","आपको आज पूरी दुनिया नहीं बदलनी। अगली बोतल से शुरू करें, फिर इसे आदत बनाएँ।")[language]}</p>
        <div className="documentary-actions">
          {actions.map(item=><label className="documentary-action" key={item.key}>
            <input type="checkbox" checked={pledged.includes(item.key)}
              onChange={e=>setPledged(prev=>e.target.checked?[...prev,item.key]:prev.filter(x=>x!==item.key))}/>
            <span>{item.text[language]}</span>
          </label>)}
        </div>
        <p className="documentary-pledge-count" role="status">{pledged.length} / {actions.length} {line("actions chosen","acciones elegidas","चुने गए कदम")[language]}</p>
        <div className="documentary-final-buttons">
          <button type="button" onClick={onScan}><Recycle size={18}/>{line("Scan your next item","Escanear otro objeto","अगली वस्तु स्कैन करें")[language]}</button>
          <button type="button" className="secondary" onClick={onReturns}>{line("Check bottle refunds","Comprobar reembolsos","बोतल वापसी देखें")[language]} <ArrowRight size={18}/></button>
        </div>
        <a className="documentary-quiz-link" href="#bottle-quiz">{line("One last stop: earn your Bottle Explorer badge","Una última parada: gana tu insignia Bottle Explorer","आखिरी पड़ाव: Bottle Explorer बैज पाएँ")[language]} <ArrowDown size={16}/></a>
      </div>
    </section>
    <aside className="documentary-sources">
      <h2>{line("Behind the story","Fuentes de la historia","कहानी के स्रोत")[language]}</h2>
      <p>{line("The photographs come from NOAA and licensed Wikimedia Commons contributors, each identified below. Statistics cover different materials, locations and years, so the images do not depict the exact data points. Some photos are cropped to fit the layout.","Las fotografías son de NOAA y autores de Wikimedia Commons con licencia. Cada dato tiene su año y región; las fotos son ilustrativas. Algunas están recortadas para el diseño.","ये वास्तविक तस्वीरें NOAA और लाइसेंस प्राप्त Wikimedia Commons योगदानकर्ताओं की हैं। आँकड़ों के वर्ष और क्षेत्र अलग हैं। कुछ तस्वीरें लेआउट के अनुसार क्रॉप की गई हैं।")[language]}</p>
      <details><summary>{line("See original photos and research","Ver fotos originales e investigaciones","मूल तस्वीरें और शोध देखें")[language]}</summary>
        <ul>{Object.values(photos).map(photo=><li key={photo.page}><a href={photo.page} target="_blank" rel="noopener noreferrer">{photo.credit} — {photo.caption[language]}</a>{photo.licenseUrl&&<> · <a href={photo.licenseUrl} target="_blank" rel="noopener noreferrer">{photo.license}</a></>}</li>)}
        {chapters.map(chapter=><li key={chapter.id}><a href={chapter.statSource} target="_blank" rel="noopener noreferrer">{chapter.factYear}: {chapter.statExplain[language]}</a></li>)}</ul>
      </details>
    </aside>
  </div>;
}
