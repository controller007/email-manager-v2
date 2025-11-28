// app/api/contact-lists/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/app/_lib/auth/session"
import prisma from "@/app/_lib/db/prisma"
import { contactListSchema } from "@/app/_lib/validations/email"

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    const body = await request.json()

    // Validate input
    const validationResult = contactListSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0].message },
        { status: 400 }
      )
    }

    const { name, emails, domainId } = validationResult.data

    // Check if contact list exists and belongs to user
    const existingList = await prisma.contactList.findUnique({
      where: { id: params.id },
    })

    if (!existingList) {
      return NextResponse.json(
        { error: "Contact list not found" },
        { status: 404 }
      )
    }

    if (existingList.createdBy !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      )
    }

    // Check if a list with the same name exists (excluding current list)
    const duplicateName = await prisma.contactList.findFirst({
      where: {
        name,
        createdBy: user.id,
        id: { not: params.id },
      },
    })

    if (duplicateName) {
      return NextResponse.json(
        { error: "A contact list with this name already exists" },
        { status: 400 }
      )
    }

    // If domainId is provided, verify it exists and belongs to user
    if (domainId && domainId !== existingList.domainId) {
      const domain = await prisma.domain.findFirst({
        where: {
          id: domainId,
          userId: user.id,
          status: "verified",
        },
      })

      if (!domain) {
        return NextResponse.json(
          { error: "Invalid or unverified domain" },
          { status: 400 }
        )
      }
    }

    // Update contact list
    const updatedList = await prisma.contactList.update({
      where: { id: params.id },
      data: {
        name,
        emails,
        ...(domainId && { domainId }),
        updatedAt: new Date(),
      },
      include: {
        domain: {
          select: {
            domain: true,
            status: true,
          },
        },
      },
    })

    return NextResponse.json(updatedList)
  } catch (error) {
    console.error("Error updating contact list:", error)
    return NextResponse.json(
      { error: "Failed to update contact list" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()

    // Check if contact list exists and belongs to user
    const existingList = await prisma.contactList.findUnique({
      where: { id: params.id },
    })

    if (!existingList) {
      return NextResponse.json(
        { error: "Contact list not found" },
        { status: 404 }
      )
    }

    if (existingList.createdBy !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      )
    }

    // Delete contact list
    await prisma.contactList.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting contact list:", error)
    return NextResponse.json(
      { error: "Failed to delete contact list" },
      { status: 500 }
    )
  }
}