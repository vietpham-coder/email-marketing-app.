import { NextResponse } from "next/server";
import { getMasterContacts, getCampaigns, Interaction } from "@/lib/storage";

export async function GET() {
  try {
    const allContacts = await getMasterContacts();
    const allCampaigns = await getCampaigns();
    
    // We group by email
    const interactionMap = new Map<string, { latestCampaign: string, interactions: Interaction[] }>();
    
    for (const campaign of allCampaigns) {
      for (const email of Object.keys(campaign.interactions)) {
        const interactions = campaign.interactions[email];
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

    const reportData = [];

    for (const contact of allContacts) {
      if (!contact.email) continue;
      const key = contact.email.toLowerCase().replace(/\./g, '_');
      
      const interactionHistory = interactionMap.get(key);
      let sentDateStr = "N/A";
      let readStatusStr = "No";
      let timeElapsedStr = "N/A";
      let nextStepStr = "N/A";
      let campaignName = "No active campaign";
      
      if (interactionHistory && interactionHistory.interactions.length > 0) {
        const interactions = interactionHistory.interactions;
        campaignName = interactionHistory.latestCampaign;
        
        const latestInteraction = interactions[interactions.length - 1];
        
        sentDateStr = new Date(latestInteraction.sentAt).toLocaleString();
        
        if (latestInteraction.openedAt) {
          readStatusStr = "Yes";
          timeElapsedStr = `${latestInteraction.timeElapsedHours || 0} hours`;
          nextStepStr = "🟢 Nhắc nhở gửi Email chăm sóc hàng tuần";
        } else {
          const daysSinceSent = (new Date().getTime() - new Date(latestInteraction.sentAt).getTime()) / (1000 * 3600 * 24);
          const hasFollowUp = interactions.length > 1;
          
          if (daysSinceSent >= 7) {
            nextStepStr = "📞 Yêu cầu gọi điện trực tiếp";
          } else if (daysSinceSent >= 5 && hasFollowUp) {
            nextStepStr = "🔴 Yêu cầu nhắn tin qua Linkedin hoặc Whatsapp";
          } else if (daysSinceSent >= 3 && !hasFollowUp) {
            nextStepStr = "🟡 Gửi Email Follow Up";
          } else if (daysSinceSent < 3) {
            nextStepStr = "Đang chờ mở...";
          }
        }
      }

      const row = {
        ...contact,
        "Latest Campaign": campaignName,
        "Lần cuối gửi": sentDateStr,
        "Trạng thái đã đọc": readStatusStr,
        "Thời gian chờ mở": timeElapsedStr,
        "Đề xuất bước tiếp theo": nextStepStr
      };
      
      reportData.push(row);
    }

    return NextResponse.json({ success: true, count: reportData.length, data: reportData });
  } catch (error: any) {
    console.error("API error master-data GET:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
