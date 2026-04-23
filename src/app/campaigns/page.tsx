"use client";

import { useState, useEffect, useMemo } from "react";
import { Send, Users, FileText, CheckCircle, ChevronRight, FastForward, Layers, Filter, RefreshCw, Trash2, Clock } from "lucide-react";
import "./campaigns.css";

export default function CampaignsPage() {
  const [step, setStep] = useState(1);
  const [isSending, setIsSending] = useState(false);

  // Context loading state
  const [loadingContext, setLoadingContext] = useState(true);
  const [viewMode, setViewMode] = useState<"new" | "history">("new");
  const [historyCampaigns, setHistoryCampaigns] = useState<any[]>([]);

  // Step 1: Audience Master Data
  const [masterData, setMasterData] = useState<any[]>([]);
  const [uniqueBatches, setUniqueBatches] = useState<string[]>([]);
  const [selectedBatches, setSelectedBatches] = useState<Set<string>>(new Set());
  const [contacts, setContacts] = useState<any[]>([]);

  // Step 2: Templates
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [templateData, setTemplateData] = useState<{subject:string, bodyHtml:string, attachments:any[], name: string} | null>(null);

  // Step 3: Review Queue
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sentCount, setSentCount] = useState(0);

  // Fetch contextual master data and templates on mount
  useEffect(() => {
    const fetchContext = async () => {
      setLoadingContext(true);
      try {
        const [mdRes, tplRes, campRes] = await Promise.all([
          fetch("/api/master-data"),
          fetch("/api/templates"),
          fetch("/api/campaigns")
        ]);

        const mdJson = await mdRes.json();
        const tplJson = await tplRes.json();
        const campJson = await campRes.json();

        if (campJson.success) {
          setHistoryCampaigns(campJson.data);
        }

        if (mdJson.success) {
          setMasterData(mdJson.data);
          const batches = new Set<string>();
          mdJson.data.forEach((row: any) => {
            if (row._batchName) batches.add(row._batchName);
          });
          setUniqueBatches(Array.from(batches));
        }

        if (tplJson.success) {
          setTemplates(tplJson.data);
        }
      } catch (err) {
        console.error("Failed to fetch context", err);
      } finally {
        setLoadingContext(false);
      }
    };
    fetchContext();
  }, []);

  // Sync contacts when batch selection changes
  const contactsList = useMemo(() => {
    if (selectedBatches.size === 0) return [];
    return masterData
      .filter((c: any) => c._batchName && selectedBatches.has(c._batchName) && (c.email || c.Email))
      .map((c: any) => ({ ...c, _status: "pending" }));
  }, [selectedBatches, masterData]);

  // Keep a local state for status updates (since status changes during send)
  useEffect(() => {
    setContacts(contactsList);
  }, [contactsList]);

  const handleBatchToggle = (batchName: string) => {
    setSelectedBatches(prev => {
      const next = new Set(prev);
      if (next.has(batchName)) next.delete(batchName);
      else next.add(batchName);
      return next;
    });
  };

  const handleSelectTemplate = (tpl: any) => {
    setSelectedTemplateId(tpl.id);
    setTemplateData({
      name: tpl.name,
      subject: tpl.subject,
      bodyHtml: tpl.bodyHtml,
      attachments: tpl.attachments || []
    });
  };

  const parseTemplate = (template: string, data: any) => {
    if (!template) return "";
    let parsed = template;
    for (const key in data) {
      const exactKey = Object.keys(data).find(k => k.toLowerCase() === key.toLowerCase()) || key;
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, "gi");
      parsed = parsed.replace(regex, data[exactKey] || "");
    }
    // Also clear empty unmatched variables to look neat
    parsed = parsed.replace(/{{\s*[a-zA-Z0-9_]+\s*}}/g, "");
    return parsed;
  };

  const updateContactStatus = (index: number, status: string) => {
    setContacts(prev => prev.map((c, i) => i === index ? { ...c, _status: status } : c));
  };

  const handleNextContact = () => {
    if (currentIndex + 1 >= contacts.length) {
      setStep(4);
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handleSkipContact = () => {
    updateContactStatus(currentIndex, "skipped");
    handleNextContact();
  };

  const handleSendSingle = async () => {
    if (!templateData || contacts.length === 0 || currentIndex >= contacts.length) return;
    
    setIsSending(true);
    const contact = contacts[currentIndex];
    const emailToConnect = contact.Email || contact.email;
    
    try {
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: `camp-${Date.now()}`,
          campaignName: `Manual Blast - ${templateData.name}`,
          contacts: [contact],
          subjectTemplate: templateData.subject,
          bodyTemplate: templateData.bodyHtml,
          attachments: templateData.attachments,
          // Infer followup based on previous interactions if possible, defaulting to generic blast logic
          isFollowUp: false 
        })
      });
      const result = await res.json();
      if (result.success) {
        setSentCount(prev => prev + 1);
        updateContactStatus(currentIndex, "success");
      } else {
        updateContactStatus(currentIndex, "failed");
        alert("Có lỗi khi gửi tới " + emailToConnect);
      }
    } catch (e) {
      console.error("Failed to send", e);
      updateContactStatus(currentIndex, "failed");
      alert("Có lỗi kết nối mạng!");
    }
    
    setIsSending(false);
    handleNextContact();
  };

  const currentContact = contacts[currentIndex];

  const columns = useMemo(() => {
    if (contacts.length === 0) return [];
    const keysSet = new Set<string>();
    contacts.forEach(c => {
      Object.keys(c).forEach(k => {
        if (k !== '_status' && k !== '_batchName') keysSet.add(k);
      });
    });
    
    return Array.from(keysSet).sort((a, b) => {
      if (a.toLowerCase() === 'email') return -1;
      if (b.toLowerCase() === 'email') return 1;
      if (a.toLowerCase() === 'name') return -1;
      if (b.toLowerCase() === 'name') return 1;
      return 0;
    });
  }, [contacts]);

  const handleDeleteCampaign = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn chiến dịch "${name}" khỏi hệ thống?\n(Khách hàng đã nhận mail sẽ không bị thu hồi, nhưng báo cáo chiến dịch này sẽ không còn)`)) {
      return;
    }
    try {
      const res = await fetch("/api/campaigns/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      const json = await res.json();
      if (json.success) {
        setHistoryCampaigns(prev => prev.filter(c => c.id !== id));
      } else {
        alert("Lỗi: " + json.error);
      }
    } catch (e) {
      console.error(e);
      alert("Lỗi kết nối.");
    }
  };

  if (loadingContext) {
    return (
      <div className="page-container flex items-center justify-center min-h-[60vh]">
        <div className="text-muted flex flex-col items-center gap-4">
          <RefreshCw className="animate-spin text-primary" size={32} />
          <span>Đang tải thông tin từ Master Data & Templates...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header" style={{ marginBottom: "1.5rem" }}>
        <div>
          <h1 className="page-title">Campaigns</h1>
          <p className="page-subtitle">Duyệt & Gửi Email Thủ Công với dữ liệu trực tiếp.</p>
        </div>
      </div>

      <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
        <button 
          className={`tab-btn ${viewMode === "new" ? "active" : ""}`} 
          style={{ background: viewMode === "new" ? "rgba(255,87,34,0.1)" : "transparent", padding: "0.5rem 1rem", border: "1px solid", borderColor: viewMode === "new" ? "var(--primary)" : "var(--border-color)", borderRadius: "8px", color: viewMode === "new" ? "var(--primary)" : "var(--text-muted)", cursor: "pointer", fontWeight: 600, display: "flex", gap: "0.5rem", alignItems: "center" }}
          onClick={() => setViewMode("new")}
        >
          <Send size={16}/> Tạo Chiến Dịch Mới
        </button>
        <button 
          className={`tab-btn ${viewMode === "history" ? "active" : ""}`} 
          style={{ background: viewMode === "history" ? "rgba(255,87,34,0.1)" : "transparent", padding: "0.5rem 1rem", border: "1px solid", borderColor: viewMode === "history" ? "var(--primary)" : "var(--border-color)", borderRadius: "8px", color: viewMode === "history" ? "var(--primary)" : "var(--text-muted)", cursor: "pointer", fontWeight: 600, display: "flex", gap: "0.5rem", alignItems: "center" }}
          onClick={() => setViewMode("history")}
        >
          <Clock size={16}/> Lịch Sử & Quản Lý
        </button>
      </div>

      {viewMode === "history" && (
        <div className="premium-card p-0 overflow-hidden animate-fade-in">
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
            <thead style={{ background: "var(--bg-card)" }}>
              <tr>
                <th style={{ padding: "1rem", textAlign: "left", fontSize: "0.875rem", color: "var(--text-color)", borderBottom: "1px solid var(--border-color)" }}>Tên Chiến Dịch</th>
                <th style={{ padding: "1rem", textAlign: "left", fontSize: "0.875rem", color: "var(--text-color)", borderBottom: "1px solid var(--border-color)" }}>Ngày Tạo</th>
                <th style={{ padding: "1rem", textAlign: "left", fontSize: "0.875rem", color: "var(--text-color)", borderBottom: "1px solid var(--border-color)" }}>Số Khách</th>
                <th style={{ padding: "1rem", textAlign: "center", fontSize: "0.875rem", color: "var(--text-color)", borderBottom: "1px solid var(--border-color)" }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {historyCampaigns.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center p-8 text-muted">Chưa có chiến dịch nào được lưu trên hệ thống.</td>
                </tr>
              ) : historyCampaigns.map((c) => (
                <tr key={c.id} className="hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                  <td style={{ padding: "1rem", borderBottom: "1px solid var(--border-color)" }}>
                    <div className="font-semibold" style={{ color: "var(--text-main)" }}>{c.campaignName}</div>
                    <div className="text-xs text-muted">ID: {c.id}</div>
                  </td>
                  <td style={{ padding: "1rem", borderBottom: "1px solid var(--border-color)", color: "var(--text-muted)", fontSize: "0.875rem" }}>
                    {new Date(c.createdAt).toLocaleString()}
                  </td>
                  <td style={{ padding: "1rem", borderBottom: "1px solid var(--border-color)", color: "var(--text-muted)" }}>
                    {c.audience?.length || 0} người
                  </td>
                  <td style={{ padding: "1rem", borderBottom: "1px solid var(--border-color)", textAlign: "center" }}>
                    <button 
                      title="Xóa Chiến Dịch"
                      style={{ background: "rgba(239, 68, 68, 0.1)", color: "var(--danger)", padding: "0.5rem", borderRadius: "6px", cursor: "pointer", border: "1px solid rgba(239, 68, 68, 0.2)" }}
                      className="hover:scale-105 transition-transform"
                      onClick={() => handleDeleteCampaign(c.id, c.campaignName)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {viewMode === "new" && (
        <div className="animate-fade-in">
          <div className="stepper-container">
        <div className={`step ${step >= 1 ? "active" : ""}`}>
          <div className="step-number"><Users size={16} /></div>
          <span>Khán giả (Audience)</span>
        </div>
        <div className="step-divider" />
        <div className={`step ${step >= 2 ? "active" : ""}`}>
          <div className="step-number"><FileText size={16} /></div>
          <span>Mẫu (Template)</span>
        </div>
        <div className="step-divider" />
        <div className={`step ${step >= 3 ? "active" : ""}`}>
          <div className="step-number"><CheckCircle size={16} /></div>
          <span>Duyệt & Gửi (Review)</span>
        </div>
      </div>

      <div className="campaign-content premium-card">
        {step === 1 && (
          <div className="step-content animate-fade-in">
            <h2>Chọn danh sách người nhận</h2>
            <p className="text-muted">Lọc và gộp các tập khách hàng từ hệ thống thẻ gốc Master Data mà không tốn công upload file mới.</p>
            
            <div className="mt-4 flex gap-6">
              <div style={{ flex: "0 0 300px", borderRight: "1px solid var(--border-color)", paddingRight: "1.5rem" }}>
                <h4 className="flex items-center gap-2 mb-4 text-main"><Filter size={16}/> Nguồn Dữ Liệu (Batches)</h4>
                {uniqueBatches.length === 0 ? (
                  <p className="text-muted text-sm italic">Master Data hiện đang trống trống.</p>
                ) : (
                  <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto">
                    {uniqueBatches.map(batch => (
                      <label key={batch} style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", padding: "0.5rem", background: selectedBatches.has(batch) ? "rgba(255,87,34,0.1)" : "rgba(255,255,255,0.02)", borderRadius: "6px", border: selectedBatches.has(batch) ? "1px solid var(--primary)" : "1px solid var(--border-color)", transition: "all 0.2s" }}>
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
                    ))}
                  </div>
                )}
              </div>
              
              <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", background: "rgba(0,0,0,0.02)", borderRadius: "8px", border: "1px dashed var(--border-color)" }}>
                {contacts.length === 0 ? (
                  <div className="text-muted text-center p-8">
                     <Users size={48} style={{ opacity: 0.3, margin: "0 auto 1rem auto"}} />
                     <p>Hãy tích chọn tệp nguồn ở bên trái để nạp danh sách vào cỗ máy.</p>
                  </div>
                ) : (
                  <div className="text-center p-8">
                    <CheckCircle size={48} className="text-success" style={{ margin: "0 auto 1rem auto"}}/>
                    <h3 className="text-main mb-2">Đã chuẩn bị sẵn sàng</h3>
                    <p className="text-muted">Tổng cộng có <strong className="text-primary">{contacts.length} địa chỉ Email hợp lệ</strong> trong tệp gộp.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="step-actions mt-6">
              <button disabled className="btn-secondary">Quay lại</button>
              <button className="btn-primary" onClick={() => setStep(2)} disabled={contacts.length === 0}>
                Bước tiếp theo <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="step-content animate-fade-in">
            <h2>Chọn cấu hình nội dung Template thư</h2>
            <p className="text-muted">Hệ thống nạp trực tiếp thiết kế từ giao diện quản lý Templates chuyên dụng.</p>
            
            <div className="template-grid mt-4" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
              {templates.length === 0 ? (
                <div className="text-muted bg-surface rounded p-6 text-center border dashed col-span-full">
                   Bạn chưa tạo bất cứ mẫu Email nào rỗng. Hãy quay lại thẻ Templates để thiết kế nhé.
                </div>
              ) : templates.map(tpl => {
                const isSelected = selectedTemplateId === tpl.id;
                return (
                  <div 
                    key={tpl.id} 
                    className={`premium-card cursor-pointer hover-scale`} 
                    style={{ 
                      padding: "1rem", 
                      border: isSelected ? "2px solid var(--primary)" : "1px solid var(--border-color)",
                      background: isSelected ? "rgba(255,87,34,0.05)" : "var(--bg-surface)"
                    }}
                    onClick={() => handleSelectTemplate(tpl)}
                  >
                    <div className="flex-between mb-2">
                       <h3 className="text-main font-semibold" style={{ fontSize: "1rem" }}>{tpl.name}</h3>
                       {isSelected && <CheckCircle size={18} className="text-primary"/>}
                    </div>
                    <p className="text-muted text-sm italic mb-2">"{tpl.subject}"</p>
                    {tpl.attachments?.length > 0 && (
                      <span className="badge" style={{ fontSize: "0.75rem", background: "rgba(255,255,255,0.05)", padding: "0.2rem 0.5rem", borderRadius: "4px" }}>
                        📎 {tpl.attachments.length} tệp đính kèm
                      </span>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="step-actions mt-6">
              <button className="btn-secondary" onClick={() => setStep(1)}>Quay lại</button>
              <button className="btn-primary" onClick={() => setStep(3)} disabled={!templateData}>
                Bắt đầu Duyệt <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="step-content animate-fade-in">
            <div className="flex-between mb-4">
              <h2>Trạm Kiểm Duyệt & Gửi </h2>
              <span className="font-semibold text-primary" style={{ padding: "0.5rem 1rem", background: "rgba(255,87,34,0.1)", borderRadius: "20px" }}>Liên hệ {currentIndex + 1} / {contacts.length}</span>
            </div>
            <p className="text-muted border-b pb-4 border-slate-700">Hãy đọc cẩn thận và soát lại biến số dữ liệu ({`{{Name}}`}, v.v..) trước khi ấn vào nút phát tin.</p>
            
            {currentContact && (
              <div className="preview-box mt-4" style={{ border: "1px solid var(--border-color)", background: "rgba(255,255,255,0.02)", borderRadius: "8px", overflow: "hidden" }}>
                <div style={{ background: "rgba(0,0,0,0.2)", padding: "1rem", borderBottom: "1px solid var(--border-color)" }}>
                  <div className="preview-row mb-2 text-sm">
                    <span className="text-muted mr-2 w-20 inline-block font-semibold">Tới (To):</span> 
                    <span className="text-main">{currentContact.Email || currentContact.email}</span>
                    {currentContact.Name && <span className="text-muted ml-2">({currentContact.Name})</span>}
                  </div>
                  <div className="preview-row text-sm">
                    <span className="text-muted mr-2 w-20 inline-block font-semibold">Tiêu đề:</span> 
                    <span className="text-main">{parseTemplate(templateData?.subject || "", currentContact)}</span>
                  </div>
                </div>
                
                <div style={{ padding: "1.5rem", background: "#ffffff", color: "#222", fontFamily: "Arial, sans-serif", fontSize: "14px", lineHeight: "1.6" }} dangerouslySetInnerHTML={{ __html: parseTemplate(templateData?.bodyHtml || "", currentContact) }}>
                </div>

                {templateData?.attachments && templateData.attachments.length > 0 && (
                  <div style={{ padding: "1rem", background: "rgba(0,0,0,0.1)", borderTop: "1px dashed var(--border-color)" }}>
                    <span className="font-semibold text-sm mb-2 block text-muted">Tệp sẽ đính kèm ({templateData.attachments.length}):</span>
                    <div className="flex gap-2 text-muted text-sm flex-wrap">
                      {templateData.attachments.map((a, i) => (
                        <span key={i} className="bg-surface px-2 py-1 rounded border shadow-sm">📎 {a.name}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="step-actions mt-6 flex justify-between">
              <button className="btn-secondary" onClick={handleSkipContact} disabled={isSending}>
                <FastForward size={16} /> Bỏ qua (Skip)
              </button>
              <button className="btn-primary" onClick={handleSendSingle} disabled={isSending} style={{ background: "linear-gradient(135deg, #FF9800, #F44336)", boxShadow: "0 4px 14px 0 rgba(255, 87, 34, 0.3)" }}>
                {isSending ? "Đang gửi..." : <><Send size={16} /> Phát Cấu Hình Tới Khách Hàng Này</>}
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="step-content success-state animate-fade-in text-center p-8">
            <div className="flex justify-center mb-6">
              <CheckCircle size={80} className="text-success" />
            </div>
            <h2 className="text-2xl mb-4">Chiến dịch hoàn thành!</h2>
            <p className="text-muted text-lg max-w-lg mx-auto">Tất cả thông điệp đã được gửi trơn tru qua cỗ máy cục bộ. Đã gửi thành công {sentCount} email hợp lệ.</p>
            <div className="mt-8 flex justify-center gap-4">
              <button className="btn-secondary" onClick={() => window.location.href = '/'}>
                Trở về Trang Tổng (Dashboard)
              </button>
              <button className="btn-primary" onClick={() => window.open('/master-data', '_self')}>
                Xem kết quả Tracking Data
              </button>
            </div>
          </div>
        )}
      </div>

      {contacts.length > 0 && (
        <div className="campaign-tracking-section mt-8 premium-card p-0 overflow-hidden relative animate-fade-in" style={{ marginBottom: "2rem" }}>
          <div className="flex-between p-4" style={{ borderBottom: "1px solid var(--border-color)", background: "rgba(0,0,0,0.02)" }}>
            <h3 className="font-semibold flex items-center gap-2">
              <Layers size={18}/> Danh sách Chờ - {contacts.length} liên hệ
            </h3>
          </div>
          <div style={{ overflowX: "auto", maxHeight: "40vh" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1200px" }}>
              <thead style={{ background: "var(--bg-card)", position: "sticky", top: 0, zIndex: 10, boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
                <tr>
                  {columns.map(col => (
                    <th key={col} style={{ padding: "1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: 600, color: "var(--text-color)" }}>
                      {col}
                    </th>
                  ))}
                  <th style={{ padding: "1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: 600, color: "var(--text-color)" }}>Tiến Trình Gửi</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((c, idx) => {
                  const isCurrent = idx === currentIndex && step === 3;
                  return (
                    <tr key={idx} style={{ 
                        borderTop: "1px solid var(--border-color)", 
                        transition: "background 0.2s", 
                        background: isCurrent ? "rgba(255,87,34, 0.05)" : "transparent" 
                      }} 
                      className={`hover-bg-gray-50 ${isCurrent ? "highlighted-row" : ""}`}
                    >
                      {columns.map(col => (
                        <td key={col} style={{ padding: "1rem", fontSize: "0.875rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                          {c[col] || "-"}
                        </td>
                      ))}
                      <td style={{ padding: "1rem", fontSize: "0.875rem", whiteSpace: "nowrap" }}>
                         {isCurrent && c._status === 'pending' ? <span className="status-badge" style={{ background: "rgba(255, 152, 0, 0.2)", color: "#FF9800", padding: "4px 8px", borderRadius: "100px", fontWeight: 600 }}>Tới lượt duyệt</span> :
                            c._status === 'pending' ? <span className="status-badge text-muted">Hàng chờ</span> :
                            c._status === 'success' ? <span className="status-badge" style={{ background: "rgba(76, 175, 80, 0.2)", color: "#4CAF50", padding: "4px 8px", borderRadius: "100px", fontWeight: 600 }}>Thành công</span> :
                            c._status === 'failed' ? <span className="status-badge status-failed" style={{ background: "rgba(239, 68, 68, 0.1)", color: "var(--danger)", padding: "4px 8px", borderRadius: "100px" }}>Bị lỗi mạng</span> :
                            <span className="status-badge" style={{ padding: "4px 8px", background: "rgba(255,255,255,0.1)", borderRadius: "100px" }}>Đã ấn lọc bỏ</span>
                          }
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
        </div>
      )}
    </div>
  );
}
