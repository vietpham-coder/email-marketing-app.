"use client";

import { useState } from "react";
import { UploadCloud, FileType, CheckCircle, Users, Sparkles, Save } from "lucide-react";
import { guessGenderFromName } from "@/lib/genderGuesser";
import "./audience.css";

export default function AudiencePage() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [data, setData] = useState<any[]>([]);

  // Inline edit state
  const [editCell, setEditCell] = useState<{ rowIndex: number, field: string } | null>(null);
  const [editValue, setEditValue] = useState("");

  const startEdit = (rowIndex: number, field: string, currentValue: string) => {
    setEditCell({ rowIndex, field });
    setEditValue(currentValue || "");
  };

  const saveEdit = () => {
    if (!editCell) return;
    const { rowIndex, field } = editCell;
    const newData = [...data];
    newData[rowIndex] = { ...newData[rowIndex], [field]: editValue };
    setData(newData);
    setEditCell(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (selectedFile: File) => {
    // Only accept excel or csv
    if (
      selectedFile.name.endsWith(".xlsx") ||
      selectedFile.name.endsWith(".csv")
    ) {
      setFile(selectedFile);
    } else {
      alert("Invalid file format. Please upload .xlsx or .csv");
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/parse-excel", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        setData(result.data);
      } else {
        alert("Upload failed.");
      }
    } catch (error) {
      console.error(error);
      alert("Something went wrong");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDetectGenders = () => {
    if (data.length === 0) return;
    
    // Find name column dynamically (ignoring accents, case, and spacing)
    const headers = Object.keys(data[0]);
    
    const normalizeString = (str: string) => {
      if (!str) return "";
      return str.toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    };

    const nameKeywords = ["name", "ten", "ho ten", "ho va ten", "first name", "nguoi nhan", "khach hang"];
    const nameColumn = headers.find(h => {
      const normalizedHeader = normalizeString(h);
      return nameKeywords.some(kw => normalizedHeader.includes(kw));
    });

    if (!nameColumn) {
      alert("Hệ thống không tìm thấy cột chứa Tên. Vui lòng đặt lại tên cột là 'Họ Tên' hoặc 'Name'. Các cột hiện tại: " + headers.join(", "));
      return;
    }

    let detectCount = 0;
    const newData = data.map(row => {
      const nameVal = row[nameColumn] ? String(row[nameColumn]) : "";
      const guessedTitle = guessGenderFromName(nameVal);
      if (guessedTitle) detectCount++;
      
      // We prepend Title column by reconstructing the object
      return {
        Title: guessedTitle, // Put Title as first column
        ...row
      };
    });

    setData(newData);
    alert(`Detection complete! Successfully auto-detected Mr/Ms for ${detectCount} out of ${data.length} contacts.`);
  };

  const handleSaveToMaster = async () => {
    if (data.length === 0) return;
    setIsSaving(true);
    
    try {
      const res = await fetch("/api/master-data/import-json", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          contacts: data, 
          batchName: file?.name || "Audience Upload" 
        })
      });
      
      const json = await res.json();
      if (json.success) {
        alert(json.message || "Đã lưu thành công vào Master Data.");
      } else {
        alert("Lỗi khi lưu: " + json.error);
      }
    } catch (err) {
      console.error(err);
      alert("Đã xảy ra lỗi mạng khi lưu dữ liệu.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Audience List</h1>
        <p className="page-subtitle">Import your contacts from Excel or CSV files.</p>
      </div>

      <div className="upload-section premium-card">
        {!data.length ? (
          <div
            className="drop-zone"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <UploadCloud size={48} className="drop-icon" />
            <h3>Drag & Drop your file here</h3>
            <p className="text-muted">Supports .xlsx and .csv</p>
            <div className="upload-actions">
              <input
                type="file"
                id="file-upload"
                hidden
                accept=".xlsx, .csv"
                onChange={handleFileInput}
              />
              <label htmlFor="file-upload" className="btn-secondary">
                Browse Files
              </label>
              {file && (
                <button
                  className="btn-primary"
                  onClick={handleUpload}
                  disabled={isUploading}
                >
                  {isUploading ? "Processing..." : "Process List"}
                </button>
              )}
            </div>
            {file && (
              <div className="file-info">
                <FileType size={20} />
                <span>{file.name}</span>
                <CheckCircle size={16} className="text-success" />
              </div>
            )}
          </div>
        ) : (
          <div className="data-preview">
            <div className="data-header">
              <div className="data-count">
                <Users size={20} />
                <span>{data.length} contacts ready</span>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button 
                  className="btn-primary" 
                  onClick={handleDetectGenders}
                  style={{ gap: '0.5rem', background: 'linear-gradient(135deg, #FF9800, #F44336)' }}
                >
                  <Sparkles size={16} />
                  Auto-Detect Mr/Ms
                </button>
                <button 
                  className="btn-primary" 
                  onClick={handleSaveToMaster}
                  disabled={isSaving}
                  style={{ gap: '0.5rem' }}
                >
                  <Save size={16} />
                  {isSaving ? "Đang lưu..." : "Lưu vào Master Data"}
                </button>
                <button 
                  className="btn-secondary" 
                  onClick={() => {
                    setData([]);
                    setFile(null);
                  }}
                >
                  Upload Different File
                </button>
              </div>
            </div>
            
            <div className="table-container">
              <table className="audience-table">
                <thead>
                  <tr>
                    {Object.keys(data[0] || {}).map((key) => (
                      <th key={key}>{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.slice(0, 50).map((row, idx) => (
                    <tr key={idx}>
                      {Object.keys(data[0] || {}).map((header, colIdx) => {
                        const isEditing = editCell?.rowIndex === idx && editCell?.field === header;
                        return (
                          <td 
                            key={colIdx} 
                            onDoubleClick={() => startEdit(idx, header, String(row[header] || ""))}
                            style={{ position: "relative", cursor: "text" }}
                            title="Double click để sửa"
                          >
                            {isEditing ? (
                              <div style={{ display: "flex", padding: "0.4rem", background: "rgba(0,0,0,0.8)", border: "1px solid var(--primary)", borderRadius: "4px", position: "absolute", top: "50%", transform: "translateY(-50%)", width: "calc(100% - 10px)", zIndex: 20 }}>
                                <input 
                                  value={editValue} 
                                  onChange={e => setEditValue(e.target.value)}
                                  onKeyDown={e => {
                                    if (e.key === "Enter") saveEdit();
                                    if (e.key === "Escape") setEditCell(null);
                                  }}
                                  autoFocus
                                  style={{ background: "transparent", border: "none", color: "#ffffff", outline: "none", width: "100%", fontSize: "0.875rem" }}
                                />
                              </div>
                            ) : (
                              row[header]?.toString() || "(Trống)"
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="table-caption">Đang hiển thị {Math.min(data.length, 50)} dòng đầu để Preview và chỉnh sửa nhanh. (Lưu để cập nhật toàn bộ vào Master)</p>
          </div>
        )}
      </div>
    </div>
  );
}
