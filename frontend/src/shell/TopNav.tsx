import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import type { SessionUser } from "../types";
import AccountMenu from "../AccountMenu";
import type { AppearanceTheme, NavigationLayout } from "../AccountMenu";
import { LANGUAGES, useLanguage } from "../i18n";

export type View = "identifier" | "chat" | "finder" | "account" | "history" | "admin" | "leaderboard" | "audit" | "deposits" | "journey" | "about";

type Props = {
  view: View;
  user: SessionUser | null;
  theme: AppearanceTheme;
  onThemeChange: (theme: AppearanceTheme) => void;
  navigationLayout: NavigationLayout;
  onNavigationLayoutChange: (value: NavigationLayout) => void;
  onNavigate: (view: View) => void;
};

/** Everything in the product is reachable from this one list. */
export default function TopNav({ view, user, theme, onThemeChange, navigationLayout, onNavigationLayoutChange, onNavigate }: Props) {
  const { language, setLanguage, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  const primary: { id: View; label: string }[] = [
    { id: "identifier", label: "Scan" }, { id: "chat", label: "Ask" }, { id: "finder", label: "Find a place" },
    { id: "deposits", label: "Bottle returns" }, { id: "audit", label: "Waste audit" },
  ];
  const more: { id: View; label: string }[] = [
    { id: "journey", label: "Bottle journey" }, { id: "history", label: "My activity" },
    { id: "leaderboard", label: "Leaderboard" },
    ...(user?.role === "admin" ? [{ id: "admin" as View, label: "Admin" }] : []),
    { id: "about", label: "About" },
  ];
  const moreActive = more.some(item => item.id === view);

  function go(next: View) { setOpen(false); onNavigate(next); }

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); toggle.current?.focus(); }
    };
    window.addEventListener("keydown", onKey);
    panel.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let ctx: gsap.Context | undefined;
    if (!reduce && panel.current) {
      ctx = gsap.context(() => {
        gsap.from(panel.current, { opacity: 0, duration: 0.3, ease: "power2.out" });
        gsap.from(".tn-item", { yPercent: 40, opacity: 0, duration: 0.7, ease: "power3.out", stagger: 0.045, delay: 0.05 });
      }, panel);
    }
    return () => { window.removeEventListener("keydown", onKey); ctx?.revert(); };
  }, [open]);

  const link = (item: { id: View; label: string }) => (
    <button key={item.id} type="button" className={"tn-link" + (view === item.id ? " on" : "")}
      aria-current={view === item.id ? "page" : undefined} onClick={() => go(item.id)}>{t(item.label)}</button>
  );

  return <>
    <header className="tn">
      <button type="button" className="tn-word" aria-label="WasteLens" onClick={() => go("identifier")}>
        <span className="tn-dot" aria-hidden="true" />WasteLens
      </button>
      <nav className="tn-links" aria-label="WasteLens navigation">
        {primary.map(link)}
        <button ref={toggle} type="button" className={"tn-link tn-more" + (moreActive ? " on" : "")}
          aria-expanded={open} aria-controls="wastelens-primary-navigation" onClick={() => setOpen(c => !c)}>
          {open ? t("Close menu") : t("More")}
        </button>
      </nav>
      <div className="tn-tools">
        <label className="visually-hidden" htmlFor="wastelens-lang">{t("Choose language")}</label>
        <select id="wastelens-lang" className="tn-lang" aria-label={t("Choose language")} value={language}
          onChange={event => setLanguage(event.target.value as typeof language)}>
          {LANGUAGES.map(option => <option key={option.code} value={option.code}>{option.label}</option>)}
        </select>
        <AccountMenu user={user} theme={theme} onThemeChange={onThemeChange} navigationLayout={navigationLayout} onNavigationLayoutChange={onNavigationLayoutChange} onNavigate={next => go(next)} />
        <button type="button" className="tn-burger" aria-label={open ? t("Close menu") : t("Open menu")}
          aria-expanded={open} aria-controls="wastelens-primary-navigation" onClick={() => setOpen(c => !c)}>
          <span /><span />
        </button>
      </div>
    </header>
    {open && <div id="wastelens-primary-navigation" ref={panel} className="tn-panel" role="dialog" aria-modal="false" aria-label={t("Menu")}>
      <div className="tn-panel-inner">
        <p className="tn-eyebrow">{t("Explore")}</p>
        <ul className="tn-list">
          {[...primary, ...more].map((item, index) => (
            <li key={item.id} className="tn-item">
              <button type="button" className={view === item.id ? "on" : ""} aria-current={view === item.id ? "page" : undefined}
                onClick={() => go(item.id)}><em>{String(index + 1).padStart(2, "0")}</em>{t(item.label)}</button>
            </li>
          ))}
        </ul>
      </div>
    </div>}
  </>;
}
