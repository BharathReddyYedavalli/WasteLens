/* Kiosk-only words: deliberately separate from the full website's translation table. */
import type { Language } from "./i18n";

const COPY:Record<string,{es:string;hi:string}>={
  "Scan with camera":{es:"Escanear con cámara",hi:"कैमरे से स्कैन करें"},
  "Find an item":{es:"Buscar un objeto",hi:"वस्तु खोजें"},
  "Search by name":{es:"Buscar por nombre",hi:"नाम से खोजें"},
  "No camera or AI needed":{es:"No necesitas cámara ni IA",hi:"कैमरा या AI की ज़रूरत नहीं"},
  "Search for a common item or choose one below.":{es:"Busca un objeto común o elige uno de abajo.",hi:"किसी सामान्य वस्तु को खोजें या नीचे चुनें।"},
  "Search for a bottle, cup, fork…":{es:"Busca botella, vaso, tenedor…",hi:"बोतल, कप, चम्मच खोजें…"},
  "Common items":{es:"Objetos comunes",hi:"सामान्य वस्तुएँ"},
  "No matching items":{es:"No hay objetos que coincidan",hi:"कोई मेल खाती वस्तु नहीं"},
  "Try another word or ask staff.":{es:"Prueba otra palabra o pregunta al personal.",hi:"दूसरा शब्द आज़माएँ या कर्मचारियों से पूछें।"},
  "Choose this item":{es:"Elegir este objeto",hi:"यह वस्तु चुनें"},
  "Change item":{es:"Cambiar objeto",hi:"वस्तु बदलें"},
  "Start with a photo or item search":{es:"Empieza con una foto o búsqueda",hi:"फोटो या खोज से शुरू करें"},
  "Only staff-confirmed materials can have a bin recommendation.":{es:"Solo los materiales confirmados por el personal pueden tener un contenedor indicado.",hi:"केवल कर्मचारियों द्वारा पुष्टि की गई सामग्री के लिए डिब्बा सुझाया जा सकता है।"},
  "Item selected":{es:"Objeto seleccionado",hi:"चुनी हुई वस्तु"},
  "Your organization's bin":{es:"Contenedor de tu organización",hi:"आपकी संस्था का डिब्बा"},
  "No confirmed bin for this item":{es:"No hay contenedor confirmado para este objeto",hi:"इस वस्तु के लिए कोई पक्का डिब्बा नहीं है"},
  "Please ask staff or check the sign on the physical bin.":{es:"Pregunta al personal o revisa el cartel del contenedor.",hi:"कर्मचारियों से पूछें या असली डिब्बे के संकेत देखें।"},
  "The item must match the listed type and condition.":{es:"El objeto debe coincidir con el tipo y el estado indicados.",hi:"वस्तु का प्रकार और हालत दी गई जानकारी से मेल खानी चाहिए।"},
  "This is an organization's staff-entered rule, not a WasteLens verification.":{es:"Esta regla la introdujo el personal; WasteLens no la verificó.",hi:"यह कर्मचारियों द्वारा दर्ज नियम है, WasteLens ने इसे सत्यापित नहीं किया।"},
  "No school or office rules are set up yet.":{es:"Aún no hay reglas configuradas para este centro.",hi:"इस स्कूल या कार्यालय के नियम अभी सेट नहीं हैं।"},
  "A manager can add approved bin rules in the Admin page.":{es:"Un responsable puede añadir normas aprobadas en la página Admin.",hi:"प्रबंधक Admin पेज में स्वीकृत डिब्बे के नियम जोड़ सकता है।"},
  "You can identify an item, but WasteLens cannot confirm a physical bin here yet.":{es:"Puedes identificar un objeto, pero WasteLens aún no puede confirmar un contenedor aquí.",hi:"आप वस्तु पहचान सकते हैं, लेकिन WasteLens यहाँ अभी डिब्बे की पुष्टि नहीं कर सकता।"},
  "Local rules":{es:"Normas locales",hi:"स्थानीय नियम"},
  "Scanning sends the photo to Google Gemini. Item search stays on this device.":{es:"Escanear envía la foto a Google Gemini. La búsqueda de objetos se queda en este dispositivo.",hi:"स्कैन करने पर फोटो Google Gemini को भेजी जाती है। वस्तु की खोज इसी डिवाइस पर रहती है।"},
  "Use a private item photo. Do not photograph people.":{es:"Fotografía solo el objeto; no a las personas.",hi:"केवल वस्तु की फोटो लें, लोगों की नहीं।"},
  "Your session will clear soon.":{es:"La sesión se borrará pronto.",hi:"यह सत्र जल्द साफ हो जाएगा।"},
  "This shared kiosk clears after two minutes without activity.":{es:"Este quiosco compartido se borra tras dos minutos de inactividad.",hi:"इस साझा कियोस्क की स्क्रीन दो मिनट निष्क्रिय रहने पर साफ हो जाती है।"},
  "Stay here":{es:"Seguir aquí",hi:"यहीं रहें"},
  "Clear now":{es:"Borrar ahora",hi:"अभी साफ करें"},
  "Done — next person":{es:"Listo — siguiente persona",hi:"पूरा हुआ — अगला व्यक्ति"},
  "Refresh bin rules":{es:"Actualizar reglas",hi:"डिब्बे के नियम अपडेट करें"},
  "Could not load this location's bin rules. Ask staff.":{es:"No se pudieron cargar las reglas del lugar. Pregunta al personal.",hi:"इस स्थान के नियम लोड नहीं हुए। कर्मचारियों से पूछें।"},
  "Photo recognition suggestion":{es:"Sugerencia de reconocimiento de foto",hi:"फोटो से पहचान का सुझाव"},
  "Choose the closest confirmed item type":{es:"Elige el tipo confirmado más cercano",hi:"सही पुष्टि की हुई वस्तु चुनें"},
  "Unsure? Ask staff instead of guessing.":{es:"¿Dudas? Pregunta al personal.",hi:"पता नहीं? अनुमान लगाने के बजाय कर्मचारियों से पूछें।"},
  "Return to choices":{es:"Volver a las opciones",hi:"विकल्पों पर वापस जाएँ"},
  "No internet or AI? Use item search.":{es:"¿Sin internet o IA? Busca un objeto.",hi:"इंटरनेट या AI नहीं है? वस्तु खोजें।"}
};
export function kioskCopy(language:Language,key:string):string {
  if(language==="en")return key;
  return COPY[key]?.[language]??key;
}

export const ITEM_SYNONYMS:Record<string,string>={
  empty_plastic_bottle:"bottle water soda pet plastic drink",
  empty_metal_can:"aluminum aluminium soda drinks can tin metal",
  empty_glass_bottle:"jar glass bottle",
  clean_paper:"paper worksheet printer notebook sheets",
  clean_cardboard:"box cardboard packaging carton",
  plastic_cutlery:"fork spoon knife utensil cutlery flatware plastic",
  paper_plate:"plate disposable paper",
  empty_food_container:"takeout box food container lunch plastic",
  disposable_cup:"cup coffee paper plastic drink",
  food_scraps:"food banana apple leftovers compost scraps",
  plastic_film:"bag wrap grocery film packaging plastic"
};
