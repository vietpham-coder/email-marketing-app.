import Link from "next/link";
import { Mail, CheckCircle, Clock, Download, AlertCircle } from "lucide-react";
import "./dashboard.css";
import OverdueActionsBtn from "@/components/OverdueActionsBtn";
import AnalyticsCharts from "@/components/AnalyticsCharts";
import { getCampaigns, getMasterContacts, Interaction } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function Home() {
  // Fetch and calculate data directly on the server (RSC) to improve performance
  const allCampaigns = await getCampaigns();
  const allContacts = await getMasterContacts();
  
  let totalSent = 0;
  let totalOpened = 0;
  let totalHoursElapsed = 0;
  let openedCountWithHours = 0;

  const campaigns = allCampaigns.map(c => {
    let sent = 0;
    let opened = 0;
    Object.keys(c.interactions).forEach(email => {
      const history = c.interactions[email];
      sent += history.length;
      history.forEach((i: Interaction) => {
        if (i.openedAt) {
          opened++;
          if (i.timeElapsedHours !== undefined) {
             totalHoursElapsed += i.timeElapsedHours;
             openedCountWithHours++;
          }
        }
      });
    });
    totalSent += sent;
    totalOpened += opened;

    return {
      id: c.id,
      name: c.campaignName,
      createdAt: c.createdAt,
      totalSent: sent,
      openRate: sent > 0 ? Math.round((opened / sent) * 100) + "%" : "0%"
    };
  });

  const openRateVal = totalSent > 0 ? (totalOpened / totalSent) * 100 : 0;
  const avgOpenTimeVal = openedCountWithHours > 0 ? (totalHoursElapsed / openedCountWithHours).toFixed(1) : "0";

  const stats = {
    totalSent,
    openRate: openRateVal.toFixed(1) + "%",
    avgOpenTime: avgOpenTimeVal + " hrs"
  };

  const interactionMap = new Map<string, { latestCampaign: string, interactions: Interaction[] }>();
  for (const campaign of allCampaigns) {
    for (const email of Object.keys(campaign.interactions)) {
      const interactions = campaign.interactions[email];
      if (!interactions || interactions.length === 0) continue;
      const key = email.toLowerCase();
      const existing = interactionMap.get(key);
      const currentLatestSentAt = new Date(interactions[interactions.length - 1].sentAt).getTime();
      if (!existing) {
        interactionMap.set(key, { latestCampaign: campaign.campaignName, interactions });
      } else {
        const existingLatestSentAt = new Date(existing.interactions[existing.interactions.length - 1].sentAt).getTime();
        if (currentLatestSentAt > existingLatestSentAt) {
          interactionMap.set(key, { latestCampaign: campaign.campaignName, interactions });
        }
      }
    }
  }

  const customers = allContacts.map(contact => {
    const key = contact.email?.toLowerCase();
    const interactionHistory = key ? interactionMap.get(key) : null;
    let nextStepStr = "N/A";
    let readStatus = "No";

    if (interactionHistory && interactionHistory.interactions.length > 0) {
      const interactions = interactionHistory.interactions;
      const latestInteraction = interactions[interactions.length - 1];
      
      if (latestInteraction.openedAt) {
        readStatus = "Yes";
        nextStepStr = "🟢 Nhắc nhở gửi Email chăm sóc hàng tuần";
      } else {
        const daysSinceSent = (new Date().getTime() - new Date(latestInteraction.sentAt).getTime()) / (1000 * 3600 * 24);
        const hasFollowUp = interactions.length > 1;
        if (daysSinceSent >= 7) {
          nextStepStr = "📞 Yêu cầu gọi điện trực tiếp";
        } else if (daysSinceSent >= 5 && hasFollowUp) {
          nextStepStr = "🔴 Yêu cầu nhắn tin qua Linkedin/Whatsapp";
        } else if (daysSinceSent >= 3 && !hasFollowUp) {
          nextStepStr = "🟡 Gửi Email Follow Up";
        } else if (daysSinceSent < 3) {
          nextStepStr = "Đang chờ mở...";
        }
      }
    }

    return {
      email: contact.email,
      name: contact.name || contact.Name || contact.email.split('@')[0],
      campaign: interactionHistory?.latestCampaign || "None",
      readStatus,
      proposedAction: nextStepStr
    };
  });

  return (
    <div className="page-container animate-fade-in">
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Welcome back! Here's your campaign overview.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <a href="/api/export-excel" target="_blank" rel="noopener noreferrer" className="btn-secondary">
            <Download size={18} />
            Export Tracking Report
          </a>
          <Link href="/campaigns" className="btn-primary">
            <Mail size={18} />
            New Campaign
          </Link>
        </div>
      </div>

      <div className="premium-card mb-6 flex-between">
        <div>
          <h3 className="font-semibold" style={{ marginBottom: "0.25rem" }}>Automated Follow-ups (Action Required)</h3>
          <p className="text-muted" style={{ fontSize: "0.875rem" }}>You have contacts needing attention based on the 3-5-7 day rule.</p>
        </div>
        <OverdueActionsBtn />
      </div>

      <div className="stats-grid">
        <div className="premium-card stat-card">
          <div className="stat-icon-wrapper blue">
            <Mail size={24} />
          </div>
          <div className="stat-content">
            <h3>Total Sent</h3>
            <p className="stat-value">{stats.totalSent}</p>
            <span className="stat-trend neutral">All time emails sent</span>
          </div>
        </div>

        <div className="premium-card stat-card">
          <div className="stat-icon-wrapper green">
            <CheckCircle size={24} />
          </div>
          <div className="stat-content">
            <h3>Avg. Open Rate</h3>
            <p className="stat-value">{stats.openRate}</p>
            <span className="stat-trend positive">Across all campaigns</span>
          </div>
        </div>

        <div className="premium-card stat-card">
          <div className="stat-icon-wrapper purple">
            <Clock size={24} />
          </div>
          <div className="stat-content">
            <h3>Avg. Time to Open</h3>
            <p className="stat-value">{stats.avgOpenTime}</p>
            <span className="stat-trend neutral">Time after delivery</span>
          </div>
        </div>
      </div>

      <AnalyticsCharts campaigns={campaigns} />

      <div className="charts-grid mt-6">
        <div className="premium-card chart-container">
          <h3 className="card-title">Campaign Tracking</h3>
          <div className="dashboard-table-wrapper" style={{ maxHeight: "400px", overflowY: "auto" }}>
            <table className="dashboard-table">
              <thead style={{ position: "sticky", top: 0, zIndex: 1, backgroundColor: "var(--bg-surface)" }}>
                <tr>
                  <th>Campaign Name</th>
                  <th>Date Created</th>
                  <th>Total Sent</th>
                  <th>Open Rate</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center text-muted">No campaigns run yet.</td>
                  </tr>
                ) : (
                  campaigns.map((c: any) => (
                    <tr key={c.id}>
                      <td className="font-semibold" style={{ color: "var(--primary)" }}>{c.name}</td>
                      <td>{new Date(c.createdAt).toLocaleDateString()}</td>
                      <td>{c.totalSent} mails</td>
                      <td>{c.openRate}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="premium-card chart-container">
          <h3 className="card-title flex items-center gap-2">
            <AlertCircle size={18} style={{ color: "var(--primary)" }}/> 
            Customer Engagement (Proposed Actions)
          </h3>
          <div className="dashboard-table-wrapper" style={{ maxHeight: "400px", overflowY: "auto" }}>
            <table className="dashboard-table">
              <thead style={{ position: "sticky", top: 0, zIndex: 1, backgroundColor: "var(--bg-surface)" }}>
                <tr>
                  <th>Customer Info</th>
                  <th>Latest Campaign</th>
                  <th>Opened?</th>
                  <th>Äá» xuáº¥t (Proposed Action)</th>
                </tr>
              </thead>
              <tbody>
                {customers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center text-muted">No customers found in master data.</td>
                  </tr>
                ) : (
                  customers.map((c: any, i: number) => (
                    <tr key={i}>
                      <td>
                        <div className="font-semibold">{c.name}</div>
                        <div className="text-muted" style={{ fontSize: "0.75rem" }}>{c.email}</div>
                      </td>
                      <td>{c.campaign}</td>
                      <td>{c.readStatus === "Yes" ? <span style={{ color: "var(--success)", fontWeight: 600 }}>Yes</span> : "No"}</td>
                      <td><span className="badge-proposal">{c.proposedAction}</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
