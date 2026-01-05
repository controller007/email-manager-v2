// app/domains/actions.ts - UPDATED FOR BREVO
"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/app/_lib/auth/session";
import prisma from "@/app/_lib/db/prisma";
import { brevo } from "@/app/_lib/email/brevo-client";
import type { BrevoDomainDnsRecord } from "@/types/brevo";

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

    const brevoDomain = await brevo.createDomain(domainName);

    const domainConfig = await brevo.getDomainConfiguration(domainName);

    const domain = await prisma.domain.create({
      data: {
        domain: domainName,
        status: "pending",
        brevoId: domainName,
        userId: user.id,
      },
    });

    console.log(domainConfig);

    const records: DomainDnsRecords[] = Object.values(domainConfig.dns_records)
      .filter(Boolean)
      .map((record: any) => ({
        record: record.type,
        name: record.host_name,
        value: record.value,
        type: record.type,
        priority: record.priority ?? null,
        status: record.status,
      }));

    revalidatePath("/domains");

    return {
      success: true,
      domain: {
        id: domain.id,
        domain: domain.domain,
        status: domain.status,
        records,
      },
    };
  } catch (error) {
    console.error("Create domain error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

export async function verifyDomain(domainId: string) {
  try {
    const user = await requireAuth();

    const domain = await prisma.domain.findFirst({
      where: { id: domainId, userId: user.id },
    });

    if (!domain || !domain.brevoId) {
      return { success: false, error: "Domain not found" };
    }

    await brevo.authenticateDomain(domain.brevoId);

    const domainConfig = await brevo.getDomainConfiguration(domain.brevoId);

    const status = domainConfig.authenticated ? "verified" : "pending";

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
    return {
      success: false,
      error: error instanceof Error ? error.message : "Verification failed",
    };
  }
}

export async function getDomainRecords(domainId: string) {
  try {
    const user = await requireAuth();

    const domain = await prisma.domain.findFirst({
      where: { id: domainId, userId: user.id },
    });

    if (!domain || !domain.brevoId) {
      return { success: false, error: "Domain not found" };
    }

    const domainData = await brevo.getDomainConfiguration(domain.brevoId);

  const records: DomainDnsRecords[] = Object.values(domainData.dns_records)
      .filter(Boolean)
      .map((record: any) => ({
        record: record.type,
        name: record.host_name,
        value: record.value,
        type: record.type,
        priority: record.priority ?? null,
        status: record.status,
      }));


    return {
      success: true,
      records,
      status: domainData.authenticated ? "verified" : "pending",
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
      return { success: false, error: "Domain not found or not verified" };
    }

    const email = `${username}@${domain.domain}`;

    const existingSender = await prisma.sender.findUnique({
      where: { email },
    });

    if (existingSender) {
      return { success: false, error: "Sender email already exists" };
    }

    const brevoSender = await brevo.createSender({ name, email });

    const sender = await prisma.sender.create({
      data: {
        name,
        email,
        brevoId: brevoSender.body.id,
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
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create sender",
    };
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
              select: { id: true },
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

    // Delete contact lists from Brevo
    for (const list of domain.contactLists) {
      if (list.brevoListId) {
        try {
          await brevo.deleteList(list.brevoListId);
          console.log(`Deleted Brevo list: ${list.brevoListId}`);
        } catch (error) {
          console.error(
            `Failed to delete Brevo list ${list.brevoListId}:`,
            error
          );
        }
      }
    }

    // Delete senders from Brevo
    for (const sender of domain.senders) {
      if (sender.brevoId) {
        try {
          await brevo.deleteSender(sender.brevoId);
          console.log(`Deleted Brevo sender: ${sender.brevoId}`);
        } catch (error) {
          console.error(
            `Failed to delete Brevo sender ${sender.brevoId}:`,
            error
          );
        }
      }
    }

    // Delete domain from Brevo
    if (domain.brevoId) {
      try {
        await brevo.deleteDomain(domain.brevoId);
        console.log(`Deleted Brevo domain: ${domain.brevoId}`);
      } catch (error) {
        console.error("Failed to delete Brevo domain:", error);
      }
    }

    // Delete from database
    if (emailHistoryIds.length > 0) {
      await prisma.emailRecipientEvent.deleteMany({
        where: { emailHistoryId: { in: emailHistoryIds } },
      });
      await prisma.emailHistory.deleteMany({
        where: { id: { in: emailHistoryIds } },
      });
    }

    await prisma.contactList.deleteMany({
      where: { domainId: domainId },
    });

    await prisma.sender.deleteMany({
      where: { domainId: domainId },
    });

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

    const existingSender = await prisma.sender.findFirst({
      where: {
        email: newEmail,
        id: { not: senderId },
      },
    });

    if (existingSender) {
      return { success: false, error: "This email is already in use" };
    }

    if (sender.brevoId) {
      await brevo.updateSender(sender.brevoId, { name, email: newEmail });
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
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update sender",
    };
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

    if (sender.brevoId) {
      try {
        await brevo.deleteSender(sender.brevoId);
      } catch (error) {
        console.error("Failed to delete Brevo sender:", error);
      }
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

// "use server";

// import prisma from "@/app/_lib/db/prisma"; // Adjust import path as needed
// import {
//   unifiedFormSchema,
//   UnifiedFormData,
//   determineTicketType,
// } from "@/app/_lib/schemas/ticket"; // Adjust import path
// import { quoteFormSchema, QuoteFormData } from "@/app/_lib/schemas/quote"; // Adjust import path
// import { revalidatePath } from "next/cache";
// import { FlightType, PassengerType, TicketType } from "@prisma/client";
// import { getServerSession } from "next-auth";
// import { authOptions } from "@/app/_lib/auth/next-auth-options";

// // Server action for submitting ticket
// export async function submitTicket(data: UnifiedFormData) {
//   try {

//     const session = await getServerSession(authOptions);

//     if (!session || !session.user || !session.user.id) {
//       throw new Error("User session not found or invalid.");
//     }
//     const userId = session.user.id;

//     // 1. Validate the data
//     const validatedData = unifiedFormSchema.parse(data);

//     // 2. Determine the high-level ticket type

//     // 3. Prepare Nested Flight and Layover Data
//     const flightCreateData = validatedData.flights.map((flight) => {
//       // Prepare the data for the main TicketFlight record
//       const flightBaseData = {
//         etid: flight.etid,
//         airlineId: flight.airline,
//         fromId: flight.from,
//         toId: flight.to,
//         class: flight.class,
//         pnr: flight.pnr,
//         std: flight.std,
//         sta: flight.sta,
//         iataCode: flight.iataCode,
//         luggageAmount: flight.luggageAmount,
//         luggageWeight: flight.luggageWeight,
//         hasLayover: flight.hasLayover || false,
//       };

//       // Prepare nested Layover data if any
//       const layoversConnectData =
//         flight.layovers && flight.layovers.length > 0
//           ? {
//               create: flight.layovers.map((layover) => ({
//                 airline: layover.airline,
//                 fromId: layover.from,
//                 toId: layover.to,
//                 class: layover.class,
//                 iataCode:layover.iataCode,
//                 std: layover.std,
//                 sta: layover.sta,
//               })),
//             }
//           : undefined;

//       return {
//         ...flightBaseData,
//         ...(layoversConnectData && { layovers: layoversConnectData }),
//       };
//     });

//     const passengerCreateData =
//       validatedData.passengerType === "multiple" && validatedData.passengers
//         ? validatedData.passengers.map((passenger) => ({
//             title: passenger.title,
//             firstName: passenger.firstName,
//             lastName: passenger.lastName,
//             ageGroup: passenger.ageGroup,
//           }))
//         : [];

//     const ticket = await prisma.ticket.create({
//       data: {
//         // Main Ticket Data
//         ticketType: validatedData.selectTicket as TicketType ,
//         passengerType:
//           validatedData.passengerType === "single"
//             ? ("SINGLE" as PassengerType)
//             : ("MULTIPLE" as PassengerType),
//         flightType:
//           validatedData.flightType === "local"
//             ? ("LOCAL" as FlightType)
//             : ("INTERNATIONAL" as FlightType),

//         title: validatedData.title,
//         firstName: validatedData.firstName,
//         lastName: validatedData.lastName,
//         ageGroup: validatedData.ageGroup,

//         referredById: validatedData.referredById,
//         userId: userId,

//         flights: {
//           create: flightCreateData,
//         },

//         ...(passengerCreateData.length > 0 && {
//           passengers: {
//             create: passengerCreateData,
//           },
//         }),

//         receipt: {
//           create: {
//             receiptFullName: validatedData.receiptFullName,
//             amountPaid: validatedData.amountPaid,
//             payMethod: validatedData.payMethod,
//             paidOn: validatedData.paidOn,
//             returnTicketRef: validatedData.returnTicketRef,
//             airline2: validatedData.airline2,
//             referenceCode: validatedData.referenceCode,
//             // ticketId is automatically set by the nested create
//           },
//         },
//       },
//       // Optionally select the ID back
//       select: {
//         id: true,
//       },
//     });

//     console.log("hmmer na him o");

//     return { success: true, ticketId: ticket.id };
//   } catch (error) {
//     console.error("Error submitting ticket:", error);
//     return { success: false, error: "Failed to submit ticket" };
//   }
// }
// // Server action for submitting quote
// export async function submitQuote(data: QuoteFormData) {
//   try {
//     const session = await getServerSession(authOptions);
//     const validatedData = quoteFormSchema.parse(data);
//     const quote = await prisma.quote.create({
//       data: {
//         fullName: validatedData.fullName,
//         userId: session?.user.id as string,
//       },
//     });

//     // Create depart flights
//     for (const flight of validatedData.departFlights) {
//       await prisma.quoteFlight.create({
//         data: {
//           date: flight.date,
//           airlineId: flight.airline,
//           fromId: flight.from,
//           toId: flight.to,
//           timeFrom: flight.timeFrom,
//           timeTo: flight.timeTo,
//           price: flight.price,
//           flightType: "depart",
//           quoteDepartingId: quote.id,
//         },
//       });
//     }

//     // Create return flights
//     for (const flight of validatedData.returnFlights) {
//       await prisma.quoteFlight.create({
//         data: {
//           date: flight.date,
//           airlineId: flight.airline,
//           fromId: flight.from,
//           toId: flight.to,
//           timeFrom: flight.timeFrom,
//           timeTo: flight.timeTo,
//           price: flight.price,
//           flightType: "return",
//           quoteReturningId: quote.id,
//         },
//       });
//     }

//     revalidatePath("/quotes"); // Adjust path as needed
//     return { success: true, quoteId: quote.id };
//   } catch (error) {
//     console.error("Error submitting quote:", error);
//     return { success: false, error: "Failed to submit quote" };
//   }
// }

// export async function generateReferenceCode(flights: any[], flightType: string): Promise<string> {
//   const hasInternational =flightType === "international" ;

//   const prefix = hasInternational ? "NTTLBI" : "NTTLBL";

//   const yearSuffix = new Date().getFullYear().toString().slice(-2);

//   const lastReceipt = await prisma.receipt.findFirst({
//     where: { referenceCode: { not: null } },
//     orderBy: { createdAt: "desc" },
//     select: { referenceCode: true },
//   });

//   let nextNumber = 1;

//   if (lastReceipt?.referenceCode) {
//     const match = lastReceipt.referenceCode.match(/(\d{3})$/);

//     if (match) {
//       const extracted = parseInt(match[1], 10);
//       if (!isNaN(extracted)) nextNumber = extracted + 1;
//     }
//   }

//   const padded = String(nextNumber).padStart(3, "0");

//   return `${prefix}${yearSuffix}${padded}`;
// }
