import { NextResponse } from "next/server";
import { getMasterContacts, saveMasterContacts } from "@/lib/storage";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { batchName } = body;

    if (!batchName) {
      return NextResponse.json({ success: false, error: "Missing batchName" }, { status: 400 });
    }

    const currentContacts = await getMasterContacts();
    
    // Filter out contacts that match the deleted batchName
    // If a contact belongs to multiple batches (if we ever support that), this deletes the whole contact.
    // Given the current architecture, a contact has a single `_batchName` property as string.
    const newContacts = currentContacts.filter(c => c._batchName !== batchName);
    
    const deletedCount = currentContacts.length - newContacts.length;

    await saveMasterContacts(newContacts);

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
