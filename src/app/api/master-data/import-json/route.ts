import { NextResponse } from "next/server";
import { upsertMasterContacts } from "@/lib/storage";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { contacts, batchName } = body;
    
    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
       return NextResponse.json({ success: false, error: "Dữ liệu trống hoặc không hợp lệ." }, { status: 400 });
    }
    
    const firstRow = contacts[0];
    const keys = Object.keys(firstRow);
    const emailKeywords = ["email", "e-mail", "mail", "thu dien tu"];
    const emailKey = keys.find(k => {
      const normalized = k.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
      return emailKeywords.some(kw => normalized.includes(kw));
    });

    if (!emailKey && !firstRow.email) {
      return NextResponse.json({ success: false, error: `Không tìm thấy cột 'Email' để nhận diện khóa chính. Vui lòng kiểm tra lại file. Các cột tìm thấy: ${keys.join(", ")}` }, { status: 400 });
    }

    const emailField = emailKey || "email";
    
    const mappedContacts = [];
    let addedCount = 0;

    for (const row of contacts) {
      const emailValue = row[emailField];
      if (emailValue && typeof emailValue === 'string' && emailValue.includes('@')) {
        mappedContacts.push({
          ...row,
          email: emailValue.trim().toLowerCase(),
          _batchName: batchName || "Thêm từ Audience"
        });
        addedCount++;
      }
    }
    
    if (addedCount > 0) {
      await upsertMasterContacts(mappedContacts);
      return NextResponse.json({ 
        success: true, 
        count: addedCount,
        message: `Đã lưu thành công ${addedCount} liên hệ vào Master Data.` 
      });
    } else {
      return NextResponse.json({ success: false, error: "Không phát hiện dòng dữ liệu nào có định dạng email hợp lệ." }, { status: 400 });
    }
    
  } catch (error: any) {
    console.error("Master data import JSON error:", error);
    return NextResponse.json({ success: false, error: error.message || "Lỗi máy chủ nội bộ." }, { status: 500 });
  }
}
