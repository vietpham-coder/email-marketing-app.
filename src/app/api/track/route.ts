import { NextRequest, NextResponse } from "next/server";
import { markAsOpened } from "@/lib/storage";

export const dynamic = "force-dynamic";

// 1x1 transparent GIF byte array
const TRANSPARENT_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const campaignId = searchParams.get("c");
  const email = searchParams.get("e");

  if (campaignId && email) {
    try {
      await markAsOpened(campaignId, email);
    } catch (e) {
      console.error("Error marking as opened", e);
    }
  }

  // Always return the standard transparent GIF so the email client doesn't show broken image
  return new NextResponse(TRANSPARENT_GIF, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
    },
  });
}
