// AdminPage.js - Updated to use layout
import React from "react";
import { useNavigate } from "react-router-dom";

import "../../App.css";

const AdminPage = () => {
  const navigate = useNavigate();

  return (
    <div className="dashboard-content">
      {/* Welcome Section */}
      <div className="welcome-section">
        <h2>Welcome back, Admin!</h2>
        <p>Here's what's happening with your platform today.</p>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card primary">
          <div className="stat-icon">📋</div>
          <div className="stat-details">
            <h3>12</h3>
            <p>Pending KYC</p>
          </div>
        </div>
        <div className="stat-card success">
          <div className="stat-icon">🏠</div>
          <div className="stat-details">
            <h3>5</h3>
            <p>New Listings</p>
          </div>
        </div>
        <div className="stat-card warning">
          <div className="stat-icon">💰</div>
          <div className="stat-details">
            <h3>$124K</h3>
            <p>Tokenized Value</p>
          </div>
        </div>
        <div className="stat-card info">
          <div className="stat-icon">👥</div>
          <div className="stat-details">
            <h3>234</h3>
            <p>Total Users</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <h3 className="section-title">Quick Actions</h3>
      <div className="quick-actions-grid">
        <div className="action-card" onClick={() => navigate("/admin/kyc")}>
          <span className="action-icon">📋</span>
          <h4>KYC Approval</h4>
          <p>Review pending verifications</p>
          <span className="action-badge">12 pending</span>
        </div>
        <div className="action-card" onClick={() => navigate("/admin/listings")}>
          <span className="action-icon">🏠</span>
          <h4>Approve Listings</h4>
          <p>Review new property listings</p>
          <span className="action-badge">5 pending</span>
        </div>
        <div className="action-card" onClick={() => navigate("/admin/tokenization")}>
          <span className="action-icon">💰</span>
          <h4>Tokenize Property</h4>
          <p>Create new property tokens</p>
          <span className="action-badge">3 requests</span>
        </div>
        <div className="action-card" onClick={() => navigate("/admin/disputes")}>
          <span className="action-icon">⚠️</span>
          <h4>Manage Disputes</h4>
          <p>Resolve user conflicts</p>
          <span className="action-badge warning">2 active</span>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="recent-activity-card">
        <h3>Recent Activity</h3>
        <div className="activity-timeline">
          <div className="timeline-item">
            <div className="timeline-dot"></div>
            <div className="timeline-content">
              <p className="timeline-title">New KYC submission</p>
              <p className="timeline-meta">John Doe • 2 minutes ago</p>
            </div>
          </div>
          <div className="timeline-item">
            <div className="timeline-dot"></div>
            <div className="timeline-content">
              <p className="timeline-title">Property listing approved</p>
              <p className="timeline-meta">Luxury Villa • 15 minutes ago</p>
            </div>
          </div>
          <div className="timeline-item">
            <div className="timeline-dot"></div>
            <div className="timeline-content">
              <p className="timeline-title">New dispute filed</p>
              <p className="timeline-meta">Sarah Smith • 1 hour ago</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;