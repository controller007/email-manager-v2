"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface HistorySyncClientProps {
  historyIds: string[];
}

export function HistorySyncClient({ historyIds }: HistorySyncClientProps) {
  const router = useRouter();
  const serializedIds = JSON.stringify(historyIds);
  const hasFetchedOnMount = useRef(false);

  useEffect(() => {
    // Prevent double invocation during development StrictMode re-renders
    if (historyIds.length === 0 || hasFetchedOnMount.current) return;
    hasFetchedOnMount.current = true;

    async function runViewportSync() {
      try {
        const response = await fetch("/api/email-history", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ historyIds }),
        });

        if (response.ok) {
          // Tell Next.js Server Components to pull fresh database records
          // and reload the list UI smoothly without standard page flashing
          router.refresh();
        }
      } catch (err) {
        console.error("Failed background viewport sync:", err);
      }
    }

    runViewportSync();
  }, [serializedIds, router]);

  // This is a headless execution component—it returns nothing visible
  return null;
}
