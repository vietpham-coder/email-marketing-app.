import { NextResponse } from "next/server";
import * as xlsx from "xlsx";
import { upsertMasterContacts } from "@/lib/storage";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const workbook = xlsx.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    const rows = xlsx.utils.sheet_to_json(worksheet, { defval: "" });
    
    // Attempt to parse out email field
    const mappedContacts = [];
    let addedCount = 0;
    const batchName = file.name;
    
    if (rows.length > 0) {
      const keys = Object.keys(rows[0] as any);
      const emailKeywords = ["email", "e-mail", "mail", "thu dien tu"];
      const emailKey = keys.find(k => {
        const normalized = k.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
        return emailKeywords.some(kw => normalized.includes(kw));
      });

      if (!emailKey) {
        return NextResponse.json({ 
          success: false, 
          error: `Không tìm thấy cột 'Email' trong file Excel. Các cột hiện tại: ${keys.join(", ")}` 
        }, { status: 400 });
      }

      for (const row of rows as any[]) {
        const email = row[emailKey];
        if (email && typeof email === 'string' && email.includes('@')) {
          mappedContacts.push({
            ...row,
            email: email.trim().toLowerCase(),
            _batchName: batchName
          });
          addedCount++;
        }
      }
    }
    
    if (addedCount > 0) {
      await upsertMasterContacts(mappedContacts);
    } else {
      return NextResponse.json({ success: false, error: "Không có dòng nào chứa Email hợp lệ để lưu." }, { status: 400 });
    }
    
    return NextResponse.json({ 
      success: true, 
      count: addedCount,
      message: `Đã cập nhật ${addedCount} bản ghi thành công` 
    });
    
  } catch (error: any) {
    console.error("Master data import error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
