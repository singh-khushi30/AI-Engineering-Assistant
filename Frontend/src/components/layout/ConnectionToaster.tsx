"use client";

import { useEffect, useRef } from "react";

import { useToast } from "@/components/ui/Toast";
import { useHealth } from "@/hooks/useHealth";

/**
 * Emits connection restored / lost toasts when backend health flips.
 * Mount once near the app shell.
 */
export function ConnectionToaster() {
  const { status, isOnline, isOffline } = useHealth({ pollIntervalMs: 30_000 });
  const { toast } = useToast();
  const previous = useRef<typeof status | null>(null);

  useEffect(() => {
    const prev = previous.current;
    previous.current = status;

    if (prev === null || prev === "checking") {
      return;
    }

    if (prev !== "online" && isOnline) {
      toast({
        title: "Connection restored",
        description: "Backend is online again.",
        tone: "success",
      });
    } else if (prev === "online" && isOffline) {
      toast({
        title: "Connection lost",
        description: "The review API is unreachable.",
        tone: "warning",
      });
    }
  }, [status, isOnline, isOffline, toast]);

  return null;
}
