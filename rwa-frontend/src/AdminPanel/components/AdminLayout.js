// AdminLayout.js - Main layout component
import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

import "../../RealEstate.css";
import logo from "../../images/logo.jpeg";
import adminAvatar from "../../images/admin-avatar.jpg";

const AdminLayout = ({ children }) => {
  const location = useLocation();
  const { logout } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // ✅ TRAP THE BACK BUTTON – admin cannot leave the panel
  useEffect(() => {
    // Push a dummy state onto the history stack
    window.history.pushState(null, '', window.location.href);

    const handlePopState = () => {
      // When back button is pressed, push another dummy state
      window.history.pushState(null, '', window.location.href);
    };
    window.addEventListener('popstate', handlePopState);

    // Cleanup on component unmount (logout)
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleLogout = () => {
    logout();
    window.location.replace("/");   // full redirect, replaces history
  };

  const navigateTo = (path) => {
    window.location.href = path;    // full page navigation keeps history clean
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const menuItems = [
    { path: "/admin", icon: "📊", label: "Dashboard" },
    { path: "/admin/kyc", icon: "📋", label: "KYC Approval/Rejection" },
    { path: "/admin/listings/all", icon: "🏠", label: "View Listings" },
    { path: "/admin/tokenization/requests", icon: "✅", label: "Accept/Reject Tokenization" },
    { path: "/admin/compliance", icon: "⚖️", label: "Legal Compliance" },
  ];

  const activeItem = menuItems.find(item => item.path === location.pathname);

  return (
    <div className="admin-layout">
      {/* SIDEBAR */}
      <aside className={`admin-sidebar ${sidebarCollapsed ? "collapsed" : ""}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo" onClick={() => navigateTo("/admin")}>
            <img src={logo} alt="Logo" className="sidebar-logo-img" />
            {!sidebarCollapsed && <span className="sidebar-logo-text">Real Estate</span>}
          </div>
        </div>

        <button className="sidebar-collapse-btn" onClick={toggleSidebar}>
          <span className="collapse-icon">{sidebarCollapsed ? "›" : "‹"}</span>
        </button>

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <div
              key={item.path}
              className={`sidebar-menu-item ${location.pathname === item.path ? "active" : ""}`}
              onClick={() => navigateTo(item.path)}
            >
              <span className="menu-icon">{item.icon}</span>
              {!sidebarCollapsed && <span className="menu-label">{item.label}</span>}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-menu-item" onClick={handleLogout}>
            <span className="menu-icon">🚪</span>
            {!sidebarCollapsed && <span className="menu-label">Logout</span>}
          </div>
          {!sidebarCollapsed && (
            <div className="sidebar-copyright">
              <p>Real Estate Dashboard</p>
              <p>© All Rights Reserved</p>
              <p className="credit">by Your Company</p>
            </div>
          )}
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="admin-main">
        <div className="admin-topbar">
          <div className="topbar-container">
            <div className="topbar-title">
              <h1>{activeItem?.label || "Dashboard"}</h1>
            </div>
            <div className="topbar-profile">
              <div className="profile-dropdown" onClick={handleLogout}>
                <img src={adminAvatar} alt="Admin" className="profile-avatar" />
                <div className="profile-info">
                  <span className="profile-name">Admin User</span>
                  <span className="profile-role">Super Admin</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="admin-content-area">{children}</div>
      </main>
    </div>
  );
};

export default AdminLayout;