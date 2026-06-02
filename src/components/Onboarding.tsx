import { useState } from "react";
import { cn } from "@/lib/utils";

const EXAMPLE_CHIPS = [
  "Follow up without pressure",
  "Say no clearly",
  "Keep this professional",
];

interface OnboardingProps {
  onComplete: (prefill?: string) => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(1);
  const [leaving, setLeaving] = useState(false);

  const finish = (prefill?: string) => {
    setLeaving(true);
    localStorage.setItem("solenq-onboarded", "true");
    setTimeout(() => onComplete(prefill), 480);
  };

  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] flex items-center justify-center p-6 transition-all duration-500",
        leaving ? "opacity-0 scale-[0.97] pointer-events-none" : "opacity-100 scale-100"
      )}
      style={{ background: "rgba(11,13,16,0.96)", backdropFilter: "blur(20px)" }}
    >
      <div className="w-full max-w-[360px]">
        {step === 1 && <Step1 onNext={() => setStep(2)} />}
        {step === 2 && <Step2 onNext={(prefill) => prefill ? finish(prefill) : setStep(3)} />}
        {step === 3 && <Step3 onNext={() => setStep(4)} />}
        {step === 4 && <Step4 onFinish={() => finish()} />}
      </div>
    </div>
  );
}

function Step1({ onNext }: { onNext: () => void }) {
  return (
    <div className="animate-fade-in text-center space-y-10">
      <div className="space-y-5">
        <div
          className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mx-auto"
          style={{ background: "rgba(200,169,107,0.1)", border: "1px solid rgba(200,169,107,0.22)" }}
        >
          <span style={{ fontSize: 26, color: "#C8A96B" }}>◈</span>
        </div>
        <div className="space-y-2.5">
          <h1
            className="font-bold"
            style={{ fontSize: 27, color: "#F5F5F5", letterSpacing: "-0.025em", lineHeight: 1.2 }}
          >
            Welcome to SOLENQ
          </h1>
          <p style={{ fontSize: 14, color: "#94A3B8", lineHeight: 1.65 }}>
            The intelligence layer for human communication.
          </p>
        </div>
      </div>
      <GoldButton onClick={onNext}>Let's start →</GoldButton>
    </div>
  );
}

function Step2({ onNext }: { onNext: (prefill?: string) => void }) {
  return (
    <div className="animate-fade-in text-center space-y-8">
      <div className="space-y-4">
        <StepBadge n={2} />
        <h2
          className="font-bold"
          style={{ fontSize: 22, color: "#F5F5F5", letterSpacing: "-0.02em", lineHeight: 1.3 }}
        >
          Your first hard conversation
        </h2>
        <p style={{ fontSize: 14, color: "#94A3B8", lineHeight: 1.7 }}>
          Think of a conversation you've been avoiding. A message you've rewritten 5 times. SOLENQ handles that.
        </p>
      </div>
      <div className="flex flex-col gap-2.5">
        {EXAMPLE_CHIPS.map((chip) => (
          <button
            key={chip}
            onClick={() => onNext(chip)}
            className="w-full text-left rounded-2xl px-5 py-3.5 text-[13px] font-medium transition-all duration-150 active:scale-[0.98]"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
              color: "#94A3B8",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(200,169,107,0.38)";
              e.currentTarget.style.color = "#F5F5F5";
              e.currentTarget.style.background = "rgba(200,169,107,0.05)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
              e.currentTarget.style.color = "#94A3B8";
              e.currentTarget.style.background = "rgba(255,255,255,0.04)";
            }}
          >
            + {chip}
          </button>
        ))}
      </div>
      <GhostButton onClick={() => onNext()}>I have one in mind →</GhostButton>
    </div>
  );
}

function Step3({ onNext }: { onNext: () => void }) {
  return (
    <div className="animate-fade-in text-center space-y-8">
      <div className="space-y-4">
        <StepBadge n={3} />
        <h2
          className="font-bold"
          style={{ fontSize: 22, color: "#F5F5F5", letterSpacing: "-0.02em", lineHeight: 1.3 }}
        >
          We remember your people
        </h2>
        <p style={{ fontSize: 14, color: "#94A3B8", lineHeight: 1.7 }}>
          Add the people you talk to often. SOLENQ learns their communication style so you never start from zero.
        </p>
      </div>
      <div
        className="rounded-2xl p-5 text-left"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(200,169,107,0.18)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold shrink-0"
            style={{ background: "rgba(200,169,107,0.12)", color: "#C8A96B" }}
          >
            B
          </div>
          <div className="text-left">
            <p className="text-[13px] font-semibold" style={{ color: "#F5F5F5" }}>Your boss</p>
            <p className="text-[11px] mt-0.5" style={{ color: "#94A3B8" }}>
              Direct, values clarity — dislikes vague updates
            </p>
          </div>
        </div>
      </div>
      <GoldButton onClick={onNext}>Smart →</GoldButton>
    </div>
  );
}

function Step4({ onFinish }: { onFinish: () => void }) {
  return (
    <div className="animate-fade-in text-center space-y-8">
      <div className="space-y-4">
        <StepBadge n={4} />
        <h2
          className="font-bold"
          style={{ fontSize: 22, color: "#F5F5F5", letterSpacing: "-0.02em", lineHeight: 1.3 }}
        >
          Your communication, improved daily
        </h2>
        <p style={{ fontSize: 14, color: "#94A3B8", lineHeight: 1.7 }}>
          Every conversation you handle builds your communication intelligence. Your streak starts today.
        </p>
      </div>
      <div
        className="inline-flex items-center gap-2.5 px-5 py-3 rounded-full"
        style={{ background: "rgba(200,169,107,0.08)", border: "1px solid rgba(200,169,107,0.22)" }}
      >
        <span style={{ fontSize: 20 }}>🔥</span>
        <span className="font-bold" style={{ fontSize: 14, color: "#C8A96B" }}>1 day streak</span>
      </div>
      <GoldButton onClick={onFinish} large>Start handling →</GoldButton>
    </div>
  );
}

function StepBadge({ n }: { n: number }) {
  return (
    <p style={{ fontSize: 11, color: "#94A3B8", letterSpacing: "0.15em", fontWeight: 600 }}>
      STEP {n} OF 4
    </p>
  );
}

function GoldButton({
  onClick, children, large = false,
}: {
  onClick: () => void;
  children: React.ReactNode;
  large?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="btn-solenq w-full font-semibold rounded-2xl transition-all duration-150 active:scale-[0.97]"
      style={{ height: large ? 52 : 46, fontSize: large ? 15 : 14 }}
    >
      {children}
    </button>
  );
}

function GhostButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="text-[13px] transition-opacity"
      style={{ color: "#94A3B8", opacity: 0.65 }}
      onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; }}
      onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.65"; }}
    >
      {children}
    </button>
  );
}
