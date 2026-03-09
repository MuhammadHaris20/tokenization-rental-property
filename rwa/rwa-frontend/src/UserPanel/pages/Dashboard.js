// Dashboard.js
import React, { useState, useEffect } from "react";
import Navbar from "../components/navbar";
import PropertyTable from "../components/PropertyTable";
import "../../App.css";

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [kycStatus, setKycStatus] = useState("pending"); // pending, submitted, approved, rejected
  const [showKycModal, setShowKycModal] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  // Mock user data
  const userData = {
    name: "John Investor",
    email: "john.investor@example.com",
    avatar: "https://i.pravatar.cc/150?img=12",
    kycStatus: "pending",
    walletBalance: 12500.75,
    totalInvestment: 45000,
    propertiesOwned: 3,
    monthlyIncome: 1250,
    roi: 12.5,
  };

  
 // Inside Dashboard component, after state declarations

useEffect(() => {
  const fetchKycStatus = async () => {
    try {
      const userId = 1; // Replace with actual logged-in user ID
      const response = await fetch(`http://localhost:5000/api/kyc/status/${userId}`);
      const data = await response.json();

      if (response.ok) {
        let mappedStatus = "pending"; // default for not submitted

        if (data.status === "Verified") mappedStatus = "approved";
        else if (data.status === "Rejected") mappedStatus = "rejected";
        else if (data.status === "Pending") mappedStatus = "submitted"; // <-- key change

        setKycStatus(mappedStatus);
      } else {
        console.error("Failed to fetch KYC status", data);
      }
    } catch (err) {
      console.error("Error fetching KYC status", err);
    }
  };

  fetchKycStatus();
  const interval = setInterval(fetchKycStatus, 30000);
  return () => clearInterval(interval);
}, []);

  // Properties data
  const [properties, setProperties] = useState([
    { id: 1, title: "Luxury Villa", status: "Active", tokens: 50, size: 2500, value: 25000, yield: 8.5 },
    { id: 2, title: "Downtown Apartment", status: "Active", tokens: 25, size: 1200, value: 15000, yield: 7.2 },
    { id: 3, title: "Commercial Space", status: "Pending", tokens: 100, size: 5000, value: 50000, yield: 9.8 },
  ]);

  const transactions = [
    { id: 1, type: "buy", property: "Luxury Villa", tokens: 10, amount: 5000, date: "2024-02-20" },
    { id: 2, type: "sell", property: "Downtown Apartment", tokens: 5, amount: 3000, date: "2024-02-18" },
    { id: 3, type: "dividend", property: "Commercial Space", amount: 250, date: "2024-02-15" },
  ];

  // Province options
  const provinces = [
    "Punjab",
    "Sindh",
    "Khyber Pakhtunkhwa",
    "Balochistan",
    "Gilgit-Baltistan",
    "Azad Jammu & Kashmir",
    "Islamabad Capital Territory"
  ];


  const handleAddProperty = (newProperty) => {
  // Append the new property to the existing properties state
  setProperties(prevProperties => [...prevProperties, newProperty]);
  alert("Property added successfully!");
};
  // Validate file size (less than 1MB)
  const validateFileSize = (file) => {
    const maxSize = 1 * 1024 * 1024; // 1MB in bytes
    return file.size <= maxSize;
  };

  // Validate form fields
  const validateForm = (formData) => {
    const errors = {};
    

    // Cnic validation
 const cnicInput = formData.get("cnic") || "";
  const cnicDigits = cnicInput.replace(/\D/g, ""); // remove dashes
  if (cnicDigits.length !== 13) {
    errors.cnic = "CNIC must be exactly 13 digits";
  }

    // File validations
    const fileInputs = ['cnicFront', 'cnicBack', 'selfie', 'addressProof'];
    fileInputs.forEach(inputName => {
      const file = formData.get(inputName);
      if (file && file.size > 0 && !validateFileSize(file)) {
        errors[inputName] = 'File size must be less than 1MB';
      }
    });
    
    return errors;
  };

  const handleKYCSubmit = async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);

  // Validate form
  const errors = validateForm(formData);
  if (Object.keys(errors).length > 0) {
    setFormErrors(errors);
    return;
  }

  try {
    const userId = 1; // Replace later with real logged-in user ID

    const response = await fetch(
      `http://localhost:5000/api/kyc/submit/${userId}`,
      {
        method: "POST",
        body: formData,
      }
    );

    const data = await response.json();

    if (!response.ok) {
      alert(data.message || "Failed to submit KYC.");
      return;
    }

    // ✅ Success
    setKycStatus("submitted");
    setShowKycModal(false);
    setFormErrors({});
    alert(data.message || "KYC submitted successfully!");

  } catch (err) {
    console.error("KYC Error:", err);
    alert("Server error. Please try again.");
  }
};

    // Phone number validation
const handleMobileChange = (e) => {
  let value = e.target.value;
  // Ensure +92 prefix
  if (!value.startsWith("+92")) {
    value = "+92" + value.replace(/\D/g, "").replace(/^92/, "");
  }
  // Allow only digits after +92
  let digits = value.slice(3).replace(/\D/g, "");
  // Limit to 10 digits
  digits = digits.slice(0, 10);
  e.target.value = "+92" + digits;
};

// Cnic validation
const handleCnicChange = (e) => {
  let value = e.target.value.replace(/\D/g, ""); // remove all non-digits

  if (value.length > 5 && value.length <= 12) {
    value = value.slice(0, 5) + "-" + value.slice(5);
  } else if (value.length > 12) {
    value = value.slice(0, 5) + "-" + value.slice(5, 12) + "-" + value.slice(12, 13);
  }

  e.target.value = value; // formatted value with dashes
};

const handleDobChange = (e) => {
  const today = new Date();
  const eighteenYearsAgo = new Date();
  eighteenYearsAgo.setFullYear(today.getFullYear() - 18);

  const selectedDate = new Date(e.target.value);

  if (selectedDate > today) {
    alert("Date of birth cannot be in the future.");
    e.target.value = ""; // reset
  } else if (selectedDate > eighteenYearsAgo) {
    alert("You must be at least 18 years old.");
    e.target.value = ""; // reset
  }
};
  // Get KYC banner content based on status
  const getKycBannerContent = () => {
    switch(kycStatus) {
      case 'pending':
        return {
          icon: '🔔',
          title: 'KYC Verification Required',
          message: 'Complete your KYC to start investing in properties',
          buttonText: 'Complete KYC Now',
          buttonAction: () => setShowKycModal(true),
          bannerClass: 'kyc-banner-pending'
        };
      case 'submitted':
  return {
    icon: '⏳',
    title: 'KYC Under Review',
    message: 'Your KYC is submitted and pending verification.',
    buttonText: 'Check Status',
    buttonAction: () => setShowKycModal(true),
    bannerClass: 'kyc-banner-submitted'
  };
      case 'rejected':
        return {
          icon: '❌',
          title: 'KYC Verification Failed',
          message: 'Your documents were rejected. Please resubmit with correct information.',
          buttonText: 'Resubmit KYC',
          buttonAction: () => setShowKycModal(true),
          bannerClass: 'kyc-banner-rejected'
        };
      default:
        return null;
    }
  };

  return (
    <>
      <Navbar />
      
      <div className="user-dashboard">
        {/* Top Bar with Profile - Like Admin Panel */}
        <div className="dashboard-topbar">
          <div className="topbar-title">
            <h1>My Dashboard</h1>
          </div>
          
          <div className="topbar-profile">
            <div className="profile-dropdown">
              <img src={userData.avatar} alt="Profile" className="profile-avatar" />
              <div className="profile-info">
                <span className="profile-name">{userData.name}</span>
                <span className="profile-role">Investor</span>
              </div>
            </div>
          </div>
        </div>

        {/* KYC Banner - Dynamic based on status */}
        {kycStatus !== "approved" && getKycBannerContent() && (
          <div className={`kyc-banner ${getKycBannerContent().bannerClass}`}>
            <div className="kyc-banner-content">
              <span className="kyc-icon">{getKycBannerContent().icon}</span>
              <div className="kyc-text">
                <strong>{getKycBannerContent().title}</strong>
                <p>{getKycBannerContent().message}</p>
              </div>
              <button 
                className="kyc-banner-btn"
                onClick={getKycBannerContent().buttonAction}
              >
                {getKycBannerContent().buttonText}
              </button>
            </div>
          </div>
        )}

        {/* Welcome Section */}
        <div className="welcome-section">
          <h2>Welcome back, {userData.name}!</h2>
          <p>Here's what's happening with your portfolio today.</p>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card primary">
            <div className="stat-icon">📊</div>
            <div className="stat-details">
              <h3>${userData.totalInvestment.toLocaleString()}</h3>
              <p>Total Investment</p>
            </div>
          </div>
          <div className="stat-card success">
            <div className="stat-icon">🏠</div>
            <div className="stat-details">
              <h3>{userData.propertiesOwned}</h3>
              <p>Properties Owned</p>
            </div>
          </div>
          <div className="stat-card warning">
            <div className="stat-icon">📈</div>
            <div className="stat-details">
              <h3>{userData.roi}%</h3>
              <p>ROI</p>
            </div>
          </div>
          <div className="stat-card info">
            <div className="stat-icon">💰</div>
            <div className="stat-details">
              <h3>${userData.monthlyIncome.toLocaleString()}</h3>
              <p>Monthly Income</p>
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="dashboard-tabs">
          <button 
            className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button 
            className={`tab-btn ${activeTab === 'properties' ? 'active' : ''}`}
            onClick={() => setActiveTab('properties')}
          >
            My Properties
          </button>
          <button 
            className={`tab-btn ${activeTab === 'marketplace' ? 'active' : ''}`}
            onClick={() => setActiveTab('marketplace')}
          >
            Marketplace
          </button>
          <button 
            className={`tab-btn ${activeTab === 'transactions' ? 'active' : ''}`}
            onClick={() => setActiveTab('transactions')}
          >
            Transactions
          </button>
          <button 
            className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            Settings
          </button>
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <>
              {/* Quick Actions */}
              <h3 className="section-title">Quick Actions</h3>
              <div className="quick-actions-grid">
                <div className="action-card" onClick={() => setActiveTab('marketplace')}>
                  <span className="action-icon">🔍</span>
                  <h4>Browse Properties</h4>
                  <p>Explore available investment opportunities</p>
                </div>
                <div className="action-card" onClick={() => setActiveTab('properties')}>
                  <span className="action-icon">📊</span>
                  <h4>View Portfolio</h4>
                  <p>Check your property investments</p>
                </div>
                <div className="action-card" onClick={() => document.querySelector('.add-property-btn')?.click()}>
                  <span className="action-icon">💰</span>
                  <h4>Tokenize Property</h4>
                  <p>Add a new property for tokenization</p>
                </div>
                <div className="action-card" onClick={() => {/* Handle sell tokens */}}>
                  <span className="action-icon">💸</span>
                  <h4>Sell Tokens</h4>
                  <p>Sell your property tokens</p>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="recent-activity-card">
                <h3>Recent Activity</h3>
                <div className="activity-timeline">
                  {transactions.slice(0, 3).map(tx => (
                    <div key={tx.id} className="timeline-item">
                      <div className="timeline-dot"></div>
                      <div className="timeline-content">
                        <p className="timeline-title">
                          {tx.type === 'buy' && 'Bought'}
                          {tx.type === 'sell' && 'Sold'}
                          {tx.type === 'dividend' && 'Received dividend from'} {tx.property}
                        </p>
                        <p className="timeline-meta">
                          {tx.amount && `$${tx.amount}`} • {tx.date}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Properties Tab - Now includes PropertyTable with Add Property form */}
          {activeTab === 'properties' && (
            <div className="properties-section">
              <PropertyTable 
                properties={properties} 
                onAddProperty={handleAddProperty}
              />
            </div>
          )}

          {/* Marketplace Tab */}
          {activeTab === 'marketplace' && (
            <div className="marketplace-section">
              <h3 className="section-title">Available Properties</h3>
              <div className="marketplace-grid">
                {/* Property cards would go here */}
                <p className="empty-state">Marketplace coming soon...</p>
              </div>
            </div>
          )}

          {/* Transactions Tab */}
          {activeTab === 'transactions' && (
            <div className="transactions-section">
              <h3 className="section-title">Transaction History</h3>
              <table className="transactions-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Property</th>
                    <th>Tokens</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(tx => (
                    <tr key={tx.id}>
                      <td>{tx.date}</td>
                      <td>
                        <span className={`tx-type ${tx.type}`}>
                          {tx.type.toUpperCase()}
                        </span>
                      </td>
                      <td>{tx.property}</td>
                      <td>{tx.tokens || '-'}</td>
                      <td>${tx.amount}</td>
                      <td>
                        <span className="status-badge completed">Completed</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="settings-section">
              <h3 className="section-title">Account Settings</h3>
              
              {/* Password Reset */}
              <div className="settings-card">
                <h4>Reset Password</h4>
                <form className="password-reset-form">
                  <input type="password" placeholder="Current Password" />
                  <input type="password" placeholder="New Password" />
                  <input type="password" placeholder="Confirm New Password" />
                  <button className="primary-btn">Update Password</button>
                </form>
              </div>

              {/* KYC Status */}
              <div className="settings-card">
                <h4>KYC Verification</h4>
                <div className="kyc-status">
                  <span className={`kyc-badge ${kycStatus}`}>
                  {kycStatus === 'submitted' ? 'Pending' : kycStatus.toUpperCase()}
                  </span>
                  {kycStatus !== 'approved' && (
                    <button 
                      className="view-details-btn"
                      onClick={() => setShowKycModal(true)}
                    >
                      {kycStatus === 'submitted' ? 'View Status' : 'Complete KYC'}
                    </button>
                  )}
                </div>
                {kycStatus === 'submitted' && (
                  <p className="kyc-status-message">
                    Your KYC application is being reviewed. You'll be notified once verified.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* KYC Modal - This is now outside the tab content and will persist across tab changes */}
      {showKycModal && (
        <div className="modal-overlay" onClick={() => setShowKycModal(false)}>
          <div className="kyc-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowKycModal(false)}>×</button>
            
            {/* Different modal content based on KYC status */}
            {kycStatus === 'submitted' ? (
              // View Status Modal
              <>
                <h2>KYC Verification Status</h2>
                <div className="kyc-status-view">
                  <div className="status-icon">⏳</div>
                  <h3>Under Review</h3>
                  <p>Your KYC documents are currently being verified by our team.</p>
                  
                  <div className="status-timeline">
                    <div className="timeline-step completed">
                      <span className="step-number">1</span>
                      <div className="step-content">
                        <h4>Documents Submitted</h4>
                        <p>{new Date().toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="timeline-step active">
                      <span className="step-number">2</span>
                      <div className="step-content">
                        <h4>Under Review</h4>
                        <p>Estimated time: 1-2 business days</p>
                      </div>
                    </div>
                    <div className="timeline-step">
                      <span className="step-number">3</span>
                      <div className="step-content">
                        <h4>Verification Complete</h4>
                        <p>You'll be notified via email</p>
                      </div>
                    </div>
                  </div>

                  <div className="status-info">
                    <p><strong>Submitted on:</strong> {new Date().toLocaleDateString()}</p>
                    <p><strong>Documents submitted:</strong> CNIC Front, CNIC Back, Selfie, Address Proof</p>
                  </div>
                  <button className="modal-close" onClick={() => setShowKycModal(false)}>×</button>

                </div>
              </>
            ) : (
              // KYC Form Modal (for pending or rejected)
              <>
                <h2>KYC Verification</h2>
                <p className="kyc-subtitle">Please provide the following documents and information for verification</p>
                
                {kycStatus === 'rejected' && (
                  <div className="rejection-message">
                    <strong>Previous submission was rejected.</strong>
                    <p>Please ensure all documents are clear and information matches your ID proof.</p>
                  </div>
                )}
                
                <form onSubmit={handleKYCSubmit} className="kyc-form">
                  {/* Personal Information */}
                  <div className="form-section">
                    <h3>Personal Information</h3>
                    
                    <div className="form-group">
                      <label>Full Name (as per ID) <span className="required">*</span></label>
                      <input type="text" name="fullName" placeholder="Enter your full name" required />
                    </div>
                    
                    <div className="form-row">
                      <div className="form-group">
                        <label>CNIC Number <span className="required">*</span></label>
                        <input type="text" name="cnic" placeholder="12345-6789012-3" required  maxLength={15} onChange={handleCnicChange} />
                      </div>
                      
                      <div className="form-group">
                        <label>Date of Birth <span className="required">*</span></label> 
                        <input type="date" name="dob" required max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)) .toISOString().split("T")[0]} min="1900-01-01" />
                      </div>
                    </div>
                  </div>

                  {/* Address Information */}
                  <div className="form-section">
                    <h3>Address Information</h3>
                    
                    <div className="form-group">
                      <label>Permanent Address <span className="required">*</span></label>
                      <input type="text" name="permanentAddress" placeholder="Street address" required />
                    </div>
                    
                    <div className="form-row">
                      <div className="form-group">
                        <label>City <span className="required">*</span></label>
                        <input type="text" name="city" placeholder="City" required />
                      </div>
                      
                      <div className="form-group">
                        <label>Province <span className="required">*</span></label>
                        <select name="province" required>
                          <option value="">Select Province</option>
                          {provinces.map(province => (
                            <option key={province} value={province}>
                              {province}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="form-group">
                        <label>Postal/Zip Code <span className="required">*</span></label>
                        <input type="text" name="postalCode" placeholder="Postal code" required />
                      </div>
                    </div>
                    
                    <div className="form-group">
                      <label>Current Address (if different from permanent)</label>
                      <input type="text" name="currentAddress" placeholder="Current address (optional)" />
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="form-section">
                    <h3>Contact Information</h3>
                    
                    <div className="form-row">
                      <div className="form-group">
                        <label>Mobile Number <span className="required">*</span></label>
                        <input type="tel" name="mobileNumber" placeholder="+923001234567" defaultValue="+92" pattern="\+92[0-9]{10}" required onChange={handleMobileChange}/>
                        {formErrors.mobileNumber && (
                          <span className="error-message">{formErrors.mobileNumber}</span>
                        )}
                        <small className="field-hint">Format: (e.g., +923001234567)</small>
                      </div>
                      
                      <div className="form-group">
                        <label>Email Address <span className="required">*</span></label>
                        <input type="email" name="email" placeholder="your@email.com" required />
                      </div>
                    </div>
                  </div>

                  {/* Occupation & Income */}
                  <div className="form-section">
                    <h3>Occupation & Income</h3>
                    
                    <div className="form-group">
                      <label>Occupation / Source of Income <span className="required">*</span></label>
                      <select name="occupation" required>
                        <option value="">Select occupation</option>
                        <option value="salaried">Salaried Employee</option>
                        <option value="self-employed">Self-Employed</option>
                        <option value="business">Business Owner</option>
                        <option value="investor">Investor</option>
                        <option value="retired">Retired</option>
                        <option value="student">Student</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>

                  {/* Document Uploads */}
                  <div className="form-section">
                    <h3>Document Uploads</h3>
                    <p className="upload-hint">Maximum file size: 1MB per file</p>
                    
                    <div className="form-group">
                      <label>CNIC Front Side <span className="required">*</span></label>
                      <input 
                        type="file" 
                        name="cnicFront"
                        accept="image/*,.pdf" 
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file && !validateFileSize(file)) {
                            alert('File size must be less than 1MB');
                            e.target.value = '';
                          }
                        }}
                        required 
                      />
                      {formErrors.cnicFront && (
                        <span className="error-message">{formErrors.cnicFront}</span>
                      )}
                      <small className="field-hint">Upload clear image of your CNIC/Passport front side</small>
                    </div>
                    
                    <div className="form-group">
                      <label>CNIC Back Side <span className="required">*</span></label>
                      <input 
                        type="file" 
                        name="cnicBack"
                        accept="image/*,.pdf" 
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file && !validateFileSize(file)) {
                            alert('File size must be less than 1MB');
                            e.target.value = '';
                          }
                        }}
                        required 
                      />
                      {formErrors.cnicBack && (
                        <span className="error-message">{formErrors.cnicBack}</span>
                      )}
                      <small className="field-hint">Upload clear image of your CNIC/Passport back side</small>
                    </div>
                    
                    <div className="form-group">
                      <label>Selfie <span className="required">*</span></label>
                      <input 
                        type="file" 
                        name="selfie"
                        accept="image/*" 
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file && !validateFileSize(file)) {
                            alert('File size must be less than 1MB');
                            e.target.value = '';
                          }
                        }}
                        required 
                      />
                      {formErrors.selfie && (
                        <span className="error-message">{formErrors.selfie}</span>
                      )}
                      <small className="field-hint">Take a selfie with your face clearly visible</small>
                    </div>
                    
                    <div className="form-group">
                      <label>Address Proof <span className="required">*</span></label>
                      <input 
                        type="file" 
                        name="addressProof"
                        accept="image/*,.pdf" 
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file && !validateFileSize(file)) {
                            alert('File size must be less than 1MB');
                            e.target.value = '';
                          }
                        }}
                        required 
                      />
                      {formErrors.addressProof && (
                        <span className="error-message">{formErrors.addressProof}</span>
                      )}
                      <small className="field-hint">Utility bill, rent agreement, or bank statement (last 3 months)</small>
                    </div>
                  </div>

                  <div className="form-checkbox">
                    <input type="checkbox" id="verify" name="verification" required />
                    <label htmlFor="verify">I confirm that all information provided is true and correct to the best of my knowledge.</label>
                  </div>

                  <div className="modal-actions">
                    <button type="button" className="cancel-btn" onClick={() => setShowKycModal(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="submit-kyc-btn">
                      Submit KYC
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Dashboard;