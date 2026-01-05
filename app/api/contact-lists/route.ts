// app/api/contact-lists/route.ts - UPDATED FOR BREVO
import { type NextRequest, NextResponse } from "next/server";
import { getSession, requireAuth } from "@/app/_lib/auth/session";
import { contactListSchema } from "@/app/_lib/validations/email";
import prisma from "@/app/_lib/db/prisma";
import { brevo } from "@/app/_lib/email/brevo-client";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = contactListSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { name, emails, domainId } = validationResult.data;

    // Create list in Brevo
    const brevoList = await brevo.createList(name);

    // Create contact list in DB with pending status
    const contactList = await prisma.contactList.create({
      data: {
        name,
        emails,
        domainId,
        createdBy: session.user.id,
        brevoListId: brevoList.body.id,
        status: "pending",
      },
    });

    // Import contacts to Brevo with notify URL
    const notifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/brevo/import/${contactList.id}`;
    console.log(notifyUrl);
    
    const contactsData = emails.map((email) => ({ email }));

    const importResult = await brevo.importContacts(
      contactsData,
      [brevoList.body.id!],
      notifyUrl
    );

    // Update with process ID
    await prisma.contactList.update({
      where: { id: contactList.id },
      data: { processId: importResult.body.processId },
    });

    return NextResponse.json(contactList, { status: 201 });
  } catch (error) {
    console.error("Error creating contact list:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contactLists = await prisma.contactList.findMany({
      where: { createdBy: session.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { emailHistory: true },
        },
      },
    });

    return NextResponse.json(contactLists);
  } catch (error) {
    console.error("Error fetching contact lists:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "Invalid request: ids must be a non-empty array" },
        { status: 400 }
      );
    }

    const contactLists = await prisma.contactList.findMany({
      where: { id: { in: ids } },
      include: {
        domain: true,
        emailHistory: {
          select: { id: true },
        },
      },
    });

    const unauthorizedLists = contactLists.filter(
      (list) => list.createdBy !== user.id
    );
    if (unauthorizedLists.length > 0) {
      return NextResponse.json(
        { error: "Unauthorized: You don't have permission to delete some lists" },
        { status: 403 }
      );
    }

    if (contactLists.length !== ids.length) {
      return NextResponse.json(
        { error: "Some contact lists were not found" },
        { status: 404 }
      );
    }

    const deletionResults = {
      totalLists: contactLists.length,
      successfulDeletes: 0,
      failedDeletes: 0,
      errors: [] as string[],
    };

    // Delete lists from Brevo
    for (const list of contactLists) {
      try {
        if (list.brevoListId) {
          await brevo.deleteList(list.brevoListId);
          console.log(`Deleted Brevo list: ${list.brevoListId}`);
        }
        deletionResults.successfulDeletes++;
      } catch (error) {
        deletionResults.failedDeletes++;
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        deletionResults.errors.push(`List "${list.name}": ${errorMsg}`);
        console.error(`Error processing list "${list.name}":`, error);
      }
    }

    const emailHistoryIds = contactLists.flatMap((list) =>
      list.emailHistory.map((eh) => eh.id)
    );

    if (emailHistoryIds.length > 0) {
      await prisma.emailRecipientEvent.deleteMany({
        where: { emailHistoryId: { in: emailHistoryIds } },
      });
      await prisma.emailHistory.deleteMany({
        where: { id: { in: emailHistoryIds } },
      });
    }

    await prisma.contactList.deleteMany({
      where: {
        id: { in: ids },
        createdBy: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${contactLists.length} contact list(s)`,
      details: deletionResults,
    });
  } catch (error) {
    console.error("Error during bulk delete:", error);
    return NextResponse.json(
      { error: "Failed to delete contact lists" },
      { status: 500 }
    );
  }
}