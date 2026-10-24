import { useEffect, useRef, useState } from "react";
import { BookOpen, ClipboardList, Coins, History, Info, Leaf, MapPin, Menu, MessageCircle, ScanLine, Trophy, X } from "lucide-react";
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
  { name: "UNDERSTAND", pages: [
    { id: "identifier", label: "Scan", Icon: ScanLine },
    { id: "chat", label: "Ask", Icon: MessageCircle },
    { id: "journey", label: "Bottle journey", Icon: BookOpen },
  ] },
  { name: "TAKE ACTION", pages: [
    { id: "finder", label: "Find a place", Icon: MapPin },
    { id: "deposits", label: "Bottle returns", Icon: Coins },
    { id: "audit", label: "Waste audit", Icon: ClipboardList },
  ] },
  { name: "PROGRESS", pages: [
    { id: "history", label: "My activity", Icon: History },
    { id: "leaderboard", label: "Leaderboard", Icon: Trophy },
  ] },
] as const;

/** Original WasteLens header/sidebar connected to the current application state. */
export default function LegacyNavigation({ view, user, theme, onThemeChange, onNavigate }: Props) {
  const { language, setLanguage, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLButtonElement>(null);
  const navigate = (next: View) => { setOpen(false); onNavigate(next); };
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); menuRef.current?.focus(); }
    };
    const onResize = () => { if (window.innerWidth > 900) setOpen(false); };
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  return <>
    <header className="topbar legacy-topbar">
      <button ref={menuRef} type="button" className="community-menu-toggle"
        aria-label={open ? t("Close menu") : t("Open menu")} aria-expanded={open}
        aria-controls="wastelens-primary-navigation" onClick={() => setOpen(value => !value)}>
        {open ? <X size={23}/> : <Menu size={23}/>}
      </button>
      <button type="button" className="brand" onClick={() => navigate("identifier")}>
        <span className="brand-mark"><Leaf size={24} strokeWidth={2.5}/></span><strong>WasteLens</strong>
      </button>
      <div className="topbar-actions">
        <div className="language-picker">
          <label htmlFor="wastelens-lang" className="visually-hidden">{t("Choose language")}</label>
          <select id="wastelens-lang" aria-label={t("Choose language")} value={language}
            onChange={event => setLanguage(event.target.value as typeof language)}>
            {LANGUAGES.map(option => <option key={option.code} value={option.code}>{option.label}</option>)}
          </select>
        </div>
        <AccountMenu user={user} theme={theme} onThemeChange={onThemeChange}
          onNavigate={next => navigate(next)}/>
      </div>
    </header>
    {open && <button className="community-nav-backdrop" type="button"
      aria-label={t("Close menu")} onClick={() => setOpen(false)}/>}
    <aside id="wastelens-primary-navigation" className={"side-nav community-navigation" + (open ? " is-open" : "")}
      aria-label="WasteLens navigation">
      <div className="community-nav-scroll">
        {groups.map(group => <div className="community-nav-group" key={group.name} aria-label={t(group.name)}>
          <span className="community-nav-heading">{t(group.name)}</span>
          {group.pages.map(({id,label,Icon}) => <button type="button" key={id}
            className={"nav-item" + (view === id ? " active" : "")}
            aria-current={view === id ? "page" : undefined} onClick={() => navigate(id)}>
            <Icon size={18}/>{t(label)}
          </button>)}
        </div>)}
      </div>
      <button type="button" className={"nav-item community-about-nav" + (view === "about" ? " active" : "")}
        aria-current={view === "about" ? "page" : undefined} onClick={() => navigate("about")}>
        <Info size={18}/>{t("About")}
      </button>
    </aside>
  </>;
}
