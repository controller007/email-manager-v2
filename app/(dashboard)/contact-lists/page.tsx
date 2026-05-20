import { requireAuth } from "@/app/_lib/auth/session";
import DashboardLayout from "@/app/_components/dashboard-layout";
import { ContactListsGrid } from "@/app/_components/contact-lists-grid";
import { CreateContactListDialog } from "@/app/_components/create-contact-list-dialog";
import { Button } from "@/app/_components/ui/button";
import prisma from "@/app/_lib/db/prisma";
import { Users, Plus, Globe, Send, AlertCircle } from "lucide-react";
import Link from "next/link";

async function getContactLists(userId: string) {
  return prisma.contactList.findMany({
    where: { createdBy: userId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { emailHistory: true, contacts: true } },
      domain: { include: { senders: true } },
    },
  });
}

async function getVerifiedDomains(userId: string) {
  return prisma.domain.findMany({
    where: { userId, status: "verified" },
    include: { senders: true },
    orderBy: { createdAt: "desc" },
  });
}

export default async function ContactListsPage() {
  const user = await requireAuth();
  const [contactLists, verifiedDomains] = await Promise.all([
    getContactLists(user.id),
    getVerifiedDomains(user.id),
  ]);

  const totalContacts = contactLists.reduce(
    (sum, l) => sum + (l._count?.contacts ?? l.emails.length),
    0,
  );
  const totalCampaigns = contactLists.reduce(
    (sum, l) => sum + (l._count?.emailHistory ?? 0),
    0,
  );
  const avgListSize =
    contactLists.length > 0
      ? Math.round(totalContacts / contactLists.length)
      : 0;

  return (
      <div className="space-y-6">
        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 flex items-center justify-center shadow-md shadow-indigo-200">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Contact Lists
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Manage your subscriber lists and target audiences
              </p>
            </div>
          </div>
          <CreateContactListDialog verifiedDomains={verifiedDomains}>
            <Button size="sm" disabled={verifiedDomains.length === 0}>
              <Plus className="mr-1.5 h-4 w-4" />
              Create List
            </Button>
          </CreateContactListDialog>
        </div>

        {/* ── No domain warning ─────────────────────────────────────────── */}
        {verifiedDomains.length === 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-3">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-900">
                No verified domains
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                You need a verified domain before creating contact lists.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              asChild
              className="border-amber-300 text-amber-800 hover:bg-amber-100 shrink-0"
            >
              <Link href="/domains">
                <Globe className="mr-1.5 h-3.5 w-3.5" />
                Set Up Domain
              </Link>
            </Button>
          </div>
        )}

        {/* ── Stats row ─────────────────────────────────────────────────── */}
        {contactLists.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: "Total Lists",
                value: contactLists.length,
                icon: Users,
                color: "text-indigo-600",
                bg: "bg-indigo-50",
                border: "border-indigo-100",
              },
              {
                label: "Total Contacts",
                value: totalContacts.toLocaleString(),
                icon: Users,
                color: "text-blue-600",
                bg: "bg-blue-50",
                border: "border-blue-100",
              },
              {
                label: "Avg. List Size",
                value: avgListSize.toLocaleString(),
                icon: Users,
                color: "text-purple-600",
                bg: "bg-purple-50",
                border: "border-purple-100",
              },
              {
                label: "Total Campaigns",
                value: totalCampaigns.toLocaleString(),
                icon: Send,
                color: "text-emerald-600",
                bg: "bg-emerald-50",
                border: "border-emerald-100",
              },
            ].map(({ label, value, icon: Icon, color, bg, border }) => (
              <div
                key={label}
                className={`${bg} ${border} border rounded-2xl p-4 flex items-center gap-3`}
              >
                <div className={`p-2.5 ${bg} rounded-xl border ${border}`}>
                  <Icon className={`h-4 w-4 ${color}`} />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">{label}</p>
                  <p className="text-xl font-bold text-gray-900">{value}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Grid ──────────────────────────────────────────────────────── */}
        {contactLists.length === 0 && verifiedDomains.length > 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white border border-gray-100 rounded-2xl shadow-sm text-center">
            <div className="h-14 w-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-4">
              <Users className="h-6 w-6 text-indigo-500" />
            </div>
            <h3 className="text-base font-semibold text-gray-900">
              No contact lists yet
            </h3>
            <p className="text-sm text-gray-500 mt-1 max-w-xs">
              Create your first list to start sending targeted campaigns.
            </p>
            <div className="mt-5">
              <CreateContactListDialog verifiedDomains={verifiedDomains}>
                <Button size="sm">
                  <Plus className="mr-1.5 h-4 w-4" />
                  Create Your First List
                </Button>
              </CreateContactListDialog>
            </div>
          </div>
        ) : (
          <ContactListsGrid
            domains={verifiedDomains}
            contactLists={contactLists as any}
          />
        )}
      </div>
  );
}
