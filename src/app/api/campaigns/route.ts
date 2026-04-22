import { NextResponse } from "next/server";
import { getCampaigns } from "@/lib/storage";

export async function GET() {
  try {
    const campaigns = await getCampaigns();
    return NextResponse.json({ success: true, data: campaigns });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch campaigns" }, { status: 500 });
  }
}
