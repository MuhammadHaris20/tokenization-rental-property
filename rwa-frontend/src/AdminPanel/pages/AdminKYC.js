import React, { useState, useEffect } from "react";
import "../../App.css";

const AdminKYC = () => {
  const [activeTab, setActiveTab] = useState("all");
  const [selectedUser, setSelectedUser] = useState(null);
  const [kycData, setKycData] = useState({ all: [], Approved: [], rejected: [] });
  const [stats, setStats] = useState({ pending: 0, Approved: 0, rejected: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [selectedRejectionOption, setSelectedRejectionOption] = useState("");
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [txLoading, setTxLoading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);

  const rejectionOptions = [
    { value: "incomplete_documents", label: "Incomplete Documents" },
    { value: "invalid_cnic", label: "Invalid CNIC" },
    { value: "invalid_address_proof", label: "Invalid Address Proof" },
    { value: "selfie_mismatch", label: "Selfie doesn't match CNIC" },
    { value: "underage", label: "User is under 18 years old" },
    { value: "duplicate_application", label: "Duplicate Application" },
    { value: "fake_documents", label: "Suspicious/Fake Documents" },
    { value: "other", label: "Other" }
  ];

  useEffect(() => {
    fetchKYCData();
  }, []);

  const fetchKYCData = async () => {
    try {
      setLoading(true);
      const response = await fetch("http://localhost:5000/api/kyc");
      const result = await response.json();
      if (result.success) {
        const all = result.data;
        setKycData({
          all,
          Approved: all.filter(item => item.status === "Approved"),
          rejected: all.filter(item => item.status === "Rejected"),
        });
        setStats({
          total: all.length,
          Approved: all.filter(item => item.status === "Approved").length,
          rejected: all.filter(item => item.status === "Rejected").length,
          pending: all.filter(item => item.status === "Pending").length,
        });
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError("Failed to fetch KYC data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewMore = (user) => {
    setSelectedUser(user);
    setPreviewDoc(null);
  };

  const handleCloseModal = () => {
    setSelectedUser(null);
    setRejectionReason("");
    setSelectedRejectionOption("");
    setShowRejectionModal(false);
    setPreviewDoc(null);
  };

  const getRoleBadgeClass = (role) => {
    const roleLower = role?.toLowerCase();
    switch (roleLower) {
      case "owner":   return "role-badge owner";
      case "admin":   return "role-badge admin";
      case "investor": return "role-badge investor";
      case "tenant":   return "role-badge tenant";
      default:        return "role-badge";
    }
  };

  const formatRole = (role) => {
    if (!role) return "Investor";
    return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
  };

  const getUserRole = (user) => user.user_role || user.role || "Investor";

  const handleRejectionOptionChange = (e) => {
    const value = e.target.value;
    setSelectedRejectionOption(value);
    if (value === "other") {
      setRejectionReason("");
    } else {
      const selectedOption = rejectionOptions.find(opt => opt.value === value);
      if (selectedOption && selectedOption.value !== "other") {
        setRejectionReason(selectedOption.label);
      }
    }
  };

  const handleApprove = async (user) => {
    const target = user || selectedUser;
    if (!target) return;
    if (!target.wallet_address) {
      alert("This user has no wallet address on record. Cannot approve.");
      return;
    }
    try {
      setTxLoading(true);
      const response = await fetch("http://localhost:5000/api/kyc/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kyc_id: target.kyc_id,
          admin_id: localStorage.getItem("user_id") || 1,
        }),
      });
      const result = await response.json();
      if (result.success) {
        alert("KYC approved successfully!");
        fetchKYCData();
        handleCloseModal();
      } else {
        alert("Failed to approve KYC: " + result.message);
      }
    } catch (err) {
      alert("Error approving KYC");
      console.error(err);
    } finally {
      setTxLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedUser) return;
    if (!rejectionReason.trim()) {
      alert("Please provide a rejection reason.");
      return;
    }
    if (!selectedUser.wallet_address) {
      alert("This user has no wallet address on record. Cannot reject.");
      return;
    }
    try {
      setTxLoading(true);
      const response = await fetch("http://localhost:5000/api/kyc/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kyc_id: selectedUser.kyc_id,
          reason: rejectionReason,
          admin_id: localStorage.getItem("user_id") || 1,
        }),
      });
      const result = await response.json();
      if (result.success) {
        alert("KYC rejected!");
        fetchKYCData();
        handleCloseModal();
      } else {
        alert("Failed to reject KYC: " + result.message);
      }
    } catch (err) {
      alert("Error rejecting KYC");
      console.error(err);
    } finally {
      setTxLoading(false);
    }
  };

  // Normalize backslashes and construct correct URL
  const handleViewDocument = (documentPath, label) => {
  if (!documentPath) {
    alert("Document not available");
    return;
  }
  
  console.log("Original path:", documentPath);
  
  // Extract just the filename
  let filename = documentPath;
  if (documentPath.includes('/') || documentPath.includes('\\')) {
    filename = documentPath.split(/[\\/]/).pop();
  }
  
  console.log("Filename:", filename);
  
  // Use the KYC ID and document type to fetch from server
  if (selectedUser && selectedUser.kyc_id) {
    const docTypeMap = {
      'CNIC Front': 'cnic_front',
      'CNIC Back': 'cnic_back',
      'Selfie': 'selfie',
      'Address Proof': 'address_proof'
    };
    
    const docType = docTypeMap[label] || label.toLowerCase().replace(' ', '_');
    const url = `http://localhost:5000/api/kyc/document/${selectedUser.kyc_id}/${docType}`;
    
    console.log("API URL:", url);
    setPreviewDoc({ url, label });
  } else {
    // Fallback: use the filename directly
    const fullUrl = `http://localhost:5000/uploads/kyc/${encodeURIComponent(filename)}`;
    console.log("Direct URL:", fullUrl);
    setPreviewDoc({ url, label });
  }
};

  // Helper: render a single user card (used for all tabs)
  const renderUserCard = (user, type) => {
    const statusClass = type === "pending" ? "kyc-status-pending" : type === "approved" ? "kyc-status-approved" : "kyc-status-rejected";
    return (
      <div key={user.kyc_id} className="kyc-user-card">
        <div className="kyc-card-header">
          <div className="kyc-avatar">{user.full_name?.[0]?.toUpperCase()}</div>
          <div className="kyc-header-info">
            <div className="kyc-user-name">{user.full_name}</div>
            <div className="kyc-user-meta">
              <span className={`role-badge ${getRoleBadgeClass(getUserRole(user))}`}>
                {formatRole(getUserRole(user))}
              </span>
              <span className="kyc-user-id">ID: {user.kyc_id}</span>
            </div>
          </div>
          <span className={`kyc-status-badge ${statusClass}`}>{user.status}</span>
        </div>

        <div className="kyc-card-details">
          {user.email && (
            <div className="kyc-detail-row">
              <span className="kyc-detail-icon">📧</span>
              <span>{user.email}</span>
            </div>
          )}
          {user.wallet_address && (
            <div className="kyc-detail-row">
              <span className="kyc-detail-icon">🔗</span>
              <span className="kyc-wallet-short">
                {user.wallet_address.slice(0, 8)}...{user.wallet_address.slice(-6)}
              </span>
            </div>
          )}
          <div className="kyc-detail-row">
            <span className="kyc-detail-icon">📅</span>
            <span>Requested: {new Date(user.submitted_at).toLocaleDateString()}</span>
          </div>
          {user.mobile_number && (
            <div className="kyc-detail-row">
              <span className="kyc-detail-icon">📞</span>
              <span>{user.mobile_number}</span>
            </div>
          )}
          {type === "rejected" && user.reason && (
            <div className="kyc-detail-row">
              <span className="kyc-detail-icon">❌</span>
              <span style={{ color: "#dc3545" }}>{user.reason}</span>
            </div>
          )}
          {type === "approved" && user.reviewed_at && (
            <div className="kyc-detail-row">
              <span className="kyc-detail-icon">✅</span>
              <span>Approved on {new Date(user.reviewed_at).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        <div className="kyc-card-actions">
          <button className="kyc-view-details-btn" onClick={() => handleViewMore(user)}>View Details</button>
          {type === "pending" && (
            <div className="kyc-action-buttons">
              <button className="kyc-approve-btn" title="Approve" disabled={txLoading} onClick={() => handleApprove(user)}>✓</button>
              <button className="kyc-reject-btn" title="Reject" disabled={txLoading} onClick={() => { setSelectedUser(user); setShowRejectionModal(true); }}>✗</button>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading KYC data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <h3>Error</h3>
        <p>{error}</p>
        <button onClick={fetchKYCData} className="retry-btn">Retry</button>
      </div>
    );
  }

  return (
    <div className="kyc-page">
      {/* Header */}
      <div className="kyc-header">
        <div className="header-left">
          <h1>User KYC Management</h1>
          <p className="showing-text">
            Showing {kycData[activeTab]?.length || 0} from {stats.total} total records
          </p>
        </div>
        <div className="header-stats">
          <div className="stat-item"><span className="stat-value">{stats.pending}</span><span className="stat-label">Pending</span></div>
          <div className="stat-item"><span className="stat-value">{stats.Approved}</span><span className="stat-label">Approved</span></div>
          <div className="stat-item"><span className="stat-value">{stats.rejected}</span><span className="stat-label">Rejected</span></div>
        </div>
      </div>

      {/* Tabs – fixed label for All Requests */}
      <div className="kyc-tabs">
        <button className={`tab-btn ${activeTab === "all" ? "active" : ""}`} onClick={() => setActiveTab("all")}>
          All Requests ({stats.total})
        </button>
        <button className={`tab-btn ${activeTab === "Approved" ? "active" : ""}`} onClick={() => setActiveTab("Approved")}>
          Approved ({stats.Approved})
        </button>
        <button className={`tab-btn ${activeTab === "rejected" ? "active" : ""}`} onClick={() => setActiveTab("rejected")}>
          Rejected ({stats.rejected})
        </button>
      </div>

      {/* All Requests – using the same card grid */}
      {activeTab === "all" && (
        <div className="kyc-card-grid">
          {kycData.all.length > 0 ? (
            kycData.all.map(user => renderUserCard(user, user.status === "Pending" ? "pending" : user.status === "Approved" ? "approved" : "rejected"))
          ) : (
            <div className="no-data">No KYC requests found</div>
          )}
        </div>
      )}

      {/* Approved Tab – card grid */}
      {activeTab === "Approved" && (
        <div className="kyc-card-grid">
          {kycData.Approved.length > 0 ? (
            kycData.Approved.map(user => renderUserCard(user, "approved"))
          ) : (
            <div className="no-data">No approved KYC records</div>
          )}
        </div>
      )}

      {/* Rejected Tab – card grid */}
      {activeTab === "rejected" && (
        <div className="kyc-card-grid">
          {kycData.rejected.length > 0 ? (
            kycData.rejected.map(user => renderUserCard(user, "rejected"))
          ) : (
            <div className="no-data">No rejected KYC records</div>
          )}
        </div>
      )}

      {/* Rejection Reason Modal – unchanged */}
      {showRejectionModal && selectedUser && (
        <div className="modal-overlay" onClick={() => { setShowRejectionModal(false); setRejectionReason(""); setSelectedRejectionOption(""); }}>
          <div className="rejection-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Reject KYC — {selectedUser.full_name}</h3>
            <div className="form-group">
              <label className="rejection-label">Rejection Reason *</label>
              <select className="rejection-select" value={selectedRejectionOption} onChange={handleRejectionOptionChange}>
                <option value="">Select a reason...</option>
                {rejectionOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            {selectedRejectionOption === "other" && (
              <div className="form-group">
                <label className="rejection-label">Please specify reason *</label>
                <textarea className="rejection-textarea" placeholder="Enter rejection reason..." value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} rows="4" />
              </div>
            )}
            {selectedRejectionOption && selectedRejectionOption !== "other" && (
              <div className="selected-reason-preview"><strong>Selected reason:</strong> {rejectionReason}</div>
            )}
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => { setShowRejectionModal(false); setRejectionReason(""); setSelectedRejectionOption(""); }}>Cancel</button>
              <button className="reject-btn" disabled={txLoading || !selectedRejectionOption || (selectedRejectionOption === "other" && !rejectionReason.trim())} onClick={handleReject}>
                {txLoading ? "Processing…" : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal – unchanged but uses fixed handleViewDocument */}
      {selectedUser && !showRejectionModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="kyc-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={handleCloseModal}>×</button>
            <h2>KYC Details — {selectedUser.full_name}</h2>
            <div className="modal-id-role-container">
              <div className="property-id-badge">User ID: {selectedUser.user_id || selectedUser.kyc_id}</div>
              <div className="role-badge-wrapper">
                <span className={`role-badge ${getRoleBadgeClass(getUserRole(selectedUser))}`}>
                  {formatRole(getUserRole(selectedUser))}
                </span>
              </div>
            </div>
            <div className="modal-content">
              <div className="detail-row"><span className="detail-label">Full Name:</span><span className="detail-value">{selectedUser.full_name}</span></div>
              <div className="detail-row"><span className="detail-label">Email:</span><span className="detail-value">{selectedUser.email || "—"}</span></div>
              <div className="detail-row"><span className="detail-label">CNIC:</span><span className="detail-value">{selectedUser.cnic_number}</span></div>
              <div className="detail-row"><span className="detail-label">Role:</span><span className="detail-value"><span className={`role-badge ${getRoleBadgeClass(getUserRole(selectedUser))}`}>{formatRole(getUserRole(selectedUser))}</span></span></div>
              {selectedUser.mobile_number && <div className="detail-row"><span className="detail-label">Mobile:</span><span className="detail-value">{selectedUser.mobile_number}</span></div>}
              {selectedUser.wallet_address && <div className="detail-row"><span className="detail-label">Wallet:</span><span className="detail-value wallet-address">{selectedUser.wallet_address}</span></div>}
              {selectedUser.occupation && <div className="detail-row"><span className="detail-label">Occupation:</span><span className="detail-value">{selectedUser.occupation}</span></div>}
              {selectedUser.permanent_address && <div className="detail-row"><span className="detail-label">Address:</span><span className="detail-value">{selectedUser.permanent_address}</span></div>}
              {selectedUser.city && <div className="detail-row"><span className="detail-label">City/Province:</span><span className="detail-value">{selectedUser.city}, {selectedUser.province} — {selectedUser.postal_code}</span></div>}
              {selectedUser.dob && <div className="detail-row"><span className="detail-label">Date of Birth:</span><span className="detail-value">{new Date(selectedUser.dob).toLocaleDateString()}</span></div>}
              {selectedUser.submitted_at && <div className="detail-row"><span className="detail-label">Request Date:</span><span className="detail-value">{new Date(selectedUser.submitted_at).toLocaleDateString()}</span></div>}
              {selectedUser.reviewed_at && <div className="detail-row"><span className="detail-label">{selectedUser.status === "Approved" ? "Approved Date:" : "Reviewed Date:"}</span><span className="detail-value">{new Date(selectedUser.reviewed_at).toLocaleDateString()}</span></div>}
              {selectedUser.reason && <div className="detail-row"><span className="detail-label">Rejection Reason:</span><span className="detail-value rejection-reason-text">{selectedUser.reason}</span></div>}

              <div className="kyc-documents">
                <h3>KYC Documents</h3>
                <div className="document-list">
                  {[
                    { key: "cnic_front_url", label: "CNIC Front" },
                    { key: "cnic_back_url", label: "CNIC Back" },
                    { key: "selfie_url", label: "Selfie" },
                    { key: "address_proof_url", label: "Address Proof" },
                  ].map(({ key, label }) => (
                    <div key={key} className="document-item">
                      <span className="doc-name">{label}</span>
                      <button className="view-doc-btn" disabled={!selectedUser[key]} onClick={() => handleViewDocument(selectedUser[key], label)}>
                        {selectedUser[key] ? "View" : "Not Available"}
                      </button>
                    </div>
                  ))}
                </div>
                {previewDoc && (
                  <div className="document-preview-container">
                    <div className="document-preview-header"><strong>{previewDoc.label}</strong><button className="close-preview-btn" onClick={() => setPreviewDoc(null)}>×</button></div>
                    <div className="document-preview-wrapper">
                      <img src={previewDoc.url} alt={previewDoc.label} className="document-preview-img" onError={(e) => { e.target.style.display = "none"; e.target.parentElement.querySelector(".preview-fallback").style.display = "block"; }} />
                      <div className="preview-fallback">
                        <p>Cannot preview this file type inline.</p>
                        <a href={previewDoc.url} target="_blank" rel="noreferrer" className="view-details-btn">Open in new tab</a>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            {selectedUser.status === "Pending" && (
              <div className="modal-actions">
                <button className="approve-btn large" disabled={txLoading} onClick={() => handleApprove(selectedUser)}>{txLoading ? "Processing…" : "Approve KYC"}</button>
                <button className="reject-btn large" disabled={txLoading} onClick={() => setShowRejectionModal(true)}>Reject KYC</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminKYC;