"use client";

import { Save, Server, Shield, Mail } from "lucide-react";
import "./settings.css";

export default function SettingsPage() {
  const handleSave = () => {
    alert("Settings saved! (Note: Core SMTP settings must be updated in .env.local)");
  };

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage your Email Marketing App configuration.</p>
        </div>
        <button className="btn-primary" onClick={handleSave}>
          <Save size={18} />
          Save Changes
        </button>
      </div>

      <div className="settings-grid">
        <div className="premium-card setting-section">
          <div className="section-header">
            <Server className="section-icon" size={20} />
            <h3>SMTP Configuration</h3>
          </div>
          <p className="text-muted mb-4 text-sm">
            Due to security reasons, core mailing credentials (SMTP Server, Password) are configured entirely via the <code>.env.local</code> file on your machine.
          </p>
          <div className="settings-form">
            <div className="form-group">
              <label>SMTP Host</label>
              <input type="text" value="smtp.gmail.com" disabled title="Edit in .env.local" />
            </div>
            <div className="form-group">
              <label>SMTP Port</label>
              <input type="text" value="587" disabled title="Edit in .env.local" />
            </div>
          </div>
        </div>

        <div className="premium-card setting-section">
          <div className="section-header">
            <Shield className="section-icon" size={20} />
            <h3>Tracking Preferences</h3>
          </div>
          <p className="text-muted mb-4 text-sm">
            Control how user behavior is explicitly tracked within this marketing application.
          </p>
          <div className="settings-form">
            <div className="form-switch">
              <label className="switch">
                <input type="checkbox" defaultChecked />
                <span className="slider round"></span>
              </label>
              <div>
                <span>Enable Open Tracking (1x1 Pixel)</span>
                <p className="text-xs text-muted mt-1">Embeds an invisible image to track if recipient read your mail.</p>
              </div>
            </div>
            <div className="form-switch mt-4">
              <label className="switch">
                <input type="checkbox" defaultChecked />
                <span className="slider round"></span>
              </label>
              <div>
                <span>Collect Detailed Timestamps</span>
                <p className="text-xs text-muted mt-1">Calculates 'Time elapsed' by tracking exact moments of action.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
