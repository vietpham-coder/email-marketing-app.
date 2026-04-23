import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { batchName } = body;

    if (!batchName) {
      return NextResponse.json({ success: false, error: "Missing batchName" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("email_marketing");
    const collection = db.collection("master_contacts");
    
    // Delete all contacts belonging to this batch
    const result = await collection.deleteMany({ _batchName: batchName });
    const deletedCount = result.deletedCount;

    return NextResponse.json({ 
      success: true, 
      message: `Đã xóa thành công tệp ${batchName} và dỡ bỏ ${deletedCount} khách hàng.`,
      deletedCount
    });
  } catch (error: any) {
    console.error("Delete batch failed", error);
    return NextResponse.json({ success: false, error: "Lỗi máy chủ khi dọn dẹp" }, { status: 500 });
  }
}
