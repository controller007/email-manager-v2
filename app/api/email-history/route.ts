// app/api/email-history/route.ts - UPDATED FOR RESEND
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/_lib/auth/session";
import prisma from "@/app/_lib/db/prisma";
import { resend } from "@/app/_lib/email/resend-client";

// Refresh email stats from Resend manually
export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth();

    // Fetch all email histories for the authenticated user containing batch IDs
    const emailHistories = await prisma.emailHistory.findMany({
      where: { userId: user.id },
      select: { id: true, batchIds: true },
    });

    for (const history of emailHistories) {
      if (!history.batchIds || history.batchIds.length === 0) continue;

      let deliveredCount = 0;
      let openedCount = 0;
      let clickedCount = 0;
      let bouncedCount = 0;
      let failedCount = 0;
      let complainedCount = 0;
      let unsubscribedCount = 0;

      // Poll each individual Resend Message ID to get its live state
      for (const batchId of history.batchIds) {
        try {
          const { data, error } = await resend.emails.get(batchId);
          if (error || !data) {
            console.error(`Resend API Error for ID ${batchId}:`, error);
            continue;
          }

          const lastEvent = data.last_event; // e.g., "sent" | "delivered" | "opened" | "clicked" | "bounced" | "failed"
          const recipientEmail = Array.isArray(data.to)
            ? data.to[0]
            : data.to || "";

          // 1. Sync individual recipient event records to match webhook architecture
          if (recipientEmail && lastEvent) {
            const existingEvent = await prisma.emailRecipientEvent.findFirst({
              where: {
                emailHistoryId: history.id,
                recipientEmail,
                resendMessageId: batchId,
              },
            });

            if (!existingEvent) {
              await prisma.emailRecipientEvent.create({
                data: {
                  emailHistoryId: history.id,
                  recipientEmail,
                  status: lastEvent,
                  resendMessageId: batchId,
                },
              });
            } else if (existingEvent.status !== lastEvent) {
              await prisma.emailRecipientEvent.update({
                where: { id: existingEvent.id },
                data: { status: lastEvent },
              });
            }
          }

          // 2. Aggregate totals based on the absolute latest event state
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
              failedCount++;
              break;
            case "complained":
              complainedCount++;
              break;
            default:
              // "sent" or unhandled states don't increment tracking counters
              break;
          }
        } catch (error) {
          console.error(
            `Failed to fetch stats for batch item ${batchId}:`,
            error,
          );
        }
      }

      // 3. Overwrite the summary tallies with fully reconciled numbers
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error refreshing email history:", error);
    return NextResponse.json(
      { error: "Failed to refresh email history" },
      { status: 500 },
    );
  }
}
