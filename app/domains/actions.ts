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

    const existingDomain = await prisma.domain.findUnique({
      where: { domain: domainName },
    });

    if (existingDomain) {
      return { success: false, error: "Domain already exists in the system" };
    }

    const { data: resendDomain, error } = await resend.domains.create({
      name: domainName,
      region: "us-east-1",
    });

    if (error || !resendDomain) {
      return {
        success: false,
        error: error?.message || "Failed to create domain in Resend",
      };
    }

    const domain = await prisma.domain.create({
      data: {
        domain: domainName,
        status: "pending",
        resendId: resendDomain.id,
        userId: user.id,
      },
    });

    revalidatePath("/");

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
    return { success: false, error: "An unexpected error occurred" };
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
    await resend.domains.verify(domain.resendId);

    const { data, error } = await resend.domains.get(domain.resendId);

    console.log(data);
    
    if (error) {
      return { success: false, error: error.message || "Verification failed" };
    }

    const status = data?.status === "verified" ? "verified" : "pending";

    if (status === "verified") {
      try {
        await resend.domains.update({
          id: domain.resendId,
          openTracking: true,
          clickTracking: true,
        });
      } catch (e) {
        console.error("Failed to enable tracking:", e);
      }
    }

    await prisma.domain.update({
      where: { id: domainId },
      data: { status },
    });

    revalidatePath("/");

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

    const { data: domainData, error } = await resend.domains.get(
      domain.resendId,
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
  username: string,
) {
  try {
    const user = await requireAuth();

    const domain = await prisma.domain.findFirst({
      where: { id: domainId, userId: user.id, status: "verified" },
    });

    if (!domain) {
      return { success: false, error: "Domain not found or not verified" };
    }

    const email = `${username}@${domain.domain}`;

    const existingSender = await prisma.sender.findUnique({ where: { email } });
    if (existingSender) {
      return { success: false, error: "Sender email already exists" };
    }

    const sender = await prisma.sender.create({
      data: { name, email, domainId, userId: user.id },
    });

    revalidatePath("/");

    return {
      success: true,
      sender: { id: sender.id, name: sender.name, email: sender.email },
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
      include: { senders: true },
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
            emailHistory: { select: { id: true } },
          },
        },
        senders: true,
      },
    });

    if (!domain) {
      return { success: false, error: "Domain not found" };
    }

    const emailHistoryIds = domain.contactLists.flatMap((list) =>
      list.emailHistory.map((eh) => eh.id),
    );

    // Delete from Resend
    if (domain.resendId) {
      try {
        await resend.domains.remove(domain.resendId);
        console.log(`Deleted Resend domain: ${domain.resendId}`);
      } catch (error) {
        console.error("Failed to delete Resend domain:", error);
        // Continue with DB deletion regardless
      }
    }

    // Delete in correct order
    await prisma.$transaction(async (tx) => {
      if (emailHistoryIds.length > 0) {
        await tx.emailRecipientEvent.deleteMany({
          where: { emailHistoryId: { in: emailHistoryIds } },
        });
        await tx.emailHistory.deleteMany({
          where: { id: { in: emailHistoryIds } },
        });
      }

      // Contacts cascade from contactList deletion
      await tx.contactList.deleteMany({ where: { domainId } });
      await tx.sender.deleteMany({ where: { domainId } });
      await tx.domain.delete({ where: { id: domainId } });
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
  domainName: string,
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

    const existingSender = await prisma.sender.findFirst({
      where: { email: newEmail, id: { not: senderId } },
    });

    if (existingSender) {
      return { success: false, error: "Email address already in use" };
    }

    const updated = await prisma.sender.update({
      where: { id: senderId },
      data: { name, email: newEmail, updatedAt: new Date() },
    });

    revalidatePath("/");

    return {
      success: true,
      sender: { id: updated.id, name: updated.name, email: updated.email },
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

    await prisma.sender.delete({ where: { id: senderId } });

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Delete sender error:", error);
    return { success: false, error: "Failed to delete sender" };
  }
}
