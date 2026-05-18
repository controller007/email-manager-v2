// app/send-email/page.tsx
import { requireAuth } from "@/app/_lib/auth/session";
import DashboardLayout from "@/app/_components/dashboard-layout";
import { EmailComposer } from "@/app/_components/email-composer";
import prisma from "@/app/_lib/db/prisma";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/_components/ui/card";
import { Button } from "@/app/_components/ui/button";
import { Users, Plus, Globe } from "lucide-react";
import Link from "next/link";

async function getContactLists(userId: string) {
  return prisma.contactList.findMany({
    where: {
      createdBy: userId,
      // No longer filtering by status — all new lists are ready
      emails: { isEmpty: false },
    },
    select: {
      id: true,
      name: true,
      emails: true,
      createdAt: true,
      domain: {
        select: { id: true, domain: true },
      },
      _count: {
        select: { contacts: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

async function getSenders(userId: string) {
  return prisma.sender.findMany({
    where: { userId, domain: { status: "verified" } },
    include: {
      domain: { select: { id: true, domain: true, status: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export default async function SendEmailPage() {
  const user = await requireAuth();
  const [contactLists, senders] = await Promise.all([
    getContactLists(user.id),
    getSenders(user.id),
  ]);

  const hasNoSetup = contactLists.length === 0 || senders.length === 0;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Send Email</h1>
            <p className="text-gray-600 mt-1">
              Compose and send email campaigns to your contact lists
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/domains">
                <Globe className="mr-2 h-4 w-4" />
                Manage Domains
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/contact-lists">
                <Users className="mr-2 h-4 w-4" />
                Manage Lists
              </Link>
            </Button>
          </div>
        </div>

        {!hasNoSetup ? (
          <EmailComposer
            contactLists={contactLists as any}
            senders={senders as any}
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Setup Required</CardTitle>
              <CardDescription>
                Complete the following steps before sending emails
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {senders.length === 0 && (
                <div className="border rounded-lg p-6">
                  <div className="flex items-start gap-4">
                    <Globe className="h-8 w-8 text-gray-400 shrink-0" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-2">
                        No Verified Senders
                      </h3>
                      <p className="text-gray-600 text-sm mb-4">
                        Add and verify a domain, then create at least one sender
                        email before sending campaigns.
                      </p>
                      <Button asChild>
                        <Link href="/domains">
                          <Plus className="mr-2 h-4 w-4" />
                          Add Domain & Sender
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {contactLists.length === 0 && (
                <div className="border rounded-lg p-6">
                  <div className="flex items-start gap-4">
                    <Users className="h-8 w-8 text-gray-400 shrink-0" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-2">
                        No Contact Lists
                      </h3>
                      <p className="text-gray-600 text-sm mb-4">
                        Create a contact list with email addresses to send
                        campaigns to.
                      </p>
                      <Button asChild>
                        <Link href="/contact-lists">
                          <Plus className="mr-2 h-4 w-4" />
                          Create Contact List
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
