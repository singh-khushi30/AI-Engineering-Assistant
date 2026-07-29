"use client";

import type { ReactNode } from "react";

import { ConnectionToaster } from "@/components/layout/ConnectionToaster";
import { ToastProvider } from "@/components/ui/Toast";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <ConnectionToaster />
      {children}
    </ToastProvider>
  );
}
