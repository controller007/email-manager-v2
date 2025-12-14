import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/_lib/db/prisma";
import { resend } from "@/app/_lib/email/resend-client";

export async function POST(req: NextRequest) {
  try {
    const event = await req.json();
    const { type, data } = event;
    const { broadcast_id: broadcastId, to } = data;

    if (type === "domain.updated") {
      const resendDomainId = data?.id;
      const resendStatus = data?.status;

      if (!resendDomainId) {
        return NextResponse.json({ ok: true });
      }

      const domain = await prisma.domain.findFirst({
        where: { resendId: resendDomainId },
      });

      if (!domain) {
        return NextResponse.json({ ok: true });
      }

      const status = resendStatus === "verified" ? "verified" : "pending";

      if (status === "verified" && domain.status !== "verified") {
        await resend.domains.update({
          id: resendDomainId,
          openTracking: true,
          clickTracking: true,
        });
      }

      await prisma.domain.update({
        where: { id: domain.id },
        data: { status },
      });

      console.log(`Domain status updated → ${domain.domain}: ${status}`);

      return NextResponse.json({ ok: true });
    }

    
    if (!broadcastId) {
      console.warn("Webhook: Missing broadcast_id");
      return NextResponse.json({ ok: true });
    }

    const emailHistory = await prisma.emailHistory.findFirst({
      where: { broadcastId },
    });

    if (!emailHistory) {
      console.warn(`Webhook: No EmailHistory found for id ${broadcastId}`);
      return NextResponse.json({ ok: true });
    }

    let updateData: Record<string, any> = {};
    let recipientStatus = "";

    switch (type) {
      case "email.delivered":
        updateData = { deliveredCount: { increment: 1 } };
        recipientStatus = "delivered";
        break;
      case "email.opened":
        updateData = { openedCount: { increment: 1 } };
        recipientStatus = "opened";
        break;
      case "email.clicked":
        updateData = { openedCount: { increment: 1 } };
        recipientStatus = "clicked";
        break;
      case "email.bounced":
      case "email.failed":
        updateData = { failedCount: { increment: 1 } };
        recipientStatus = "failed";
        break;
      default:
        console.log("Unhandled event type:", type);
        return NextResponse.json({ ok: true });
    }

    const recipientEmail = Array.isArray(to) ? to[0] : to;

    const existingEvent = await prisma.emailRecipientEvent.findFirst({
      where: {
        emailHistoryId: emailHistory.id,
        recipientEmail,
        status: recipientStatus,
      },
    });

    if (!existingEvent) {
      await prisma.emailRecipientEvent.create({
        data: {
          emailHistoryId: emailHistory.id,
          recipientEmail,
          status: recipientStatus,
        },
      });

      await prisma.emailHistory.update({
        where: { id: emailHistory.id },
        data: updateData,
      });

      console.log(
        `Webhook logged (broadcastId=${broadcastId}, email=${recipientEmail}) → ${recipientStatus}`
      );
    } else {
      console.log(
        `Webhook duplicate ignored (broadcastId=${broadcastId}, email=${recipientEmail}, status=${recipientStatus})`
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
  }
}
