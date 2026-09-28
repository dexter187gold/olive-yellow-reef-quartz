import { cn } from "@/lib/utils";

export function HelixMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={cn("size-7", className)}
    >
      <rect width="32" height="32" rx="8" className="fill-secondary" />
      <path
        d="M10 7.5c4.2 2.8 7.8 2.8 12 0M10 24.5c4.2-2.8 7.8-2.8 12 0"
        className="stroke-primary"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M11.5 10.5c3.2 2.1 5.8 2.1 9 0M11.5 21.5c3.2-2.1 5.8-2.1 9 0"
        className="stroke-primary"
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity="0.7"
      />
      <path
        d="M13 13.5c2.1 1.3 3.9 1.3 6 0M13 18.5c2.1-1.3 3.9-1.3 6 0"
        className="stroke-primary"
        strokeWidth="1.3"
        strokeLinecap="round"
        opacity="0.45"
      />
    </svg>
  );
}

export function HelixWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <HelixMark />
      <span className="text-[15px] font-semibold tracking-tight">Helix</span>
    </span>
  );
}
