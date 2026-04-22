import { NextResponse } from "next/server";
import { deleteCampaign } from "@/lib/storage";

export async function POST(req: Request) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ success: false, error: "Missing ID" }, { status: 400 });

    const deleted = await deleteCampaign(id);
    if (deleted) {
      return NextResponse.json({ success: true, message: "Campaign deleted successfully." });
    } else {
      return NextResponse.json({ success: false, error: "Campaign not found" }, { status: 404 });
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
