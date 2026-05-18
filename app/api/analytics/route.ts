// app/api/analytics/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/_lib/auth/session";
import prisma from "@/app/_lib/db/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("request incoming");

    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "30"; // days
    const days = Math.min(parseInt(range), 365);

    const since = new Date();
    since.setDate(since.getDate() - days);

    const userId = session.user.id;

    const [totals, recentHistory, contactStats] = await Promise.all([
      prisma.emailHistory.aggregate({
        where: { userId, createdAt: { gte: since } },
        _sum: {
          sentCount: true,
          deliveredCount: true,
          openedCount: true,
          clickedCount: true,
          failedCount: true,
          bouncedCount: true,
          complainedCount: true,
          unsubscribedCount: true,
        },
        _count: true,
      }),
      // Daily series for chart
      prisma.emailHistory.findMany({
        where: { userId, createdAt: { gte: since } },
        orderBy: { createdAt: "asc" },
        select: {
          createdAt: true,
          sentCount: true,
          deliveredCount: true,
          openedCount: true,
          clickedCount: true,
          failedCount: true,
          complainedCount: true,
          subject: true,
          contactList: { select: { name: true } },
        },
      }),
      // Contact list stats
      prisma.contactList.findMany({
        where: { createdBy: userId },
        include: {
          _count: { select: { contacts: true, emailHistory: true } },
        },
      }),
    ]);

    // ── Build daily chart data ─────────────────────────────────────────────────
    const dailyMap = new Map<
      string,
      {
        date: string;
        sent: number;
        delivered: number;
        opened: number;
        clicked: number;
        failed: number;
        complained: number;
        campaigns: number;
      }
    >();

    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split("T")[0];
      dailyMap.set(key, {
        date: key,
        sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        failed: 0,
        complained: 0,
        campaigns: 0,
      });
    }

    for (const h of recentHistory) {
      const key = h.createdAt.toISOString().split("T")[0];
      const entry = dailyMap.get(key);
      if (entry) {
        entry.sent += h.sentCount || 0;
        entry.delivered += h.deliveredCount || 0;
        entry.opened += h.openedCount || 0;
        entry.clicked += h.clickedCount || 0;
        entry.failed += h.failedCount || 0;
        entry.complained += h.complainedCount || 0;
        entry.campaigns += 1;
      }
    }

    const dailySeries = Array.from(dailyMap.values());

    // ── Top campaigns ─────────────────────────────────────────────────────────
    const topCampaigns = await prisma.emailHistory.findMany({
      where: { userId, createdAt: { gte: since } },
      orderBy: { openedCount: "desc" },
      take: 5,
      select: {
        id: true,
        subject: true,
        sentCount: true,
        openedCount: true,
        clickedCount: true,
        createdAt: true,
        contactList: { select: { name: true } },
      },
    });

    // ── Suppression stats ─────────────────────────────────────────────────────
    const suppressionCount = await prisma.emailSuppression.count({
      where: { userId },
    });

    // ── Response rates ────────────────────────────────────────────────────────
    const sent = totals._sum.sentCount || 0;
    const delivered = totals._sum.deliveredCount || 0;
    const opened = totals._sum.openedCount || 0;
    const clicked = totals._sum.clickedCount || 0;

    const rates = {
      deliveryRate: sent > 0 ? Math.round((delivered / sent) * 1000) / 10 : 0,
      openRate:
        delivered > 0 ? Math.round((opened / delivered) * 1000) / 10 : 0,
      clickRate: opened > 0 ? Math.round((clicked / opened) * 1000) / 10 : 0,
      clickToDelivery:
        delivered > 0 ? Math.round((clicked / delivered) * 1000) / 10 : 0,
    };

    return NextResponse.json({
      totals: {
        campaigns: totals._count,
        sent,
        delivered,
        opened,
        clicked,
        failed: totals._sum.failedCount || 0,
        bounced: totals._sum.bouncedCount || 0,
        complained: totals._sum.complainedCount || 0,
        unsubscribed: totals._sum.unsubscribedCount || 0,
      },
      rates,
      dailySeries,
      topCampaigns,
      contactLists: contactStats.map((l) => ({
        id: l.id,
        name: l.name,
        contactCount: l._count.contacts,
        campaignCount: l._count.emailHistory,
      })),
      suppressionCount,
      range: days,
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 },
    );
  }
}
