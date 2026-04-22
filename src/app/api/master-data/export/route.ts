import { NextResponse } from "next/server";
import * as xlsx from "xlsx";
import { getMasterReportData } from "@/lib/storage";

export async function GET() {
  try {
    // Get aggregated report data from MongoDB
    const reportData = await getMasterReportData();

    if (reportData.length === 0) {
      return NextResponse.json({ error: "No data found" }, { status: 404 });
    }

    // Convert JSON to Worksheet
    const ws = xlsx.utils.json_to_sheet(reportData);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Master Database");

    // Convert to buffer
    const buffer = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Disposition": `attachment; filename="Master_Database_Report_${new Date().toISOString().split('T')[0]}.xlsx"`,
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });

  } catch (error) {
    console.error("Master export error:", error);
    return NextResponse.json({ error: "Failed to export report" }, { status: 500 });
  }
}
