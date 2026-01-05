// app/api/send-email/route.ts - UPDATED FOR BREVO (BOTH METHODS)
import { type NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/_lib/auth/session";
import { emailComposeSchema } from "@/app/_lib/validations/email";
import { brevo, generateEmailTemplate } from "@/app/_lib/email/brevo-client";
import prisma from "@/app/_lib/db/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = emailComposeSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const {
      subject,
      body: emailBody,
      contactListId,
      senderId,
      sendMethod = "transactional",
    } = validationResult.data as any;

    // Get contact list
    const contactList = await prisma.contactList.findFirst({
      where: { id: contactListId, createdBy: session.user.id },
    });

    if (!contactList) {
      return NextResponse.json(
        { error: "Contact list not found" },
        { status: 404 }
      );
    }

    if (contactList.status !== "ready") {
      return NextResponse.json(
        {
          error: "Contact list is not ready. Import may still be in progress.",
        },
        { status: 400 }
      );
    }

    if (!contactList.brevoListId) {
      return NextResponse.json(
        { error: "Contact list not linked to Brevo" },
        { status: 404 }
      );
    }

    // Get sender details
    const sender = await prisma.sender.findFirst({
      where: { id: senderId, userId: session.user.id },
      include: { domain: true },
    });

    if (!sender || sender.domain.status !== "verified") {
      return NextResponse.json(
        { error: "Sender not found or domain not verified" },
        { status: 400 }
      );
    }

    // Create email history
    const emailHistory = await prisma.emailHistory.create({
      data: {
        subject,
        body: emailBody,
        contactListId,
        userId: session.user.id,
        sendMethod: sendMethod || "transactional",
      },
    });

    const htmlContent = generateEmailTemplate(emailBody, subject);
    const senderInfo = { name: sender.name, email: sender.email };

    let campaignId: number | undefined;
    let messageId: string | undefined;

    if (sendMethod === "campaign") {
      // METHOD 1: Marketing Campaign
      const campaign = await brevo.createEmailCampaign({
        name: `Campaign-${emailHistory.id}`,
        subject,
        sender: senderInfo,
        htmlContent,
        recipients: { listIds: [contactList.brevoListId] },
      });

      campaignId = campaign.body.id;

      const res = await brevo.sendEmailCampaignNow(campaign.body.id!);
      console.log(res);
      console.log("it worked o so why issue");

      await prisma.emailHistory.update({
        where: { id: emailHistory.id },
        data: {
          campaignId: campaign.body.id,
          sentCount: contactList.emails.length,
        },
      });

      return NextResponse.json({
        success: true,
        emailHistoryId: emailHistory.id,
        campaignId: campaign.body.id,
        recipientCount: contactList.emails.length,
        method: "campaign",
      });
    } else {
      // METHOD 2: Transactional Email (Batch sending)
      const recipients = contactList.emails.map((email) => ({ email }));

      // Brevo allows up to 1000 recipients per transactional email
      const batchSize = 1000;
      const batches = [];

      for (let i = 0; i < recipients.length; i += batchSize) {
        batches.push(recipients.slice(i, i + batchSize));
      }

      const results = [];
      for (const batch of batches) {
        const result = await brevo.sendTransactionalEmail({
          sender: senderInfo,
          to: batch,
          subject,
          htmlContent,
          tags: [`history-${emailHistory.id}`],
        });
        results.push(result);
      }

      messageId = results[0]?.body.messageId;

      await prisma.emailHistory.update({
        where: { id: emailHistory.id },
        data: {
          campaignId: messageId ? parseInt(messageId) : undefined,
          sentCount: contactList.emails.length,
        },
      });

      return NextResponse.json({
        success: true,
        emailHistoryId: emailHistory.id,
        messageId,
        recipientCount: contactList.emails.length,
        method: "transactional",
        batches: results.length,
      });
    }
  } catch (error) {
    console.error("Error sending email:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
