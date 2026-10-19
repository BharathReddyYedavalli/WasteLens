import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Palette, UserRound, Ear, Sun, Moon, Waves, Palmtree, Trees, CloudSun } from "lucide-react";
import type { SessionUser } from "./types";
import { useLanguage } from "./i18n";
import { SpeechSettingsPanel } from "./Speech";

export type AppearanceTheme = "light" | "dark" | "ocean" | "beach" | "forest" | "sunset";

const choices = [
  { id: "light", name: "Light", icon: Sun },
  { id: "dark", name: "Dark", icon: Moon },
  { id: "ocean", name: "Ocean", icon: Waves },
  { id: "beach", name: "Beach", icon: Palmtree },
  { id: "forest", name: "Forest", icon: Trees },
  { id: "sunset", name: "Sunset", icon: CloudSun },
] as const;

export function useAppearanceTheme(): [AppearanceTheme, (theme: AppearanceTheme) => void] {
  const [theme, setTheme] = useState<AppearanceTheme>(() => {
    try {
      const saved = window.localStorage.getItem("wastelens-appearance");
      return choices.some(choice => choice.id === saved) ? saved as AppearanceTheme : "light";
    } catch {
      return "light";
    }
  });
  useEffect(() => {
    document.documentElement.dataset.wlTheme = theme;
    try { window.localStorage.setItem("wastelens-appearance", theme); } catch { /* storage may be disabled */ }
  }, [theme]);
  return [theme, setTheme];
}

type Props = {
  user: SessionUser | null;
  theme: AppearanceTheme;
  onThemeChange: (value: AppearanceTheme) => void;
  onNavigate: (view: "account") => void;
};

export default function AccountMenu({ user, theme, onThemeChange, onNavigate }: Props) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [showThemes, setShowThemes] = useState(false);
  const [showAccessibility, setShowAccessibility] = useState(false);
  const host = useRef<HTMLDivElement>(null);
  const firstAction = useRef<HTMLButtonElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function closeOnOutside(event: PointerEvent) {
      if (host.current && !host.current.contains(event.target as Node)) {
        setOpen(false);
        setShowThemes(false);
        setShowAccessibility(false);
      }
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        setShowThemes(false);
        setShowAccessibility(false);
        trigger.current?.focus();
      }
    }
    document.addEventListener("pointerdown", closeOnOutside);
    document.addEventListener("keydown", escape);
    firstAction.current?.focus();
    return () => {
      document.removeEventListener("pointerdown", closeOnOutside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  function navigate(view: "account") {
    setOpen(false);
    setShowThemes(false);
    setShowAccessibility(false);
    onNavigate(view);
  }

  return <div className="wl-account-menu" ref={host}>
    <button ref={trigger} className="wl-account-trigger" type="button"
      aria-expanded={open} aria-controls="wl-profile-dropdown" aria-haspopup="dialog"
      onClick={() => { setOpen(previous => !previous); setShowThemes(false); setShowAccessibility(false); }}>
      <span className="wl-account-avatar" aria-hidden="true"><UserRound size={18}/></span>
      <span className="wl-account-name">{user?.name || t("Sign in")}</span>
      <ChevronDown size={16} className={open ? "rotated" : ""} aria-hidden="true"/>
    </button>
    {open && <div id="wl-profile-dropdown" className="wl-profile-dropdown" role="dialog"
      aria-label={t("Account and appearance")}>
      <button ref={firstAction} type="button" className="wl-profile-action" onClick={() => navigate("account")}>
        <UserRound size={19}/>{user ? t("My account") : t("Sign in")}
      </button>
      <button type="button" className={"wl-profile-action " + (showThemes ? "selected" : "")}
        aria-expanded={showThemes} aria-controls="wl-theme-choices"
        onClick={() => { setShowThemes(previous => !previous); setShowAccessibility(false); }}>
        <Palette size={19}/>{t("Personalization")}<ChevronDown size={16} className="wl-action-chevron"/>
      </button>
      {showThemes && <div id="wl-theme-choices" className="wl-theme-options" aria-label={t("Choose a theme")}>
        {choices.map(choice => {
          const Icon = choice.icon;
          return <button className={"wl-theme-choice " + (theme === choice.id ? "active" : "")}
            type="button" key={choice.id} aria-pressed={theme === choice.id}
            onClick={() => onThemeChange(choice.id)}>
            <span className={"wl-theme-thumbnail wl-theme-thumbnail-" + choice.id} aria-hidden="true">
              <Icon size={20}/>
            </span>
            <span>{t(choice.name)}</span>
            {theme === choice.id && <Check className="wl-theme-check" size={17} aria-hidden="true"/>}
          </button>;
        })}
      </div>}
      <button type="button" className={"wl-profile-action "+(showAccessibility?"selected":"")}
        aria-expanded={showAccessibility} aria-controls="wl-accessibility-options"
        onClick={()=>{setShowAccessibility(previous=>!previous);setShowThemes(false);}}>
        <Ear size={19}/>{t("Accessibility")}<ChevronDown size={16} className="wl-action-chevron"/>
      </button>
      {showAccessibility&&<div id="wl-accessibility-options"><SpeechSettingsPanel/></div>}
    </div>}
  </div>;
}
