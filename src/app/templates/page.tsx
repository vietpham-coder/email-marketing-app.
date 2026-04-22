"use client";

import { useState, useRef, useEffect } from "react";
import { Save, AlignLeft, Bold, Italic, Link as LinkIcon, Image as ImageIcon, Paperclip, X, Plus, Edit2, Trash2, ChevronLeft, LayoutTemplate } from "lucide-react";
import "./templates.css";
import { Attachment, EmailTemplate } from "@/lib/templateStorage";

export default function TemplatesPage() {
  const [viewMode, setViewMode] = useState<"list" | "edit">("list");
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Editor State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const editorRef = useRef<HTMLDivElement>(null);
  
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/templates");
      const data = await res.json();
      if (data.success) {
        setTemplates(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const openEditor = (template?: EmailTemplate) => {
    if (template) {
      setEditingId(template.id);
      setName(template.name);
      setSubject(template.subject);
      setAttachments(template.attachments || []);
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.innerHTML = template.bodyHtml;
        }
      }, 50); // small delay to ensure ref mounts
    } else {
      setEditingId(null);
      setName("");
      setSubject("");
      setAttachments([]);
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.innerHTML = "Hi {{Name}},<br/><br/>...";
        }
      }, 50);
    }
    setViewMode("edit");
  };

  const closeEditor = () => {
    setViewMode("list");
  };

  const handleSave = async () => {
    if (!name.trim() || !subject.trim()) {
      alert("Please provide both Template Name and Subject.");
      return;
    }

    const finalHtml = editorRef.current?.innerHTML || "";
    const payload = {
      name,
      subject,
      bodyHtml: finalHtml,
      attachments,
    };

    try {
      if (editingId) {
        await fetch(`/api/templates/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      } else {
        await fetch("/api/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      }
      
      alert("Template saved successfully!");
      fetchTemplates();
      setViewMode("list");
    } catch (err) {
      console.error("Failed to save template", err);
      alert("Failed to save template.");
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this template?")) return;

    try {
      await fetch(`/api/templates/${id}`, { method: "DELETE" });
      fetchTemplates();
    } catch (err) {
      console.error("Failed to delete", err);
    }
  };

  const execCommand = (cmd: string, value: string = "") => {
    document.execCommand(cmd, false, value);
    editorRef.current?.focus();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Url = event.target?.result as string;
        editorRef.current?.focus();
        document.execCommand("insertImage", false, base64Url);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach((file) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64Url = event.target?.result as string;
          setAttachments(prev => [
            ...prev, 
            { name: file.name, size: file.size, type: file.type, base64: base64Url }
          ]);
        };
        reader.readAsDataURL(file);
      });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };
  
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="page-container animate-fade-in">
      {viewMode === "list" ? (
        <>
          <div className="page-header">
            <div>
              <h1 className="page-title">Email Templates</h1>
              <p className="page-subtitle">Manage your reusable email content.</p>
            </div>
            <button className="btn-primary" onClick={() => openEditor()}>
              <Plus size={18} />
              New Template
            </button>
          </div>

          {isLoading ? (
            <div className="text-muted mt-6">Loading templates...</div>
          ) : templates.length === 0 ? (
            <div className="empty-state">
              <LayoutTemplate size={64} className="empty-state-icon" />
              <h3 className="text-xl font-semibold text-main mb-2">No Templates Found</h3>
              <p className="text-muted mb-6">Create your first template to speed up your email campaigns.</p>
              <button className="btn-primary" onClick={() => openEditor()}>
                <Plus size={18} /> Create Template
              </button>
            </div>
          ) : (
            <div className="template-grid">
              {templates.map(tpl => (
                <div key={tpl.id} className="premium-card template-card hover-scale" onClick={() => openEditor(tpl)}>
                  <div>
                    <div className="template-card-header">
                      <div>
                        <h3 className="template-card-title">{tpl.name}</h3>
                        <p className="template-card-meta">Updated: {new Date(tpl.updatedAt).toLocaleDateString()}</p>
                      </div>
                      {tpl.attachments?.length > 0 && (
                        <div className="badge" style={{ backgroundColor: "rgba(255,255,255,0.1)", padding: "0.25rem 0.5rem", borderRadius: "4px", fontSize: "0.75rem" }}>
                          <Paperclip size={12} style={{ display: "inline", marginRight: "4px" }}/> 
                          {tpl.attachments.length}
                        </div>
                      )}
                    </div>
                    <div className="text-muted" style={{ fontSize: "0.875rem", fontStyle: "italic", marginBottom: "1rem" }}>
                      "{tpl.subject}"
                    </div>
                  </div>
                  <div className="template-card-footer">
                    <button className="btn-icon" onClick={(e) => { e.stopPropagation(); openEditor(tpl); }}>
                      <Edit2 size={14} /> Chỉnh sửa
                    </button>
                    <button className="btn-icon danger" onClick={(e) => handleDelete(tpl.id, e)}>
                      <Trash2 size={14} /> Xóa
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="page-header" style={{ marginBottom: "1rem" }}>
            <div>
              <button 
                className="text-muted hover:text-main" 
                style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "none", border: "none", cursor: "pointer", padding: "0.5rem 0", marginBottom: "0.5rem" }}
                onClick={closeEditor}
              >
                <ChevronLeft size={16} /> Back to Templates
              </button>
              <h1 className="page-title">{editingId ? "Edit Template" : "New Template"}</h1>
            </div>
            <button className="btn-primary" onClick={handleSave}>
              <Save size={18} />
              Save Template
            </button>
          </div>

          <div className="template-editor premium-card animate-fade-in">
            <div className="editor-group">
              <label className="editor-label">Template Name (Internal Reference)</label>
              <input 
                type="text" 
                className="editor-input" 
                placeholder="e.g. Initial Sales Pitch, Weekly Newsletter..."
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="editor-group">
              <label className="editor-label">Email Subject Line</label>
              <input 
                type="text" 
                className="editor-input" 
                placeholder="e.g. You're invited to our exclusive webinar, {{Name}}!"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
              <span className="helper-text">Tip: Use double brackets like {'{{Name}}'} for personalized fields.</span>
            </div>

            <div className="editor-group">
              <label className="editor-label">Email Body</label>
              <div className="rich-editor">
                <div className="editor-toolbar">
                  <button className="toolbar-btn" onClick={() => execCommand('bold')} title="Bold"><Bold size={16} /></button>
                  <button className="toolbar-btn" onClick={() => execCommand('italic')} title="Italic"><Italic size={16} /></button>
                  <button className="toolbar-btn" onClick={() => execCommand('justifyLeft')} title="Align Left"><AlignLeft size={16} /></button>
                  <div className="toolbar-divider"></div>
                  <button className="toolbar-btn" onClick={() => {
                    const url = prompt('Enter link URL:', 'https://');
                    if (url) execCommand('createLink', url);
                  }} title="Insert Link"><LinkIcon size={16} /></button>
                  <button className="toolbar-btn" onClick={() => imageInputRef.current?.click()} title="Insert Image">
                    <ImageIcon size={16} />
                  </button>
                  <input type="file" accept="image/*" hidden ref={imageInputRef} onChange={handleImageUpload} />
                </div>
                <div 
                  className="editor-textarea content-editable"
                  contentEditable={true}
                  ref={editorRef}
                  suppressContentEditableWarning={true}
                >
                </div>
              </div>
            </div>

            <div className="editor-group">
              <label className="editor-label">Attachments</label>
              <div className="attachments-list">
                {attachments.map((file, index) => (
                  <div key={index} className="attachment-item hover-scale">
                    <div className="attachment-info">
                      <Paperclip size={14} className="text-muted" />
                      <span className="attachment-name">{file.name}</span>
                      <span className="attachment-size">({formatBytes(file.size)})</span>
                    </div>
                    <button className="attachment-remove" onClick={() => removeAttachment(index)} title="Remove attachment">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <button className="btn-secondary btn-small mt-2" onClick={() => fileInputRef.current?.click()}>
                <Paperclip size={16} />
                Add Attachment
              </button>
              <input type="file" multiple hidden ref={fileInputRef} onChange={handleAttachmentUpload} />
            </div>
            
            <div className="editor-group">
              <label className="editor-label">Variables Preview</label>
              <div className="variables-list">
                <span className="variable-tag">{'{'}{'{'}Name{'}'}{'}'}</span>
                <span className="variable-tag">{'{'}{'{'}Company{'}'}{'}'}</span>
                <span className="variable-tag">{'{'}{'{'}Title{'}'}{'}'}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
