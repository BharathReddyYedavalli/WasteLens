import { useEffect, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { AlertTriangle, ArrowUp, Bot, Sparkles, Trash2 } from "lucide-react";
import type { ItemAnalysis } from "./types";
import { useLanguage } from "./i18n";
import { ReadAloudButton } from "./Speech";
import { scanQuestionSuggestions } from "./scanSuggestions";

type Turn = { role: "user" | "assistant"; text: string };
type Props = {
  scan: ItemAnalysis | null;
  configured: boolean;
  onScan: () => void;
};

const generalPrompts = [
  "Where should old batteries go?",
  "Can pizza boxes be recycled?",
  "How can I reduce plastic waste?"
];

export default function AskWasteLens({ scan, configured, onScan }: Props) {
  const { language, t } = useLanguage();
  const [messages, setMessages] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // Relevant to the current identified item; general prompts only when no scan.
  const suggestions = scan
    ? scanQuestionSuggestions(scan,language)
    : generalPrompts.map(prompt=>t(prompt));

  // Don't let a past object's conversations leak into a new scan.
  useEffect(() => {
    setMessages([]);
    setInput("");
    setError("");
  }, [scan]);

  async function send(event?: FormEvent) {
    event?.preventDefault();
    const question = input.trim();
    if (busy || !configured || question.length === 0 || question.length > 1200) return;
    const history = messages.slice(-12);
    setMessages(old => [...old, {role:"user", text:question}]);
    setInput("");
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({question, history, scan, language}),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Could not get an AI reply.");
      if (typeof data.answer !== "string" || !data.answer.trim()) throw new Error("The assistant returned an empty answer.");
      setMessages(old => [...old, {role:"assistant", text:data.answer}]);
    } catch (reason) {
      // Failed questions shouldn't silently enter future AI conversation history.
      setMessages(old => old.slice(0, -1));
      setInput(question);
      setError(reason instanceof Error ? reason.message : "The chat service is unavailable.");
    } finally {
      setBusy(false);
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void send();
    }
  }

  return <section className="assistant-screen" aria-label={t("Ask WasteLens chatbot")}>
    <div className="assistant-heading">
      <div className="assistant-logo"><Bot size={25}/></div>
      <div>
        <h1>{t("Ask WasteLens")}</h1>
        
      </div>
    </div>
    <div className={"assistant-card" + (messages.length === 0 ? " is-empty" : " has-conversation")}>
      {scan&&<div className="assistant-context">
        <div className="context-main">
          <Sparkles size={18}/>
          <div>
            <strong>{scan ? scan.item_name : t("What would you like to know?")}</strong>
            
          </div>
        </div>
        <button type="button" className="context-action" onClick={onScan}>{t("View scan")}</button>
      </div>}
      <div className="assistant-messages" aria-live="polite" aria-relevant="additions text">
        {messages.length === 0 ? <div className="assistant-welcome">
          <h2 className="assistant-start-heading">{t("What would you like to know?")}</h2>
          <div className="chat-suggestions">
            {suggestions.map(prompt => <button
              key={prompt} type="button" onClick={() => setInput(prompt)}
              disabled={busy}>{prompt}</button>)}
          </div>
        </div> : messages.map((message,index) => <div
          key={index} className={message.role === "user" ? "chat-turn from-user" : "chat-turn from-ai"}>
          {message.role === "assistant" && <span className="mini-avatar"><Bot size={15}/></span>}
          <div className="chat-turn-content">
            <div className="chat-bubble">{message.text}</div>
            {message.role === "assistant" && <ReadAloudButton id={"chat-answer-"+index} category="chat" text={message.text}/>}
          </div>
        </div>)}
        {busy && <div className="chat-wait" role="status"><Bot size={17}/> {t("Thinking…")}</div>}
      </div>
      {error && <div role="alert" className="chat-error"><AlertTriangle size={16}/>{error}</div>}
      {!configured && <div className="chat-error"><AlertTriangle size={16}/> {t("Start your Python backend and configure your Gemini API key to chat.")}</div>}
      <form className="assistant-composer" onSubmit={event => void send(event)}>
        <label htmlFor="ask-input" className="visually-hidden">{t("Ask a question about an item or recycling")}</label>
        <textarea id="ask-input" rows={2} maxLength={1200}
          value={input} onChange={event => setInput(event.target.value)}
          onKeyDown={onKeyDown} disabled={busy}
          placeholder={t("Ask a question…")} />
        <button aria-label={t("Send message")} title={t("Send message")} type="submit"
          disabled={busy || !configured || !input.trim()}><ArrowUp size={19}/></button>
      </form>
      {messages.length > 0 && <div className="chat-footer">
        <button type="button" disabled={busy} onClick={() => {setMessages([]);setError("");}}><Trash2 size={14}/> {t("Clear chat")}</button>
      </div>}
    </div>
  </section>;
}
