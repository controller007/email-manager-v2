import { type NextRequest, NextResponse } from "next/server";
import { getSession, requireAuth } from "@/app/_lib/auth/session";
import { contactListSchema } from "@/app/_lib/validations/email";
import prisma from "@/app/_lib/db/prisma";
import { resend } from "@/app/_lib/email/resend-client";
import { revalidatePath } from "next/cache";

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




const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    
    const { ids } = body
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "Invalid request: ids must be a non-empty array" },
        { status: 400 }
      )
    }
    
    // Fetch all contact lists to verify ownership and get Resend info
    const contactLists = await prisma.contactList.findMany({
      where: {
        id: { in: ids },
      },
      include: {
        domain: true,
        emailHistory: {
          select: {
            id: true,
          },
        },
      },
    })
    
    // Verify all lists belong to the user
    const unauthorizedLists = contactLists.filter(list => list.createdBy !== user.id)
    if (unauthorizedLists.length > 0) {
      return NextResponse.json(
        { error: "Unauthorized: You don't have permission to delete some of these lists" },
        { status: 403 }
      )
    }
    
    if (contactLists.length !== ids.length) {
      return NextResponse.json(
        { error: "Some contact lists were not found" },
        { status: 404 }
      )
    }
    
    // Track deletion results
    const deletionResults = {
      totalLists: contactLists.length,
      successfulDeletes: 0,
      failedDeletes: 0,
      errors: [] as string[],
    }
    
    // Delete contacts and audiences from Resend for each list
    for (const list of contactLists) {
      try {
        // Delete contacts from Resend (with rate limiting)
        if (list.audienceId && list.emails.length > 0) {
          console.log(`Deleting ${list.emails.length} contacts from list "${list.name}"...`)
          
          for (let i = 0; i < list.emails.length; i++) {
            const email = list.emails[i]
            
            try {
              await resend.contacts.remove({
                audienceId: list.audienceId,
                email: email,
              })
              
              console.log(`Deleted contact ${i + 1}/${list.emails.length}: ${email}`)
              
              // Rate limit: 1 req/sec (wait 1100ms to be safe)
              if (i < list.emails.length - 1) {
                await delay(1100)
              }
            } catch (error) {
              const errorMsg = error instanceof Error ? error.message : "Unknown error"
              console.error(`Failed to delete contact ${email}:`, error)
              // Continue with other contacts even if one fails
              if (i < list.emails.length - 1) {
                await delay(1100)
              }
            }
          }
        }
        
        // Delete audience from Resend if it exists
        if (list.audienceId) {
          try {
            await resend.audiences.remove(list.audienceId)
            console.log(`Deleted Resend audience: ${list.audienceId}`)
          } catch (error) {
            console.error(`Failed to delete Resend audience for list "${list.name}":`, error)
            // Continue with database deletion even if Resend fails
          }
        }
        
        deletionResults.successfulDeletes++
      } catch (error) {
        deletionResults.failedDeletes++
        const errorMsg = error instanceof Error ? error.message : "Unknown error"
        deletionResults.errors.push(`List "${list.name}": ${errorMsg}`)
        console.error(`Error processing list "${list.name}":`, error)
      }
    }
    
    // Get all email history IDs for these contact lists
    const emailHistoryIds = contactLists.flatMap(list => 
      list.emailHistory.map(eh => eh.id)
    )
    
    // Delete in the correct order to respect foreign key constraints
    
    // 1. Delete EmailRecipientEvent records first
    if (emailHistoryIds.length > 0) {
      await prisma.emailRecipientEvent.deleteMany({
        where: {
          emailHistoryId: { in: emailHistoryIds },
        },
      })
      console.log(`Deleted EmailRecipientEvent records for ${emailHistoryIds.length} email histories`)
    }
    
    // 2. Delete EmailHistory records
    if (emailHistoryIds.length > 0) {
      await prisma.emailHistory.deleteMany({
        where: {
          id: { in: emailHistoryIds },
        },
      })
      console.log(`Deleted ${emailHistoryIds.length} EmailHistory records`)
    }
    
    // 3. Finally, delete all contact lists from database
    await prisma.contactList.deleteMany({
      where: {
        id: { in: ids },
        createdBy: user.id,
      },
    })
    
    console.log(`Bulk delete complete: ${deletionResults.successfulDeletes} successful, ${deletionResults.failedDeletes} failed`)
    
    revalidatePath("/")
    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${contactLists.length} contact list(s)`,
      details: deletionResults,
    })
  } catch (error) {
    console.error("Error during bulk delete:", error)
    return NextResponse.json(
      { error: "Failed to delete contact lists" },
      { status: 500 }
    )
  }
}