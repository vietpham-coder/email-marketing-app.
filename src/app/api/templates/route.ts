import { NextResponse } from "next/server";
import { getTemplates, saveTemplate, EmailTemplate } from "@/lib/templateStorage";

export async function GET() {
  try {
    const templates = await getTemplates();
    return NextResponse.json({ success: true, data: templates });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch templates" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    if (!body.name || !body.subject || !body.bodyHtml) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const newTemplate: EmailTemplate = {
      id: "tpl_" + Date.now().toString() + Math.floor(Math.random() * 1000).toString(),
      name: body.name,
      subject: body.subject,
      bodyHtml: body.bodyHtml,
      attachments: body.attachments || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveTemplate(newTemplate);
    return NextResponse.json({ success: true, data: newTemplate });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: "Failed to create template" }, { status: 500 });
  }
}
