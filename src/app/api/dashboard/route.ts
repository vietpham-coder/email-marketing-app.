import { NextResponse } from "next/server";
import { getCampaigns, getMasterContacts, Interaction } from "@/lib/storage";

export async function GET() {
  try {
    const allCampaigns = await getCampaigns();
    const allContacts = await getMasterContacts();
    
    // 1. Basic Stats
    let totalSent = 0;
    let totalOpened = 0;
    let totalHoursElapsed = 0;
    let openedCountWithHours = 0;

    const campaignStats = allCampaigns.map(c => {
      let sent = 0;
      let opened = 0;
      Object.keys(c.interactions).forEach(email => {
        const history = c.interactions[email];
        sent += history.length;
        history.forEach(i => {
          if (i.openedAt) {
            opened++;
            if (i.timeElapsedHours !== undefined) {
               totalHoursElapsed += i.timeElapsedHours;
               openedCountWithHours++;
            }
          }
        });
      });
      totalSent += sent;
      totalOpened += opened;

      return {
        id: c.id,
        name: c.campaignName,
        createdAt: c.createdAt,
        totalSent: sent,
        openRate: sent > 0 ? Math.round((opened / sent) * 100) + "%" : "0%"
      };
    });

    const openRate = totalSent > 0 ? (totalOpened / totalSent) * 100 : 0;
    const avgOpenTime = openedCountWithHours > 0 ? (totalHoursElapsed / openedCountWithHours).toFixed(1) : "0";

    // 2. Customer Map
    const interactionMap = new Map<string, { latestCampaign: string, interactions: Interaction[] }>();
    for (const campaign of allCampaigns) {
      for (const email of Object.keys(campaign.interactions)) {
        const sanitizedKey = email.toLowerCase().trim().replace(/\./g, '_');
        const interactions = campaign.interactions[sanitizedKey] || [];
        if (!interactions || interactions.length === 0) continue;
        const key = email.toLowerCase();
        const existing = interactionMap.get(key);
        const currentLatestSentAt = new Date(interactions[interactions.length - 1].sentAt).getTime();
        if (!existing) {
          interactionMap.set(key, { latestCampaign: campaign.campaignName, interactions });
        } else {
          const existingLatestSentAt = new Date(existing.interactions[existing.interactions.length - 1].sentAt).getTime();
          if (currentLatestSentAt > existingLatestSentAt) {
            interactionMap.set(key, { latestCampaign: campaign.campaignName, interactions });
          }
        }
      }
    }

    const customers = allContacts.map(contact => {
      const email = contact.email || contact.Email || "";
      const key = email.toLowerCase().trim().replace(/\./g, '_');
      const interactionHistory = key ? interactionMap.get(key) : null;
      let nextStepStr = "N/A";
      let readStatus = "No";

      if (interactionHistory && interactionHistory.interactions.length > 0) {
        const interactions = interactionHistory.interactions;
        const latestInteraction = interactions[interactions.length - 1];
        
        if (latestInteraction.openedAt) {
          readStatus = "Yes";
          nextStepStr = "🟢 Nhắc nhở gửi Email chăm sóc hàng tuần";
        } else {
          const daysSinceSent = (new Date().getTime() - new Date(latestInteraction.sentAt).getTime()) / (1000 * 3600 * 24);
          const hasFollowUp = interactions.length > 1;
          if (daysSinceSent >= 7) {
            nextStepStr = "📞 Yêu cầu gọi điện trực tiếp";
          } else if (daysSinceSent >= 5 && hasFollowUp) {
            nextStepStr = "🔴 Yêu cầu nhắn tin qua Linkedin/Whatsapp";
          } else if (daysSinceSent >= 3 && !hasFollowUp) {
            nextStepStr = "🟡 Gửi Email Follow Up";
          } else if (daysSinceSent < 3) {
            nextStepStr = "Đang chờ mở...";
          }
        }
      }

      return {
        email: contact.email,
        name: contact.name || contact.Name || contact.email.split('@')[0],
        campaign: interactionHistory?.latestCampaign || "None",
        readStatus,
        proposedAction: nextStepStr
      };
    });

    return NextResponse.json({
      success: true,
      stats: {
        totalSent,
        openRate: openRate.toFixed(1) + "%",
        avgOpenTime: avgOpenTime + " hrs"
      },
      campaigns: campaignStats,
      customers: customers
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to load dashboard data" }, { status: 500 });
  }
}
