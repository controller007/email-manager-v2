import { type NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/_lib/auth/session";
import { contactListSchema } from "@/app/_lib/validations/email";
import prisma from "@/app/_lib/db/prisma";
import { resend } from "@/app/_lib/email/resend-client";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

    const { name, emails,domainId } = validationResult.data;

    // 1. Create Audience in Resend
    const audience = await resend.audiences.create({
      name,
    });


    for (const email of emails) {
      try {
        const res = await resend.contacts.create({
          email,
          audienceId: audience.data?.id as string,
        });

        if (res.error) {
          console.error(`Failed to add ${email}:`, res.error);
        } else {
          console.log(`Added ${email} to audience ${audience.data?.id}`);
        }

        // Wait 600ms between requests to stay under 2/sec
        await sleep(600);
      } catch (err) {
        console.error(`Error adding ${email}:`, err);
      }
    }

    const contactList = await prisma.contactList.create({
      data: {
        name,
        emails,
        domainId, 
        createdBy: session.user.id,
        audienceId: audience.data?.id as string,
      },
    });

    return NextResponse.json(contactList, { status: 201 });
  } catch (error) {
    console.error("Error creating contact list:", error);
    return NextResponse.json(
      { error: "Internal server error" },
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
