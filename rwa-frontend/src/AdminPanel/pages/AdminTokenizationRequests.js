// AdminPanel/pages/AdminTokenizationRequests.js
import React, { useState, useEffect } from "react";
import "../../App.css";

const AdminTokenizationRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [activeTab, setActiveTab] = useState("pending");
  const [tokenPrice, setTokenPrice] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [propertyImages, setPropertyImages] = useState({});
  const [selectedImageTab, setSelectedImageTab] = useState("exterior");

  const handleViewDocument = (documentPath, label) => {
    if (!documentPath) {
      alert("Document not available");
      return;
    }
    const fullUrl = documentPath.startsWith("http")
      ? documentPath
      : `http://localhost:5000/${documentPath.replace(/\\/g, "/")}`;

    if (fullUrl.match(/\.(jpg|jpeg|png|gif)$/i)) {
      setPreviewDoc({ url: fullUrl, label });
    } else {
      window.open(fullUrl, "_blank");
    }
  };

  const handleViewImage = (imageUrl) => {
    setPreviewImage(imageUrl);
  };

  const fetchPropertyImages = async (propertyId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/properties/${propertyId}/images`);
      const result = await response.json();
      
      if (result.success && result.images && result.images.length > 0) {
        const exteriorImages = [];
        const interiorImages = [];
        
        for (const img of result.images) {
          let imageUrl = img.image_url;
          if (!imageUrl.startsWith("http")) {
            imageUrl = `http://localhost:5000/${imageUrl.replace(/\\/g, '/')}`;
          }
          
          if (img.image_type === 'exterior') {
            exteriorImages.push(imageUrl);
          } else if (img.image_type === 'interior') {
            interiorImages.push(imageUrl);
          } else {
            exteriorImages.push(imageUrl);
          }
        }
        
        setPropertyImages(prev => ({
          ...prev,
          [propertyId]: { exterior: exteriorImages, interior: interiorImages }
        }));
      } else {
        setPropertyImages(prev => ({
          ...prev,
          [propertyId]: { exterior: [], interior: [] }
        }));
      }
    } catch (err) {
      console.error(`Error fetching images for property ${propertyId}:`, err);
      setPropertyImages(prev => ({
        ...prev,
        [propertyId]: { exterior: [], interior: [] }
      }));
    }
  };

  useEffect(() => {
    fetchApprovedProperties();
  }, []);

  const fetchApprovedProperties = async () => {
    try {
      setLoading(true);
      const response = await fetch("http://localhost:5000/api/properties/approved");
      const result = await response.json();

      if (result.success) {
        const formattedData = result.data.map((prop) => ({
          id: prop.property_id,
          request_id: prop.property_id,
          propertyId: prop.property_id,
          propertyName: prop.title,
          propertyAddress: prop.address,
          propertyDescription: prop.description,
          propertyCity: prop.city,
          propertyCountry: prop.country,
          propertyHash: prop.property_hash,
          valuationAmount: prop.valuation_amount || prop.value,
          ownerRole: prop.owner_role,
          ownerName: prop.owner_name,
          ownerEmail: prop.owner_email,
          ownerWallet: prop.wallet_address,
          requestedDate: prop.created_at,
          docCount: prop.documents_parsed
            ? Object.values(prop.documents_parsed).filter((v) => v).length
            : 0,
          
          totalTokens: Math.max(1, Math.floor(parseFloat(prop.value || prop.valuation_amount || 0) / 1000)),
          tokenPrice: prop.token_price || null,
          totalValue: prop.valuation_amount || prop.value,
          documents: prop.documents_parsed || {
            titleDeed: "",
            valuationCertificate: "",
            taxBills: "",
          },
          status: prop.status === "Tokenized" ? "approved" : "pending",
          blockchainTxHash: prop.transaction_hash || null,
        }));
        setRequests(formattedData);
        
        // Fetch images for ALL properties (both pending and tokenized)
        for (const prop of formattedData) {
          await fetchPropertyImages(prop.propertyId);
        }
      } else {
        setError(result.message || "Failed to fetch approved properties");
      }
    } catch (err) {
      setError("Failed to fetch approved properties");
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (request) => {
    setSelectedRequest(request);
    setTokenPrice(request.tokenPrice ? request.tokenPrice.toString() : "");
    setShowDetailsModal(true);
    setPreviewDoc(null);
    setPreviewImage(null);
    setSelectedImageTab("exterior");
  };

  const handleCloseModal = () => {
    setShowDetailsModal(false);
    setSelectedRequest(null);
    setTokenPrice("");
    setPreviewDoc(null);
    setPreviewImage(null);
    setActionLoading(false);
  };

  const handleMintTokens = async () => {
    if (!selectedRequest) return;

    const price = 1000;

    try {
      setActionLoading(true);
      const adminId = localStorage.getItem("user_id") || 1;

      console.log("🪙 Sending mint request for property:", selectedRequest.propertyId);

      const bcResponse = await fetch(
        `http://localhost:5000/api/properties/blockchain-mint/${selectedRequest.propertyId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            total_supply: selectedRequest.totalTokens
          }),
        }
      );
      const bcResult = await bcResponse.json();

      if (!bcResult.success) {
        alert("Blockchain minting failed: " + bcResult.message);
        return;
      }

      console.log("✅ Mint TX confirmed:", bcResult.txHash);

      const dbResponse = await fetch(
        `http://localhost:5000/api/properties/update-status/${selectedRequest.propertyId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            admin_id: Number(adminId),
            status: "Tokenized",
            total_supply: selectedRequest.totalTokens,
            token_price: price,
            blockchain_tx_hash: bcResult.txHash || null,
          }),
        }
      );
      const dbResult = await dbResponse.json();

      if (dbResult.success) {
        alert(
          `✅ Property "${selectedRequest.propertyName}" tokenized!\n` +
          `${selectedRequest.totalTokens.toLocaleString()} tokens minted at PKR ${price} each.\n` +
          `TX: ${bcResult.txHash}`
        );
        fetchApprovedProperties();
        handleCloseModal();
      } else {
        alert("DB update failed after minting: " + dbResult.message);
      }
    } catch (err) {
      alert("Error during minting: " + err.message);
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredRequests = requests.filter((req) => {
    if (activeTab === "pending") return req.status === "pending";
    if (activeTab === "approved") return req.status === "approved";
    return req.status === "pending";
  });

  const formatCurrency = (amount) => {
    if (!amount) return "PKR 0";
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getRoleBadgeClass = (role) => {
    const roleLower = role?.toLowerCase();
    switch (roleLower) {
      case "owner":   return "role-badge owner";
      case "admin":   return "role-badge admin";
      case "investor": return "role-badge investor";
      default:        return "role-badge";
    }
  };

  const stats = {
    pending: requests.filter((r) => r.status === "pending").length,
    approved: requests.filter((r) => r.status === "approved").length,
    total: requests.length,
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading approved properties for tokenization...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <h3>Error</h3>
        <p>{error}</p>
        <button onClick={fetchApprovedProperties} className="retry-btn">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="kyc-page">
      <div className="kyc-header">
        <div className="header-left">
          <h1>Tokenization Requests</h1>
          <p className="showing-text">
            Showing {filteredRequests.length} from {stats.total} approved properties
          </p>
        </div>
        <div className="header-stats">
          <div className="stat-item">
            <span className="stat-value">{stats.pending}</span>
            <span className="stat-label">Ready for Tokenization</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{stats.approved}</span>
            <span className="stat-label">Tokenized</span>
          </div>
        </div>
      </div>

      {stats.pending > 0 && (
        <div className="info-banner">
          💡 {stats.pending} approved{" "}
          {stats.pending === 1 ? "property is" : "properties are"} ready for
          tokenization.
        </div>
      )}

      <div className="kyc-tabs">
        <button
          className={`tab-btn ${activeTab === "pending" ? "active" : ""}`}
          onClick={() => setActiveTab("pending")}
        >
          Ready for Tokenization ({stats.pending})
        </button>
        <button
          className={`tab-btn ${activeTab === "approved" ? "active" : ""}`}
          onClick={() => setActiveTab("approved")}
        >
          Tokenized ({stats.approved})
        </button>
      </div>

      <div className="users-list">
        {filteredRequests.length > 0 ? (
          filteredRequests.map((request) => (
            <div key={request.id} className="user-card">
              <div className="user-avatar">
                {request.propertyName?.charAt(0) || "P"}
              </div>
              <div className="user-details">
                <div className="user-id">{request.id}</div>
                <div className="user-name">{request.propertyName}</div>
                <div className="user-join">
                  Owner: {request.ownerName} • {request.propertyCity},{" "}
                  {request.propertyCountry}
                </div>
                <div className="user-role-container">
                  <span className={`role-badge ${getRoleBadgeClass(request.ownerRole)}`}>
                    {request.ownerRole || "Investor"}
                  </span>
                </div>
                <div className="user-meta-info">
                  Valuation: {formatCurrency(request.valuationAmount)} •{" "}
                  {request.docCount || 0} documents •{" "}
                  {request.status === "approved"
                    ? `tokens @ PKR ${request.tokenPrice || "1000"} each`
                    : `${request.totalTokens?.toLocaleString() || 0} tokens (fixed)`}
                </div>
              </div>
              <div className="user-actions">
                {request.status === "pending" ? (
                  <button
                    className="view-details-btn"
                    onClick={() => handleViewDetails(request)}
                  >
                    Review & Mint
                  </button>
                ) : (
                  <>
                    <button
                      className="view-details-btn view-details-outline"
                      onClick={() => handleViewDetails(request)}
                    >
                      View Details
                    </button>
                    <span className="status-badge status-approved">Tokenized</span>
                  </>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="no-data">
            <p>No properties found for this tab.</p>
            <p className="no-data-subtitle">
              Properties must be approved in View Listings before appearing here.
            </p>
          </div>
        )}
      </div>

      {/* Details / Mint Modal */}
      {showDetailsModal && selectedRequest && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="kyc-modal tokenization-modal-details" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={handleCloseModal}>×</button>

            <h2>
              {selectedRequest.status === "pending"
                ? "🪙 Mint Tokens"
                : "📋 Tokenization Details"}
            </h2>
            
            <div className="modal-id-role-container">
              <div className="property-id-badge">Property ID: {selectedRequest.id}</div>
              <div className="role-badge-wrapper">
                <span className={`role-badge ${getRoleBadgeClass(selectedRequest.ownerRole)}`}>
                  {selectedRequest.ownerRole || "Investor"}
                </span>
              </div>
            </div>

            <div className="modal-content">
              {/* Property Info */}
              <div className="info-section">
                <h3>Property Information</h3>
                <div className="detail-row">
                  <span className="detail-label">Name:</span>
                  <span className="detail-value">{selectedRequest.propertyName}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Description:</span>
                  <span className="detail-value">
                    {selectedRequest.propertyDescription || "No description"}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Address:</span>
                  <span className="detail-value">
                    {selectedRequest.propertyAddress || "N/A"}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">City / Country:</span>
                  <span className="detail-value">
                    {selectedRequest.propertyCity}, {selectedRequest.propertyCountry}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Valuation:</span>
                  <span className="detail-value valuation-amount">
                    {formatCurrency(selectedRequest.valuationAmount)}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Submitted:</span>
                  <span className="detail-value">
                    {formatDate(selectedRequest.requestedDate)}
                  </span>
                </div>
              </div>

              {/* Owner Info */}
              <div className="info-section">
                <h3>Owner Information</h3>
                <div className="detail-row">
                  <span className="detail-label">Name:</span>
                  <span className="detail-value">{selectedRequest.ownerName}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Email:</span>
                  <span className="detail-value">{selectedRequest.ownerEmail}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Role:</span>
                  <span className="detail-value">
                    <span className={`role-badge ${getRoleBadgeClass(selectedRequest.ownerRole)}`}>
                      {selectedRequest.ownerRole || "Investor"}
                    </span>
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Wallet:</span>
                  <span className="detail-value wallet-address">
                    {selectedRequest.ownerWallet || "Not connected"}
                  </span>
                </div>
              </div>

              {/* Token Configuration */}
              <div className="info-section token-config-section">
                <h3>Token Configuration</h3>
                <div className="detail-row">
                  <span className="detail-label">Total Supply:</span>
                  <span className="detail-value token-supply">
                    {selectedRequest.totalTokens.toLocaleString()} tokens
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Price per Token:</span>
                  <span className="detail-value token-price">
                    PKR {(selectedRequest.tokenPrice || 1000).toLocaleString()}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Total Token Value:</span>
                  <span className="detail-value token-total-value">
                    {formatCurrency(selectedRequest.totalTokens * (selectedRequest.tokenPrice || 1000))}
                  </span>
                </div>

                {selectedRequest.status === "approved" && selectedRequest.blockchainTxHash && (
                  <div className="detail-row">
                    <span className="detail-label">TX Hash:</span>
                    <span className="detail-value tx-hash">
                      <a
                        href={`https://sepolia.etherscan.io/tx/${selectedRequest.blockchainTxHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="tx-link"
                      >
                        {selectedRequest.blockchainTxHash.slice(0, 20)}...
                      </a>
                    </span>
                  </div>
                )}
              </div>

              {/* Property Images Section - Shows for BOTH pending AND tokenized properties */}
              {propertyImages[selectedRequest.propertyId] && 
               (propertyImages[selectedRequest.propertyId].exterior?.length > 0 || 
                propertyImages[selectedRequest.propertyId].interior?.length > 0) && (
                <div className="property-images-section">
                  <h3>📸 Property Images</h3>
                  
                  <div className="image-tabs">
                    <button
                      onClick={() => setSelectedImageTab("exterior")}
                      className={`image-tab ${selectedImageTab === "exterior" ? "active" : ""}`}
                    >
                      🏡 Exterior ({propertyImages[selectedRequest.propertyId].exterior?.length || 0})
                    </button>
                    <button
                      onClick={() => setSelectedImageTab("interior")}
                      className={`image-tab ${selectedImageTab === "interior" ? "active" : ""}`}
                    >
                      🛋️ Interior ({propertyImages[selectedRequest.propertyId].interior?.length || 0})
                    </button>
                  </div>

                  <div className="image-grid">
                    {(selectedImageTab === "exterior" 
                      ? propertyImages[selectedRequest.propertyId].exterior 
                      : propertyImages[selectedRequest.propertyId].interior
                    )?.map((imgUrl, idx) => (
                      <div
                        key={idx}
                        className="image-grid-item"
                        onClick={() => handleViewImage(imgUrl)}
                      >
                        <img
                          src={imgUrl}
                          alt={`${selectedImageTab} ${idx + 1}`}
                          className="image-grid-img"
                          onError={(e) => {
                            e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='2' y='2' width='20' height='20' rx='2.18'%3E%3C/rect%3E%3Cpath d='M7 2v20M17 2v20M2 12h20M2 7h5M2 17h5M17 17h5M17 7h5'%3E%3C/path%3E%3C/svg%3E";
                          }}
                        />
                        <div className="image-view-icon">🔍</div>
                      </div>
                    ))}
                  </div>
                  
                  {selectedImageTab === "exterior" && (!propertyImages[selectedRequest.propertyId].exterior?.length) && (
                    <p className="no-images-message">No exterior images available</p>
                  )}
                  {selectedImageTab === "interior" && (!propertyImages[selectedRequest.propertyId].interior?.length) && (
                    <p className="no-images-message">No interior images available</p>
                  )}
                </div>
              )}

              {/* Image Preview Modal */}
              {previewImage && (
                <div className="image-preview-modal" onClick={() => setPreviewImage(null)}>
                  <div className="image-preview-content" onClick={(e) => e.stopPropagation()}>
                    <button className="image-preview-close" onClick={() => setPreviewImage(null)}>×</button>
                    <img src={previewImage} alt="Preview" className="image-preview-img" />
                  </div>
                </div>
              )}

              {/* Documents - UNCHANGED */}
              <div className="kyc-documents">
                <h3>Required Documents</h3>
                <div className="document-list">
                  {[
                    { key: "titleDeed", label: "Title Deed / Ownership Proof", icon: "📜" },
                    { key: "valuationCertificate", label: "Valuation Certificate", icon: "📊" },
                    { key: "taxBills", label: "Tax / Utility Bills", icon: "🧾" },
                  ].map(({ key, label, icon }) => (
                    <div key={key} className="document-item">
                      <span className="doc-name">
                        {icon} {label}
                      </span>
                      <button
                        className="view-doc-btn"
                        disabled={!selectedRequest.documents?.[key]}
                        onClick={() =>
                          handleViewDocument(selectedRequest.documents?.[key], label)
                        }
                      >
                        {selectedRequest.documents?.[key] ? "View" : "Not Uploaded"}
                      </button>
                    </div>
                  ))}
                </div>

                {/* Inline image preview - UNCHANGED */}
                {previewDoc && (
                  <div className="document-preview-container">
                    <div className="document-preview-header">
                      <strong className="document-preview-label">{previewDoc.label}</strong>
                      <button className="close-preview-btn" onClick={() => setPreviewDoc(null)}>×</button>
                    </div>
                    <img
                      src={previewDoc.url}
                      alt={previewDoc.label}
                      className="document-preview-img-inline"
                      onError={(e) => {
                        e.target.style.display = "none";
                        e.target.parentElement.querySelector(".preview-fallback").style.display = "block";
                      }}
                    />
                    <div className="preview-fallback">
                      <p>Cannot preview this file type inline.</p>
                      <a href={previewDoc.url} target="_blank" rel="noreferrer" className="view-details-btn">
                        Open in new tab
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Mint button — only for pending */}
            {selectedRequest.status === "pending" && (
              <div className="modal-actions mint-actions">
                <button
                  className="approve-btn large mint-btn"
                  onClick={handleMintTokens}
                  disabled={actionLoading}
                >
                  {actionLoading ? "⏳ Minting on blockchain..." : "🪙 Mint Tokens"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTokenizationRequests;