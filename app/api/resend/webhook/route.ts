// app/api/webhooks/brevo/route.ts - BREVO WEBHOOK HANDLER
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/_lib/db/prisma";
import type { BrevoWebhookEvent } from "@/types/brevo";

export async function POST(req: NextRequest) {
  try {
    const event: BrevoWebhookEvent = await req.json();
    const { event: eventType, email, tag, campaign_id } = event;

    console.log("Brevo webhook received:", eventType, { email, tag, campaign_id });

    // Extract emailHistoryId from tag (format: "history-{id}")
    let emailHistoryId: string | undefined;
    
    if (tag) {
      const match = tag.match(/history-(.+)/);
      emailHistoryId = match?.[1];
    }

    // If campaign, find by campaignId
    if (!emailHistoryId && campaign_id) {
      const emailHistory = await prisma.emailHistory.findFirst({
        where: { campaignId: campaign_id },
      });
      emailHistoryId = emailHistory?.id;
    }

    if (!emailHistoryId) {
      console.warn("Brevo webhook: No emailHistoryId found");
      return NextResponse.json({ ok: true });
    }

    const emailHistory = await prisma.emailHistory.findUnique({
      where: { id: emailHistoryId },
    });

    if (!emailHistory) {
      console.warn(`Brevo webhook: EmailHistory not found for ${emailHistoryId}`);
      return NextResponse.json({ ok: true });
    }

    let updateData: Record<string, any> = {};
    let recipientStatus = "";

    // Map Brevo events to our status
    switch (eventType) {
      case "delivered":
      case "request":
        updateData = { deliveredCount: { increment: 1 } };
        recipientStatus = "delivered";
        break;

      case "opened":
      case "open":
      case "unique_opened":
        updateData = { openedCount: { increment: 1 } };
        recipientStatus = "opened";
        break;

      case "clicked":
      case "click":
      case "unique_clicked":
        updateData = { clickedCount: { increment: 1 } };
        recipientStatus = "clicked";
        break;

      case "hard_bounce":
        updateData = { bouncedCount: { increment: 1 }, failedCount: { increment: 1 } };
        recipientStatus = "hard_bounce";
        break;

      case "soft_bounce":
        updateData = { bouncedCount: { increment: 1 } };
        recipientStatus = "soft_bounce";
        break;

      case "blocked":
      case "error":
      case "invalid_email":
        updateData = { failedCount: { increment: 1 } };
        recipientStatus = "failed";
        break;

      case "unsubscribed":
        recipientStatus = "unsubscribed";
        break;

      case "complaint":
      case "spam":
        updateData = { failedCount: { increment: 1 } };
        recipientStatus = "spam";
        break;

      default:
        console.log("Unhandled Brevo event type:", eventType);
        return NextResponse.json({ ok: true });
    }

    if (!email) {
      console.warn("Brevo webhook: No email found in event");
      return NextResponse.json({ ok: true });
    }

    // Check for duplicate event
    const existingEvent = await prisma.emailRecipientEvent.findFirst({
      where: {
        emailHistoryId: emailHistory.id,
        recipientEmail: email,
        status: recipientStatus,
      },
    });

    if (!existingEvent && recipientStatus) {
      await prisma.emailRecipientEvent.create({
        data: {
          emailHistoryId: emailHistory.id,
          recipientEmail: email,
          status: recipientStatus,
        },
      });

      if (Object.keys(updateData).length > 0) {
        await prisma.emailHistory.update({
          where: { id: emailHistory.id },
          data: updateData,
        });
      }

      console.log(
        `Brevo webhook logged (historyId=${emailHistoryId}, email=${email}) → ${recipientStatus}`
      );
    } else {
      console.log(
        `Brevo webhook duplicate ignored (historyId=${emailHistoryId}, email=${email}, status=${recipientStatus})`
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Brevo webhook error:", err);
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
  }
}