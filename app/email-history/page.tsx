// app/email-history/page.tsx
import { requireAuth } from "@/app/_lib/auth/session";
import DashboardLayout from "@/app/_components/dashboard-layout";
import { EmailHistoryFilters } from "@/app/_components/email-history-filters";
import { Button } from "@/app/_components/ui/button";
import prisma from "@/app/_lib/db/prisma";
import { Send } from "lucide-react";
import Link from "next/link";
import { EmailHistoryList } from "../_components/email-history-list";
import { HistorySyncClient } from "./sync";

interface SearchParams {
  status?: string;
  search?: string;
  page?: string;
}

async function getEmailHistory(userId: string, searchParams: SearchParams) {
  const page = Number.parseInt(searchParams.page || "1");
  const limit = 10;
  const offset = (page - 1) * limit;

  const where: any = { userId };

  if (searchParams.status && searchParams.status !== "all") {
    where.status = searchParams.status;
  }

  if (searchParams.search) {
    where.OR = [
      { subject: { contains: searchParams.search, mode: "insensitive" } },
      {
        contactList: {
          name: { contains: searchParams.search, mode: "insensitive" },
        },
      },
    ];
  }

  const [emailHistory, totalCount] = await Promise.all([
    prisma.emailHistory.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      include: {
        contactList: {
          select: {
            name: true,
            domain: {
              select: {
                domain: true,
              },
            },
            _count: {
              select: {
                emailHistory: true,
              },
            },
          },
        },
      },
    }),
    prisma.emailHistory.count({ where }),
  ]);

  return {
    emailHistory,
    totalCount,
    currentPage: page,
    totalPages: Math.ceil(totalCount / limit),
  };
}

export default async function EmailHistoryPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireAuth();
  const { emailHistory, totalCount, currentPage, totalPages } =
    await getEmailHistory(user.id, searchParams);

  const visibleHistoryIds = emailHistory.map((item) => item.id);
  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <HistorySyncClient historyIds={visibleHistoryIds} />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl  font-bold text-gray-900">Email History</h1>
            <p className="text-gray-600 mt-1">
              View and track all your email campaigns and their delivery status
            </p>
          </div>
          <div className="flex gap-3">
            <Button asChild>
              <Link href="/send-email">
                <Send className="mr-2 h-4 w-4" />
                Send New Email
              </Link>
            </Button>
          </div>
        </div>

        {/* Filters */}
        <EmailHistoryFilters />

        {/* Email History List */}
        <EmailHistoryList
          emailHistory={emailHistory as any}
          totalCount={totalCount}
          currentPage={currentPage}
          totalPages={totalPages}
        />
      </div>
    </DashboardLayout>
  );
}
