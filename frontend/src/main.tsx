import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { LanguageProvider } from "./i18n";
import "./styles.css";
import "./friendly.css";
import "./design2026.css";
import "./bottle-returns.css";

createRoot(document.getElementById("root")!).render(<React.StrictMode><LanguageProvider><App /></LanguageProvider></React.StrictMode>);
