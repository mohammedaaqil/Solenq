import { useEffect, useRef, useState } from "react";
import { Mic, Plus, Image as ImageIcon, AudioLines, ClipboardPaste } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface SmartInputControlsProps {
  onTranscript: (text: string) => void;
  onAttach: (kind: "screenshot" | "audio", file: File) => void;
  onPasteConversation: (text: string) => void;
  focused?: boolean;
  valueLength?: number;
}

export default function SmartInputControls({ onTranscript, onAttach, onPasteConversation, focused = false, valueLength = 0 }: SmartInputControlsProps) {
  const [recording, setRecording] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const recognitionRef = useRef<any>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const screenshotInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const showPlus = focused || valueLength >= 10 || menuOpen;

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  useEffect(() => {
    if (!showPlus && menuOpen) setMenuOpen(false);
  }, [showPlus, menuOpen]);

  useEffect(() => {
    return () => {
      try { recognitionRef.current?.stop(); } catch { /* ignore */ }
    };
  }, []);

  const toggleMic = () => {
    const SR: any =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      toast({
        title: "Mic not supported here",
        description: "Try Chrome or Safari for voice input.",
        variant: "destructive",
      });
      return;
    }

    if (recording) {
      try { recognitionRef.current?.stop(); } catch { /* ignore */ }
      setRecording(false);
      return;
    }

    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = false;

    let finalText = "";
    rec.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += t;
        else interim += t;
      }
      const out = (finalText + interim).trim();
      if (out) onTranscript(out);
    };
    rec.onerror = () => setRecording(false);
    rec.onend = () => setRecording(false);

    try {
      rec.start();
      recognitionRef.current = rec;
      setRecording(true);
    } catch {
      setRecording(false);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text?.trim()) {
        onPasteConversation(text.trim());
        toast({ title: "Pasted", description: "Conversation added." });
      } else {
        toast({ title: "Clipboard empty", variant: "destructive" });
      }
    } catch {
      toast({ title: "Couldn't read clipboard", description: "Paste manually with ⌘V.", variant: "destructive" });
    }
    setMenuOpen(false);
  };

  return (
    <div ref={wrapRef} className="relative flex items-center gap-1">
      {/* Hidden inputs */}
      <input
        ref={screenshotInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) {
            onAttach("screenshot", f);
            toast({ title: "Screenshot added", description: f.name });
          }
          e.target.value = "";
          setMenuOpen(false);
        }}
      />
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) {
            onAttach("audio", f);
            toast({ title: "Audio added", description: f.name });
          }
          e.target.value = "";
          setMenuOpen(false);
        }}
      />

      {/* + menu trigger — visible only when focused and >= 10 chars */}
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        onMouseDown={(e) => { e.preventDefault(); setMenuOpen(v => !v); }}
        title="Add input"
        aria-label="Add input"
        className={cn(
          "p-1.5 rounded-md transition-all duration-200 active:scale-[0.95]",
          menuOpen
            ? "text-[hsl(var(--mode-accent))] bg-[hsl(var(--mode-accent)/0.12)]"
            : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
        )}
        style={{
          opacity: showPlus ? 1 : 0,
          pointerEvents: showPlus ? "auto" : "none",
          transition: "opacity 200ms ease",
        }}
      >
        <Plus className={cn("h-4 w-4 transition-transform", menuOpen && "rotate-45")} />
      </button>

      {/* Mic */}
      <button
        type="button"
        onClick={toggleMic}
        title={recording ? "Stop recording" : "Speak"}
        aria-label={recording ? "Stop recording" : "Start voice input"}
        className={cn(
          "p-1.5 rounded-md transition-all active:scale-[0.95]",
          recording
            ? "text-[hsl(var(--mode-accent))] bg-[hsl(var(--mode-accent)/0.15)] animate-pulse"
            : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
        )}
      >
        <Mic className="h-4 w-4" />
      </button>

      {/* Floating mini-menu */}
      {menuOpen && showPlus && (
        <div
          className={cn(
            "absolute right-0 bottom-full mb-2 z-30",
            "min-w-[200px] p-1.5 rounded-xl border border-border",
            "bg-popover/95 backdrop-blur-xl shadow-[0_12px_40px_-12px_rgba(0,0,0,0.4)]",
            "animate-fade-in"
          )}
          role="menu"
        >
          <MenuItem
            icon={<ImageIcon className="h-3.5 w-3.5" />}
            label="Upload screenshot"
            onClick={() => screenshotInputRef.current?.click()}
          />
          <MenuItem
            icon={<AudioLines className="h-3.5 w-3.5" />}
            label="Upload audio"
            onClick={() => audioInputRef.current?.click()}
          />
          <MenuItem
            icon={<ClipboardPaste className="h-3.5 w-3.5" />}
            label="Paste conversation"
            onClick={handlePaste}
          />
        </div>
      )}
    </div>
  );
}

function MenuItem({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className="w-full flex items-center gap-2 text-[12px] font-medium px-2.5 py-2 rounded-lg text-foreground hover:bg-secondary/70 transition-colors text-left"
      role="menuitem"
    >
      <span className="text-muted-foreground">{icon}</span>
      {label}
    </button>
  );
}
