import { useEffect, useRef } from "react";
import {
  BookOpen, ClipboardList, Coins, History, Info, MapPin,
  MessageCircle, ScanLine, Trophy,
} from "lucide-react";
import AccountMenu from "../AccountMenu";
import type { AppearanceTheme, NavigationLayout } from "../AccountMenu";
import { LANGUAGES, useLanguage } from "../i18n";
import type { SessionUser } from "../types";
import type { View } from "./TopNav";

type Props = {
  view: View;
  user: SessionUser | null;
  theme: AppearanceTheme;
  onThemeChange: (theme: AppearanceTheme) => void;
  visualStyle: "claude" | "legacy";
  onVisualStyleChange: (value: "claude" | "legacy") => void;
  navigationLayout: NavigationLayout;
  onNavigationLayoutChange: (layout: NavigationLayout) => void;
  onNavigate: (view: View) => void;
};

const destinations = [
  { id: "identifier", label: "Scan", Icon: ScanLine },
  { id: "chat", label: "Ask", Icon: MessageCircle },
  { id: "journey", label: "Bottle journey", Icon: BookOpen },
  { id: "finder", label: "Find a place", Icon: MapPin },
  { id: "deposits", label: "Bottle returns", Icon: Coins },
  { id: "audit", label: "Waste audit", Icon: ClipboardList },
  { id: "history", label: "My activity", Icon: History },
  { id: "leaderboard", label: "Leaderboard", Icon: Trophy },
  { id: "about", label: "About", Icon: Info },
] as const;

/**
 * Alternative, full-width navigation. Every page remains one tap away,
 * including narrow touchscreens where the tab rail scrolls horizontally.
 * No nested "More" menu and no change to application routing.
 */
export default function HorizontalNav({
  view, user, theme, onThemeChange,
  visualStyle, onVisualStyleChange,
  navigationLayout, onNavigationLayoutChange, onNavigate,
}: Props) {
  const {language,setLanguage,t} = useLanguage();
  const links = useRef<HTMLElement>(null);

  useEffect(() => {
    const current = links.current?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!current || !links.current) return;
    const rail = links.current;
    const to = current.offsetLeft - rail.offsetLeft + current.offsetWidth / 2 - rail.clientWidth / 2;
    rail.scrollTo({left: Math.max(0,to), behavior:"auto"});
  },[view]);

  return <header className="wl-horizontal-shell">
    <div className="wl-horizontal-primary">
      <button className="wl-horizontal-brand" type="button" onClick={()=>onNavigate("identifier")} aria-label="WasteLens — Scan">
        <span className="wl-horizontal-brand-dot" aria-hidden="true"/>
        <strong>WasteLens</strong>
      </button>
      <div className="wl-horizontal-tools">
        <label className="visually-hidden" htmlFor="wastelens-lang">{t("Choose language")}</label>
        <select id="wastelens-lang" className="wl-horizontal-language"
          value={language} onChange={event=>setLanguage(event.target.value as typeof language)}
          aria-label={t("Choose language")}>
          {LANGUAGES.map(option=><option key={option.code} value={option.code}>{option.label}</option>)}
        </select>
        <AccountMenu user={user} theme={theme} onThemeChange={onThemeChange}
          navigationLayout={navigationLayout} onNavigationLayoutChange={onNavigationLayoutChange}
          visualStyle={visualStyle} onVisualStyleChange={onVisualStyleChange}
          onNavigate={next=>onNavigate(next)}/>
      </div>
    </div>
    <nav ref={links} className="wl-horizontal-links" aria-label={t("WasteLens pages")}>
      {destinations.map(({id,label,Icon})=><button type="button" key={id}
        className={"wl-horizontal-link"+(view===id?" active":"")}
        aria-current={view===id?"page":undefined}
        onClick={()=>onNavigate(id)}>
        <Icon size={20} strokeWidth={2} aria-hidden="true"/>
        <span>{t(label)}</span>
      </button>)}
    </nav>
  </header>;
}
