"""Deterministic guardrails for a Gemini scan result.

These rules use Gemini's item name and reported uncertainty; they do not
independently identify image contents or verify a local recycling policy.
"""
from __future__ import annotations

import re
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .vision import ItemAnalysis


# Narrow hazard keywords: do not mistake a functioning smartphone for a
# waste battery, or a charger/compartment for a loose battery.
HAZARD_TERMS = (
    r"\b(?:batter(?:y|ies)(?![- ]powered)|lithium[- ]?ion\s+cell|button[- ]cell|power\s+bank)\b",
    r"\b(?:syringes?|hypodermic\s+needle|used\s+needle|medical\s+sharps?|razor\s+blades?)\b",
    r"\b(?:pesticide|insecticide|paint\s+thinner|drain\s+cleaner|bleach|solvent|"
    r"propane\s+(?:tank|cylinder)|gas\s+cylinder|aerosol\s+can|mercury\s+thermometer)\b",
    # Spanish and Hindi labels produced by the app's other two languages.
    r"\b(?:bater[ií]a|pilas?|jeringas?|agujas?|pesticidas?|insecticidas?|"
    r"disolventes?|lej[ií]a|aerosoles?|propano)\b",
    r"बैटरी|लिथियम|सिरिंज|इंजेक्शन की सुई|कीटनाशक|पेंट थिनर|"
    r"रसायन|एरोसोल|प्रोपेन",
)
BATTERY_ACCESSORY = re.compile(
    r"\bbattery[- ](?:charger|case|holder|compartment|cover|powered)\b|"
    r"\bcargador\s+de\s+bater[ií]a\b|बैटरी\s+(?:का\s+)?चार्जर", re.I
)
# Unqualified AI-generated instructions can imply that *every* curbside program
# accepts an item. These narrow patterns catch direct bin-placement imperatives
# but leave conditional advice and item preparation steps intact.
DIRECT_BIN_CLAIM = re.compile(
    r"\b(?:put|place|toss|throw|drop)\b.{0,90}\b"
    r"(?:recycling|compost|curbside|blue|green)\s+(?:cart|bin)\b|"
    r"\b(?:pon(?:lo)?|coloca|deposita|mete)\b.{0,90}"
    r"\bcontenedor\s+(?:de\s+|para\s+)?(?:reciclaje|compost|azul)\b|"
    r"(?:रीसायक्लिंग|कम्पोस्ट|कंपोस्ट).{0,32}"
    r"(?:बिन|डिब्बे).{0,20}(?:डाल|रख)",
    re.I,
)
CONDITIONAL_ADVICE = re.compile(
    r"\b(?:if|when|unless|after confirming|only if|confirm|check|verify|"
    r"si|cuando|comprueba|confirma)\b|यदि|अगर|जाँच|पुष्टि",
    re.I,
)


def unverified_bin_claim(step: str) -> bool:
    return bool(DIRECT_BIN_CLAIM.search(step) and not CONDITIONAL_ADVICE.search(step))


UNKNOWN_MATERIAL = re.compile(
    r"\b(?:unknown|unidentified|undetermined|unclear|unsure|"
    r"cannot\s+(?:tell|determine|identify)|"
    r"desconocid[oa]|inciert[oa]|indeterminad[oa])\b|"
    r"अज्ञात|स्पष्ट नहीं|पता नहीं",
    re.I,
)

WORDS = {
    "en": {
        "uncertain": [
            "Do not choose a disposal bin from this photo alone.",
            "Confirm the item and its material using a label or a clearer photo.",
            "Check the collection rules for this location.",
        ],
        "material": [
            "Confirm the material before choosing a recycling or compost bin.",
            "Check your local collection rules.",
        ],
        "hazard": [
            "Keep the item intact. Do not cut, open, puncture, or heat it.",
            "Keep it out of regular recycling and trash until local collection rules are confirmed.",
            "Check a designated take-back or special collection program.",
        ],
        "question": "What is this item, and what material does its label show?",
        "uncertain_title": "Confirm the item before sorting",
        "material_title": "Confirm the material before sorting",
        "hazard_title": "Check special collection options",
        "uncertain_caution": "The photo alone is not enough to confirm safe disposal.",
        "hazard_caution": "Safe handling and collection depend on the exact item and condition.",
        "local_rule": "Check whether your local program accepts this item before choosing a bin.",
    },
    "es": {
        "uncertain": [
            "No elijas un contenedor basándote solo en esta foto.",
            "Confirma el objeto y el material con su etiqueta o una foto más clara.",
            "Consulta las normas de recogida de este lugar.",
        ],
        "material": [
            "Confirma el material antes de elegir reciclaje o compostaje.",
            "Consulta las normas locales de recogida.",
        ],
        "hazard": [
            "Mantén el objeto intacto. No lo cortes, abras, perfores ni calientes.",
            "Evita la basura y el reciclaje común hasta confirmar las normas locales.",
            "Consulta un programa de recogida especial o devolución.",
        ],
        "question": "¿Qué objeto es y qué material indica la etiqueta?",
        "uncertain_title": "Confirma el objeto antes de clasificarlo",
        "material_title": "Confirma el material antes de clasificarlo",
        "hazard_title": "Consulta la recogida especial",
        "uncertain_caution": "La foto no basta para confirmar un método seguro.",
        "hazard_caution": "La recogida segura depende del objeto y de su estado.",
        "local_rule": "Consulta si el programa local acepta este objeto antes de elegir un contenedor.",
    },
    "hi": {
        "uncertain": [
            "केवल तस्वीर देखकर कचरे का डिब्बा न चुनें।",
            "लेबल या स्पष्ट तस्वीर से वस्तु और सामग्री की पुष्टि करें।",
            "इस स्थान के कचरा संग्रह नियम जाँचें।",
        ],
        "material": [
            "रीसायक्लिंग या कम्पोस्ट डिब्बा चुनने से पहले सामग्री पक्की करें।",
            "अपने स्थानीय संग्रह नियम जाँचें।",
        ],
        "hazard": [
            "वस्तु को वैसे ही रखें। इसे काटें, खोलें, छेदें या गर्म न करें।",
            "स्थानीय नियम पक्के होने तक इसे सामान्य कचरे या रीसायक्लिंग में न डालें।",
            "विशेष संग्रह या वापस लेने वाले कार्यक्रम की जानकारी लें।",
        ],
        "question": "यह कौन सी वस्तु है और लेबल पर कौन सी सामग्री लिखी है?",
        "uncertain_title": "छँटाई से पहले वस्तु की पुष्टि करें",
        "material_title": "छँटाई से पहले सामग्री पक्की करें",
        "hazard_title": "विशेष संग्रह विकल्प जाँचें",
        "uncertain_caution": "सुरक्षित निपटान तय करने के लिए केवल तस्वीर पर्याप्त नहीं है।",
        "hazard_caution": "सुरक्षित संग्रह वस्तु और उसकी स्थिति पर निर्भर करता है।",
        "local_rule": "कचरे का डिब्बा चुनने से पहले जाँचें कि स्थानीय कार्यक्रम यह वस्तु स्वीकार करता है या नहीं।",
    },
}


def explicit_high_risk_name(name: str) -> bool:
    """Only inspect the AI item label, never the user's free-form photo hint."""
    name_without_accessories = BATTERY_ACCESSORY.sub("", name.strip())
    return any(re.search(p, name_without_accessories, re.I) for p in HAZARD_TERMS)


def review_sorting_safety(analysis: ItemAnalysis, language: str = "en") -> ItemAnalysis:
    """Replace unverified instructions for ambiguous or high-risk results."""
    if language not in WORDS:
        raise ValueError("Unsupported language")
    result = analysis.model_copy(deep=True)
    wording = WORDS[language]
    hazard = explicit_high_risk_name(result.item_name)
    material_unknown = bool(UNKNOWN_MATERIAL.search(result.material_guess))

    if result.identification != "likely" or result.route == "needs_identification":
        result.route = "needs_identification"
        result.route_title = wording["uncertain_title"]
        result.disposal_steps = list(wording["uncertain"])
        result.follow_up_question = wording["question"]
        result.cautions = [wording["uncertain_caution"]]
        if hazard:
            result.disposal_steps = list(wording["hazard"])
            result.cautions = [wording["hazard_caution"]]
    elif hazard:
        result.route = "special_dropoff"
        result.route_title = wording["hazard_title"]
        result.disposal_steps = list(wording["hazard"])
        result.follow_up_question = ""
        result.cautions = [wording["hazard_caution"]]
    elif material_unknown and result.route in ("check_recycling", "check_compost"):
        result.route = "needs_identification"
        result.route_title = wording["material_title"]
        result.disposal_steps = list(wording["material"])
        result.follow_up_question = wording["question"]
        result.cautions = [wording["uncertain_caution"]]
    else:
        if result.route in ("check_recycling", "check_compost"):
            result.disposal_steps = [
                wording["local_rule"] if unverified_bin_claim(step) else step
                for step in result.disposal_steps
            ]
        if not result.location_helpful:
            result.collection_search_term = ""
        return result

    # A generated DIY idea or local material-specific lookup should not
    # accompany a blocked or unidentified item.
    result.reuse_projects = []
    result.reuse_ideas = []
    result.location_helpful = False
    result.collection_search_term = ""
    return result
