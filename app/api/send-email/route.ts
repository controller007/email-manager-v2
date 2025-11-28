import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/app/_lib/auth/session"
import { emailComposeSchema } from "@/app/_lib/validations/email"
import { resend, generateEmailTemplate } from "@/app/_lib/email/resend-client"
import prisma from "@/app/_lib/db/prisma"

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validationResult = emailComposeSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0].message },
        { status: 400 }
      )
    }

    const { subject, body: emailBody, contactListId, senderId } = validationResult.data

    // Get contact list
    const contactList = await prisma.contactList.findFirst({
      where: { id: contactListId, createdBy: session.user.id },
    })

    if (!contactList || !contactList.audienceId) {
      return NextResponse.json(
        { error: "Contact list not found or not linked to audience" },
        { status: 404 }
      )
    }

    // Get sender details
    const sender = await prisma.sender.findFirst({
      where: { id: senderId, userId: session.user.id },
      include: { domain: true },
    })

    if (!sender || sender.domain.status !== "verified") {
      return NextResponse.json(
        { error: "Sender not found or domain not verified" },
        { status: 400 }
      )
    }

    // Create email history
    const emailHistory = await prisma.emailHistory.create({
      data: {
        subject,
        body: emailBody,
        contactListId,
        userId: session.user.id,
      },
    })

    const htmlContent = generateEmailTemplate(emailBody, subject)
    const fromEmail = `${sender.name.replaceAll(" ","")} <${sender.email}>`
    

    // Create and send broadcast with tracking enabled
    const broadcast = await resend.broadcasts.create({
      name: `Broadcast-${emailHistory.id}`,
      audienceId: contactList.audienceId,
      from: fromEmail,
      subject,
      html: htmlContent,
      // Enable tracking
    
    })

    await resend.broadcasts.send(broadcast.data?.id as string)

    // Update email history
    await prisma.emailHistory.update({
      where: { id: emailHistory.id },
      data: {
        broadcastId: broadcast.data?.id as string,
        sentCount: contactList.emails.length,
      },
    })

    return NextResponse.json({
      success: true,
      emailHistoryId: emailHistory.id,
      broadcastId: broadcast.data?.id as string,
      recipientCount: contactList.emails.length,
    })
  } catch (error) {
    console.error("Error sending broadcast:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}