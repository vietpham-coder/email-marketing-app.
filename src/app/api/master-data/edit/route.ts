import { NextResponse } from "next/server";
import { getMasterContacts, saveMasterContacts } from "@/lib/storage";

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { email, field, value } = body;

    if (!email || !field) {
      return NextResponse.json({ success: false, error: "Missing email or field" }, { status: 400 });
    }

    const contacts = await getMasterContacts();
    const contactIndex = contacts.findIndex(c => c.email.toLowerCase() === email.toLowerCase());

    if (contactIndex === -1) {
      return NextResponse.json({ success: false, error: "Contact not found" }, { status: 404 });
    }

    // Update the specific field
    contacts[contactIndex][field] = value;

    // Save back to disk
    await saveMasterContacts(contacts);

    return NextResponse.json({ success: true, message: "Updated successfully" });
  } catch (error: any) {
    console.error("Failed to edit contact:", error);
    return NextResponse.json({ success: false, error: "Server Error" }, { status: 500 });
  }
}
