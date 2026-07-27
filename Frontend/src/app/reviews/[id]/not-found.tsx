import Link from "next/link";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <AppShell showHeading={false}>
      <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-xl border border-slate-800 bg-zinc-900/40 px-6 py-16 text-center">
        <h1 className="text-2xl font-semibold text-slate-50">Review not found</h1>
        <p className="mt-2 max-w-md text-sm text-slate-500">
          The requested review ID does not exist in the current mock dataset.
        </p>
        <Link href="/reviews" className="mt-6">
          <Button variant="primary">Back to Reviews</Button>
        </Link>
      </div>
    </AppShell>
  );
}
