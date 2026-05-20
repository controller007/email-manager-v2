"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface HistorySyncClientProps {
  historyIds: string[];
}

/**
 * Headless component: auto-syncs visible email history records via Resend API
 * on mount and whenever the set of visible IDs changes (e.g. pagination).
 * No hasFetchedOnMount guard — the serializedIds dependency alone prevents
 * duplicate work: router.refresh() only re-renders server components with
 * updated counts, the IDs themselves don't change so the effect won't re-fire.
 */
export function HistorySyncClient({ historyIds }: HistorySyncClientProps) {
  const router = useRouter();
  const serializedIds = JSON.stringify(historyIds);
  // Track in-flight request to avoid parallel runs
  const isSyncing = useRef(false);

  useEffect(() => {
    if (historyIds.length === 0 || isSyncing.current) return;

    isSyncing.current = true;

    async function runSync() {
      try {
        const response = await fetch("/api/email-history", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ historyIds }),
        });

        if (response.ok) {
          router.refresh();
        }
      } catch (err) {
        console.error("Failed background viewport sync:", err);
      } finally {
        isSyncing.current = false;
      }
    }

    runSync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serializedIds]);

  return null;
}
