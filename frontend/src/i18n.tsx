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
  "Clear chat": { es: "Borrar chat", hi: "चैट मिटाएँ" },
  "Sign in to WasteLens": { es: "Entrar en WasteLens", hi: "WasteLens में लॉग इन" },
  "Create your account": { es: "Crea tu cuenta", hi: "अपना खाता बनाएँ" },
  "Display name": { es: "Nombre", hi: "दिखने वाला नाम" },
  "Email": { es: "Correo", hi: "ईमेल" },
  "Password": { es: "Contraseña", hi: "पासवर्ड" },
  "Sign up": { es: "Registrarme", hi: "साइन अप" },
  "My account": { es: "Mi cuenta", hi: "मेरा खाता" },
  "Sign out": { es: "Salir", hi: "लॉग आउट" },
  "New here? Create an account": { es: "¿Primera vez? Crea una cuenta", hi: "नए हैं? खाता बनाएँ" },
  "Already have an account? Sign in": { es: "¿Ya tienes cuenta? Entra", hi: "पहले से खाता है? लॉग इन करें" },
  "Your account and privacy": { es: "Tu cuenta y privacidad", hi: "खाता और गोपनीयता" },
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
