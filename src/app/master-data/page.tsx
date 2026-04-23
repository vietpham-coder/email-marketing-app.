"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { Database, Upload, Download, RefreshCw, Layers, Edit3, Filter, FileText, Check, Trash2, ArrowLeft, ArrowRight } from "lucide-react";
import "../dashboard.css";

export default function MasterDataPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Search & Pagination States
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [totalRecords, setTotalRecords] = useState(0);

  // View States
  const [viewMode, setViewMode] = useState<"all" | "batch">("all");
  const [selectedBatches, setSelectedBatches] = useState<Set<string>>(new Set());
  const [uniqueBatches, setUniqueBatches] = useState<string[]>([]);

  // Inline Edit State
  const [editCell, setEditCell] = useState<{ email: string, field: string } | null>(null);
  const [editValue, setEditValue] = useState("");

  const fetchMasterData = async () => {
    setLoading(true);
    try {
      const url = new URL("/api/master-data", window.location.origin);
      url.searchParams.append("search", searchQuery);
      url.searchParams.append("page", page.toString());
      url.searchParams.append("limit", limit.toString());
      url.searchParams.append("t", Date.now().toString()); // Cache busting

      const res = await fetch(url.toString());
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        setTotalRecords(json.total || json.count);
        
        // Extract unique batches
        const batches = new Set<string>();
        json.data.forEach((row: any) => {
          if (row._batchName) batches.add(row._batchName);
        });
        setUniqueBatches(Array.from(batches));
      }
    } catch (err) {
      console.error("Failed to fetch master data", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMasterData();
    }, 500); // Debounce search
    return () => clearTimeout(timer);
  }, [searchQuery, page, limit]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/master-data/import", {
        method: "POST",
        body: formData
      });
      const json = await res.json();
      
      if (json.success) {
        alert(json.message);
        fetchMasterData(); // Refresh table
      } else {
        alert("Upload failed: " + json.error);
      }
    } catch (err) {
      console.error("Upload error", err);
      alert("An error occurred during upload.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteBatch = async (batchName: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn toàn bộ liên hệ thuộc File "${batchName}" khỏi Master Data không?\n(Dữ liệu sẽ không thể khôi phục)`)) {
      return;
    }
    try {
      const res = await fetch("/api/master-data/delete-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchName })
      });
      const json = await res.json();
      if (json.success) {
        alert(json.message);
        setSelectedBatches(prev => {
          const next = new Set(prev);
          next.delete(batchName);
          return next;
        });
        fetchMasterData();
      } else {
        alert("Xóa thất bại: " + json.error);
      }
    } catch (e) {
      console.error("Delete Error", e);
      alert("Đã xảy ra lỗi mạng!");
    }
  };

  const handleBatchToggle = (batchName: string) => {
    setSelectedBatches(prev => {
      const next = new Set(prev);
      if (next.has(batchName)) next.delete(batchName);
      else next.add(batchName);
      return next;
    });
  };

  const startEdit = (email: string, field: string, currentValue: string) => {
    // Only allow editing if we have an email primary key
    if (!email) return;
    setEditCell({ email, field });
    setEditValue(currentValue || "");
  };

  const saveEdit = async () => {
    if (!editCell) return;
    const { email, field } = editCell;
    const val = editValue;
    
    // Optimistic UI Update
    setData(prev => prev.map(row => 
      row.email === email ? { ...row, [field]: val } : row
    ));
    setEditCell(null);

    // Persist
    try {
      const res = await fetch("/api/master-data/edit", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, field, value: val })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
    } catch (err) {
      console.error("Edit failed", err);
      alert("Failed to save edit.");
      fetchMasterData(); // Revert Optimistic Update
    }
  };

  // Determine which data to render based on viewMode
  const renderData = useMemo(() => {
    return viewMode === "all" 
      ? data 
      : data.filter(row => row._batchName && selectedBatches.has(row._batchName));
  }, [data, viewMode, selectedBatches]);

  // Dynamically calculate headers from CURRENT renderData only
  const headers = useMemo(() => {
    const headersSet = new Set<string>();
    renderData.forEach(row => {
      Object.keys(row).forEach(k => {
        if (k !== "_batchName") headersSet.add(k);
      });
    });
    
    return Array.from(headersSet).sort((a, b) => {
      if (a.toLowerCase() === 'email') return -1;
      if (b.toLowerCase() === 'email') return 1;
      if (a.toLowerCase() === 'name') return -1;
      if (b.toLowerCase() === 'name') return 1;
      return 0;
    });
  }, [renderData]);

  return (
    <div className="page-container animate-fade-in" style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", paddingBottom: "2rem" }}>
      <div className="dashboard-header flex-between mb-4" style={{ alignItems: 'flex-end', flexShrink: 0 }}>
        <div>
          <h1 className="page-title flex items-center" style={{ gap: "0.5rem" }}>
            <Database size={28} className="text-blue-600" /> API Master Data
          </h1>
          <p className="page-subtitle">Centralized tracker with dynamic columns and batch filtering</p>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div className="search-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Filter size={18} style={{ position: 'absolute', left: '10px', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Tìm kiếm Email hoặc Tên..." 
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
              style={{ padding: '0.6rem 1rem 0.6rem 2.2rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)', color: 'var(--text-main)', width: '250px' }}
            />
          </div>

          <input 
            type="file" 
            accept=".xlsx, .xls, .csv" 
            ref={fileInputRef} 
            style={{ display: "none" }} 
            onChange={handleFileUpload} 
          />
          <button 
            className="btn-secondary" 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Upload size={18} />
            {uploading ? "Uploading..." : "Import Excel"}
          </button>
          
          <a href="/api/master-data/export" target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ textDecoration: 'none' }}>
            <Download size={18} />
            Download Master Excel
          </a>
        </div>
      </div>

      <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem", flexShrink: 0 }}>
        <button 
          className={`tab-btn ${viewMode === "all" ? "active" : ""}`} 
          style={{ background: viewMode === "all" ? "rgba(255,87,34,0.1)" : "transparent", padding: "0.5rem 1rem", border: "1px solid", borderColor: viewMode === "all" ? "var(--primary)" : "var(--border-color)", borderRadius: "8px", color: viewMode === "all" ? "var(--primary)" : "var(--text-muted)", cursor: "pointer", fontWeight: 600 }}
          onClick={() => setViewMode("all")}
        >
          Tất cả Data (View All)
        </button>
        <button 
          className={`tab-btn ${viewMode === "batch" ? "active" : ""}`} 
          style={{ background: viewMode === "batch" ? "rgba(255,87,34,0.1)" : "transparent", padding: "0.5rem 1rem", border: "1px solid", borderColor: viewMode === "batch" ? "var(--primary)" : "var(--border-color)", borderRadius: "8px", color: viewMode === "batch" ? "var(--primary)" : "var(--text-muted)", cursor: "pointer", fontWeight: 600 }}
          onClick={() => setViewMode("batch")}
        >
          Xem theo đợt Upload (Batch Filter)
        </button>
      </div>

      <div style={{ display: "flex", gap: "1.5rem", flex: 1, minHeight: 0, paddingBottom: "1rem" }}>
        {viewMode === "batch" && (
          <div className="premium-card p-4" style={{ width: "320px", flexShrink: 0, overflowY: "auto", border: "1px solid var(--border-color)" }}>
            <div className="flex items-center gap-2 mb-4" style={{ color: "var(--text-main)", fontWeight: 600 }}>
              <Filter size={18}/> Chọn & Quản lý thư mục
            </div>
            {uniqueBatches.length === 0 ? (
              <p className="text-muted" style={{ fontSize: "0.875rem" }}>Chưa có file nào từng được tải lên hoặc ghi nhận _batchName.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {uniqueBatches.map(batch => (
                  <div key={batch} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem", background: "rgba(255,255,255,0.02)", borderRadius: "6px", border: selectedBatches.has(batch) ? "1px solid var(--primary)" : "1px solid var(--border-color)" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", flex: 1, minWidth: 0 }}>
                      <input 
                        type="checkbox" 
                        checked={selectedBatches.has(batch)}
                        onChange={() => handleBatchToggle(batch)}
                        style={{ cursor: "pointer" }}
                      />
                      <FileText size={16} className={selectedBatches.has(batch) ? "text-primary" : "text-muted"} />
                      <span style={{ fontSize: "0.875rem", color: "var(--text-main)", flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {batch}
                      </span>
                    </label>
                    <button 
                      onClick={() => handleDeleteBatch(batch)}
                      style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", opacity: 0.8, padding: "4px" }}
                      title="Xóa vĩnh viễn File này"
                      className="hover:scale-110 transition-transform"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="premium-card p-0 overflow-hidden relative" style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <div className="flex-between p-4" style={{ borderBottom: "1px solid var(--border-color)", background: "rgba(0,0,0,0.02)", flexShrink: 0 }}>
            <h3 className="font-semibold flex items-center gap-2">
              <Layers size={18}/> Data Grid ({renderData.length} records)
            </h3>
            <div style={{ fontSize: "0.875rem", color: "var(--text-muted)", fontStyle: "italic", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Edit3 size={14} /> Double-click bất kỳ ô nào để chỉnh sửa trực tiếp
              <button className="btn-secondary" onClick={fetchMasterData} disabled={loading} style={{ padding: "0.4rem", borderRadius: "8px", marginLeft: "1rem" }}>
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              </button>
            </div>
          </div>
          
          <div style={{ flex: 1, overflow: "auto" }}>
            {loading ? (
              <div className="p-8 text-center text-muted">Loading data...</div>
            ) : renderData.length === 0 ? (
              <div className="p-8 text-center text-muted">
                {viewMode === "batch" && selectedBatches.size === 0 
                  ? "Vui lòng chọn ít nhất một thư mục Upload ở bên trái để xem dữ liệu." 
                  : "No contacts found or matched the filter."}
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, minWidth: "1200px" }}>
                <thead style={{ background: "var(--bg-card)", position: "sticky", top: 0, zIndex: 10, boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
                  <tr>
                    {headers.map(header => (
                      <th key={header} style={{ padding: "1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: 600, color: "var(--text-color)", borderBottom: "2px solid var(--border-color)", background: "var(--bg-surface)" }}>
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {renderData.map((row, idx) => (
                    <tr key={idx} style={{ transition: "background 0.1s" }} className="hover:bg-[rgba(255,255,255,0.03)] cursor-default">
                      {headers.map(header => {
                        const isEditing = editCell?.email === row.email && editCell?.field === header;
                        return (
                          <td 
                            key={header} 
                            style={{ padding: "0", fontSize: "0.875rem", color: "var(--text-main)", whiteSpace: "nowrap", borderBottom: "1px solid var(--border-color)", position: "relative" }}
                            onDoubleClick={() => startEdit(row.email, header, row[header])}
                          >
                            {isEditing ? (
                              <div style={{ display: "flex", padding: "0.5rem", background: "rgba(0,0,0,0.8)", border: "1px solid var(--primary)", borderRadius: "4px", position: "absolute", top: "50%", transform: "translateY(-50%)", width: "calc(100% - 10px)", zIndex: 20 }}>
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
                                <button onClick={saveEdit} style={{ background: "none", border: "none", color: "var(--primary)", cursor: "pointer" }}><Check size={16}/></button>
                              </div>
                            ) : (
                              <div style={{ padding: "1rem", minHeight: "45px", display: "flex", alignItems: "center", opacity: row[header] ? 1 : 0.5, cursor: "pointer" }}>
                                {row[header]?.toString() || "(Trống)"}
                              </div>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="pagination-footer flex-between p-4" style={{ borderTop: "1px solid var(--border-color)", background: "rgba(0,0,0,0.02)", flexShrink: 0 }}>
            <div className="text-muted text-sm font-medium">
              Hiển thị <span style={{ color: "var(--text-main)" }}>{renderData.length}</span> trong <span style={{ color: "var(--text-main)" }}>{totalRecords}</span> bản ghi
            </div>
            
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-color)", borderRadius: "8px", overflow: "hidden" }}>
                <button 
                  className="hover:bg-[rgba(255,255,255,0.05)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  style={{ padding: "0.5rem", background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                  disabled={page === 1 || loading}
                  onClick={() => setPage(prev => Math.max(1, prev - 1))}
                  title="Trang trước"
                >
                  <ArrowLeft size={20} style={{ color: "var(--text-main)" }} />
                </button>
                
                <div style={{ padding: "0.5rem 1rem", borderLeft: "1px solid var(--border-color)", borderRight: "1px solid var(--border-color)", fontSize: "0.875rem", fontWeight: 600, minWidth: "100px", textAlign: "center" }}>
                  Trang {page} / {Math.ceil(totalRecords / limit) || 1}
                </div>
                
                <button 
                  className="hover:bg-[rgba(255,255,255,0.05)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  style={{ padding: "0.5rem", background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                  disabled={page * limit >= totalRecords || loading}
                  onClick={() => setPage(prev => prev + 1)}
                  title="Trang sau"
                >
                  <ArrowRight size={20} style={{ color: "var(--text-main)" }} />
                </button>
              </div>

              <select 
                value={limit} 
                onChange={e => { setLimit(parseInt(e.target.value)); setPage(1); }}
                style={{ padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-surface)", color: "var(--text-main)", fontSize: "0.875rem", fontWeight: 500, cursor: "pointer", outline: "none" }}
              >
                <option value={20}>20 bản ghi/trang</option>
                <option value={50}>50 bản ghi/trang</option>
                <option value={100}>100 bản ghi/trang</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
