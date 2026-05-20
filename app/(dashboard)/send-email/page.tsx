import { requireAuth } from "@/app/_lib/auth/session";
import DashboardLayout from "@/app/_components/dashboard-layout";
import { EmailComposer } from "@/app/_components/email-composer";
import prisma from "@/app/_lib/db/prisma";
import { Button } from "@/app/_components/ui/button";
import Link from "next/link";
import {
  Users,
  Plus,
  Globe,
  Send,
  ArrowRight,
  CheckCircle2,
  Circle,
} from "lucide-react";

async function getContactLists(userId: string) {
  return prisma.contactList.findMany({
    where: { createdBy: userId, emails: { isEmpty: false } },
    select: {
      id: true,
      name: true,
      emails: true,
      createdAt: true,
      domain: { select: { id: true, domain: true } },
      _count: { select: { contacts: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

async function getSenders(userId: string) {
  return prisma.sender.findMany({
    where: { userId, domain: { status: "verified" } },
    include: { domain: { select: { id: true, domain: true, status: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export default async function SendEmailPage({
  searchParams,
}: {
  searchParams: { listId?: string };
}) {

  
  const user = await requireAuth();
  const [contactLists, senders] = await Promise.all([
    getContactLists(user.id),
    getSenders(user.id),
  ]);

  const hasNoSetup = contactLists.length === 0 || senders.length === 0;

  const steps = [
    {
      done: senders.length > 0,
      label: "Verified sender",
      desc: "Add a domain and create a sender email address.",
      href: "/domains",
      cta: "Add Domain & Sender",
      icon: Globe,
    },
    {
      done: contactLists.length > 0,
      label: "Contact list",
      desc: "Create a contact list with email addresses to send to.",
      href: "/contact-lists",
      cta: "Create Contact List",
      icon: Users,
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center shadow-md shadow-blue-200">
            <Send className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Send Campaign</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Compose and deliver your email campaign
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/domains">
              <Globe className="mr-1.5 h-3.5 w-3.5" />
              Domains
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/contact-lists">
              <Users className="mr-1.5 h-3.5 w-3.5" />
              Lists
            </Link>
          </Button>
        </div>
      </div>

      {!hasNoSetup ? (
        <EmailComposer
          contactLists={contactLists as any}
          senders={senders as any}
          initialListId={searchParams.listId}
        />
      ) : (
        /* ── Setup Required ─────────────────────────────────────────── */
        <div className="max-w-2xl">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 mb-6 flex items-start gap-3">
            <span className="text-xl mt-0.5">⚠️</span>
            <div>
              <p className="text-sm font-semibold text-amber-900">
                Setup required before sending
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                Complete the steps below to unlock the campaign composer.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {steps.map(({ done, label, desc, href, cta, icon: Icon }, i) => (
              <div
                key={label}
                className="bg-white border border-gray-100 rounded-2xl p-5 flex items-start gap-4 shadow-sm"
              >
                <div
                  className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                    done
                      ? "bg-emerald-100 border border-emerald-200"
                      : "bg-gray-100 border border-gray-200"
                  }`}
                >
                  {done ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Circle className="h-4 w-4 text-gray-400" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Step {i + 1}
                    </span>
                    {done && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                        <CheckCircle2 className="h-2.5 w-2.5" /> Done
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                </div>

                {!done && (
                  <Button size="sm" asChild className="shrink-0">
                    <Link href={href}>
                      <Plus className="mr-1.5 h-3.5 w-3.5" />
                      {cta}
                      <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
