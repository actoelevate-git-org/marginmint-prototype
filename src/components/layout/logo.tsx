import { cn } from "@/lib/utils";

/** Geometric mark: a rising profit line that ends in a leaf. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" aria-hidden="true" className={cn("size-7", className)}>
      <rect width="28" height="28" rx="6" fill="#16A34A" />
      <path d="M6 19.5 11.5 13l3.5 3.5L21 9.5" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 8.6c1.8-1.7 4.3-1.9 5.4-1.6.3 1.1.1 3.6-1.6 5.4-1.2 1.2-2.7 1.5-3.6 1.4-.1-.9.3-2.5 1.4-3.6" fill="#DCFCE7" />
    </svg>
  );
}

export function Logo({ tone = "dark" }: { tone?: "dark" | "light" }) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark />
      <div className="leading-none">
        <div className={cn("text-[15px] font-semibold tracking-tight", tone === "dark" ? "text-white" : "text-ink")}>MarginMint</div>
        <div className={cn("mt-1 text-2xs", tone === "dark" ? "text-emerald-200/70" : "text-muted")}>Profit intelligence</div>
      </div>
    </div>
  );
}
