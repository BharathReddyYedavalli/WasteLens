import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

export type Language = "en" | "es" | "hi";
export const LANGUAGES: { code: Language; label: string }[] = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "hi", label: "हिन्दी" },
];

const strings: Record<string, { es: string; hi: string }> = {
  "Scan": { es: "Escanear", hi: "स्कैन करें" },
  "Ask": { es: "Preguntar", hi: "पूछें" },
  "Find a place": { es: "Buscar un lugar", hi: "केंद्र खोजें" },
  "My activity": { es: "Mi actividad", hi: "मेरी गतिविधि" },
  "Leaderboard": { es: "Clasificación", hi: "लीडरबोर्ड" },
  "Sign in": { es: "Entrar", hi: "लॉग इन" },
  "Admin": { es: "Administración", hi: "व्यवस्थापक" },
  "Choose language": { es: "Elegir idioma", hi: "भाषा चुनें" },
  "Know what goes where.": { es: "Cada cosa en su lugar.", hi: "हर चीज़ की सही जगह।" },
  "Before you toss it, scan it.": {
    es: "Antes de tirarlo, escanéalo.",
    hi: "फेंकने से पहले स्कैन करें।"
  },
  "See how to reuse it, sort it, or find a place nearby.": {
    es: "Descubre cómo reutilizarlo, clasificarlo o buscar un centro cercano.",
    hi: "जानें कि इसे दोबारा कैसे इस्तेमाल करें, कहाँ छाँटें या कहाँ जमा करें।"
  },
  "Snap it. Sort it. Make it count.": { es: "Toma una foto. Clasifica. Haz la diferencia.", hi: "तस्वीर लें। सही छाँटें। बदलाव लाएँ।" },
  "A smarter way to handle everyday stuff.": { es: "Una forma más fácil de decidir qué hacer con cada objeto.", hi: "रोज़मर्रा की चीज़ों का सही उपयोग जानें।" },
  "Take a picture": { es: "Toma una foto", hi: "तस्वीर लें" },
  "What's in front of you?": { es: "¿Qué tienes delante?", hi: "आपके सामने क्या है?" },
  "Use your camera or upload a photo.": { es: "Usa la cámara o sube una foto.", hi: "कैमरा उपयोग करें या फोटो चुनें।" },
  "Use camera": { es: "Usar cámara", hi: "कैमरा खोलें" },
  "Choose a photo": { es: "Elegir foto", hi: "फोटो चुनें" },
  "Take picture": { es: "Capturar foto", hi: "तस्वीर लें" },
  "Close camera": { es: "Cerrar cámara", hi: "कैमरा बंद करें" },
  "Identify item": { es: "Identificar objeto", hi: "चीज़ पहचानें" },
  "Looking at it…": { es: "Analizando…", hi: "पहचान रहे हैं…" },
  "Try another photo": { es: "Otra foto", hi: "दूसरी फोटो" },
  "Focus on one item": { es: "Enfócate en un objeto", hi: "एक चीज़ पर ध्यान दें" },
  "Optional": { es: "Opcional", hi: "वैकल्पिक" },
  "Change AI model": { es: "Cambiar modelo", hi: "AI मॉडल बदलें" },
  "Choose a model": { es: "Elegir modelo", hi: "मॉडल चुनें" },
  "Photo privacy": { es: "Privacidad de fotos", hi: "फोटो की गोपनीयता" },
  "Photos go to Google Gemini when you scan. Free tier data may be used to improve Google's services.": {
    es: "Las fotos se envían a Gemini al escanear. En el nivel gratuito, Google puede usar esos datos para mejorar sus servicios.",
    hi: "स्कैन करने पर फोटो Google Gemini को भेजी जाती है। मुफ्त सेवा का डेटा Google अपनी सेवाएँ सुधारने के लिए इस्तेमाल कर सकता है।"
  },
  "What to do with it": { es: "Qué hacer con esto", hi: "इसका क्या करें" },
  "Give it another life": { es: "Dale otra vida", hi: "फिर से उपयोग करें" },
  "You'll need": { es: "Necesitas", hi: "आपको चाहिए" },
  "How to make it": { es: "Cómo hacerlo", hi: "बनाने के चरण" },
  "Ask about this item": { es: "Pregunta sobre este objeto", hi: "इस चीज़ के बारे में पूछें" },
  "Material": { es: "Material", hi: "सामग्री" },
  "A few things to check": { es: "Antes de decidir", hi: "पहले यह जाँचें" },
  "Nearby places": { es: "Lugares cercanos", hi: "आसपास के केंद्र" },
  "Search": { es: "Buscar", hi: "खोजें" },
  "Searching…": { es: "Buscando…", hi: "खोज रहे हैं…" },
  "ZIP code": { es: "Código postal", hi: "ज़िप कोड" },
  "Was that right?": { es: "¿Acertamos?", hi: "क्या पहचान सही थी?" },
  "Yes": { es: "Sí", hi: "हाँ" },
  "No": { es: "No", hi: "नहीं" },
  "What did you do with it?": { es: "¿Qué hiciste con esto?", hi: "आपने इसका क्या किया?" },
  "Recycled": { es: "Reciclado", hi: "रीसायकल किया" },
  "Reused": { es: "Reutilizado", hi: "फिर इस्तेमाल किया" },
  "Composted": { es: "Compostado", hi: "खाद बनाया" },
  "Donated": { es: "Donado", hi: "दान किया" },
  "Saved!": { es: "¡Guardado!", hi: "सहेजा गया!" },
  "Sort plan": { es: "Plan de clasificación", hi: "छँटाई की योजना" },
  "Take this guide with you": { es: "Llévate esta guía", hi: "यह गाइड अपने साथ रखें" },
  "Save or print": { es: "Guardar o imprimir", hi: "सहेजें या प्रिंट करें" },
  "Copy steps": { es: "Copiar pasos", hi: "चरण कॉपी करें" },

  "Your routine": { es: "Tu rutina", hi: "आपकी दिनचर्या" },
  "Unlock your first badge": { es: "Desbloquea tu primera insignia", hi: "अपना पहला बैज पाएँ" },
  "First Find": { es: "Primer hallazgo", hi: "पहली खोज" },
  "Getting Curious": { es: "Cada vez más curioso", hi: "खोज जारी" },
  "Sorting Star": { es: "Estrella del reciclaje", hi: "छँटाई सितारा" },
  "Everyday Hero": { es: "Héroe diario", hi: "रोज़ का नायक" },
  "Waste Wise": { es: "Experto en residuos", hi: "कचरा विशेषज्ञ" },
  "New badge!": { es: "¡Nueva insignia!", hi: "नया बैज!" },
  "Unlocked": { es: "Desbloqueada", hi: "अनलॉक हुआ" },
  "Join the challenge": { es: "Únete al reto", hi: "चुनौती में शामिल हों" },
  "Sign in to earn XP and collect badges as you scan.": {
    es: "Entra para ganar XP e insignias al escanear.",
    hi: "स्कैन करके XP और बैज पाने के लिए लॉग इन करें।"
  },
  "The board is empty. You can be the first!": {
    es: "Todavía no hay nadie. ¡Sé el primero!",
    hi: "अभी यहाँ कोई नहीं है। आप पहले हो सकते हैं!"
  },
  "Show me on the leaderboard": { es: "Aparecer en la clasificación", hi: "लीडरबोर्ड पर मेरा नाम दिखाएँ" },
  "Your progress is private until you join.": {
    es: "Tu progreso es privado hasta que participes.",
    hi: "शामिल होने तक आपकी प्रगति निजी रहेगी।"
  },
  "Your display name and scores are visible to visitors.": {
    es: "Tu nombre y puntuación serán visibles.",
    hi: "दूसरे लोग आपका नाम और स्कोर देख सकेंगे।"
  },
  "No extra tools required.": { es: "No necesitas más herramientas.", hi: "अतिरिक्त सामान की ज़रूरत नहीं।" },
  "Before trying a project": { es: "Antes de empezar", hi: "शुरू करने से पहले" },
  "No safe reuse idea for this item yet.": { es: "No hay una idea de reutilización segura por ahora.", hi: "फिलहाल सुरक्षित पुनः उपयोग का सुझाव नहीं है।" },
  "Find somewhere nearby": { es: "Buscar cerca de ti", hi: "पास में खोजें" },
  "One thing to check": { es: "Algo que debes comprobar", hi: "यह जाँचें" },
  "What was the item? (optional)": { es: "¿Qué objeto era? (opcional)", hi: "वह क्या चीज़ थी? (वैकल्पिक)" },
  "Submit feedback": { es: "Enviar comentario", hi: "प्रतिक्रिया भेजें" },
  "New here? Create an account": { es: "¿Primera vez? Crea una cuenta", hi: "नए हैं? खाता बनाएँ" },
  "See the tips for this item": { es: "Ver consejos para este objeto", hi: "इस चीज़ के सुझाव देखें" },
  "Nothing here yet. Scan your first item to save it.": {
    es: "Todavía no hay nada. Escanea un objeto para guardarlo.",
    hi: "अभी कुछ नहीं है। पहली चीज़ स्कैन करें।"
  },
  "My account details": { es: "Detalles de mi cuenta", hi: "मेरे खाते का विवरण" },
  "Admin dashboard": { es: "Panel de administración", hi: "व्यवस्थापक डैशबोर्ड" },
  "Your account and privacy": { es: "Tu cuenta y privacidad", hi: "आपका खाता और गोपनीयता" },
  "What would you like to know?": { es: "¿Qué quieres saber?", hi: "आप क्या जानना चाहते हैं?" },
  "Anything else you want to know?": { es: "¿Algo más que quieras saber?", hi: "कुछ और जानना है?" },
  "Can I recycle this with its cap or lid?": { es: "¿Puedo reciclarlo con la tapa?", hi: "क्या इसे ढक्कन के साथ रीसायकल कर सकते हैं?" },
  "What is the easiest way to reuse this?": { es: "¿Cómo puedo reutilizarlo fácilmente?", hi: "इसका सबसे आसान पुनः उपयोग क्या है?" },
  "How should I prepare this for disposal?": { es: "¿Cómo lo preparo para desecharlo?", hi: "इसे फेंकने से पहले क्या करें?" },
  "Where should old batteries go?": { es: "¿Dónde van las pilas usadas?", hi: "पुरानी बैटरियाँ कहाँ दें?" },
  "Can pizza boxes be recycled?": { es: "¿Se reciclan las cajas de pizza?", hi: "क्या पिज़्ज़ा बॉक्स रीसायकल होते हैं?" },
  "How can I reduce plastic waste?": { es: "¿Cómo puedo reducir residuos plásticos?", hi: "प्लास्टिक कचरा कैसे कम करें?" },
  "Clear chat": { es: "Borrar chat", hi: "चैट मिटाएँ" },
  "All": { es: "Todos", hi: "सभी" },
  "Centers": { es: "Centros", hi: "केंद्र" },
  "Drop off spots": { es: "Puntos de entrega", hi: "जमा करने के स्थान" },
  "Places near you": { es: "Lugares cercanos", hi: "आसपास के स्थान" },
  "No places found": { es: "No encontramos lugares", hi: "कोई स्थान नहीं मिला" },
  "Location details": { es: "Datos del lugar", hi: "स्थान का विवरण" },
  "Waste audit": { es: "Auditoría de residuos", hi: "कचरा सर्वेक्षण" },

  "Bottle Explorer": { es:"Explorador de botellas", hi:"बोतल खोजकर्ता" },
  "Check your container": { es:"Revisa tu envase", hi:"बोतल की जाँच करें" },
  "Ready to return them?": { es:"¿Listo para devolverlos?", hi:"वापस जमा करने के लिए तैयार?" },
  "Where was it purchased?": { es:"¿Dónde lo compraste?", hi:"इसे कहाँ खरीदा था?" },
  "What's inside?": { es:"¿Qué bebida contiene?", hi:"अंदर कौन सा पेय है?" },
  "Container type": { es:"Tipo de envase", hi:"बोतल का प्रकार" },
  "Size in fluid ounces": { es:"Tamaño en onzas líquidas", hi:"आकार (फ़्लूइड औंस)" },
  "Number of containers": { es:"Cantidad de envases", hi:"कितनी बोतलें हैं?" },
  "Was the deposit paid in that state?": { es:"¿Pagaste el depósito en ese estado?", hi:"क्या उस राज्य में जमा शुल्क दिया था?" },
  "Plastic type": { es:"Tipo de plástico", hi:"प्लास्टिक का प्रकार" },
  "Is that bottle worth something?": { es:"¿Cuánto vale devolverla?", hi:"इस बोतल से कितना वापस मिलेगा?" },
  "Check what you might get back when you return a drink container.": {
    es:"Descubre cuánto podrías recuperar al devolver un envase.",
    hi:"बोतल जमा करने पर कितने पैसे वापस मिल सकते हैं, जानें।"
  },
  "Not every state has bottle deposits.": {es:"No todos los estados cobran depósitos.",hi:"हर राज्य में बोतल जमा शुल्क नहीं है।"},
  "Only 10 do. And even in those states, the drink, container and purchase location matter.": {
    es:"Solo diez lo hacen. La bebida, el envase y dónde se compró importan.",
    hi:"केवल 10 राज्यों में है। पेय, बोतल और खरीदे गए स्थान से राशि बदलती है।"
  },
  "Still water": {es:"Agua sin gas",hi:"सादा पानी"},
  "Sparkling water": {es:"Agua con gas",hi:"सोडा पानी"},
  "Soda": {es:"Refresco",hi:"सॉफ्ट ड्रिंक"},
  "Beer or malt drink":{es:"Cerveza o bebida de malta",hi:"बीयर या माल्ट पेय"},
  "Hard cider":{es:"Sidra alcohólica",hi:"हार्ड साइडर"},
  "Juice":{es:"Jugo",hi:"जूस"},
  "Sports or energy drink":{es:"Bebida deportiva o energética",hi:"स्पोर्ट्स या एनर्जी ड्रिंक"},
  "Coffee or tea":{es:"Café o té",hi:"कॉफी या चाय"},
  "Wine":{es:"Vino",hi:"वाइन"},
  "Liquor or spirits":{es:"Licor o destilados",hi:"शराब"},
  "Mixed alcoholic drink":{es:"Cóctel preparado",hi:"मिश्रित अल्कोहल पेय"},
  "Milk":{es:"Leche",hi:"दूध"},
  "Something else":{es:"Otra bebida",hi:"कुछ और"},
  "Metal can":{es:"Lata metálica",hi:"धातु का कैन"},
  "Plastic bottle":{es:"Botella de plástico",hi:"प्लास्टिक की बोतल"},
  "Glass bottle":{es:"Botella de vidrio",hi:"काँच की बोतल"},
  "Paper carton or box":{es:"Cartón o caja",hi:"कार्टन या डिब्बा"},
  "Pouch":{es:"Bolsa flexible",hi:"पाउच"},
  "Not sure":{es:"No estoy seguro",hi:"पता नहीं"},
  "I don't know":{es:"No lo sé",hi:"पता नहीं"},
  "No, it wasn't":{es:"No, no lo pagué",hi:"नहीं, नहीं दिया"},
  "Yes, a deposit was charged":{es:"Sí, pagué un depósito",hi:"हाँ, जमा शुल्क दिया था"},
  "Try one:":{es:"Prueba:",hi:"उदाहरण:"},
  "YOUR REFUND CHECK":{es:"RESULTADO",hi:"वापसी की राशि"},
  "Possible refund for eligible returns":{es:"Posible reembolso",hi:"संभावित वापसी राशि"},
  "Check before counting on it":{es:"Compruébalo antes de devolverlo",hi:"पहले पुष्टि करें"},
  "No deposit expected":{es:"No se espera reembolso",hi:"जमा राशि नहीं मिलेगी"},
  "The calculation follows the selected state's rules. Check the official link for exceptions.":{
    es:"El cálculo sigue las normas estatales. Consulta el enlace oficial para conocer las excepciones.",
    hi:"यह गणना राज्य के नियमों के अनुसार है। अपवादों के लिए आधिकारिक लिंक देखें।"
  },
  "Read the official state rules":{es:"Ver normas oficiales",hi:"आधिकारिक नियम देखें"},
  "Have the bottle with you?":{es:"¿Tienes el envase contigo?",hi:"क्या बोतल आपके पास है?"},
  "Read its label with your camera":{es:"Leer la etiqueta con la cámara",hi:"कैमरे से लेबल पढ़ें"},
  "Read label":{es:"Leer etiqueta",hi:"लेबल पढ़ें"},
  "Reading…":{es:"Leyendo…",hi:"पढ़ रहे हैं…"},
  "Not yet verified":{es:"Sin verificar",hi:"अभी पुष्टि नहीं हुई"},
  "Check these details above":{es:"Comprueba los datos de arriba",hi:"ऊपर दी गई जानकारी जाँचें"},
  "Refund estimate":{es:"Reembolso estimado",hi:"अनुमानित वापसी"},
  "What happens to your bottle?":{es:"¿Qué pasa con tu botella?",hi:"आपकी बोतल का क्या होता है?"},
  "Scroll to begin":{es:"Desliza para comenzar",hi:"शुरू करने के लिए नीचे जाएँ"},
  "From the official source":{es:"Fuente oficial",hi:"आधिकारिक स्रोत"},
  "Finish quiz":{es:"Terminar cuestionario",hi:"क्विज़ पूरा करें"},
  "Try again":{es:"Intentar otra vez",hi:"फिर से प्रयास करें"},
  "Sign in to earn the badge":{es:"Entra para ganar la insignia",hi:"बैज पाने के लिए लॉग इन करें"},
  "YOU MADE IT!":{es:"¡LO LOGRASTE!",hi:"आप पहुँच गए!"},
  "Bottle story":{es:"La historia de una botella",hi:"बोतल की कहानी"},
  "Choose the answer for each question":{es:"Elige la respuesta de cada pregunta",hi:"हर सवाल का जवाब चुनें"},
  "Bottle returns": { es: "Devolver envases", hi: "बोतल जमा करें" },
  "Bottle journey": { es: "Viaje de la botella", hi: "बोतल की यात्रा" },
  "Count what you see during a cleanup or lunch period. No photos needed.": {
    es: "Cuenta los objetos durante la limpieza o el almuerzo. No necesitas fotos.",
    hi: "सफ़ाई या लंच के दौरान चीज़ें गिनें। फोटो की ज़रूरत नहीं।"
  },
  "Audit name": { es: "Nombre del conteo", hi: "सर्वेक्षण का नाम" },
  "Example: Cafeteria lunch": { es: "Ejemplo: Almuerzo escolar", hi: "उदाहरण: स्कूल का लंच" },
  "Items counted": { es: "Objetos contados", hi: "गिनी गई चीज़ें" },
  "Tap a category for each item you observe.": {
    es: "Toca una categoría por cada objeto que veas.",
    hi: "हर देखी गई चीज़ के लिए श्रेणी चुनें।"
  },
  "Recycling": { es: "Reciclaje", hi: "रीसायकल" },
  "Compost": { es: "Compostaje", hi: "खाद" },
  "Trash": { es: "Basura", hi: "कचरा" },
  "Reuse": { es: "Reutilizar", hi: "दोबारा उपयोग" },
  "Undo last": { es: "Deshacer", hi: "पिछला हटाएँ" },
  "Export CSV": { es: "Exportar CSV", hi: "CSV निर्यात करें" },
  "Print results": { es: "Imprimir", hi: "प्रिंट करें" },
  "Clear audit": { es: "Borrar conteo", hi: "सर्वेक्षण मिटाएँ" },
  "Clear this audit?": { es: "¿Borrar este conteo?", hi: "सर्वेक्षण मिटाएँ?" },
  "What you counted": { es: "Tu conteo", hi: "आपकी गिनती" },
  "Tap a category above to start.": { es: "Toca una categoría para empezar.", hi: "शुरू करने के लिए श्रेणी चुनें।" },
  "About these numbers": { es: "Sobre estos números", hi: "इन आँकड़ों के बारे में" },
  "Counts are entered by people, not checked by AI. They do not prove recycling or carbon savings. This audit stays in this browser until cleared.": {
    es: "Las cifras las introduce una persona. No demuestran reciclaje ni ahorro de carbono. Se guardan solo en este navegador hasta que las borres.",
    hi: "ये आँकड़े लोगों ने दर्ज किए हैं। ये रीसायकल या कार्बन बचत का प्रमाण नहीं हैं। मिटाने तक यह सर्वेक्षण इसी ब्राउज़र में रहेगा।"
  },
  "Listen": { es: "Escuchar", hi: "सुनें" },
  "Stop reading": { es: "Detener lectura", hi: "पढ़ना रोकें" },
  "Copied!": { es: "¡Copiado!", hi: "कॉपी हो गया!" },
  "Finished": { es: "Terminado", hi: "पूरा" },
  "steps done": { es: "pasos completados", hi: "चरण पूरे" },
  "Check each step as you go": { es: "Marca los pasos que termines", hi: "पूरा होने पर चरण चुनें" },
  "Before you go": { es: "Antes de ir", hi: "जाने से पहले" },
  "My scans": { es: "Mis escaneos", hi: "मेरे स्कैन" },
  "No scans yet": { es: "Todavía no hay escaneos", hi: "अभी कोई स्कैन नहीं" },
  "Your habits": { es: "Tus hábitos", hi: "आपकी आदतें" },
  "Past 7 days": { es: "Últimos 7 días", hi: "पिछले 7 दिन" },
  "Items scanned": { es: "Objetos escaneados", hi: "स्कैन की गई चीज़ें" },
  "Actions logged": { es: "Acciones registradas", hi: "दर्ज कार्रवाई" },
  "Reused or donated": { es: "Reutilizado o donado", hi: "दोबारा उपयोग या दान" },
  "Your activity is based on scans and actions you reported.": {
    es: "Esta actividad se basa en tus escaneos y acciones declaradas.",
    hi: "यह जानकारी आपके स्कैन और दर्ज की गई कार्रवाइयों पर आधारित है।"
  },
  "Your badges": { es: "Tus insignias", hi: "आपके बैज" },
  "Top scanners": { es: "Los que más escanean", hi: "सबसे अधिक स्कैन" },
  "Your progress": { es: "Tu progreso", hi: "आपकी प्रगति" },
  "Level": { es: "Nivel", hi: "स्तर" },
  "Badges": { es: "Insignias", hi: "बैज" },
  "Scans": { es: "Escaneos", hi: "स्कैन" },
  "Join leaderboard": { es: "Unirme a la clasificación", hi: "लीडरबोर्ड में शामिल हों" },
  "Leave leaderboard": { es: "Salir de la clasificación", hi: "लीडरबोर्ड छोड़ें" },
  "How XP works": { es: "Cómo funciona XP", hi: "XP कैसे काम करता है" },
  "Ask WasteLens": { es: "Pregunta a WasteLens", hi: "WasteLens से पूछें" },
  "What's on your mind?": { es: "¿Qué quieres saber?", hi: "क्या जानना चाहते हैं?" },
  "Ask a question…": { es: "Haz una pregunta…", hi: "कोई सवाल पूछें…" },
  "Scan an object": { es: "Escanear un objeto", hi: "चीज़ स्कैन करें" },
  "View scan": { es: "Ver escaneo", hi: "स्कैन देखें" },
  "Sign in to WasteLens": { es: "Entrar en WasteLens", hi: "WasteLens में लॉग इन" },
  "Create your account": { es: "Crea tu cuenta", hi: "अपना खाता बनाएँ" },
  "Display name": { es: "Nombre", hi: "दिखने वाला नाम" },
  "Email": { es: "Correo", hi: "ईमेल" },
  "Password": { es: "Contraseña", hi: "पासवर्ड" },
  "Sign up": { es: "Registrarme", hi: "साइन अप" },
  "My account": { es: "Mi cuenta", hi: "मेरा खाता" },
  "Sign out": { es: "Salir", hi: "लॉग आउट" },
  "Already have an account? Sign in": { es: "¿Ya tienes cuenta? Entra", hi: "पहले से खाता है? लॉग इन करें" },
  "Check local rules": { es: "Consulta las normas locales", hi: "स्थानीय नियम जाँचें" },
  "Share this guide": { es: "Compartir esta guía", hi: "यह गाइड साझा करें" },
};
type Context = {
  language: Language;
  setLanguage: (next: Language) => void;
  t: (english: string) => string;
};
const I18n = createContext<Context>({
  language: "en", setLanguage: () => {},
  t: english => english,
});
export function LanguageProvider({ children }: {children: ReactNode}) {
  const [language, setLanguage] = useState<Language>(() => {
    try {
      const saved = window.localStorage.getItem("wastelens-language");
      return saved === "es" || saved === "hi" ? saved : "en";
    } catch { return "en"; }
  });
  useEffect(() => {
    document.documentElement.lang = language;
    try {window.localStorage.setItem("wastelens-language", language);} catch { /* Private browsing */ }
  },[language]);
  return <I18n.Provider value={{
    language, setLanguage,
    t: text => language === "en" ? text : strings[text]?.[language] ?? text,
  }}>{children}</I18n.Provider>;
}
export function useLanguage(): Context { return useContext(I18n); }
