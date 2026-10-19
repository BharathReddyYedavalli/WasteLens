import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { LanguageProvider } from "./i18n";
import { SpeechProvider } from "./Speech";
import "./styles.css";
import "./friendly.css";
import "./design2026.css";
import "./bottles.css";
import "./themes.css";
import "./accessibility.css";
import "./documentary.css";

createRoot(document.getElementById("root")!).render(<React.StrictMode><LanguageProvider><SpeechProvider><App /></SpeechProvider></LanguageProvider></React.StrictMode>);
