import { useEffect } from "react";
import type { CSSProperties } from "react";
import { Award, X } from "lucide-react";
import type { WasteLensBadge } from "./types";
import { useLanguage } from "./i18n";

const colors = ["#42ba69", "#ffb93f", "#ed817e", "#8ac6e9", "#d3a6f4", "#ffda78"];
const pieces = Array.from({ length: 52 }, (_, index) => {
  const position = (index * 73 + 19) % 100;
  const spin = index % 2 === 0 ? 440 : -460;
  const drift = ((index * 37) % 140) - 70;
  return {
    index,
    style: {
      left: position + "%",
      backgroundColor: colors[index % colors.length],
      animationDelay: (index % 10) * 0.075 + "s",
      animationDuration: (2.3 + (index % 7) * 0.17) + "s",
      ["--drift" as string]: drift + "px",
      ["--spin" as string]: spin + "deg",
    } as CSSProperties,
  };
});

export default function BadgeCelebration({ badge, onClose }: { badge: WasteLensBadge; onClose: () => void }) {
  const { t } = useLanguage();
  useEffect(() => {
    // Only a fresh, rewarded scan mounts this component. Never fire on page load.
    const timeout = window.setTimeout(onClose, 7200);
    return () => window.clearTimeout(timeout);
  }, [onClose]);

  return <div className="badge-celebration" role="status" aria-live="polite">
    <div className="confetti-layer" aria-hidden="true">
      {pieces.map(({ index, style }) =>
        <span key={index} className="confetti-piece" style={style}/>)}
    </div>
    <div className="badge-toast">
      <span className="badge-toast-medal"><Award size={35} strokeWidth={2}/></span>
      <div className="badge-toast-message">
        <span>{t("New badge!")}</span>
        <strong>{t(badge.name)}</strong>
        <p>{badge.description}</p>
      </div>
      <button type="button" className="badge-toast-close" onClick={onClose} aria-label="Dismiss badge celebration">
        <X size={19}/>
      </button>
    </div>
  </div>;
}
