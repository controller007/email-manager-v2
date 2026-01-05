// app/api/contact-lists/[id]/route.ts - UPDATED FOR BREVO
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/_lib/auth/session";
import prisma from "@/app/_lib/db/prisma";
import { contactListSchema } from "@/app/_lib/validations/email";
import { brevo } from "@/app/_lib/email/brevo-client";
import { revalidatePath } from "next/cache";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    const validationResult = contactListSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { name, emails, domainId } = validationResult.data;

    const existingList = await prisma.contactList.findUnique({
      where: { id: params.id },
    });

    if (!existingList) {
      return NextResponse.json(
        { error: "Contact list not found" },
        { status: 404 }
      );
    }

    if (existingList.createdBy !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const duplicateName = await prisma.contactList.findFirst({
      where: {
        name,
        createdBy: user.id,
        id: { not: params.id },
      },
    });

    if (duplicateName) {
      return NextResponse.json(
        { error: "A contact list with this name already exists" },
        { status: 400 }
      );
    }

    if (domainId && domainId !== existingList.domainId) {
      const domain = await prisma.domain.findFirst({
        where: {
          id: domainId,
          userId: user.id,
          status: "verified",
        },
      });

      if (!domain) {
        return NextResponse.json(
          { error: "Invalid or unverified domain" },
          { status: 400 }
        );
      }
    }

    // Re-import contacts if emails changed
    if (JSON.stringify(emails.sort()) !== JSON.stringify(existingList.emails.sort())) {
      if (existingList.brevoListId) {
        const notifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/brevo/import/${existingList.id}`;
        const contactsData = emails.map((email) => ({ email }));

        const importResult = await brevo.importContacts(
          contactsData,
          [existingList.brevoListId],
          notifyUrl
        );

        await prisma.contactList.update({
          where: { id: params.id },
          data: {
            name,
            emails,
            ...(domainId && { domainId }),
            status: "pending",
            processId: importResult.body.processId,
            updatedAt: new Date(),
          },
        });
      }
    } else {
      await prisma.contactList.update({
        where: { id: params.id },
        data: {
          name,
          emails,
          ...(domainId && { domainId }),
          updatedAt: new Date(),
        },
      });
    }

    const updatedList = await prisma.contactList.findUnique({
      where: { id: params.id },
      include: {
        domain: {
          select: {
            domain: true,
            status: true,
          },
        },
      },
    });

    return NextResponse.json(updatedList);
  } catch (error) {
    console.error("Error updating contact list:", error);
    return NextResponse.json(
      { error: "Failed to update contact list" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();

    const existingList = await prisma.contactList.findUnique({
      where: { id: params.id },
      include: { domain: true },
    });

    if (!existingList) {
      return NextResponse.json(
        { error: "Contact list not found" },
        { status: 404 }
      );
    }

    if (existingList.createdBy !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (existingList.brevoListId) {
      try {
        await brevo.deleteList(existingList.brevoListId);
        console.log(`Deleted Brevo list: ${existingList.brevoListId}`);
      } catch (error) {
        console.error("Failed to delete Brevo list:", error);
      }
    }

    await prisma.contactList.delete({
      where: { id: params.id },
    });

    revalidatePath("/");

    return NextResponse.json({
      success: true,
      message: "Contact list deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting contact list:", error);
    return NextResponse.json(
      { error: "Failed to delete contact list" },
      { status: 500 }
    );
  }
}