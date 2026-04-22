import "./dashboard.css";

// This loading component will automatically be shown by Next.js while the Server Component is fetching data.
export default function Loading() {
  return (
    <div className="page-container animate-fade-in" style={{ opacity: 0.7 }}>
      <div className="dashboard-header mb-6">
        <div>
          <div style={{ height: '32px', width: '200px', backgroundColor: 'var(--border-color)', borderRadius: 'var(--radius-sm)', marginBottom: '8px' }} className="skeleton" />
          <div style={{ height: '20px', width: '300px', backgroundColor: 'var(--border-color)', borderRadius: 'var(--radius-sm)' }} className="skeleton" />
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ height: '40px', width: '150px', backgroundColor: 'var(--border-color)', borderRadius: 'var(--radius-md)' }} className="skeleton" />
          <div style={{ height: '40px', width: '150px', backgroundColor: 'var(--border-color)', borderRadius: 'var(--radius-md)' }} className="skeleton" />
        </div>
      </div>

      <div className="stats-grid">
        {[1, 2, 3].map((i) => (
          <div key={i} className="premium-card stat-card" style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ height: '48px', width: '48px', backgroundColor: 'var(--border-color)', borderRadius: '12px' }} className="skeleton" />
            <div style={{ flex: 1 }}>
              <div style={{ height: '16px', width: '80px', backgroundColor: 'var(--border-color)', borderRadius: '4px', marginBottom: '8px' }} className="skeleton" />
              <div style={{ height: '32px', width: '60px', backgroundColor: 'var(--border-color)', borderRadius: '4px', marginBottom: '8px' }} className="skeleton" />
              <div style={{ height: '14px', width: '120px', backgroundColor: 'var(--border-color)', borderRadius: '4px' }} className="skeleton" />
            </div>
          </div>
        ))}
      </div>

      <div className="charts-grid mt-6">
        {[1, 2].map((i) => (
          <div key={i} className="premium-card chart-container" style={{ minHeight: '300px' }}>
            <div style={{ height: '24px', width: '200px', backgroundColor: 'var(--border-color)', borderRadius: '8px', marginBottom: '16px' }} className="skeleton" />
            <div style={{ height: '40px', width: '100%', backgroundColor: 'var(--border-color)', borderRadius: '8px', marginBottom: '16px' }} className="skeleton" />
            <div style={{ height: '160px', width: '100%', backgroundColor: 'var(--border-color)', borderRadius: '8px' }} className="skeleton" />
          </div>
        ))}
      </div>

      <style>{`
        .skeleton {
          background: linear-gradient(90deg, var(--bg-surface) 25%, var(--border-color) 50%, var(--bg-surface) 75%);
          background-size: 200% 100%;
          animation: skeleton-loading 1.5s infinite;
        }
        @keyframes skeleton-loading {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
