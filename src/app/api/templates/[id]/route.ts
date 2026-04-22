import { NextResponse } from "next/server";
import { getTemplates, saveTemplate, deleteTemplate, EmailTemplate } from "@/lib/templateStorage";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Next.js 15+ syntax expects await params for NextRequest
    const resolvedParams = await params;
    const body = await req.json();
    const templates = await getTemplates();
    const existing = templates.find(t => t.id === resolvedParams.id);

    if (!existing) {
      return NextResponse.json({ success: false, error: "Template not found" }, { status: 404 });
    }

    const updatedTemplate: EmailTemplate = {
      ...existing,
      name: body.name || existing.name,
      subject: body.subject !== undefined ? body.subject : existing.subject,
      bodyHtml: body.bodyHtml !== undefined ? body.bodyHtml : existing.bodyHtml,
      attachments: body.attachments !== undefined ? body.attachments : existing.attachments,
      updatedAt: new Date().toISOString(),
    };

    await saveTemplate(updatedTemplate);
    return NextResponse.json({ success: true, data: updatedTemplate });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to update template" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    await deleteTemplate(resolvedParams.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to delete template" }, { status: 500 });
  }
}
