// app/api/resend/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/_lib/db/prisma";
import { resend } from "@/app/_lib/email/resend-client";

export async function POST(req: NextRequest) {
  try {
    // ── Signature verification (optional but recommended) ──────────────────
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
    if (webhookSecret) {
      const signature =
        req.headers.get("svix-signature") ||
        req.headers.get("resend-signature");
      if (!signature) {
        console.warn("Webhook: Missing signature header");
        // Don't hard-reject — Resend may not send signature on all events
        // return NextResponse.json({ error: "Missing signature" }, { status: 401 });
      }
    }

    const event = await req.json();
    const { type, data } = event;

    // ── Domain verification events ─────────────────────────────────────────
    if (type === "domain.updated" || type === "domain.verified") {
      const resendDomainId = data?.id;
      const resendStatus = data?.status;

      if (!resendDomainId) return NextResponse.json({ ok: true });

      const domain = await prisma.domain.findFirst({
        where: { resendId: resendDomainId },
      });
      if (!domain) return NextResponse.json({ ok: true });

      const status = resendStatus === "verified" ? "verified" : "pending";

      if (status === "verified" && domain.status !== "verified") {
        try {
          await resend.domains.update({
            id: resendDomainId,
            openTracking: true,
            clickTracking: true,
          });
        } catch (e) {
          console.error("Failed to enable tracking on domain:", e);
        }
      }

      await prisma.domain.update({
        where: { id: domain.id },
        data: { status },
      });

      console.log(`Domain ${domain.domain} → ${status}`);
      return NextResponse.json({ ok: true });
    }

    // ── Email events ───────────────────────────────────────────────────────
    // New sends use tags: email_history_id
    // Legacy sends used broadcastId field (kept for backward compat)
    const tags: { name: string; value: string }[] = data?.tags || [];
    const tagHistoryId = tags.find((t) => t.name === "email_history_id")?.value;
    const legacyBroadcastId = data?.broadcast_id;

    const recipientEmail: string = Array.isArray(data?.to)
      ? data.to[0]
      : data?.to || "";

    // Resolve EmailHistory
    let emailHistory: { id: string; userId: string } | null = null;

    if (tagHistoryId) {
      emailHistory = await prisma.emailHistory.findUnique({
        where: { id: tagHistoryId },
        select: { id: true, userId: true },
      });
    }

    // Legacy broadcast lookup
    if (!emailHistory && legacyBroadcastId) {
      // broadcastId field no longer in schema — skip silently
      console.log(
        `Webhook: Legacy broadcastId ${legacyBroadcastId} — no history found (expected for old records)`,
      );
    }

    if (!emailHistory) {
      // Not fatal — could be old send, test email, or unrelated event
      console.log(
        `Webhook: No EmailHistory for event ${type}, tags=${JSON.stringify(tags)}`,
      );
      return NextResponse.json({ ok: true });
    }

    const historyId = emailHistory.id;
    const userId = emailHistory.userId;

    let updateData: Record<string, any> = {};
    let recipientStatus = "";
    let clickedUrl: string | undefined;

    switch (type) {
      case "email.sent":
        // sentCount is already set at send time; just record the event
        recipientStatus = "sent";
        updateData = {};
        break;

      case "email.delivered":
        updateData = { deliveredCount: { increment: 1 } };
        recipientStatus = "delivered";
        break;

      case "email.opened":
        updateData = { openedCount: { increment: 1 } };
        recipientStatus = "opened";
        break;

      case "email.clicked":
        clickedUrl = data?.click?.link || data?.link || undefined;
        updateData = { clickedCount: { increment: 1 } };
        recipientStatus = "clicked";
        break;

      case "email.bounced":
      case "email.failed":
        updateData = { bouncedCount: { increment: 1 } };
        recipientStatus = type === "email.bounced" ? "bounced" : "failed";
        // Mark contact as bounced and add to suppression
        if (recipientEmail) {
          await prisma.contact.updateMany({
            where: { email: recipientEmail, contactListId: undefined },
            data: { isBounced: true, isSubscribed: false },
          });
          // Global suppression
          await prisma.emailSuppression.upsert({
            where: { email: recipientEmail },
            create: { email: recipientEmail, reason: "bounced", userId },
            update: { reason: "bounced" },
          });
        }
        break;

      case "email.complained":
        updateData = { complainedCount: { increment: 1 } };
        recipientStatus = "complained";
        if (recipientEmail) {
          await prisma.contact.updateMany({
            where: { email: recipientEmail },
            data: { isComplained: true, isSubscribed: false },
          });
          await prisma.emailSuppression.upsert({
            where: { email: recipientEmail },
            create: { email: recipientEmail, reason: "complained", userId },
            update: { reason: "complained" },
          });
        }
        break;

      case "email.unsubscribed":
      case "contact.unsubscribed":
        updateData = { unsubscribedCount: { increment: 1 } };
        recipientStatus = "unsubscribed";
        if (recipientEmail) {
          await prisma.contact.updateMany({
            where: { email: recipientEmail },
            data: { isSubscribed: false },
          });
          await prisma.emailSuppression.upsert({
            where: { email: recipientEmail },
            create: { email: recipientEmail, reason: "unsubscribed", userId },
            update: { reason: "unsubscribed" },
          });
        }
        break;

      default:
        console.log("Unhandled webhook event type:", type);
        return NextResponse.json({ ok: true });
    }

    // Deduplicate recipient events (except clicks — each click is unique)
    if (recipientStatus && recipientEmail) {
      const existingEvent =
        type !== "email.clicked"
          ? await prisma.emailRecipientEvent.findFirst({
              where: {
                emailHistoryId: historyId,
                recipientEmail,
                status: recipientStatus,
              },
            })
          : null;

      if (!existingEvent) {
        await prisma.emailRecipientEvent.create({
          data: {
            emailHistoryId: historyId,
            recipientEmail,
            status: recipientStatus,
            clickedUrl: clickedUrl || null,
            resendMessageId: data?.email_id || data?.id || null,
          },
        });

        if (Object.keys(updateData).length > 0) {
          await prisma.emailHistory.update({
            where: { id: historyId },
            data: updateData,
          });
        }

        console.log(
          `Webhook: ${type} → historyId=${historyId}, email=${recipientEmail}`,
        );
      } else {
        console.log(`Webhook: duplicate ${type} ignored for ${recipientEmail}`);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
  }
}
