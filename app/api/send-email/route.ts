// app/api/send-email/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/_lib/auth/session";
import { emailComposeSchema } from "@/app/_lib/validations/email";
import {
  sendBatch,
  generateEmailTemplate,
  replaceVariables,
} from "@/app/_lib/email/resend-client";
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
        { status: 400 },
      );
    }

    const {
      subject,
      body: emailBody,
      contactListId,
      senderId,
      preheader,
    } = validationResult.data;

    // Get contact list
    const contactList = await prisma.contactList.findFirst({
      where: { id: contactListId, createdBy: session.user.id },
    });

    if (!contactList) {
      return NextResponse.json(
        { error: "Contact list not found" },
        { status: 404 },
      );
    }

    // Get sender
    const sender = await prisma.sender.findFirst({
      where: { id: senderId, userId: session.user.id },
      include: { domain: true },
    });

    if (!sender || sender.domain.status !== "verified") {
      return NextResponse.json(
        { error: "Sender not found or domain not verified" },
        { status: 400 },
      );
    }

    // Get sendable contacts — prefer Contact model, fall back to emails[]
    let recipientContacts: {
      email: string;
      firstName?: string | null;
      lastName?: string | null;
      company?: string | null;
    }[] = [];

    const dbContacts = await prisma.contact.findMany({
      where: {
        contactListId,
        isSubscribed: true,
        isBounced: false,
        isComplained: false,
      },
      select: { email: true, firstName: true, lastName: true, company: true },
    });

    if (dbContacts.length > 0) {
      recipientContacts = dbContacts;
    } else {
      // Legacy fallback: use emails[] array from contact list
      recipientContacts = contactList.emails.map((e) => ({ email: e }));
    }

    if (recipientContacts.length === 0) {
      return NextResponse.json(
        {
          error:
            "No sendable contacts in this list (all may be unsubscribed or bounced)",
        },
        { status: 400 },
      );
    }

    // Filter out globally suppressed emails
    const suppressedSet = new Set<string>();
    const suppressions = await prisma.emailSuppression.findMany({
      where: { email: { in: recipientContacts.map((c) => c.email) } },
      select: { email: true },
    });
    suppressions.forEach((s) => suppressedSet.add(s.email));
    recipientContacts = recipientContacts.filter(
      (c) => !suppressedSet.has(c.email),
    );

    if (recipientContacts.length === 0) {
      return NextResponse.json(
        { error: "All contacts in this list are suppressed" },
        { status: 400 },
      );
    }

    // Create EmailHistory record first so we have the ID for tags
    const emailHistory = await prisma.emailHistory.create({
      data: {
        subject,
        body: emailBody,
        preheader: preheader || null,
        contactListId,
        userId: session.user.id,
        senderId: sender.id,
        senderEmail: sender.email,
        senderName: sender.name,
        sendMethod: "batch",
        status: "sending",
        sentCount: 0,
      },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const fromAddress = `${sender.name} <${sender.email}>`;

    // Build batch payload — one email per recipient with personalisation
    const batchPayload = recipientContacts.map((contact) => {
      const variables: Record<string, string> = {
        first_name: contact.firstName || "",
        last_name: contact.lastName || "",
        full_name: [contact.firstName, contact.lastName]
          .filter(Boolean)
          .join(" "),
        email: contact.email,
        company: contact.company || "",
      };

      const personalizedBody = replaceVariables(emailBody, variables);
      const unsubscribeUrl = `${appUrl}/api/unsubscribe?email=${encodeURIComponent(contact.email)}&historyId=${emailHistory.id}`;

      const html = generateEmailTemplate({
        body: personalizedBody,
        subject: replaceVariables(subject, variables),
        senderName: sender.name,
        preheader: replaceVariables(preheader || "", variables),
        unsubscribeUrl,
        variables,
      });

      return {
        from: fromAddress,
        to: contact.email,
        subject: replaceVariables(subject, variables),
        html,
        headers: {
          "List-Unsubscribe": `<${unsubscribeUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
        tags: [
          { name: "email_history_id", value: emailHistory.id },
          { name: "contact_list_id", value: contactListId },
        ],
      };
    });

    // Send in batches of 100
    const { ids, failedCount } = await sendBatch(batchPayload, emailHistory.id);

    const sentCount = recipientContacts.length - failedCount;

    // Update history with results
    await prisma.emailHistory.update({
      where: { id: emailHistory.id },
      data: {
        status: failedCount === recipientContacts.length ? "failed" : "sent",
        sentCount,
        failedCount,
        batchIds: ids,
      },
    });

    return NextResponse.json({
      success: true,
      emailHistoryId: emailHistory.id,
      recipientCount: recipientContacts.length,
      sentCount,
      failedCount,
    });
  } catch (error) {
    console.error("Error sending batch email:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
