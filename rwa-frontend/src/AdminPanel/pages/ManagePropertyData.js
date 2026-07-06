import React, { useState, useEffect } from "react";
import "../../App.css";

const ManagePropertyData = () => {
  const [activeTab, setActiveTab] = useState("all");
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [properties, setProperties] = useState([]);
  // Sample property data

useEffect(() => {
  const fetchProperties = async () => {
    try {
      const res = await fetch(
        "http://localhost:5000/api/properties/my-properties?user_id=1&role=ADMIN"
      );

      if (!res.ok) {
        throw new Error(`HTTP Error! Status: ${res.status}`);
      }

      const data = await res.json();

      console.log("API Response:", data);

      if (data.success) {
        setProperties(data.properties);
      } else {
        throw new Error(data.message || "Failed to load properties");
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setError(err.message);
    }
  };

  fetchProperties();
}, []);

  const filteredProperties = properties.filter(prop => {
    if (activeTab === "all") return true;
    return prop.status === activeTab;
  });

  const handleViewDetails = (property) => {
    setSelectedProperty(property);
  };

  const handleCloseModal = () => {
    setSelectedProperty(null);
    setShowEditModal(false);
  };

  const handleEdit = (property) => {
    setSelectedProperty(property);
    setShowEditModal(true);
  };

  const handleUpdateProperty = (e) => {
    e.preventDefault();
    alert(`Property ${selectedProperty.id} updated successfully!`);
    setShowEditModal(false);
  };

  const handleDeleteProperty = (id) => {
    if (window.confirm(`Are you sure you want to delete property ${id}?`)) {
      alert(`Property ${id} deleted`);
    }
  };

  return (
    <div className="admin-page">
      <div className="page-header">
        <h2>Manage Property Data</h2>
        <div className="header-stats">
          <span className="stat">Total: {properties.length}</span>
          <span className="stat">Active: {properties.filter(p => p.status === 'active').length}</span>
          <span className="stat">Pending: {properties.filter(p => p.status === 'pending').length}</span>
        </div>
      </div>

      {/* Simple Tabs */}
      <div className="property-tabs">
        <button 
          className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          All Properties
        </button>
        <button 
          className={`tab-btn ${activeTab === 'active' ? 'active' : ''}`}
          onClick={() => setActiveTab('active')}
        >
          Active
        </button>
        <button 
          className={`tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          Pending
        </button>
        <button 
          className={`tab-btn ${activeTab === 'inactive' ? 'active' : ''}`}
          onClick={() => setActiveTab('inactive')}
        >
          Inactive
        </button>
      </div>

      {/* Properties Table */}
      <div className="table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Property</th>
              <th>Location</th>
              <th>Type</th>
              <th>Value(PKR)</th>
              <th>Tokens</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProperties.map(property => (
              <tr key={property.id}>
                <td>{property.id}</td>
                <td>
                  <strong>{property.title}</strong>
                  <div><small>Owner: {property.owner}</small></div>
                </td>
                <td>{property.location}</td>
                <td>{property.type}</td>
                <td>{property.value.toLocaleString()}</td>
                <td>{property.tokens}</td>
                <td>
                  <span className={`status-badge ${property.status}`}>
                    {property.status}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    <button className="action-btn view" onClick={() => handleViewDetails(property)}>View</button>
                    <button className="action-btn edit" onClick={() => handleEdit(property)}>Edit</button>
                    <button className="action-btn delete" onClick={() => handleDeleteProperty(property.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Property Details Modal */}
      {selectedProperty && !showEditModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="kyc-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={handleCloseModal}>×</button>
            <h2>Property Details - {selectedProperty.id}</h2>
            
            <div className="modal-content">
              <div className="detail-row">
                <span className="detail-label">Title:</span>
                <span className="detail-value">{selectedProperty.title}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Location:</span>
                <span className="detail-value">{selectedProperty.location}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Type:</span>
                <span className="detail-value">{selectedProperty.type}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Size:</span>
                <span className="detail-value">{selectedProperty.size} sq.ft</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Value:</span>
                <span className="detail-value">${selectedProperty.value.toLocaleString()}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Tokens:</span>
                <span className="detail-value">{selectedProperty.tokens}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Owner:</span>
                <span className="detail-value">{selectedProperty.owner}</span>
              </div>
            </div>

            <div className="modal-actions">
              <button className="approve-btn large" onClick={() => handleEdit(selectedProperty)}>
                Edit Property
              </button>
              <button className="reject-btn large" onClick={handleCloseModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Property Modal */}
      {showEditModal && selectedProperty && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="kyc-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={handleCloseModal}>×</button>
            <h2>Edit Property - {selectedProperty.id}</h2>
            
            <form onSubmit={handleUpdateProperty}>
              <div className="form-group">
                <label>Property Title</label>
                <input type="text" defaultValue={selectedProperty.title} required />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Property Value ($)</label>
                  <input type="number" defaultValue={selectedProperty.value} required />
                </div>
                <div className="form-group">
                  <label>Size (sq.ft)</label>
                  <input type="number" defaultValue={selectedProperty.size} required />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Tokens</label>
                  <input type="number" defaultValue={selectedProperty.tokens} required />
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select defaultValue={selectedProperty.status}>
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Location</label>
                <input type="text" defaultValue={selectedProperty.location} required />
              </div>

              <div className="form-group">
                <label>Owner</label>
                <input type="text" defaultValue={selectedProperty.owner} required />
              </div>

              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="submit-kyc-btn">
                  Update Property
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagePropertyData;