"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/app/_lib/auth/session";
import prisma from "@/app/_lib/db/prisma";
import { resend } from "@/app/_lib/email/resend-client";

interface DomainDnsRecords {
  record: string;
  name: string;
  value: string;
  type: string;
  priority?: number;
}

export async function createDomain(domainName: string) {
  try {
    const user = await requireAuth();

    // Check if domain already exists
    const existingDomain = await prisma.domain.findUnique({
      where: { domain: domainName },
    });

    if (existingDomain) {
      return {
        success: false,
        error: "Domain already exists in the system",
      };
    }

    // Create domain in Resend with tracking enabled
    const { data: resendDomain, error } = await resend.domains.create({
      name: domainName,
      region: "us-east-1", // or eu-west-1, sa-east-1
    });

    if (error || !resendDomain) {
      return {
        success: false,
        error: error?.message || "Failed to create domain in Resend",
      };
    }

    // await resend.webhooks.create({
    //   endpoint: webhookUrl,
    //   events: [
    //     "email.sent",
    //     "email.delivered",
    //     "email.delivery_delayed",
    //     "email.complained",
    //     "email.bounced",
    //     "email.opened",
    //     "email.clicked",
    //   ],
    // })

    // Save domain to database
    const domain = await prisma.domain.create({
      data: {
        domain: domainName,
        status: "pending",
        resendId: resendDomain.id,
        userId: user.id,
      },
    });

    revalidatePath("/domains");

    return {
      success: true,
      domain: {
        id: domain.id,
        domain: domain.domain,
        status: domain.status,
        records: resendDomain.records as DomainDnsRecords[],
      },
    };
  } catch (error) {
    console.error("Create domain error:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

export async function verifyDomain(domainId: string) {
  try {
    const user = await requireAuth();

    const domain = await prisma.domain.findFirst({
      where: { id: domainId, userId: user.id },
    });

    if (!domain || !domain.resendId) {
      return { success: false, error: "Domain not found" };
    }

    const { data: Verification } = await resend.domains.verify(domain.resendId);


    
    const { data, error } = await resend.domains.get(domain.resendId);


    if (error) {
      return {
        success: false,
        error: error.message || "Verification failed",
      };
    }

    // Update domain
    const status = data?.status === "verified" ? "verified" : "pending";

    if (status == "verified") {
      await resend.domains.update({
        id: domain.resendId,
        openTracking: true,
        clickTracking: true,
      });
    }
    await prisma.domain.update({
      where: { id: domainId },
      data: { status },
    });

    revalidatePath("/domains");

    return {
      success: true,
      status,
      message:
        status === "verified"
          ? "Domain verified successfully!"
          : "Domain not yet verified. Please check DNS records.",
    };
  } catch (error) {
    console.error("Verify domain error:", error);
    return { success: false, error: "Verification failed" };
  }
}

export async function getDomainRecords(domainId: string) {
  try {
    const user = await requireAuth();

    const domain = await prisma.domain.findFirst({
      where: { id: domainId, userId: user.id },
    });

    if (!domain || !domain.resendId) {
      return { success: false, error: "Domain not found" };
    }

    // Get domain details from Resend
    const { data: domainData, error } = await resend.domains.get(
      domain.resendId
    );

    if (error || !domainData) {
      return { success: false, error: "Failed to fetch domain records" };
    }

    return {
      success: true,
      records: domainData.records as DomainDnsRecords[],
      status: domainData.status,
    };
  } catch (error) {
    console.error("Get domain records error:", error);
    return { success: false, error: "Failed to fetch records" };
  }
}

export async function createSender(
  domainId: string,
  name: string,
  username: string
) {
  try {
    const user = await requireAuth();

    const domain = await prisma.domain.findFirst({
      where: { id: domainId, userId: user.id, status: "verified" },
    });

    if (!domain) {
      return {
        success: false,
        error: "Domain not found or not verified",
      };
    }

    const email = `${username}@${domain.domain}`;

    // Check if sender already exists
    const existingSender = await prisma.sender.findUnique({
      where: { email },
    });

    if (existingSender) {
      return { success: false, error: "Sender email already exists" };
    }

    const sender = await prisma.sender.create({
      data: {
        name,
        email,
        domainId,
        userId: user.id,
      },
    });

    revalidatePath("/domains");

    return {
      success: true,
      sender: {
        id: sender.id,
        name: sender.name,
        email: sender.email,
      },
    };
  } catch (error) {
    console.error("Create sender error:", error);
    return { success: false, error: "Failed to create sender" };
  }
}

export async function getAllDomains() {
  try {
    const user = await requireAuth();

    const domains = await prisma.domain.findMany({
      where: { userId: user.id },
      include: {
        senders: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, domains };
  } catch (error) {
    console.error("Get domains error:", error);
    return { success: false, error: "Failed to fetch domains", domains: [] };
  }
}



export async function deleteDomain(domainId: string) {
  try {
    const user = await requireAuth();

    const domain = await prisma.domain.findFirst({
      where: { id: domainId, userId: user.id },
      include: {
        contactLists: {
          include: {
            emailHistory: {
              select: {
                id: true,
              },
            },
          },
        },
        senders: true,
      },
    });
    

    if (!domain) {
      return { success: false, error: "Domain not found" };
    }

    const emailHistoryIds = domain.contactLists.flatMap((list) =>
      list.emailHistory.map((eh) => eh.id)
    );

    for (const list of domain.contactLists) {
      if (list.audienceId) {
        try {
          await resend.contacts.remove({audienceId:list.audienceId});
          await resend.audiences.remove(list.audienceId);
          console.log(`Deleted Resend audience: ${list.audienceId}`);
        } catch (error) {
          console.error(
            `Failed to delete Resend audience ${list.audienceId}:`,
            error
          );
        }
      }
    }

    if (domain.resendId) {
      try {
        await resend.domains.remove(domain.resendId);
        console.log(`Deleted Resend domain: ${domain.resendId}`);
      } catch (error) {
        console.error("Failed to delete Resend domain:", error);
        // Continue with database deletion even if Resend fails
      }
    }

    // 1. Delete EmailRecipientEvent records first
    if (emailHistoryIds.length > 0) {
      await prisma.emailRecipientEvent.deleteMany({
        where: {
          emailHistoryId: { in: emailHistoryIds },
        },
      });
      console.log(
        `Deleted EmailRecipientEvent records for ${emailHistoryIds.length} email histories`
      );
    }

    if (emailHistoryIds.length > 0) {
      await prisma.emailHistory.deleteMany({
        where: {
          id: { in: emailHistoryIds },
        },
      });
      console.log(`Deleted ${emailHistoryIds.length} EmailHistory records`);
    }

    await prisma.contactList.deleteMany({
      where: {
        domainId: domainId,
      },
    });
    console.log(`Deleted ${domain.contactLists.length} contact lists`);

    // 4. Delete Senders
    await prisma.sender.deleteMany({
      where: {
        domainId: domainId,
      },
    });
    console.log(`Deleted ${domain.senders.length} senders`);

    await prisma.domain.delete({
      where: { id: domainId },
    });

    revalidatePath("/");
    return { success: true, message: "Domain deleted successfully" };
  } catch (error) {
    console.error("Delete domain error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete domain",
    };
  }
}

export async function updateSender(
  senderId: string,
  name: string,
  username: string,
  domainName: string
) {
  try {
    const user = await requireAuth();

    const sender = await prisma.sender.findFirst({
      where: { id: senderId, userId: user.id },
    });

    if (!sender) {
      return { success: false, error: "Sender not found" };
    }

    const newEmail = `${username}@${domainName}`;

    // Check if new email already exists (excluding current sender)
    const existingSender = await prisma.sender.findFirst({
      where: {
        email: newEmail,
        id: { not: senderId },
      },
    });

    if (existingSender) {
      return { success: false, error: "This email is already in use" };
    }

    const updatedSender = await prisma.sender.update({
      where: { id: senderId },
      data: {
        name: name.trim(),
        email: newEmail,
      },
    });

    revalidatePath("/domains");

    return {
      success: true,
      sender: {
        id: updatedSender.id,
        name: updatedSender.name,
        email: updatedSender.email,
      },
    };
  } catch (error) {
    console.error("Update sender error:", error);
    return { success: false, error: "Failed to update sender" };
  }
}

export async function deleteSender(senderId: string) {
  try {
    const user = await requireAuth();

    const sender = await prisma.sender.findFirst({
      where: { id: senderId, userId: user.id },
    });

    if (!sender) {
      return { success: false, error: "Sender not found" };
    }

    await prisma.sender.delete({
      where: { id: senderId },
    });

    revalidatePath("/domains");

    return { success: true, message: "Sender deleted successfully" };
  } catch (error) {
    console.error("Delete sender error:", error);
    return { success: false, error: "Failed to delete sender" };
  }
}
