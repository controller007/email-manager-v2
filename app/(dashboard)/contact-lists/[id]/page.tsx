import { requireAuth } from "@/app/_lib/auth/session";
import DashboardLayout from "@/app/_components/dashboard-layout";
import { ContactListDetail } from "@/app/_components/contact-list-detail";
import prisma from "@/app/_lib/db/prisma";
import { notFound } from "next/navigation";

interface PageProps {
  params: { id: string };
  searchParams: { page?: string; search?: string };
}

const ITEMS_PER_PAGE = 50;

export default async function ContactListDetailPage({
  params,
  searchParams,
}: PageProps) {
  const user = await requireAuth();

  const page = Math.max(1, parseInt(searchParams.page || "1"));
  const search = searchParams.search || "";
  const skip = (page - 1) * ITEMS_PER_PAGE;

  const list = await prisma.contactList.findFirst({
    where: { id: params.id, createdBy: user.id },
    include: {
      domain: { select: { domain: true } },
      _count: { select: { contacts: true, emailHistory: true } },
    },
  });

  if (!list) notFound();

  const contactWhere: any = {
    contactListId: params.id,
    ...(search
      ? {
          OR: [
            { email: { contains: search, mode: "insensitive" } },
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
            { company: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({
      where: contactWhere,
      orderBy: { createdAt: "desc" },
      skip,
      take: ITEMS_PER_PAGE,
    }),
    prisma.contact.count({ where: contactWhere }),
  ]);

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

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
