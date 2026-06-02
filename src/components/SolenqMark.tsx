import { cn } from "@/lib/utils";

export default function SolenqMark({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(className)}
    >
      <path
        d="M10 1.5L18.5 10L10 18.5L1.5 10L10 1.5Z"
        fill="currentColor"
        fillOpacity="0.12"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M10 5.5L14.5 10L10 14.5L5.5 10L10 5.5Z"
        fill="currentColor"
        fillOpacity="0.7"
      />
    </svg>
  );
}
