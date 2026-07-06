// AdminPanel/pages/ViewListings.js
import React, { useState, useEffect } from "react";
import "../../App.css";

const ViewListings = () => {
  const [listings, setListings] = useState([]);
  const [stats, setStats] = useState({ pending: 0, Approved: 0, Tokenized: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [propertyImages, setPropertyImages] = useState({});
  const [error, setError] = useState(null);
  const [selectedListing, setSelectedListing] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [selectedRejectionOption, setSelectedRejectionOption] = useState("");
  const [approveLoading, setApproveLoading] = useState(false);
  const [rejectLoading, setRejectLoading] = useState(false);
  const [propertyAllImages, setPropertyAllImages] = useState({});
  const [previewImage, setPreviewImage] = useState(null);
  const [selectedImageTab, setSelectedImageTab] = useState("exterior");

  const adminId = localStorage.getItem("user_id");

  // Predefined rejection reasons for properties
  const rejectionOptions = [
    { value: "incomplete_documents", label: "Incomplete Documents" },
    { value: "invalid_valuation", label: "Invalid Valuation Amount" },
    { value: "missing_documents", label: "Missing Required Documents" },
    { value: "property_misrepresentation", label: "Property Misrepresentation" },
    { value: "owner_kyc_not_approved", label: "Owner KYC Not Approved" },
    { value: "duplicate_listing", label: "Duplicate Listing" },
    { value: "invalid_property_details", label: "Invalid Property Details" },
    { value: "other", label: "Other" }
  ];

  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = async () => {
    try {
      setLoading(true);
      const response = await fetch("http://localhost:5000/api/properties/marketplace");
      const result = await response.json();

      if (result.success) {
        const properties = result.properties;
        setListings(properties);
        setStats({
          total: properties.length,
          pending: properties.filter(l => l.status === "Pending").length,
          Approved: properties.filter(l => l.status === "Approved").length,
          Tokenized: properties.filter(l => l.status === "Tokenized").length,
        });
        
        for (const property of properties) {
          await fetchPropertyImages(property.property_id);
        }
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError("Failed to fetch listings");
      console.error(err);
    } finally {
      setLoading(false);
    }
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
        
        setPropertyAllImages(prev => ({
          ...prev,
          [propertyId]: { exterior: exteriorImages, interior: interiorImages }
        }));
        
        const exteriorImage = exteriorImages[0];
        const firstImage = exteriorImage || (result.images[0] ? (() => {
          let url = result.images[0].image_url;
          if (!url.startsWith("http")) {
            url = `http://localhost:5000/${url.replace(/\\/g, '/')}`;
          }
          return url;
        })() : null);
        
        setPropertyImages(prev => ({
          ...prev,
          [propertyId]: firstImage
        }));
      } else {
        setPropertyImages(prev => ({ ...prev, [propertyId]: null }));
        setPropertyAllImages(prev => ({ ...prev, [propertyId]: { exterior: [], interior: [] } }));
      }
    } catch (err) {
      console.error(`Error fetching images for property ${propertyId}:`, err);
      setPropertyImages(prev => ({ ...prev, [propertyId]: null }));
      setPropertyAllImages(prev => ({ ...prev, [propertyId]: { exterior: [], interior: [] } }));
    }
  };

  const handleApprove = async (listing) => {
    try {
      setApproveLoading(true);
      if (!adminId) {
        alert("Admin ID not found. Please log in again.");
        return;
      }

      const bcResponse = await fetch(
        `http://localhost:5000/api/properties/blockchain-approve/${listing.property_id}`,
        { method: "POST", headers: { "Content-Type": "application/json" } }
      );
      const bcResult = await bcResponse.json();

      if (!bcResult.success) {
        alert("Blockchain approval failed: " + bcResult.message);
        return;
      }

      const dbResponse = await fetch(
        `http://localhost:5000/api/properties/update-status/${listing.property_id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            admin_id: Number(adminId),
            status: "Approved",
            valuation_amount: listing.value,
          }),
        }
      );
      const dbResult = await dbResponse.json();

      if (dbResult.success) {
        alert("Property approved successfully!");
        fetchListings();
        setSelectedListing(null);
      } else {
        alert("DB update failed: " + dbResult.message);
      }
    } catch (err) {
      alert("Error approving property: " + err.message);
    } finally {
      setApproveLoading(false);
    }
  };

  // Handle rejection option change
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

  const handleReject = async () => {
    if (!selectedListing) return;
    if (!rejectionReason.trim()) {
      alert("Please provide a rejection reason.");
      return;
    }

    try {
      setRejectLoading(true);
      const response = await fetch(
        `http://localhost:5000/api/properties/update-status/${selectedListing.property_id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            admin_id: adminId,
            status: "Rejected",
            rejection_reason: rejectionReason,
          }),
        }
      );
      const result = await response.json();

      if (result.success) {
        alert("Property rejected successfully!");
        fetchListings();
        setSelectedListing(null);
        setShowRejectionModal(false);
        setRejectionReason("");
        setSelectedRejectionOption("");
      } else {
        alert("Failed to reject: " + result.message);
      }
    } catch (err) {
      alert("Error rejecting property");
    } finally {
      setRejectLoading(false);
    }
  };

  // Updated handleViewDocument with better preview logic
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

  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case "pending":   return "status-pending";
      case "approved":  return "status-approved";
      case "tokenized": return "status-approved";
      case "rejected":  return "status-rejected";
      default:          return "";
    }
  };

  const getRoleBadgeClass = (role) => {
    switch (role?.toLowerCase()) {
      case "owner":   return "role-badge owner";
      case "admin":   return "role-badge admin";
      case "investor": return "role-badge investor";
      default:        return "role-badge";
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return "PKR 0";
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading property listings...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <h3>Error</h3>
        <p>{error}</p>
        <button onClick={fetchListings} className="retry-btn">Retry</button>
      </div>
    );
  }

  return (
    <div className="kyc-page">
      <div className="kyc-header">
        <div className="header-left">
          <h1>Property Listings</h1>
          <p className="showing-text">Showing {stats.total} total properties</p>
        </div>
        <div className="header-stats">
          <div className="stat-item">
            <span className="stat-value">{stats.pending}</span>
            <span className="stat-label">Pending</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{stats.Approved}</span>
            <span className="stat-label">Approved</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{stats.Tokenized}</span>
            <span className="stat-label">Tokenized</span>
          </div>
        </div>
      </div>

      <div className="properties-grid">
        {listings.map((listing) => {
          const imageUrl = propertyImages[listing.property_id];
          
          return (
            <div
              key={listing.property_id}
              className="property-card"
              onClick={() => setSelectedListing(listing)}
            >
              <div className="property-card-image">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={listing.title}
                    className="property-card-img"
                    onError={(e) => {
                      e.target.style.display = "none";
                      const fallback = e.target.parentElement.querySelector('.fallback-icon');
                      if (fallback) fallback.style.display = "flex";
                    }}
                  />
                ) : null}
                <div className="fallback-icon">
                  🏠
                </div>
                <span className="property-status-badge">
                  {listing.status}
                </span>
              </div>

              <div className="property-card-content">
                <h3 className="property-card-title">{listing.title}</h3>
                <p className="property-card-location">📍 {listing.city}, {listing.country || "Pakistan"}</p>
                <p className="property-card-owner">👤 {listing.owner_name}</p>
                <p className="property-card-price">{formatCurrency(listing.value || listing.valuation_amount)}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Details Modal */}
      {selectedListing && !showRejectionModal && (
        <div className="modal-overlay" onClick={() => setSelectedListing(null)}>
          <div className="kyc-modal view-listings-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedListing(null)}>×</button>
            <h2>{selectedListing.title}</h2>
            
            <div className="modal-id-role-container">
              <div className="property-id-badge">Property ID: {selectedListing.property_id}</div>
              <div className="role-badge-wrapper">
                <span className={`role-badge ${getRoleBadgeClass(selectedListing.owner_role)}`}>
                  {selectedListing.owner_role || "Investor"}
                </span>
              </div>
            </div>

            <div className="modal-content">
              <div className="detail-row">
                <span className="detail-label">Description:</span>
                <span className="detail-value">{selectedListing.description || "No description"}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Address:</span>
                <span className="detail-value">{selectedListing.address || selectedListing.street || "N/A"}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">City:</span>
                <span className="detail-value">{selectedListing.city}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Province:</span>
                <span className="detail-value">{selectedListing.province}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Country:</span>
                <span className="detail-value">{selectedListing.country || "Pakistan"}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Type:</span>
                <span className="detail-value">{selectedListing.type}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Size:</span>
                <span className="detail-value">{selectedListing.size} {selectedListing.size_unit}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Rental Yield:</span>
                <span className="detail-value">{selectedListing.rentalYield || selectedListing.yield ? `${selectedListing.rentalYield || selectedListing.yield}%` : "N/A"}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Owner:</span>
                <span className="detail-value">{selectedListing.owner_name}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Owner Email:</span>
                <span className="detail-value">{selectedListing.owner_email || "N/A"}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Owner Role:</span>
                <span className="detail-value">
                  <span className={`role-badge ${getRoleBadgeClass(selectedListing.owner_role)}`}>
                    {selectedListing.owner_role || "Investor"}
                  </span>
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Valuation:</span>
                <span className="detail-value valuation-amount">{formatCurrency(selectedListing.valuation_amount || selectedListing.value)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Status:</span>
                <span className="detail-value">
                  <span className={`status-badge ${getStatusBadgeClass(selectedListing.status)}`}>
                    {selectedListing.status}
                  </span>
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Created:</span>
                <span className="detail-value">{new Date(selectedListing.created_at).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Property Images Section */}
            {propertyAllImages[selectedListing.property_id] && 
             (propertyAllImages[selectedListing.property_id].exterior?.length > 0 || 
              propertyAllImages[selectedListing.property_id].interior?.length > 0) && (
              <div className="property-images-section">
                <h3 className="section-title">📸 Property Images</h3>
                
                <div className="image-tabs">
                  <button
                    onClick={() => setSelectedImageTab("exterior")}
                    className={`image-tab ${selectedImageTab === "exterior" ? "active" : ""}`}
                  >
                    🏡 Exterior ({propertyAllImages[selectedListing.property_id].exterior?.length || 0})
                  </button>
                  <button
                    onClick={() => setSelectedImageTab("interior")}
                    className={`image-tab ${selectedImageTab === "interior" ? "active" : ""}`}
                  >
                    🛋️ Interior ({propertyAllImages[selectedListing.property_id].interior?.length || 0})
                  </button>
                </div>

                <div className="image-grid">
                  {(selectedImageTab === "exterior" 
                    ? propertyAllImages[selectedListing.property_id].exterior 
                    : propertyAllImages[selectedListing.property_id].interior
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
                
                {selectedImageTab === "exterior" && (!propertyAllImages[selectedListing.property_id].exterior?.length) && (
                  <p className="no-images-message">No exterior images available</p>
                )}
                {selectedImageTab === "interior" && (!propertyAllImages[selectedListing.property_id].interior?.length) && (
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

            {/* Documents Section */}
            {selectedListing.documents_parsed && (
              <div className="property-documents-section">
                <h3 className="section-title">📄 Property Documents</h3>
                <div className="document-list">
                  {[
                    { key: "titleDeed", label: "Title Deed / Ownership Proof", icon: "📜" },
                    { key: "valuationCertificate", label: "Valuation Certificate", icon: "📊" },
                    { key: "taxBills", label: "Tax / Utility Bills", icon: "🧾" },
                  ].map(({ key, label, icon }) => (
                    <div key={key} className="document-item">
                      <span className="doc-name">{icon} {label}</span>
                      <button 
                        className="view-doc-btn" 
                        disabled={!selectedListing.documents_parsed?.[key]} 
                        onClick={() => handleViewDocument(selectedListing.documents_parsed?.[key], label)}
                      >
                        {selectedListing.documents_parsed?.[key] ? "View" : "Not Available"}
                      </button>
                    </div>
                  ))}
                </div>
                
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
            )}

            {selectedListing.status === "Pending" && (
              <div className="modal-actions">
                <button 
                  className="approve-btn large" 
                  disabled={approveLoading || rejectLoading} 
                  onClick={() => handleApprove(selectedListing)}
                >
                  {approveLoading ? "Processing..." : "✓ Approve Listing"}
                </button>
                <button 
                  className="reject-btn large" 
                  disabled={approveLoading || rejectLoading} 
                  onClick={() => setShowRejectionModal(true)}
                >
                  {rejectLoading ? "Processing..." : "✗ Reject Listing"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rejection Modal with Dropdown */}
      {showRejectionModal && selectedListing && (
        <div className="modal-overlay" onClick={() => { setShowRejectionModal(false); setRejectionReason(""); setSelectedRejectionOption(""); }}>
          <div className="rejection-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Reject Listing — {selectedListing.title}</h3>
            <p className="property-name-modal">Property ID: {selectedListing.property_id}</p>
            
            <div className="form-group">
              <label className="rejection-label">Rejection Reason *</label>
              <select 
                className="rejection-select"
                value={selectedRejectionOption}
                onChange={handleRejectionOptionChange}
              >
                <option value="">Select a reason...</option>
                {rejectionOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            {selectedRejectionOption === "other" && (
              <div className="form-group">
                <label className="rejection-label">Please specify reason *</label>
                <textarea
                  className="rejection-textarea"
                  placeholder="Enter rejection reason..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows="4"
                />
              </div>
            )}

            {selectedRejectionOption && selectedRejectionOption !== "other" && (
              <div className="selected-reason-preview">
                <strong>Selected reason:</strong> {rejectionReason}
              </div>
            )}

            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => { setShowRejectionModal(false); setRejectionReason(""); setSelectedRejectionOption(""); }}>
                Cancel
              </button>
              <button 
                className="reject-btn" 
                disabled={rejectLoading || !selectedRejectionOption || (selectedRejectionOption === "other" && !rejectionReason.trim())} 
                onClick={handleReject}
              >
                {rejectLoading ? "Processing…" : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewListings;