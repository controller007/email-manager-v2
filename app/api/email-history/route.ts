// app/api/email-history/route.ts - UPDATED FOR BREVO
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/_lib/auth/session";
import prisma from "@/app/_lib/db/prisma";
import { brevo } from "@/app/_lib/email/brevo-client";




// Refresh email stats from Brevo
export async function PUT(request: NextRequest) {
  try {

    const user = await requireAuth();

    const emailHistories = await prisma.emailHistory.findMany({
      where: { userId: user.id },
      select: { id: true, campaignId: true, sendMethod: true },
    });

    

    for (const history of emailHistories) {
      if (!history.campaignId) continue;

      try {
        let stats;

        if (history.sendMethod === "campaign") {
          // Get campaign statistics
                    console.log(stats,history.campaignId);

          stats = (await brevo.getCampaignStats(history.campaignId)).statistics;
          console.log(stats);
          
          await prisma.emailHistory.update({
            where: { id: history.id },
            data: {
              deliveredCount: stats.campaignStats[0]?.delivered || 0,
              openedCount: stats.campaignStats[0]?.uniqueViews || 0,
              clickedCount: stats.campaignStats[0]?.uniqueClicks || 0,
              bouncedCount: stats.campaignStats[0]?.hardBounces + stats.campaignStats?.softBounces || 0,
              failedCount: stats.campaignStats[0]?.hardBounces || 0,
            },
          });
        }
      } catch (error) {
        console.error(`Failed to update stats for history ${history.id}:`, error);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error refreshing email history:", error);
    return NextResponse.json(
      { error: "Failed to refresh email history" },
      { status: 500 }
    );
  }
}