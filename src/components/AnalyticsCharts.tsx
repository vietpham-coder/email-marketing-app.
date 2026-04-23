"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import { Line, Pie, Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export default function AnalyticsCharts({ campaigns }: { campaigns: any[] }) {
  // 1. Line Chart: Open Rate over time
  const lineData = {
    labels: [...campaigns].reverse().map(c => new Date(c.createdAt).toLocaleDateString()),
    datasets: [
      {
        label: "Tỷ lệ mở (%)",
        data: [...campaigns].reverse().map(c => parseInt(c.openRate)),
        borderColor: "#FF5722",
        backgroundColor: "rgba(255, 87, 34, 0.5)",
        tension: 0.4,
      },
    ],
  };

  // 2. Pie Chart: Total Opens vs Unopened (overall)
  const totalSent = campaigns.reduce((acc, c) => acc + c.totalSent, 0);
  const totalOpened = campaigns.reduce((acc, c) => acc + (c.totalSent * parseInt(c.openRate) / 100), 0);
  
  const pieData = {
    labels: ["Đã mở", "Chưa mở"],
    datasets: [
      {
        data: [totalOpened, totalSent - totalOpened],
        backgroundColor: ["#4CAF50", "rgba(255, 255, 255, 0.1)"],
        borderWidth: 0,
      },
    ],
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
      <div className="premium-card p-6">
        <h3 className="card-title mb-4">Xu hướng hiệu quả (Tỷ lệ mở)</h3>
        <div style={{ height: "250px" }}>
          <Line 
            data={lineData} 
            options={{ 
              responsive: true, 
              maintainAspectRatio: false,
              scales: {
                y: { beginAtZero: true, max: 100, grid: { color: "rgba(255,255,255,0.05)" } },
                x: { grid: { display: false } }
              },
              plugins: { legend: { display: false } }
            }} 
          />
        </div>
      </div>

      <div className="premium-card p-6">
        <h3 className="card-title mb-4">Tổng quan tương tác</h3>
        <div style={{ height: "250px", display: 'flex', justifyContent: 'center' }}>
          <Pie 
            data={pieData} 
            options={{ 
              responsive: true, 
              maintainAspectRatio: false,
              plugins: { legend: { position: 'bottom', labels: { color: '#888' } } }
            }} 
          />
        </div>
      </div>
    </div>
  );
}
