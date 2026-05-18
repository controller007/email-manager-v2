// app/api/templates/route.ts — UPDATED
// Only change: accepts and stores the designJson field from the visual builder.
// All existing GET/POST logic is preserved exactly.

import { type NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/_lib/auth/session";
import prisma from "@/app/_lib/db/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const templates = await prisma.emailTemplate.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error("Error fetching templates:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    // designJson is new — optional, sent by visual builder
    const {
      name,
      description,
      subject,
      body: templateBody,
      category,
      designJson,
    } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Template name is required" },
        { status: 400 },
      );
    }
    if (!templateBody?.trim()) {
      return NextResponse.json(
        { error: "Template body is required" },
        { status: 400 },
      );
    }

    const template = await prisma.emailTemplate.create({
      data: {
        name: name.trim(),
        description: description?.trim() || undefined,
        subject: subject?.trim() || undefined,
        body: templateBody,
        // Store visual builder block state — null for plain text templates
        ...(designJson ? { designJson } : {}),
        category: category || "custom",
        isBuiltIn: false,
        userId: session.user.id,
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error("Error creating template:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
