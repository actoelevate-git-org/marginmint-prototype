import Link from "next/link";

export function SidebarFooter() {
  return (
    <div className="m-3 rounded-md border border-white/10 bg-white/[0.04] p-3">
      <p className="text-xs font-medium text-white">Demo workspace</p>
      <p className="mt-1 text-2xs leading-relaxed text-emerald-100/60">
        Seeded, simulated records. No marketplace is connected.
      </p>
      <Link href="/integrations" className="mt-2 inline-block text-2xs font-medium text-emerald-300 hover:text-emerald-200">
        View data sources →
      </Link>
    </div>
  );
}
