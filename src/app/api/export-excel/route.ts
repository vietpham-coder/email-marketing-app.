import { NextRequest, NextResponse } from "next/server";
import * as xlsx from "xlsx";
import { getCampaigns } from "@/lib/storage";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const campaignId = searchParams.get("id");

    const allCampaigns = await getCampaigns();
    
    let targetCampaigns = allCampaigns;
    if (campaignId) {
      targetCampaigns = allCampaigns.filter(c => c.id === campaignId);
    }
    
    if (targetCampaigns.length === 0) {
      return NextResponse.json({ error: "No campaign found" }, { status: 404 });
    }

    const reportData: any[] = [];

    // Flatten all contacts from selected campaigns
    for (const campaign of targetCampaigns) {
      for (const contact of campaign.audience) {
        const email = contact.Email || contact.email;
        if (!email) continue;

        const interactions = campaign.interactions[email] || [];
        
        let sentDateStr = "N/A";
        let readStatusStr = "No";
        let timeElapsedStr = "N/A";
        let nextStepStr = "🟢 Nhắc nhở gửi Email chăm sóc hàng tuần";
        
        if (interactions.length > 0) {
          const firstInteraction = interactions[0];
          const latestInteraction = interactions[interactions.length - 1];
          
          sentDateStr = new Date(firstInteraction.sentAt).toLocaleString();
          
          if (latestInteraction.openedAt) {
            readStatusStr = "Yes";
            timeElapsedStr = `${latestInteraction.timeElapsedHours} hours`;
            // If they opened the email, the nurture cycle is complete
            nextStepStr = "🟢 Nhắc nhở gửi Email chăm sóc hàng tuần";
          } else {
            // Not opened
            const daysSinceFirstSent = (new Date().getTime() - new Date(firstInteraction.sentAt).getTime()) / (1000 * 3600 * 24);
            
            // Check follow up history
            const hasFollowUp = interactions.some(i => i.type === "follow_up");
            
            if (daysSinceFirstSent >= 7) {
              nextStepStr = "📞 Yêu cầu gọi điện trực tiếp";
            } else if (daysSinceFirstSent >= 5 && hasFollowUp) {
              nextStepStr = "🔴 Yêu cầu nhắn tin qua Linkedin hoặc Whatsapp";
            } else if (daysSinceFirstSent >= 3 && !hasFollowUp) {
              nextStepStr = "🟡 Gửi Email Follow Up";
            } else if (daysSinceFirstSent < 3) {
              nextStepStr = "Đang chờ mở...";
            }
          }
        }

        const row = {
          ...contact,
          "Campaign Name": campaign.campaignName,
          "Ngày gửi": sentDateStr,
          "Trạng thái đã đọc": readStatusStr,
          "Thời gian chờ mở": timeElapsedStr,
          "Đề xuất bước tiếp theo": nextStepStr
        };
        
        reportData.push(row);
      }
    }

    // Convert JSON to Worksheet
    const ws = xlsx.utils.json_to_sheet(reportData);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Tracking Report");

    // Convert to buffer
    const buffer = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Disposition": `attachment; filename="Email_Tracking_Report_${new Date().toISOString().split('T')[0]}.xlsx"`,
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });

  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Failed to export report" }, { status: 500 });
  }
}
