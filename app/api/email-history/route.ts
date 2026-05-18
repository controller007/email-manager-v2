import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/_lib/auth/session";
import prisma from "@/app/_lib/db/prisma";
import { resend } from "@/app/_lib/email/resend-client";

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth();

    const body = await request.json();
    const { historyIds } = body;

    
    if (!Array.isArray(historyIds) || historyIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No active history targets provided",
      });
    }

    // Pull ONLY the records currently rendered in the active viewport
    const emailHistories = await prisma.emailHistory.findMany({
      where: {
        id: { in: historyIds },
        userId: user.id,
        status: "sent",
      },
      select: { id: true, batchIds: true },
    });

    console.log(emailHistories);
    
    for (const history of emailHistories) {
      if (!history.batchIds || history.batchIds.length === 0) continue;

      let deliveredCount = 0;
      let openedCount = 0;
      let clickedCount = 0;
      let bouncedCount = 0;
      let failedCount = 0;
      let complainedCount = 0;

      // Parallel chunks of 10 for the visible set
      const batchSize = 10;
      for (let i = 0; i < history.batchIds.length; i += batchSize) {
        const currentBatchIds = history.batchIds.slice(i, i + batchSize);

        const batchResults = await Promise.all(
          currentBatchIds.map(async (batchId) => {
            try {
              const { data, error } = await resend.emails.get(batchId);
              if (error || !data) return null;
              return { batchId, data };
            } catch {
              return null;
            }
          }),
        );

        for (const result of batchResults) {
          if (!result) continue;

          const { batchId, data } = result;
          const lastEvent = data.last_event;
          const recipientEmail = Array.isArray(data.to)
            ? data.to[0]
            : data.to || "";

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
          }
        }
      }

      await prisma.emailHistory.update({
        where: { id: history.id },
        data: {
          deliveredCount,
          openedCount,
          clickedCount,
          bouncedCount,
          failedCount,
          complainedCount,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error syncing view targets:", error);
    return NextResponse.json(
      { error: "Failed to refresh viewport items" },
      { status: 500 },
    );
  }
}
