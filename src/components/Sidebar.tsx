"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Send, 
  Users, 
  FileText, 
  Settings,
  Menu,
  X,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import "./Sidebar.css";

const navItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Campaigns", href: "/campaigns", icon: Send },
  { name: "Master Data", href: "/master-data", icon: Users },
  { name: "Audience", href: "/audience", icon: Users },
  { name: "Templates", href: "/templates", icon: FileText },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Close sidebar on route change for mobile users
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Load and apply collapse state
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved === 'true') {
      setIsCollapsed(true);
      document.body.classList.add('sidebar-collapsed');
    }
  }, []);

  const toggleCollapse = () => {
    const nextState = !isCollapsed;
    setIsCollapsed(nextState);
    localStorage.setItem('sidebar-collapsed', String(nextState));
    if (nextState) {
      document.body.classList.add('sidebar-collapsed');
    } else {
      document.body.classList.remove('sidebar-collapsed');
    }
  };

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="logo-icon-mobile">
            <Send size={18} />
          </div>
          <h2 className="logo-text-mobile">MailFlow</h2>
        </div>
        <button className="mobile-menu-btn" onClick={() => setIsOpen(true)}>
          <Menu size={24} />
        </button>
      </div>

      {/* Sidebar Backdrop for mobile */}
      {isOpen && (
        <div className="sidebar-backdrop" onClick={() => setIsOpen(false)} />
      )}

      {/* Sidebar Content */}
      <aside className={`sidebar ${isOpen ? "open" : ""}`}>
        <div className="sidebar-header" style={{ justifyContent: "space-between" }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="logo-icon">
              <Send size={24} />
            </div>
            <h2 className="logo-text">MailFlow</h2>
          </div>
          <button className="mobile-close-btn" onClick={() => setIsOpen(false)}>
            <X size={24} color="var(--text-muted)" />
          </button>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-group">
            <span className="nav-group-title">Menu</span>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`nav-item ${isActive ? "active" : ""}`}
                >
                  <Icon size={20} className="nav-icon" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="sidebar-footer">
          <Link href="/settings" className="nav-item">
            <Settings size={20} className="nav-icon" />
            <span>Settings</span>
          </Link>
          <button className="nav-item" onClick={toggleCollapse} style={{ width: "100%", textAlign: "left", opacity: 0.8 }}>
            {isCollapsed ? <ChevronRight size={20} className="nav-icon" /> : <ChevronLeft size={20} className="nav-icon" />}
            <span>Collapse Menu</span>
          </button>
        </div>
      </aside>
    </>
  );
}
