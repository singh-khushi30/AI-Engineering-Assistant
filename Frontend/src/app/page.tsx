import { AppShell } from "@/components/layout/AppShell";

export default function HomePage() {
  return (
    <AppShell>
      <div className="flex min-h-[60vh] items-center justify-center rounded-xl border border-slate-800 bg-zinc-900/40 px-6 py-16 shadow-sm shadow-black/20">
        <p className="text-center text-base text-slate-400 sm:text-lg">
          Dashboard Content Coming Soon
        </p>
      </div>
    </AppShell>
  );
}
