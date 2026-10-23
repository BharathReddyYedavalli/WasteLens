import type { ItemAnalysis } from "./types";
import type { Language } from "./i18n";

type ThreeQuestions=[string,string,string];

const translations={
  en:{
    towel:[
      "Can this used paper towel go in recycling, compost, or trash?",
      "Does food, grease, or cleaning-product residue affect how I should dispose of it?",
      "What should I check before putting a paper towel in my local compost collection?"
    ],
    battery:[
      "Where should I safely take this battery for collection?",
      "Do I need to protect the terminals before dropping it off?",
      "How can I check which nearby programs accept this battery type?"
    ],
    electronics:[
      "Does this electronic item need a special drop-off location?",
      "What should I do with any batteries or personal data before recycling it?",
      "Could this item be repaired, donated, or reused safely?"
    ],
    generic:[
      "Can my local recycling program accept {item}?",
      "Does the material or condition of {item} change how I should dispose of it?",
      "Is there a safe way to reuse {item} before throwing it away?"
    ],
    uncertain:[
      "How can I confirm what material {item} is made of?",
      "What should I check before choosing a bin for {item}?",
      "Where can I find the local rules for an item like {item}?"
    ]
  },
  es:{
    towel:[
      "¿Esta toalla de papel usada va al reciclaje, al compost o a la basura?",
      "¿Cambian las instrucciones si tiene comida, grasa o productos de limpieza?",
      "¿Qué debo comprobar antes de poner una toalla de papel en el compost local?"
    ],
    battery:[
      "¿Dónde puedo llevar esta pila o batería de forma segura?",
      "¿Debo proteger los terminales antes de entregarla?",
      "¿Cómo compruebo qué puntos de recogida aceptan este tipo de batería?"
    ],
    electronics:[
      "¿Este aparato electrónico necesita un punto de entrega especial?",
      "¿Qué hago con las baterías y los datos personales antes de reciclarlo?",
      "¿Se puede reparar, donar o reutilizar de forma segura?"
    ],
    generic:[
      "¿Mi programa local de reciclaje acepta {item}?",
      "¿Cambian las instrucciones según el material o el estado de {item}?",
      "¿Hay una forma segura de reutilizar {item} antes de desecharlo?"
    ],
    uncertain:[
      "¿Cómo puedo confirmar de qué material está hecho {item}?",
      "¿Qué debo comprobar antes de elegir un contenedor para {item}?",
      "¿Dónde consulto las normas locales para algo como {item}?"
    ]
  },
  hi:{
    towel:[
      "क्या इस्तेमाल किया हुआ पेपर टॉवल रीसायक्लिंग, कंपोस्ट या कचरे में जाना चाहिए?",
      "खाना, चिकनाई या सफाई के रसायन लगे हों तो निपटान में क्या फर्क पड़ता है?",
      "पेपर टॉवल को स्थानीय कंपोस्ट में डालने से पहले क्या जाँचें?"
    ],
    battery:[
      "इस बैटरी को सुरक्षित रूप से जमा करने के लिए कहाँ ले जाएँ?",
      "जमा करने से पहले क्या बैटरी के टर्मिनल ढकने चाहिए?",
      "इस प्रकार की बैटरी कौन से नज़दीकी केंद्र लेते हैं, यह कैसे जाँचें?"
    ],
    electronics:[
      "क्या इस इलेक्ट्रॉनिक वस्तु को विशेष संग्रह केंद्र पर देना चाहिए?",
      "रीसायकल करने से पहले बैटरी या निजी डेटा का क्या करें?",
      "क्या इसे सुरक्षित रूप से ठीक, दान या फिर से उपयोग किया जा सकता है?"
    ],
    generic:[
      "क्या मेरा स्थानीय रीसायक्लिंग कार्यक्रम {item} स्वीकार करता है?",
      "{item} की सामग्री या स्थिति से निपटान के नियम कैसे बदलते हैं?",
      "क्या {item} को फेंकने से पहले सुरक्षित रूप से फिर इस्तेमाल कर सकते हैं?"
    ],
    uncertain:[
      "{item} की सामग्री की पुष्टि कैसे करें?",
      "{item} के लिए कूड़ेदान चुनने से पहले क्या जाँचना चाहिए?",
      "{item} जैसी वस्तु के स्थानीय नियम कहाँ मिलेंगे?"
    ]
  }
} as const;

export function scanQuestionSuggestions(scan: ItemAnalysis, language: Language):ThreeQuestions {
  // Only the label is used for generic interpolation. This neither asserts
  // an AI material guess as fact nor claims that a local program accepts it.
  const item=(scan.item_name||"this item").trim().slice(0,90);
  const info=(scan.item_name+" "+scan.visual_description).toLowerCase();
  const category=/(?:paper\s*(?:towel|napkin)|\bnapkin\b|\btissue\b|\bserviette\b|toalla de papel|servilleta|papel absorbente|पेपर टॉवल|कागज़ का तौलिया)/i.test(info)
    ?"towel"
    :/(?:\bbatter(?:y|ies)\b|\bpower bank\b|\bbutton cell\b|\bbatería\b|\bpila\b|बैटरी)/i.test(info)
      ?"battery"
      :/(?:\belectronic\b|\be-?waste\b|\blaptop\b|\bphone\b|\btablet\b|\bcircuit board\b|\bcharger\b)/i.test(info)
        ?"electronics"
        :scan.identification!=="likely"||scan.route==="needs_identification"
          ?"uncertain"
          :"generic";
  const templates=translations[language][category];
  return templates.map(text=>text.replace(/\{item\}/g,item)) as unknown as ThreeQuestions;
}
