import React, { useState } from "react";
import "../../App.css";

const AdminKYC = () => {
  const [activeTab, setActiveTab] = useState("all");
  const [selectedUser, setSelectedUser] = useState(null);

  const kycData = {
    all: [
      { id: "#KYC01234", name: "Robert Patilson", joinDate: "26/04/2020", time: "12:42 AM", avatar: "RP", status: "pending" },
      { id: "#KYC01235", name: "Peter Parkur", joinDate: "26/04/2020", time: "12:42 AM", avatar: "PP", status: "pending" },
      { id: "#KYC01236", name: "Emilia Sigh", joinDate: "26/04/2020", time: "12:42 AM", avatar: "ES", status: "pending" },
    ],
    approved: [
      { id: "#KYC01237", name: "Julia Henry", email: "julia@example.com", phone: "+92 300-1234567", approvedDate: "26/04/2020", status: "approved" },
    ],
    rejected: [
      { id: "#KYC01240", name: "John Doe", reason: "Invalid documents", rejectedDate: "25/04/2020", status: "rejected" },
    ]
  };

  const handleViewMore = (user) => {
    setSelectedUser(user);
  };

  const handleCloseModal = () => {
    setSelectedUser(null);
  };

  const handleApprove = (id) => {
    alert(`KYC ${id} approved successfully!`);
  };

  const handleReject = (id) => {
    alert(`KYC ${id} rejected!`);
  };

  return (
    <div className="kyc-page">
      {/* Header with stats */}
      <div className="kyc-header">
        <div className="header-left">
          <h1>User KYC Management</h1>
          <p className="showing-text">Showing {kycData[activeTab].length} from 160 data</p>
        </div>
        <div className="header-stats">
          <div className="stat-item">
            <span className="stat-value">{kycData.all.length}</span>
            <span className="stat-label">Pending</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{kycData.approved.length}</span>
            <span className="stat-label">Approved</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{kycData.rejected.length}</span>
            <span className="stat-label">Rejected</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="kyc-tabs">
        <button 
          className={`tab-btn ${activeTab === "all" ? "active" : ""}`} 
          onClick={() => setActiveTab("all")}
        >
          All Requests
        </button>
        <button 
          className={`tab-btn ${activeTab === "approved" ? "active" : ""}`} 
          onClick={() => setActiveTab("approved")}
        >
          Approved
        </button>
        <button 
          className={`tab-btn ${activeTab === "rejected" ? "active" : ""}`} 
          onClick={() => setActiveTab("rejected")}
        >
          Rejected
        </button>
      </div>

      {/* ALL REQUESTS TAB */}
      {activeTab === "all" && (
        <div className="users-list">
          {kycData.all.map((user) => (
            <div key={user.id} className="user-card">
              <div className="user-avatar">{user.avatar}</div>
              <div className="user-details">
                <div className="user-id">{user.id}</div>
                <div className="user-name">{user.name}</div>
                <div className="user-join">Requested on {user.joinDate}, {user.time}</div>
              </div>
              <div className="user-actions">
                <button 
                  className="view-details-btn"
                  onClick={() => handleViewMore(user)}
                >
                  View Details
                </button>
                <div className="action-buttons">
                  <button 
                    className="approve-btn"
                    onClick={() => handleApprove(user.id)}
                    title="Approve KYC"
                  >
                    ✓
                  </button>
                  <button 
                    className="reject-btn"
                    onClick={() => handleReject(user.id)}
                    title="Reject KYC"
                  >
                    ✗
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* APPROVED TAB */}
      {activeTab === "approved" && (
        <div className="approved-list">
          {kycData.approved.map((user) => (
            <div key={user.id} className="approved-card">
              <div className="approved-header">
                <span className="approved-id">{user.id}</span>
                <span className="approved-badge">Approved</span>
              </div>
              <div className="approved-details">
                <div className="detail-row">
                  <span className="detail-label">Name:</span>
                  <span className="detail-value">{user.name}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Email:</span>
                  <span className="detail-value">{user.email}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Phone:</span>
                  <span className="detail-value">{user.phone}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Approved on:</span>
                  <span className="detail-value">{user.approvedDate}</span>
                </div>
              </div>
              <button 
                className="view-details-btn"
                onClick={() => handleViewMore(user)}
              >
                View Details
              </button>
            </div>
          ))}
        </div>
      )}

      {/* REJECTED TAB */}
      {activeTab === "rejected" && (
        <div className="rejected-list">
          {kycData.rejected.map((user) => (
            <div key={user.id} className="rejected-item">
              <div className="rejected-info">
                <span className="rejected-id">{user.id}</span>
                <span className="rejected-name">{user.name}</span>
                <span className="rejected-reason">{user.reason}</span>
                <span className="rejected-date">{user.rejectedDate}</span>
              </div>
              <div className="rejected-actions">
                <button 
                  className="view-details-btn small"
                  onClick={() => handleViewMore(user)}
                >
                  View
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL */}
      {selectedUser && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="kyc-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={handleCloseModal}>×</button>
            <h2>KYC Details - {selectedUser.id}</h2>
            
            <div className="modal-content">
              <div className="detail-row">
                <span className="detail-label">Full Name:</span>
                <span className="detail-value">{selectedUser.name}</span>
              </div>
              
              {selectedUser.email && (
                <div className="detail-row">
                  <span className="detail-label">Email:</span>
                  <span className="detail-value">{selectedUser.email}</span>
                </div>
              )}
              
              {selectedUser.phone && (
                <div className="detail-row">
                  <span className="detail-label">Phone:</span>
                  <span className="detail-value">{selectedUser.phone}</span>
                </div>
              )}
              
              {selectedUser.joinDate && (
                <div className="detail-row">
                  <span className="detail-label">Request Date:</span>
                  <span className="detail-value">{selectedUser.joinDate} {selectedUser.time}</span>
                </div>
              )}
              
              {selectedUser.approvedDate && (
                <div className="detail-row">
                  <span className="detail-label">Approved Date:</span>
                  <span className="detail-value">{selectedUser.approvedDate}</span>
                </div>
              )}
              
              {selectedUser.rejectedDate && (
                <div className="detail-row">
                  <span className="detail-label">Rejected Date:</span>
                  <span className="detail-value">{selectedUser.rejectedDate}</span>
                </div>
              )}
              
              {selectedUser.reason && (
                <div className="detail-row">
                  <span className="detail-label">Rejection Reason:</span>
                  <span className="detail-value">{selectedUser.reason}</span>
                </div>
              )}

              {/* KYC Documents Section */}
              <div className="kyc-documents">
                <h3>KYC Documents</h3>
                <div className="document-list">
                  <div className="document-item">
                    <span className="doc-name">Government ID (Passport/CNIC)</span>
                    <button className="view-doc-btn">View</button>
                  </div>
                  <div className="document-item">
                    <span className="doc-name">Proof of Address</span>
                    <button className="view-doc-btn">View</button>
                  </div>
                  <div className="document-item">
                    <span className="doc-name">Selfie with ID</span>
                    <button className="view-doc-btn">View</button>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button 
                className="approve-btn large"
                onClick={() => {
                  handleApprove(selectedUser.id);
                  handleCloseModal();
                }}
              >
                Approve KYC
              </button>
              <button 
                className="reject-btn large"
                onClick={() => {
                  handleReject(selectedUser.id);
                  handleCloseModal();
                }}
              >
                Reject KYC
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminKYC;