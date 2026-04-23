import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { saveCampaign, CampaignRecord } from "@/lib/storage";

export async function POST(req: NextRequest) {
  try {
    const { campaignId, campaignName, contacts, subjectTemplate, bodyTemplate, isFollowUp, attachments } = await req.json();

    if (!contacts || !subjectTemplate || !bodyTemplate) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const cid = campaignId || `camp-${Date.now()}`;
    const cName = campaignName || `Campaign ${new Date().toLocaleDateString()}`;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const parseTemplate = (template: string, data: any) => {
      let parsed = template;
      for (const key in data) {
        // Find property name ignoring case
        const exactKey = Object.keys(data).find(k => k.toLowerCase() === key.toLowerCase()) || key;
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, "gi");
        parsed = parsed.replace(regex, data[exactKey]);
      }
      return parsed;
    };

    const nodemailerAttachments = (attachments || []).map((att: any) => ({
      filename: att.name,
      path: att.base64
    }));

    let sentCount = 0;
    const failedEmails = [];
    const interactionsRecord: Record<string, any[]> = {};

    for (const contact of contacts) {
      const rawEmail = contact.Email || contact.email;
      if (!rawEmail) continue;
      const email = rawEmail.toLowerCase().trim();

      const personalizedSubject = parseTemplate(subjectTemplate, contact);
      let htmlBodyRaw = parseTemplate(bodyTemplate, contact);
      let htmlBody = `
        <div style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.6; color: #222222; max-width: 800px;">
          ${htmlBodyRaw}
        </div>
      `;
      // Inject Tracking Pixel
      const trackingUrl = `${appUrl}/api/track?c=${cid}&e=${encodeURIComponent(email)}`;
      const pixel = `<img src="${trackingUrl}" width="1" height="1" style="display:none;" alt="" />`;
      htmlBody += pixel;

      try {
        await transporter.sendMail({
          from: `"Việt Phạm" <${process.env.SMTP_USER}>`,
          to: email,
          subject: personalizedSubject,
          html: htmlBody,
          attachments: nodemailerAttachments
        });
        
        interactionsRecord[email] = [{
          type: isFollowUp ? "follow_up" : "initial",
          sentAt: new Date().toISOString()
        }];
        sentCount++;
      } catch (err) {
        console.error(`Failed to send to ${email}`, err);
        failedEmails.push(email);
      }
    }

    // Save Campaign Data
    const record: CampaignRecord = {
      id: cid,
      campaignName: cName,
      audience: contacts,
      interactions: interactionsRecord,
      createdAt: new Date().toISOString()
    };
    await saveCampaign(record);

    return NextResponse.json({
      success: true,
      message: `Successfully sent ${sentCount} emails.`,
      campaignId: cid,
      failed: failedEmails,
    });
  } catch (error) {
    console.error("Error sending emails:", error);
    return NextResponse.json(
      { error: "Failed to process campaign" },
      { status: 500 }
    );
  }
}

