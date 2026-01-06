// app/api/send-email/route.ts - UPDATED FOR INDIVIDUAL SENDING
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
    const messageIds: string[] = [];

    if (sendMethod === "campaign") {
      // METHOD 1: Marketing Campaign
      const campaign = await brevo.createEmailCampaign({
        name: `Campaign-${emailHistory.id}`,
        subject,
        sender: senderInfo,
        replyTo: senderInfo,
        htmlContent,
        recipients: { listIds: [contactList.brevoListId] },
      });

      campaignId = campaign.body.id;

      const res = await brevo.sendEmailCampaignNow(campaign.body.id!);
      console.log(res);
      console.log("Campaign sent successfully");

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
      // METHOD 2: Transactional Email (INDIVIDUAL SENDING)
      // Send one email at a time to make it look personal
      
      let successCount = 0;
      let failureCount = 0;
      const errors: Array<{ email: string; error: string }> = [];

      for (const email of contactList.emails) {
        try {
          const result = await brevo.sendTransactionalEmail({
            sender: senderInfo,
            to: [{ email }], // Only ONE recipient per email
            replyTo: senderInfo,
            subject,
            htmlContent,
            tags: [`history-${emailHistory.id}`],
          });

          if (result.body.messageId) {
            messageIds.push(result.body.messageId);
            successCount++;
          }

          // Optional: Add a small delay between sends to avoid rate limiting
          // Uncomment if you experience rate limit issues
          // await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
          
        } catch (error) {
          console.error(`Failed to send to ${email}:`, error);
          failureCount++;
          errors.push({
            email,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      await prisma.emailHistory.update({
        where: { id: emailHistory.id },
        data: {
          campaignId: messageIds[0] ? parseInt(messageIds[0]) : undefined,
          sentCount: successCount,
        },
      });

      return NextResponse.json({
        success: true,
        emailHistoryId: emailHistory.id,
        messageIds,
        recipientCount: contactList.emails.length,
        successCount,
        failureCount,
        method: "transactional",
        individualSends: true,
        errors: errors.length > 0 ? errors : undefined,
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