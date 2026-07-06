// AdminPanel/pages/AdminPage.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const AdminPage = () => {
  const navigate = useNavigate();
  const [pendingKYC, setPendingKYC] = useState(0);
const [pendingListings, setPendingListings] = useState(0);
const [totalUsers, setTotalUsers] = useState(0);

const [loadingKYC, setLoadingKYC] = useState(true);
const [loadingListings, setLoadingListings] = useState(true);
const [loadingUsers, setLoadingUsers] = useState(true);

const adminId = localStorage.getItem("user_id");

  useEffect(() => {
    fetchPendingKYC();
    fetchPendingListings();
    fetchTotalUsers();
  }, []);

  const fetchPendingKYC = async () => {
  try {
    setLoadingKYC(true);
    const response = await fetch('http://localhost:5000/api/kyc');
    const result = await response.json();
    if (result.success) {
      // Use stats.pending directly like in AdminKYC
      const all = result.data;
      const pending = all.filter(k => k.status === 'Pending').length;
      setPendingKYC(pending);
    }
  } catch (err) {
    console.error('Error fetching KYC stats:', err);
  } finally {
    setLoadingKYC(false);
  }
};

  const fetchPendingListings = async () => {
  try {
    setLoadingListings(true);
    // Use the same marketplace endpoint that ViewListings uses
    const response = await fetch('http://localhost:5000/api/properties/marketplace');
    const result = await response.json();
    if (result.success) {
      const properties = result.properties || [];
      // Filter pending count - same logic as ViewListings
      const pendingCount = properties.filter(p => p.status === 'Pending').length;
      setPendingListings(pendingCount);
    }
  } catch (err) {
    console.error('Error fetching pending listings:', err);
    setPendingListings(0);
  } finally {
    setLoadingListings(false);
  }
};

  const fetchTotalUsers = async () => {
  try {
    setLoadingUsers(true);
    const response = await fetch('http://localhost:5000/api/users/count');
    const result = await response.json();
    if (result.success) {
      setTotalUsers(result.total || 0);
    }
  } catch (err) {
    console.error('Error fetching total users:', err);
  } finally {
    setLoadingUsers(false);
  }
};

  // Stats data with dynamic pending KYC
  const statsData = [
    {
      title: "Pending KYC",
      value: loadingKYC ? "..." : pendingKYC,
      icon: "📋",
      color: "primary",
      bgColor: "#fff3cd",
      textColor: "#856404",
      link: "/admin/kyc",
      clickable: true,
    },
    {
      title: "New Listings",
      value: loadingListings ? "..." : pendingListings,
      icon: "🏠",
      color: "success",
      bgColor: "#d1e7dd",
      textColor: "#0f5132",
      link: "/admin/listings/all",
      clickable: true,
    },
    {
      title: "Tokenized Value",
      value: "$124K",
      icon: "💰",
      color: "warning",
      bgColor: "#cfe2ff",
      textColor: "#084298",
      link: "/admin/tokenization/requests",
      clickable: false
    },
    {
      title: "Total Users",
      value: loadingUsers ? "..." : totalUsers,
      icon: "👥",
      color: "info",
      bgColor: "#f8d7da",
      textColor: "#842029",
      link: "/admin/users",
      clickable: false,
    }
  ];

  return (
    <div className="admin-dashboard">
      {/* Welcome Section */}
      <div className="welcome-section">
        <h2>Welcome back, Admin!</h2>
        <p>Here's what's happening with your real estate platform today.</p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
  {statsData.map((stat, index) => (
    <div 
      key={index} 
      className="stat-card"
      onClick={() => stat.clickable && stat.link && navigate(stat.link)}
      style={{ 
        cursor: stat.clickable ? 'pointer' : 'default',  // 🔥 Conditional cursor
        opacity: stat.clickable ? 1 : 0.9
      }}
    >
      <div className="stat-icon" style={{ background: stat.bgColor }}>
        {stat.icon}
      </div>
      <div className="stat-details">
        <h3 style={{ color: stat.textColor }}>{stat.value}</h3>
        <p>{stat.title}</p>
      </div>
    </div>
  ))}
</div>

      {/* Quick Actions */}
      <div className="section-title">Quick Actions</div>
      <div className="quick-actions-grid">
        <div className="action-card" onClick={() => navigate("/admin/kyc")}>
          <div className="action-icon">📋</div>
          <h4>Review KYC Requests</h4>
          <p>Approve or reject pending KYC applications</p>
          {pendingKYC > 0 && !loadingKYC && (
            <span className="action-badge">{pendingKYC} Pending</span>
          )}
        </div>
        
        <div className="action-card" onClick={() => navigate("/admin/tokenization/requests")}>
          <div className="action-icon">✅</div>
          <h4>Tokenization Requests</h4>
          <p>Review and process new property tokenization requests</p>
        </div>
        
        <div className="action-card" onClick={() => navigate("/admin/listings/all")}>
          <div className="action-icon">🏠</div>
          <h4>Manage Listings</h4>
          <p>View and manage all property listings</p>
        </div>
        
        <div className="action-card" onClick={() => navigate("/admin/compliance")}>
          <div className="action-icon">⚖️</div>
          <h4>Legal Compliance</h4>
          <p>Review and manage legal compliance documents</p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="section-title">Recent Activity</div>
      <div className="recent-activity-card">
        <div className="activity-timeline">
          <div className="timeline-item">
            <div className="timeline-dot"></div>
            <div className="timeline-content">
              <p className="timeline-title">New KYC submission from User</p>
              <p className="timeline-meta">2 minutes ago</p>
            </div>
          </div>
          <div className="timeline-item">
            <div className="timeline-dot"></div>
            <div className="timeline-content">
              <p className="timeline-title">Property listing approved: Luxury Villa</p>
              <p className="timeline-meta">1 hour ago</p>
            </div>
          </div>
          <div className="timeline-item">
            <div className="timeline-dot"></div>
            <div className="timeline-content">
              <p className="timeline-title">New tokenization request received</p>
              <p className="timeline-meta">3 hours ago</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;