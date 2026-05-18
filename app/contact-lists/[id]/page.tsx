// app/contact-lists/[id]/page.tsx
import { redirect } from "next/navigation";
import { getSession } from "@/app/_lib/auth/session";
import prisma from "@/app/_lib/db/prisma";
import DashboardLayout from "@/app/_components/dashboard-layout";
import { ContactListDetail } from "@/app/_components/contact-list-detail";

interface PageProps {
  params: { id: string };
  searchParams: { page?: string; search?: string };
}

export default async function ContactListDetailPage({
  params,
  searchParams,
}: PageProps) {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");

  const page = Math.max(1, parseInt(searchParams.page || "1"));
  const search = searchParams.search || "";
  const limit = 50;
  const skip = (page - 1) * limit;

  const list = await prisma.contactList.findFirst({
    where: { id: params.id, createdBy: session.user.id },
    include: {
      domain: { select: { domain: true, status: true } },
      _count: { select: { contacts: true, emailHistory: true } },
    },
  });

  if (!list) redirect("/contact-lists");

  const whereContacts = {
    contactListId: params.id,
    ...(search
      ? {
          OR: [
            { email: { contains: search, mode: "insensitive" as const } },
            { firstName: { contains: search, mode: "insensitive" as const } },
            { lastName: { contains: search, mode: "insensitive" as const } },
            { company: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({
      where: whereContacts,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.contact.count({ where: whereContacts }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return (
    <DashboardLayout>
      <ContactListDetail
        list={list as any}
        initialContacts={contacts as any}
        initialTotal={total}
        initialPage={page}
        initialTotalPages={totalPages}
      />
    </DashboardLayout>
  );
}
