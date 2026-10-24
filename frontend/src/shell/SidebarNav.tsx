import { useEffect, useRef, useState } from "react";
import {
  BookOpen, ClipboardList, Coins, History, Info, MapPin, Menu,
  MessageCircle, ScanLine, ShieldCheck, Trophy, X,
} from "lucide-react";
import AccountMenu from "../AccountMenu";
import type { AppearanceTheme } from "../AccountMenu";
import { LANGUAGES, useLanguage } from "../i18n";
import type { SessionUser } from "../types";
import type { View } from "./TopNav";

type Props = {
  view: View;
  user: SessionUser | null;
  theme: AppearanceTheme;
  onThemeChange: (theme: AppearanceTheme) => void;
  onNavigate: (view: View) => void;
};

const groups = [
  {
    label: "UNDERSTAND",
    items: [
      { id: "identifier", label: "Scan", Icon: ScanLine },
      { id: "chat", label: "Ask", Icon: MessageCircle },
      { id: "journey", label: "Bottle journey", Icon: BookOpen },
    ],
  },
  {
    label: "TAKE ACTION",
    items: [
      { id: "finder", label: "Find a place", Icon: MapPin },
      { id: "deposits", label: "Bottle returns", Icon: Coins },
      { id: "audit", label: "Waste audit", Icon: ClipboardList },
    ],
  },
  {
    label: "PROGRESS",
    items: [
      { id: "history", label: "My activity", Icon: History },
      { id: "leaderboard", label: "Leaderboard", Icon: Trophy },
    ],
  },
] as const;

/** Restores the original grouped navigation without sacrificing the 3D shell. */
export default function SidebarNav({view,user,theme,onThemeChange,onNavigate}: Props) {
  const {language,setLanguage,t} = useLanguage();
  const [open,setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const navigate = (next: View) => {setOpen(false);onNavigate(next);};

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    const onResize = () => {
      if (window.innerWidth > 960) setOpen(false);
    };
    window.addEventListener("keydown",onKey);
    window.addEventListener("resize",onResize);
    panelRef.current?.querySelector<HTMLButtonElement>(".fl-side-link")?.focus();
    return () => {
      window.removeEventListener("keydown",onKey);
      window.removeEventListener("resize",onResize);
    };
  },[open]);

  return <>
    <header className="fl-topbar">
      <button ref={toggleRef} type="button" className="fl-mobile-toggle"
        aria-expanded={open} aria-controls="wastelens-primary-navigation"
        aria-label={open?t("Close menu"):t("Open menu")} onClick={()=>setOpen(value=>!value)}>
        {open?<X size={23}/>:<Menu size={23}/>}
      </button>
      <button type="button" className="fl-top-brand" onClick={()=>navigate("identifier")}>
        <span className="fl-brand-dot" aria-hidden="true"/><strong>WasteLens</strong>
      </button>
      <div className="fl-top-actions">
        <label className="visually-hidden" htmlFor="wastelens-lang">{t("Choose language")}</label>
        <select id="wastelens-lang" className="fl-language" aria-label={t("Choose language")}
          value={language} onChange={event=>setLanguage(event.target.value as typeof language)}>
          {LANGUAGES.map(option=><option key={option.code} value={option.code}>{option.label}</option>)}
        </select>
        <AccountMenu user={user} theme={theme} onThemeChange={onThemeChange}
          onNavigate={next=>navigate(next)}/>
      </div>
    </header>

    {open && <button type="button" className="fl-side-backdrop"
      aria-label={t("Close menu")} onClick={()=>setOpen(false)}/>}

    <aside ref={panelRef} id="wastelens-primary-navigation"
      className={"fl-sidebar"+(open?" is-open":"")}
      aria-label="WasteLens navigation">
      <nav className="fl-side-scroll" aria-label="WasteLens pages">
        {groups.map(group=><section key={group.label} className="fl-side-group"
          aria-label={t(group.label)}>
          <h2 className="fl-side-heading">{t(group.label)}</h2>
          {group.items.map(({id,label,Icon})=><button type="button" key={id}
            className={"fl-side-link"+(view===id?" active":"")}
            aria-current={view===id?"page":undefined}
            onClick={()=>navigate(id)}>
            <Icon size={19} strokeWidth={1.75}/><span>{t(label)}</span>
          </button>)}
        </section>)}
        <section className="fl-side-group fl-side-last" aria-label={t("About")}>
          <button type="button" className={"fl-side-link"+(view==="about"?" active":"")}
            aria-current={view==="about"?"page":undefined} onClick={()=>navigate("about")}>
            <Info size={19} strokeWidth={1.75}/><span>{t("About")}</span>
          </button>
          {user?.role==="admin" && <button type="button"
            className={"fl-side-link"+(view==="admin"?" active":"")}
            aria-current={view==="admin"?"page":undefined} onClick={()=>navigate("admin")}>
            <ShieldCheck size={19} strokeWidth={1.75}/><span>{t("Admin")}</span>
          </button>}
        </section>
      </nav>
      <p className="fl-side-signature">WASTELENS <span>© 2026</span></p>
    </aside>
  </>;
}
