// app/api/contact-lists/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/app/_lib/auth/session"
import prisma from "@/app/_lib/db/prisma"
import { contactListSchema } from "@/app/_lib/validations/email"
import { resend } from "@/app/_lib/email/resend-client"

// Helper function to delay execution (for rate limiting)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

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
      include: {
        domain: true,
      },
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
    
    // Delete contacts from Resend (with rate limiting)
    if (existingList.audienceId && existingList.emails.length > 0) {
      console.log(`Deleting ${existingList.emails.length} contacts from Resend...`)
      
      const results = {
        success: 0,
        failed: 0,
        errors: [] as string[],
      }
      
      for (let i = 0; i < existingList.emails.length; i++) {
        const email = existingList.emails[i]
        
        try {
          await resend.contacts.remove({
            audienceId: existingList.audienceId,
            email: email,
          })
          
          results.success++
          console.log(`Deleted contact ${i + 1}/${existingList.emails.length}: ${email}`)
          
          // Rate limit: 1 req/sec (wait 1100ms to be safe)
          if (i < existingList.emails.length - 1) {
            await delay(1100)
          }
        } catch (error) {
          results.failed++
          const errorMsg = error instanceof Error ? error.message : "Unknown error"
          results.errors.push(`${email}: ${errorMsg}`)
          console.error(`Failed to delete contact ${email}:`, error)
          
          // Continue with rate limiting even on error
          if (i < existingList.emails.length - 1) {
            await delay(1100)
          }
        }
      }
      
      console.log(`Resend cleanup complete: ${results.success} success, ${results.failed} failed`)
      
      // Log errors if any
      if (results.errors.length > 0) {
        console.error("Resend deletion errors:", results.errors)
      }
    }
    
    // Delete audience from Resend if it exists
    if (existingList.audienceId) {
      try {
        await resend.audiences.remove(existingList.audienceId)
        console.log(`Deleted Resend audience: ${existingList.audienceId}`)
      } catch (error) {
        console.error("Failed to delete Resend audience:", error)
        // Continue with database deletion even if Resend fails
      }
    }
    
    // Delete contact list from database
    await prisma.contactList.delete({
      where: { id: params.id },
    })
  
    return NextResponse.json({ 
      success: true,
      message: "Contact list deleted successfully"
    })
  } catch (error) {
    console.error("Error deleting contact list:", error)
    return NextResponse.json(
      { error: "Failed to delete contact list" },
      { status: 500 }
    )
  }
}