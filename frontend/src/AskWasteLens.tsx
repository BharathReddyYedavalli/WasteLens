import { useEffect, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { AlertTriangle, ArrowUp, Bot, MessageCircle, Sparkles, Trash2 } from "lucide-react";
import type { ItemAnalysis } from "./types";

type Turn = { role: "user" | "assistant"; text: string };
type Props = {
  scan: ItemAnalysis | null;
  model: string;
  configured: boolean;
  onScan: () => void;
};

const startingPrompts = [
  "Can I recycle this with its cap or lid?",
  "What is the easiest way to reuse this?",
  "How should I prepare this for disposal?"
];
const generalPrompts = [
  "Where should old batteries go?",
  "Can pizza boxes be recycled?",
  "How can I reduce plastic waste?"
];

export default function AskWasteLens({ scan, model, configured, onScan }: Props) {
  const [messages, setMessages] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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
        body: JSON.stringify({question, model_id:model, history, scan}),
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

  return <section className="assistant-screen" aria-label="Ask WasteLens chatbot">
    <div className="assistant-heading">
      <div className="assistant-logo"><Bot size={25}/></div>
      <div>
        <span className="eyebrow">YOUR SUSTAINABILITY ASSISTANT</span>
        <h1>Ask WasteLens</h1>
        <p>Have a question about recycling, composting or creative reuse? Ask away.</p>
      </div>
    </div>
    <div className="assistant-card">
      <div className="assistant-context">
        <div className="context-main">
          <Sparkles size={18}/>
          <div>
            <strong>{scan ? `Talking about: ${scan.item_name}` : "General waste and recycling questions"}</strong>
            <small>{scan ? `Based on your latest scan · material: ${scan.material_guess}` : "Scan an object first for more specific answers."}</small>
          </div>
        </div>
        <button type="button" className="context-action" onClick={onScan}>{scan ? "View scan" : "Scan an object"}</button>
      </div>
      <div className="assistant-messages" aria-live="polite" aria-relevant="additions text">
        {messages.length === 0 ? <div className="assistant-welcome">
          <MessageCircle size={34}/>
          <h2>{scan ? "What would you like to know about this item?" : "What can I help you sort?"}</h2>
          <p>{scan ? "Ask about its parts, safe disposal, or ideas to reuse it. I'll remember the scan details." : "I can help you think through common waste, reuse, and recycling questions."}</p>
          <div className="chat-suggestions">
            {(scan ? startingPrompts : generalPrompts).map(prompt => <button
              key={prompt} type="button" onClick={() => setInput(prompt)}
              disabled={busy}>{prompt}</button>)}
          </div>
        </div> : messages.map((message,index) => <div
          key={index} className={message.role === "user" ? "chat-turn from-user" : "chat-turn from-ai"}>
          {message.role === "assistant" && <span className="mini-avatar"><Bot size={15}/></span>}
          <div className="chat-bubble">{message.text}</div>
        </div>)}
        {busy && <div className="chat-wait" role="status"><Bot size={17}/> Thinking about your question…</div>}
      </div>
      {error && <div role="alert" className="chat-error"><AlertTriangle size={16}/>{error}</div>}
      {!configured && <div className="chat-error"><AlertTriangle size={16}/> Start your Python backend and configure your Gemini API key to chat.</div>}
      <form className="assistant-composer" onSubmit={event => void send(event)}>
        <label htmlFor="ask-input" className="visually-hidden">Ask a question about an item or recycling</label>
        <textarea id="ask-input" rows={2} maxLength={1200}
          value={input} onChange={event => setInput(event.target.value)}
          onKeyDown={onKeyDown} disabled={busy}
          placeholder="Ask a question about your item… (Enter to send)" />
        <button aria-label="Send message" title="Send message" type="submit"
          disabled={busy || !configured || !input.trim()}><ArrowUp size={19}/></button>
      </form>
      <div className="chat-footer">
        <small>Conversation is kept in this browser session. Questions, scan summaries and recent replies are sent to Gemini; photos are not resent by chat. Free-tier data policies apply. Check local rules for recycling acceptance.</small>
        {messages.length > 0 && <button type="button" disabled={busy} onClick={() => {setMessages([]);setError("");}}><Trash2 size={14}/> Clear chat</button>}
      </div>
    </div>
  </section>;
}
