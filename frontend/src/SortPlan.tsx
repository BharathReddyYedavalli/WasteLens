import { useState } from "react";
import { Check, ClipboardCopy, Printer } from "lucide-react";
import { ReadAloudButton } from "./Speech";
import type { ItemAnalysis } from "./types";
import { useLanguage } from "./i18n";

export default function SortPlan({ analysis }: { analysis: ItemAnalysis }) {
  const { t } = useLanguage();
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [copied, setCopied] = useState(false);

  const needsLocalRules = ["check_recycling", "check_compost", "special_dropoff"]
    .includes(analysis.route);
  const steps = [
    ...analysis.disposal_steps,
    ...(needsLocalRules ? [t("Check local rules")] : []),
  ];
  const totalSteps = steps.length;

  function markStep(stepIndex: number, checked: boolean) {
    setCompletedSteps(previous => checked
      ? [...previous, stepIndex]
      : previous.filter(index => index !== stepIndex)
    );
  }

  async function copyPlan() {
    const planText = [
      analysis.item_name,
      ...steps.map((step, index) => `${index + 1}. ${step}`),
    ].join("\n");

    try {
      await navigator.clipboard.writeText(planText);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  const spokenPlan = [
    analysis.item_name,
    ...steps.map((step, index) => `${index + 1}. ${step}`),
  ].join(". ");

  return <article className="sort-plan" aria-label={t("Sort plan")}>
    <div className="sort-plan-top">
      <div><h3>{t("What to do with it")}</h3></div>
      <span className="sort-plan-counter">
        <Check size={16}/>{completedSteps.length}/{totalSteps}
      </span>
    </div>
    <div className="sort-plan-progress" aria-hidden="true">
      <span style={{ width: totalSteps ? completedSteps.length / totalSteps * 100 + "%" : "0%" }}/>
    </div>
    <div className="sort-plan-steps">
      {steps.map((step, index) =>
        <label key={index} className={"sort-step " + (completedSteps.includes(index) ? "complete" : "")}>
          <input
            type="checkbox"
            checked={completedSteps.includes(index)}
            onChange={event => markStep(index, event.target.checked)}
          />
          <span className="sort-step-number">{index + 1}</span>
          <span>{step}</span>
        </label>
      )}
    </div>
    <div className="sort-plan-tools">
      <button type="button" onClick={() => void copyPlan()}>
        <ClipboardCopy size={16}/>{copied ? t("Copied!") : t("Copy steps")}
      </button>
      <button type="button" onClick={() => window.print()}>
        <Printer size={16}/>{t("Save or print")}
      </button>
      <ReadAloudButton id="sort-plan-steps" category="steps" text={spokenPlan}/>
    </div>
  </article>;
}
