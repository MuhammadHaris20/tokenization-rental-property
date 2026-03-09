// AdminLayout.js - Main layout component

import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import "../../RealEstate.css";
import logo from "../../images/logo.jpeg";
import adminAvatar from "../../images/admin-avatar.jpg";


const AdminLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const menuItems = [
    { path: "/admin", icon: "📊", label: "Dashboard" },
    { path: "/admin/kyc", icon: "📋", label: "KYC Approval/Rejection", badge: 12 },
    { path: "/admin/listings/all", icon: "🏠", label: "View Listings" },
    { path: "/admin/tokenization/requests", icon: "✅", label: "Accept/Reject Tokenization", badge: 3 },
    { path: "/admin/properties", icon: "📊", label: "Manage Property Data" },
    { path: "/admin/rentals", icon: "📅", label: "Manage Rental Info" },
    { path: "/admin/compliance", icon: "⚖️", label: "Legal Compliance" },
    { path: "/admin/disputes", icon: "⚠️", label: "Manage Disputes", badge: 2 },
  ];

  const activeItem = menuItems.find(item => item.path === location.pathname);

  return (
    <div className="admin-layout">

      {/* ================= SIDEBAR ================= */}
      <aside className={`admin-sidebar ${sidebarCollapsed ? "collapsed" : ""}`}>
        
        <div className="sidebar-header">
          <div
            className="sidebar-logo"
            onClick={() => navigate("/admin")}
          >
            <img src={logo} alt="Logo" className="sidebar-logo-img" />
            {!sidebarCollapsed && (
              <span className="sidebar-logo-text">Real Estate</span>
            )}
          </div>
        </div>

        {/* Collapse Button */}
        <button
          className="sidebar-collapse-btn"
          onClick={toggleSidebar}
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <span className="collapse-icon">
            {sidebarCollapsed ? "›" : "‹"}
          </span>
        </button>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <div
              key={item.path}
              className={`sidebar-menu-item ${
                location.pathname === item.path ? "active" : ""
              }`}
              onClick={() => navigate(item.path)}
            >
              <span className="menu-icon">{item.icon}</span>

              {!sidebarCollapsed && (
                <>
                  <span className="menu-label">{item.label}</span>
                  {item.badge && (
                    <span className="menu-badge">{item.badge}</span>
                  )}
                </>
              )}

              {sidebarCollapsed && item.badge && (
                <span className="menu-badge collapsed">
                  {item.badge}
                </span>
              )}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <div className="sidebar-menu-item" onClick={handleLogout}>
            <span className="menu-icon">🚪</span>
            {!sidebarCollapsed && (
              <span className="menu-label">Logout</span>
            )}
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

      {/* ================= MAIN CONTENT ================= */}
      <main className="admin-main">

        {/* Top Bar */}
        <div className="admin-topbar">
          <div className="topbar-container">
            
            <div className="topbar-title">
              <h1>{activeItem?.label || "Dashboard"}</h1>
            </div>

            <div className="topbar-profile">
              <div className="profile-dropdown">
                <img
                  src={adminAvatar}
                  alt="Admin"
                  className="profile-avatar"
                />
                <div className="profile-info">
                  <span className="profile-name">Admin User</span>
                  <span className="profile-role">Super Admin</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Page Content */}
        <div className="admin-content-area">
          {children}
        </div>

      </main>
    </div>
  );
};

export default AdminLayout;