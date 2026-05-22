// app/api/resend/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/_lib/db/prisma";
import { resend } from "@/app/_lib/email/resend-client";

// ── Helper: extract tracking status from Resend records ──────────────────────

function getTrackingStatusFromRecords(records: any[]): "verified" | "pending" {
  const trackingCname = records?.find((r: any) => r.record === "Tracking");
  return trackingCname?.status === "verified" ? "verified" : "pending";
}

export async function POST(req: NextRequest) {
  try {
    // ── Signature verification ─────────────────────────────────────────────
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
    if (webhookSecret) {
      const signature =
        req.headers.get("svix-signature") ||
        req.headers.get("resend-signature");
      if (!signature) {
        console.warn("Webhook: Missing signature header");
      }
    }

    const event = await req.json();
    const { type, data } = event;

    // ── Domain events ──────────────────────────────────────────────────────
    if (type === "domain.updated" || type === "domain.verified") {
      const resendDomainId = data?.id;
      const resendStatus = data?.status;

      if (!resendDomainId) return NextResponse.json({ ok: true });

      const domain = await prisma.domain.findFirst({
        where: { resendId: resendDomainId },
      });
      if (!domain) return NextResponse.json({ ok: true });

      const newStatus = resendStatus === "verified" ? "verified" : "pending";
      const dbUpdate: Record<string, any> = { status: newStatus };

      // ── When domain becomes verified: activate tracking on Resend ────────
      if (newStatus === "verified" && domain.status !== "verified") {
        try {
          const { data: updated } = await resend.domains.update({
            id: resendDomainId,
            openTracking: true,
            clickTracking: true,
            trackingSubdomain: "track",
          });

          if (updated) {
            // Check if the tracking record is already verified in this update
            const allRecords = (updated as any).records ?? [];
            const trackingStatus = getTrackingStatusFromRecords(allRecords);
            dbUpdate.trackingSubdomain = "track";
            dbUpdate.trackingStatus = trackingStatus;
            console.log(
              `Domain ${domain.domain}: tracking activated, status=${trackingStatus}`,
            );
          }
        } catch (e) {
          console.error("Failed to enable tracking on domain.verified:", e);
          // Don't fail the webhook — just log and continue
        }
      }

      // ── On any domain.updated: also sync tracking status if records present
      // (Resend may send a domain.updated after tracking DNS is verified)
      if (type === "domain.updated" && data?.records) {
        const trackingStatus = getTrackingStatusFromRecords(data.records);
        // Only update if the domain is already verified (tracking only applies then)
        if (domain.status === "verified" || newStatus === "verified") {
          dbUpdate.trackingStatus = trackingStatus;
          if (trackingStatus === "verified" && !domain.trackingSubdomain) {
            dbUpdate.trackingSubdomain = "track";
          }
          console.log(
            `Domain ${domain.domain}: tracking status from webhook = ${trackingStatus}`,
          );
        }
      }

      await prisma.domain.update({
        where: { id: domain.id },
        data: dbUpdate,
      });

      console.log(
        `Webhook domain.updated: ${domain.domain} → status=${newStatus}, tracking=${dbUpdate.trackingStatus ?? "unchanged"}`,
      );
      return NextResponse.json({ ok: true });
    }

    // ── Email events ───────────────────────────────────────────────────────
    const tags = data?.tags || {};
    const tagHistoryId =
      typeof tags === "object" && !Array.isArray(tags)
        ? tags["email_history_id"]
        : undefined;

    const legacyBroadcastId = data?.broadcast_id;
    const recipientEmail: string = Array.isArray(data?.to)
      ? data.to[0]
      : data?.to || "";

    let emailHistory: { id: string; userId: string } | null = null;

    if (tagHistoryId) {
      emailHistory = await prisma.emailHistory.findUnique({
        where: { id: tagHistoryId },
        select: { id: true, userId: true },
      });
    }

    if (!emailHistory && legacyBroadcastId) {
      console.log(
        `Webhook: Legacy broadcastId ${legacyBroadcastId} — no history found (expected for old records)`,
      );
    }

    if (!emailHistory) {
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
        if (recipientEmail) {
          await prisma.contact.updateMany({
            where: { email: recipientEmail, contactListId: undefined },
            data: { isBounced: true, isSubscribed: false },
          });
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
