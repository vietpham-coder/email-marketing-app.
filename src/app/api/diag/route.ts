import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db(); // Default DB from connection string
    const dbName = db.databaseName;
    
    // Check our specific DB name too
    const emailMarketingDb = client.db("email_marketing");
    
    const campaignsCount = await emailMarketingDb.collection("campaigns").countDocuments();
    const latestCampaigns = await emailMarketingDb.collection("campaigns")
      .find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

    return NextResponse.json({
      success: true,
      diagnostic: {
        currentTimestamp: new Date().toISOString(),
        connectionDbName: dbName,
        targetDbName: "email_marketing",
        campaignsCount,
        latestCampaignIds: latestCampaigns.map(c => ({
          id: c.id,
          name: c.campaignName,
          createdAt: c.createdAt
        }))
      }
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
