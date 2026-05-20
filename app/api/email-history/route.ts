import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/_lib/auth/session";
import prisma from "@/app/_lib/db/prisma";
import { resend } from "@/app/_lib/email/resend-client";

/**
 * PUT /api/email-history
 *
 * Called by HistorySyncClient whenever the visible email history IDs change.
 * Fetches per-email status from Resend using individual message IDs stored in
 * batchIds, then overwrites the aggregate counters on each EmailHistory record.
 *
 * Resend's emails.get(id) returns { last_event: string } where last_event is:
 *   queued | sent | delivered | opened | clicked | bounced | complained
 *
 * Cascade logic:
 *   clicked  → delivered + opened + clicked
 *   opened   → delivered + opened
 *   delivered → delivered
 *   bounced  → bounced (delivery failure, not "delivered")
 *   complained → complained
 *   queued/sent → not yet delivered, skip
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth();

    const body = await request.json();
    const { historyIds } = body;

    if (!Array.isArray(historyIds) || historyIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No history IDs provided",
      });
    }

    // Fetch history records that belong to this user and have batch IDs to check
    // We check BOTH "sent" and "sending" (in case status update was missed)
    const emailHistories = await prisma.emailHistory.findMany({
      where: {
        id: { in: historyIds },
        userId: user.id,
        batchIds: { isEmpty: false },
      },
      select: { id: true, batchIds: true, sentCount: true },
    });

    if (emailHistories.length === 0) {
      return NextResponse.json({ success: true, synced: 0 });
    }

    const CONCURRENT_CHUNK = 10; // stay within Resend rate limits

    for (const history of emailHistories) {
      if (!history.batchIds || history.batchIds.length === 0) continue;

      let deliveredCount = 0;
      let openedCount = 0;
      let clickedCount = 0;
      let bouncedCount = 0;
      let failedCount = 0;
      let complainedCount = 0;
      let unsubscribedCount = 0;

      // Process batchIds in parallel chunks to respect Resend rate limits
      for (let i = 0; i < history.batchIds.length; i += CONCURRENT_CHUNK) {
        const chunk = history.batchIds.slice(i, i + CONCURRENT_CHUNK);

        const results = await Promise.all(
          chunk.map(async (messageId: string) => {
            try {
              const { data, error } = await resend.emails.get(messageId);
              if (error || !data) return null;

              return {
                messageId,
                lastEvent: data.last_event as string | undefined,
                to: Array.isArray(data.to) ? data.to[0] : data.to || "",
              };
            } catch {
              return null;
            }
          }),
        );

        for (const result of results) {
          if (!result || !result.lastEvent) continue;

          const { messageId, lastEvent, to: recipientEmail } = result;

          // Upsert recipient event record for audit trail
          if (recipientEmail) {
            try {
              const existing = await prisma.emailRecipientEvent.findFirst({
                where: {
                  emailHistoryId: history.id,
                  resendMessageId: messageId,
                },
              });

              if (!existing) {
                await prisma.emailRecipientEvent.create({
                  data: {
                    emailHistoryId: history.id,
                    recipientEmail,
                    status: lastEvent,
                    resendMessageId: messageId,
                  },
                });
              } else if (existing.status !== lastEvent) {
                await prisma.emailRecipientEvent.update({
                  where: { id: existing.id },
                  data: { status: lastEvent },
                });
              }
            } catch {
              // Non-fatal — continue with count aggregation
            }
          }

          // Aggregate counts with cascade (clicked implies opened implies delivered)
          switch (lastEvent) {
            case "delivered":
              deliveredCount++;
              break;
            case "opened":
              deliveredCount++;
              openedCount++;
              break;
            case "clicked":
              deliveredCount++;
              openedCount++;
              clickedCount++;
              break;
            case "bounced":
              bouncedCount++;
              break;
            case "failed":
              // Resend sometimes uses "failed" for transient failures
              failedCount++;
              break;
            case "complained":
              complainedCount++;
              break;
            case "unsubscribed":
              unsubscribedCount++;
              break;
            // "queued" and "sent" mean not yet delivered — don't count
            default:
              break;
          }
        }
      }

      // Only update if we got meaningful data from Resend
      const totalKnown =
        deliveredCount +
        openedCount +
        clickedCount +
        bouncedCount +
        failedCount +
        complainedCount;

      if (totalKnown > 0 || history.batchIds.length > 0) {
        await prisma.emailHistory.update({
          where: { id: history.id },
          data: {
            deliveredCount,
            openedCount,
            clickedCount,
            bouncedCount,
            failedCount,
            complainedCount,
            unsubscribedCount,
          },
        });
      }
    }

    return NextResponse.json({ success: true, synced: emailHistories.length });
  } catch (error) {
    console.error("Error syncing email history:", error);
    return NextResponse.json(
      { error: "Failed to sync email history" },
      { status: 500 },
    );
  }
}
