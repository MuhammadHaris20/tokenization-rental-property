import React, { useState } from "react";
import "../../App.css";

const ManageRentalInfo = () => {
  const [activeTab, setActiveTab] = useState("active");
  const [selectedRental, setSelectedRental] = useState(null);

  // Sample rental data
  const rentals = {
    active: [
      { 
        id: "#RNT001", 
        property: "Luxury Villa", 
        tenant: "John Smith", 
        startDate: "2024-01-15", 
        endDate: "2024-07-15",
        rentAmount: 2500,
        paymentStatus: "paid",
        lastPayment: "2024-02-15"
      },
      { 
        id: "#RNT002", 
        property: "Downtown Apartment", 
        tenant: "Emma Watson", 
        startDate: "2024-02-01", 
        endDate: "2024-08-01",
        rentAmount: 1800,
        paymentStatus: "pending",
        lastPayment: "2024-01-01"
      },
    ],
    upcoming: [
      { 
        id: "#RNT004", 
        property: "Beach House", 
        tenant: "Michael Brown", 
        startDate: "2024-03-01", 
        endDate: "2024-09-01",
        rentAmount: 3200,
        paymentStatus: "upcoming",
        lastPayment: null
      },
    ],
    expired: [
      { 
        id: "#RNT005", 
        property: "Garden Apartment", 
        tenant: "Sarah Johnson", 
        startDate: "2023-08-01", 
        endDate: "2024-02-01",
        rentAmount: 1500,
        paymentStatus: "expired",
        lastPayment: "2024-01-01"
      },
    ]
  };

  const handleViewDetails = (rental) => {
    setSelectedRental(rental);
  };

  const handleCloseModal = () => {
    setSelectedRental(null);
  };

  const handleSendReminder = (id) => {
    alert(`Payment reminder sent for rental ${id}`);
  };

  return (
    <div className="admin-page">
      <div className="page-header">
        <h2>Manage Rental Information</h2>
        <div className="header-stats">
          <span className="stat">Active: {rentals.active.length}</span>
          <span className="stat">Upcoming: {rentals.upcoming.length}</span>
          <span className="stat">Expired: {rentals.expired.length}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="rental-tabs">
        <button 
          className={`tab-btn ${activeTab === 'active' ? 'active' : ''}`}
          onClick={() => setActiveTab('active')}
        >
          Active Rentals
        </button>
        <button 
          className={`tab-btn ${activeTab === 'upcoming' ? 'active' : ''}`}
          onClick={() => setActiveTab('upcoming')}
        >
          Upcoming Rentals
        </button>
        <button 
          className={`tab-btn ${activeTab === 'expired' ? 'active' : ''}`}
          onClick={() => setActiveTab('expired')}
        >
          Expired Rentals
        </button>
      </div>

      {/* Rentals Table */}
      <div className="table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Rental ID</th>
              <th>Property</th>
              <th>Tenant</th>
              <th>Period</th>
              <th>Monthly Rent</th>
              <th>Payment Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rentals[activeTab].map(rental => (
              <tr key={rental.id}>
                <td>{rental.id}</td>
                <td>{rental.property}</td>
                <td>{rental.tenant}</td>
                <td>{rental.startDate} to {rental.endDate}</td>
                <td>${rental.rentAmount}</td>
                <td>
                  <span className={`status-badge ${rental.paymentStatus}`}>
                    {rental.paymentStatus}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    <button className="action-btn view" onClick={() => handleViewDetails(rental)}>View</button>
                    <button className="action-btn approve" onClick={() => handleSendReminder(rental.id)}>Remind</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Rental Details Modal */}
      {selectedRental && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="kyc-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={handleCloseModal}>×</button>
            <h2>Rental Details - {selectedRental.id}</h2>
            
            <div className="modal-content">
              <div className="detail-row">
                <span className="detail-label">Property:</span>
                <span className="detail-value">{selectedRental.property}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Tenant:</span>
                <span className="detail-value">{selectedRental.tenant}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Lease Period:</span>
                <span className="detail-value">{selectedRental.startDate} to {selectedRental.endDate}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Monthly Rent:</span>
                <span className="detail-value">${selectedRental.rentAmount}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Payment Status:</span>
                <span className="detail-value">
                  <span className={`status-badge ${selectedRental.paymentStatus}`}>
                    {selectedRental.paymentStatus}
                  </span>
                </span>
              </div>
            </div>

            <div className="modal-actions">
              <button className="approve-btn large" onClick={() => handleSendReminder(selectedRental.id)}>
                Send Reminder
              </button>
              <button className="reject-btn large" onClick={handleCloseModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageRentalInfo;