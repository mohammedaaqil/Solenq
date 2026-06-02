import { useEffect, useMemo, useState } from "react";

export type RefineAction = "softer" | "clearer" | "shorter" | "longer" | "direct";
export type FormatKind = "default" | "whatsapp" | "email" | "coldEmail";

interface RefinePanelProps {
  message: string;
  onApply: (finalMessage: string) => void;
}

export default function RefinePanel({ message, onApply }: RefinePanelProps) {
  const [modifier] = useState<RefineAction | null>(null);
  const [format] = useState<FormatKind>("default");

  const final = useMemo(() => {
    try {
      const base = (message || "").trim();
      if (!base) return "";
      const modified = modifier ? safeTransform(base, modifier) : base;
      return applyFormat(modified, format) || base;
    } catch { return message; }
  }, [message, modifier, format]);

  useEffect(() => { if (final) onApply(final); }, [final]); // eslint-disable-line

  return null;
}

function splitSentences(text: string): string[] {
  return text.replace(/\s+/g, " ").trim().split(/(?<=[.!?])\s+/).filter(Boolean);
}

export function safeTransform(message: string, action: RefineAction): string {
  try {
    const out = transform(message, action);
    return out && out.trim() ? out : message;
  } catch { return message; }
}

function transform(message: string, action: RefineAction): string {
  const m = message.trim();
  switch (action) {
    case "softer": {
      let out = m
        .replace(/\bI need\b/gi, "It would help if I could get")
        .replace(/\bSend\b/g, "Could you send")
        .replace(/\bPay\b/g, "Could you settle")
        .replace(/\bnow\b/gi, "when you get a chance")
        .replace(/\btoday\b/gi, "today if possible");
      if (!/^(hey|hi|hello)/i.test(out)) out = "Hey — " + out.charAt(0).toLowerCase() + out.slice(1);
      return out;
    }
    case "clearer": {
      return m
        .replace(/\b(just|really|actually|basically|kind of|sort of|maybe|perhaps|i think|i guess|honestly|literally)\b\s*/gi, "")
        .replace(/\s{2,}/g, " ").replace(/\s+([,.!?])/g, "$1").trim();
    }
    case "shorter": {
      const cleaned = m.replace(/\b(just|really|actually|basically|honestly|literally)\b\s*/gi, "").replace(/\s{2,}/g, " ").trim();
      const target = Math.max(40, Math.floor(cleaned.length * 0.7));
      const sents = splitSentences(cleaned);
      const out: string[] = [];
      let len = 0;
      for (const s of sents) {
        if (len && len + s.length > target) break;
        out.push(s); len += s.length + 1;
      }
      return (out.length ? out.join(" ") : sents[0] || cleaned).trim();
    }
    case "longer": {
      const sents = splitSentences(m);
      const hasCloser = /(thanks|thank you|appreciate|cheers|best)/i.test(m);
      const clarity = "Just want to make sure we're aligned on next steps.";
      const closer = "Appreciate it.";
      const insertAt = Math.min(1, sents.length);
      const woven = [...sents.slice(0, insertAt), clarity, ...sents.slice(insertAt)];
      return (hasCloser ? woven.join(" ") : woven.join(" ") + " " + closer).replace(/\s{2,}/g, " ").trim();
    }
    case "direct": {
      let out = m
        .replace(/^(hey|hi|hello)[,—\-\s]+/i, "")
        .replace(/\b(just|maybe|perhaps|i was wondering if|would you mind|if possible|when you get a chance|when you have a moment)\b\s*/gi, "")
        .replace(/\bcould you\b/gi, "please")
        .replace(/\s{2,}/g, " ").replace(/\s+([,.!?])/g, "$1").trim();
      return out.charAt(0).toUpperCase() + out.slice(1);
    }
  }
}

function applyFormat(message: string, format: FormatKind): string {
  const m = message.trim();
  if (!m) return m;
  switch (format) {
    case "default": return m;
    case "whatsapp": {
      let out = m
        .replace(/^(dear|hello)\b[^,]*,?\s*/i, "")
        .replace(/\b(kind regards|best regards|sincerely|regards)[^.]*\.?\s*$/i, "")
        .replace(/\bI hope this (email |message )?finds you well\.?\s*/gi, "")
        .replace(/\s{2,}/g, " ").trim();
      const sents = splitSentences(out);
      out = sents.slice(0, 3).join(" ");
      if (!/^(hey|hi|hello)/i.test(out)) out = "Hey — " + out.charAt(0).toLowerCase() + out.slice(1);
      return out;
    }
    case "email": {
      const body = m.replace(/^(hey|hi|hello)[,—\-\s]+/i, "").trim();
      return `Hi,\n\n${body}\n\nThanks,\n[Your name]`;
    }
    case "coldEmail": {
      const sents = splitSentences(m);
      const hook = sents[0] || m;
      const middle = sents.slice(1, 3).join(" ");
      const body = [hook, middle].filter(Boolean).join(" ").trim();
      return `Subject: Quick question\n\nHi,\n\n${body}\n\nOpen to a quick reply this week?\n\nThanks,\n[Your name]`;
    }
  }
}
