import React, { useState, useEffect } from "react";
import "../../RealEstate.css";
import { CONTRACT_ADDRESSES } from "../../contracts";
import { getEthPkrRate } from "../../utils/ethRate";
const TenantManagement = ({ ownerId, isKycApproved = false }) => {
  const [tenants, setTenants] = useState([]);
  const [properties, setProperties] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTenantDetailsModal, setShowTenantDetailsModal] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sendingReminders, setSendingReminders] = useState(false);
  const [reminderMessage, setReminderMessage] = useState(null);
  const [hasTokenizedProperty, setHasTokenizedProperty] = useState(false);
  const [addingTenant, setAddingTenant] = useState(false);
  const [propertiesWithTenants, setPropertiesWithTenants] = useState({});
  const [showChangeTenantModal, setShowChangeTenantModal] = useState(false);
  const [showExtendLeaseModal, setShowExtendLeaseModal] = useState(false);
  const [tenantToChange, setTenantToChange] = useState(null);
  const [newLeaseEnd, setNewLeaseEnd] = useState("");
  const [extendingLease, setExtendingLease] = useState(false);
   
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    cnic: "",
    phone: "",
    propertyId: "",
    monthlyRent: "",
    leaseStart: "",
    leaseEnd: ""
  });

  const provinces = [
    "Punjab", "Sindh", "Khyber Pakhtunkhwa", "Balochistan",
    "Gilgit-Baltistan", "Azad Jammu & Kashmir", "Islamabad Capital Territory"
  ];

  useEffect(() => {
    if (ownerId) {
      fetchTenants();
      fetchProperties();
    }
  }, [ownerId]);

  useEffect(() => {
    if (ownerId) {
      const interval = setInterval(() => {
        fetchTenants();
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [ownerId]);

const fetchTenants = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/tenants?owner_id=${ownerId}`);
      const data = await response.json();
      if (data.success) {
        setTenants(data.tenants);

        // Keep ALL tenants (including ended leases) in `tenants` for record/history.
        // But for the purpose of "does this property already have a tenant?" —
        // which controls whether it shows up in the Add/Change Tenant dropdown —
        // only count tenants whose lease is still active (not yet ended).
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tenantMap = {};
        data.tenants.forEach(tenant => {
          if (!tenant.property_id) return;

          const leaseEnded = tenant.lease_end && new Date(tenant.lease_end) < today;
          if (leaseEnded) return; // don't block the property — lease is over

          if (!tenantMap[tenant.property_id]) {
            tenantMap[tenant.property_id] = [];
          }
          tenantMap[tenant.property_id].push(tenant);
        });
        setPropertiesWithTenants(tenantMap);
      }
    } catch (err) {
      console.error("Error fetching tenants:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProperties = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/properties/my-properties?user_id=${ownerId}&role=OWNER`);
      const data = await response.json();
      
      if (data.success) {
        setProperties(data.properties);
        const hasTokenized = data.properties.some(property => property.status === "Tokenized");
        setHasTokenizedProperty(hasTokenized);
      } else {
        setProperties([]);
        setHasTokenizedProperty(false);
      }
    } catch (err) {
      console.error("Error fetching properties:", err);
      setProperties([]);
      setHasTokenizedProperty(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCnicChange = (e) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 13) value = value.slice(0, 13);
    
    if (value.length > 5 && value.length <= 12) {
      value = value.slice(0, 5) + "-" + value.slice(5);
    } else if (value.length > 12) {
      value = value.slice(0, 5) + "-" + value.slice(5, 12) + "-" + value.slice(12, 13);
    }
    
    setFormData({ ...formData, cnic: value });
  };

  const getMinLeaseStartDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  const getMaxLeaseStartDate = () => {
    const date = new Date();
    date.setMonth(date.getMonth() + 3);
    return date.toISOString().split('T')[0];
  };

  const getMaxLeaseEndDate = () => {
    if (!formData.leaseStart) return '';
    const startDate = new Date(formData.leaseStart);
    startDate.setFullYear(startDate.getFullYear() + 1);
    return startDate.toISOString().split('T')[0];
  };

  const getMinLeaseEndDate = () => {
    if (!formData.leaseStart) return getMinLeaseStartDate();
    const startDate = new Date(formData.leaseStart);
    startDate.setMonth(startDate.getMonth() + 1);
    return startDate.toISOString().split('T')[0];
  };

  const validateLeaseDates = (startDate, endDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const leaseStart = new Date(startDate);
    const leaseEnd = new Date(endDate);
    
    if (leaseStart < today) {
      alert("Lease start date must be today or a future date");
      return false;
    }
    
    const threeMonthsFromNow = new Date(today);
    threeMonthsFromNow.setMonth(today.getMonth() + 3);
    
    if (leaseStart > threeMonthsFromNow) {
      alert("Lease start date cannot be more than 3 months from today");
      return false;
    }
    
    if (leaseEnd <= leaseStart) {
      alert("Lease end date must be after the start date");
      return false;
    }
    
    const oneYearFromStart = new Date(leaseStart);
    oneYearFromStart.setFullYear(leaseStart.getFullYear() + 1);
    
    if (leaseEnd > oneYearFromStart) {
      alert("Lease end date cannot exceed 1 year from the start date");
      return false;
    }
    
    const oneMonthFromStart = new Date(leaseStart);
    oneMonthFromStart.setMonth(leaseStart.getMonth() + 1);
    if (leaseEnd < oneMonthFromStart) {
      alert("Lease duration must be at least 1 month");
      return false;
    }
    
    return true;
  };

  const checkPropertyHasTenant = (propertyId) => {
    const propertyTenants = propertiesWithTenants[propertyId] || [];
    return propertyTenants.length >= 1;
  };

  const getAvailableProperties = () => {
    return properties.filter(property => {
      return !checkPropertyHasTenant(property.property_id);
    });
  };

  const handleAddTenant = async (e) => {
    e.preventDefault();
    setAddingTenant(true);

    if (checkPropertyHasTenant(formData.propertyId)) {
      alert("❌ This property already has a tenant. Only ONE tenant is allowed per property.");
      setAddingTenant(false);
      return;
    }

    const cnicRegex = /^\d{5}-\d{7}-\d{1}$/;
    if (!cnicRegex.test(formData.cnic)) {
      alert("Please enter CNIC in format: 12345-1234567-1");
      setAddingTenant(false);
      return;
    }
    if (!formData.propertyId) {
      alert("Please select a property");
      setAddingTenant(false);
      return;
    }
    if (!validateLeaseDates(formData.leaseStart, formData.leaseEnd)) {
      setAddingTenant(false);
      return;
    }
    const selectedProperty = properties.find(
      p => p.property_id === parseInt(formData.propertyId)
    );
    if (selectedProperty && selectedProperty.status !== "Tokenized") {
      alert("Cannot add tenant. Property must be tokenized first.");
      setAddingTenant(false);
      return;
    }

    try {
      if (!window.ethereum) {
        alert("MetaMask not found.");
        setAddingTenant(false);
        return;
      }

      const { ethers } = await import("ethers");
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      await browserProvider.send("eth_requestAccounts", []);
      const freshSigner = await browserProvider.getSigner();

      const network = await freshSigner.provider.getNetwork();
      if (network.chainId !== 11155111n) {
        alert("Please switch MetaMask to Sepolia Testnet.");
        setAddingTenant(false);
        return;
      }

      const ethPriceInPkr = await getEthPkrRate();

      const monthlyRentPKR = Number(formData.monthlyRent);
      const monthlyRentETH = monthlyRentPKR / ethPriceInPkr;
      const monthlyRentWei = BigInt(Math.round(monthlyRentETH * 1e18));

      const propRes = await fetch(
        `http://localhost:5000/api/properties/property/${formData.propertyId}`
      );
      const propData = await propRes.json();
      if (!propData?.property?.property_hash) {
        alert("Property hash not found.");
        setAddingTenant(false);
        return;
      }
      const propertyHashHex = "0x" + propData.property.property_hash;

      const cnicDigits = formData.cnic.replace(/\D/g, "");
      const tenantCnicHash = ethers.keccak256(ethers.toUtf8Bytes(cnicDigits));

      const OWNER_CONTROLLER = CONTRACT_ADDRESSES.PropertyOwnerController
      const contractABI = [
        "function assignTenant(bytes32 propertyHash, bytes32 tenantCnic, uint256 monthlyRent) external"
      ];
      const contract = new ethers.Contract(OWNER_CONTROLLER, contractABI, freshSigner);

      const tx = await contract.assignTenant(
        propertyHashHex,
        tenantCnicHash,
        monthlyRentWei
      );

      alert(`⏳ Transaction submitted!\nTX: ${tx.hash}\n\nWaiting for confirmation...`);

      const receipt = await tx.wait();
      if (receipt.status === 0) {
        alert("On-chain transaction failed. Please try again.");
        setAddingTenant(false);
        return;
      }

      const response = await fetch("http://localhost:5000/api/tenants/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner_id: ownerId,
          ...formData,
          blockchain_tx_hash: receipt.hash,
          monthly_rent_wei: monthlyRentWei.toString()
        })
      });
      const data = await response.json();

      if (data.success) {
        alert(`✅ Tenant ${formData.fullName} added successfully!\nBlockchain TX: ${receipt.hash}\nLogin credentials sent to their email.`);
        setShowAddModal(false);
        setFormData({
          fullName: "", email: "", cnic: "", phone: "",
          propertyId: "", monthlyRent: "", leaseStart: "", leaseEnd: ""
        });
        fetchTenants();
      } else {
        alert("On-chain TX succeeded but DB save failed: " + (data.error || "Unknown error") + "\nTX Hash: " + receipt.hash);
      }

    } catch (err) {
      console.error("Error adding tenant:", err);
      if (err.code === 4001 || err.code === "ACTION_REJECTED") {
        alert("Transaction rejected in MetaMask.");
      } else {
        alert("Transaction failed: " + (err.reason || err.message));
      }
    } finally {
      setAddingTenant(false);
    }
  };

  const handleViewDetails = (tenant) => {
    setSelectedTenant(tenant);
    setShowTenantDetailsModal(true);
  };

  const isLeaseEnded = (tenant) => {
    if (!tenant?.lease_end) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(tenant.lease_end.split('T')[0]) < today;
  };

  const openChangeTenantModal = (tenant) => {
    setTenantToChange(tenant);
    setNewLeaseEnd("");
    setShowChangeTenantModal(true);
  };

  const closeChangeTenantModal = () => {
    setShowChangeTenantModal(false);
    setTenantToChange(null);
  };

  // "Same Tenant" path → owner just sets a new end date, DB only, no blockchain
  const chooseSameTenant = () => {
    setShowChangeTenantModal(false);
    setShowExtendLeaseModal(true);
  };

  // "Different Tenant" path → reuse the existing Add Tenant on-chain flow,
  // pre-filling the property so the owner doesn't have to pick it again
  const chooseDifferentTenant = () => {
    setShowChangeTenantModal(false);
    setFormData({
      fullName: "",
      email: "",
      cnic: "",
      phone: "",
      propertyId: tenantToChange?.property_id ? String(tenantToChange.property_id) : "",
      monthlyRent: "",
      leaseStart: "",
      leaseEnd: ""
    });
    setShowAddModal(true);
  };

  const handleExtendLeaseSubmit = async (e) => {
    e.preventDefault();
    if (!newLeaseEnd) {
      alert("Please select a new lease end date");
      return;
    }
    if (!tenantToChange) return;

    const todayStr = new Date().toISOString().split("T")[0];
    if (newLeaseEnd <= todayStr) {
      alert("New lease end date must be in the future");
      return;
    }

    setExtendingLease(true);
    try {
      const response = await fetch(
        `http://localhost:5000/api/tenants/${tenantToChange.tenant_id}/extend-lease`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            owner_id: ownerId,
            new_lease_end: newLeaseEnd
          })
        }
      );
      const data = await response.json();
      if (data.success) {
        alert(`✅ Lease extended for ${tenantToChange.full_name} until ${newLeaseEnd}`);
        setShowExtendLeaseModal(false);
        setTenantToChange(null);
        setNewLeaseEnd("");
        fetchTenants();
      } else {
        alert(data.error || data.message || "Failed to extend lease");
      }
    } catch (err) {
      alert("Error extending lease");
    } finally {
      setExtendingLease(false);
    }
  };

  const sendRentReminders = async () => {
    setSendingReminders(true);
    setReminderMessage(null);
    
    try {
      const response = await fetch("http://localhost:5000/api/rentals/send-reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerId })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setReminderMessage({
          type: 'success',
          text: `Rent reminders sent to ${data.sentCount} tenant(s)!`
        });
        fetchTenants();
      } else {
        setReminderMessage({ type: 'error', text: data.error || 'Failed to send reminders' });
      }
    } catch (err) {
      setReminderMessage({ type: 'error', text: 'Error sending reminders' });
    } finally {
      setSendingReminders(false);
      setTimeout(() => setReminderMessage(null), 5000);
    }
  };

  const sendSingleReminder = async (tenant) => {
    try {
      const response = await fetch("http://localhost:5000/api/rentals/send-single-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: tenant.tenant_id })
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert(`Rent reminder sent to ${tenant.full_name}`);
      } else {
        alert(`Failed to send reminder: ${data.error}`);
      }
    } catch (err) {
      alert('Error sending reminder');
    }
  };

  const shouldDisableButtons = !isKycApproved || !hasTokenizedProperty;
  const availableProperties = getAvailableProperties();
  const hasAvailableProperties = availableProperties.length > 0;

  const getDisabledReason = () => {
    if (!isKycApproved) {
      return "Complete KYC verification first.";
    }
    if (!hasTokenizedProperty) {
      return "Your property must be tokenized first.";
    }
    if (!hasAvailableProperties) {
      return "All your properties already have tenants (max 1 per property).";
    }
    return "";
  };

  if (loading) {
    return <div className="loading-container">Loading tenants...</div>;
  }

  return (
    <div className="tenant-management">
      <div className="card-header">
        <h2>Tenant Management</h2>
        <div className="header-buttons">
          
          {!hasTokenizedProperty && isKycApproved && (
            <div className="warning-banner">
              Your property is currently <strong>{properties[0]?.status || "Pending"}</strong>. 
              Tenants can only be added after property is tokenized.
            </div>
          )}
          
          <div className="button-tooltip-container">
            <button 
              className="send-all-reminders-btn" 
              onClick={sendRentReminders}
              disabled={shouldDisableButtons || sendingReminders || tenants.length === 0}
            >
              {sendingReminders ? "Sending..." : "Send All Reminders"}
            </button>
            {shouldDisableButtons && (
              <span className="button-tooltip">{getDisabledReason()}</span>
            )}
          </div>
          
          <div className="button-tooltip-container">
            <button 
              className="add-property-btn" 
              onClick={() => setShowAddModal(true)}
              disabled={shouldDisableButtons || !hasAvailableProperties}
            >
              + Add New Tenant
            </button>
            {shouldDisableButtons && (
              <span className="button-tooltip">{getDisabledReason()}</span>
            )}
          </div>
        </div>
      </div>

      {reminderMessage && (
        <div className={`reminder-toast ${reminderMessage.type}`}>
          {reminderMessage.text}
        </div>
      )}

      <div className="tenants-list">
        {tenants.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👥</div>
            <h3>No Tenants Yet</h3>
            <p>
              {shouldDisableButtons 
                ? "Complete KYC and ensure your property is tokenized to add tenants" 
                : !hasAvailableProperties && properties.length > 0
                ? "All your properties already have tenants. Only one tenant is allowed per property."
                : "Add your first tenant to start managing rentals"}
            </p>
          </div>
        ) : (
          tenants.map(tenant => (
            <div key={tenant.tenant_id} className="tenant-card">
              <div className="tenant-info">
                <h3>{tenant.full_name}</h3>
                <p><span>📧</span> {tenant.email}</p>
                <p><span>📞</span> {tenant.phone}</p>
                <p><span>🏠</span> {tenant.property_title}</p>
                <p><span>💰</span> PKR {tenant.monthly_rent?.toLocaleString()}/month</p>
                <p><span>📅</span> Lease: {tenant.lease_start?.split('T')[0]} to {tenant.lease_end?.split('T')[0]}</p>
                <p><span>✅</span> KYC: <span className={`status-badge ${tenant.kyc_status}`}>
                  {tenant.kyc_status === "pending" && "Pending Verification"}
                  {tenant.kyc_status === "approved" && "Verified ✓"}
                  {tenant.kyc_status === "rejected" && "Rejected"}
                </span></p>
              </div>
              <div className="tenant-actions">
                <button 
                  className="view-details-btn" 
                  onClick={() => handleViewDetails(tenant)}
                >
                  View Details
                </button>
                <div className="button-tooltip-container">
                  <button 
                    className="send-reminder-btn" 
                    onClick={() => sendSingleReminder(tenant)}
                    disabled={shouldDisableButtons}
                  >
                    Send Reminder
                  </button>
                </div>

                <div className="button-tooltip-container">
                  <button
                    className="send-reminder-btn"
                    onClick={() => openChangeTenantModal(tenant)}
                    disabled={!isLeaseEnded(tenant)}
                  >
                    Change Tenant
                  </button>
                  {!isLeaseEnded(tenant) && (
                    <span className="button-tooltip">
                      Available only after lease ends ({tenant.lease_end})
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Tenant Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="add-tenant-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Tenant</h2>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            
            <p className="modal-subtitle">
              <span className="subtitle-icon">📋</span>
              Tenant will receive login credentials via email to complete their KYC
            </p>

            <div className="warning-modal-banner warning-yellow">
              ⚠️ <strong>Important:</strong> Only <strong>ONE tenant</strong> can be assigned per property.
            </div>

            {properties.length > 0 && properties[0]?.status !== "Tokenized" && (
              <div className="warning-modal-banner">
                Your property is currently <strong>{properties[0]?.status}</strong>. 
                You can only add tenants after the property is tokenized.
              </div>
            )}

            {!hasAvailableProperties && properties.length > 0 && (
              <div className="warning-modal-banner warning-red">
                ⚠️ All your properties already have tenants. You cannot add more tenants because each property can only have ONE tenant.
              </div>
            )}

            <form onSubmit={handleAddTenant}>
              <div className="form-row">
                <div className="form-group">
                  <label>Full Name <span className="required">*</span></label>
                  <div className="input-with-icon">
                    <span className="input-icon">👤</span>
                    <input 
                      type="text" 
                      name="fullName" 
                      placeholder="e.g., Muhammad Ali"
                      onChange={handleChange} 
                      required 
                      disabled={shouldDisableButtons || !hasAvailableProperties}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Email <span className="required">*</span></label>
                  <div className="input-with-icon">
                    <span className="input-icon">📧</span>
                    <input 
                      type="email" 
                      name="email" 
                      placeholder="tenant@example.com"
                      onChange={handleChange} 
                      required 
                      disabled={shouldDisableButtons || !hasAvailableProperties}
                    />
                  </div>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>CNIC Number <span className="required">*</span></label>
                  <div className="input-with-icon">
                    <span className="input-icon">🪪</span>
                    <input 
                      type="text" 
                      name="cnic" 
                      placeholder="12345-1234567-1"
                      value={formData.cnic}
                      onChange={handleCnicChange} 
                      required 
                      disabled={shouldDisableButtons || !hasAvailableProperties}
                    />
                  </div>
                  <small className="field-hint">Format: XXXXX-XXXXXXX-X (13 digits)</small>
                </div>
                <div className="form-group">
                  <label>Phone Number <span className="required">*</span></label>
                  <div className="input-with-icon">
                    <span className="input-icon">📞</span>
                    <input 
                      type="tel" 
                      name="phone" 
                      placeholder="+92 300 1234567"
                      onChange={handleChange} 
                      required 
                      disabled={shouldDisableButtons || !hasAvailableProperties}
                    />
                  </div>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Select Property <span className="required">*</span></label>
                  <div className="input-with-icon">
                    <span className="input-icon">🏠</span>
                    <select 
                      name="propertyId" 
                      onChange={handleChange} 
                      required 
                      disabled={shouldDisableButtons || !hasAvailableProperties}
                      value={formData.propertyId}
                    >
                      <option value="">Select Property</option>
                      {availableProperties.map(p => (
                        <option key={p.property_id} value={p.property_id}>
                          {p.title} - {p.city || p.address} ({p.status})
                        </option>
                      ))}
                    </select>
                  </div>
                  <small className="field-hint">
                    Only properties without existing tenants are shown
                  </small>
                </div>
                <div className="form-group">
                  <label>Monthly Rent (PKR) <span className="required">*</span></label>
                  <div className="input-with-icon">
                    <span className="input-icon">💰</span>
                    <input 
                      type="number" 
                      name="monthlyRent" 
                      placeholder="e.g., 25000"
                      onChange={handleChange} 
                      required 
                      disabled={shouldDisableButtons || !hasAvailableProperties}
                      min="0"
                      step="500"
                    />
                  </div>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Lease Start Date <span className="required">*</span></label>
                  <div className="input-with-icon">
                    <span className="input-icon">📅</span>
                    <input 
                      type="date" 
                      name="leaseStart" 
                      onChange={handleChange} 
                      required 
                      disabled={shouldDisableButtons || !hasAvailableProperties}
                      min={getMinLeaseStartDate()}
                      max={getMaxLeaseStartDate()}
                      value={formData.leaseStart}
                    />
                  </div>
                  <small className="field-hint">Today up to 3 months from now</small>
                </div>
                <div className="form-group">
                  <label>Lease End Date <span className="required">*</span></label>
                  <div className="input-with-icon">
                    <span className="input-icon">📅</span>
                    <input 
                      type="date" 
                      name="leaseEnd" 
                      onChange={handleChange} 
                      required 
                      disabled={shouldDisableButtons || !hasAvailableProperties}
                      min={getMinLeaseEndDate()}
                      max={getMaxLeaseEndDate()}
                      value={formData.leaseEnd}
                    />
                  </div>
                  <small className="field-hint">Maximum 1 year from start date</small>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="submit-tenant-btn"
                  disabled={shouldDisableButtons || !hasAvailableProperties || addingTenant}
                >
                  {addingTenant ? "Adding..." : "+ Add Tenant"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
     

     {/* Change Tenant — Choice Modal (only shown after lease has ended) */}
      {showChangeTenantModal && tenantToChange && (
        <div className="modal-overlay" onClick={closeChangeTenantModal}>
          <div className="add-tenant-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "480px" }}>
            <div className="modal-header">
              <h2>Change Tenant</h2>
              <button className="modal-close" onClick={closeChangeTenantModal}>×</button>
            </div>
           <div className="change-tenant-info">
              <div className="change-tenant-info-row">
                <span className="change-tenant-label">Tenant</span>
                <span className="change-tenant-value">{tenantToChange.full_name}</span>
              </div>
              <div className="change-tenant-info-row">
                <span className="change-tenant-label">Lease Ended On</span>
                <span className="change-tenant-value change-tenant-expired">
                  {new Date(tenantToChange.lease_end).toLocaleDateString("en-PK", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>
              <p className="change-tenant-prompt">What would you like to do?</p>
            </div>
            <div className="change-tenant-actions">
              <button type="button" className="change-tenant-btn-same" onClick={chooseSameTenant}>
                ✅ Same Tenant — Extend Lease
              </button>
              <button type="button" className="change-tenant-btn-new" onClick={chooseDifferentTenant}>
                🔄 Different Tenant — Assign New (On-Chain)
              </button>
              
            </div>
          </div>
        </div>
      )}

      {/* Extend Lease Modal — Same Tenant, DB-only update, no blockchain */}
      {showExtendLeaseModal && tenantToChange && (
        <div className="modal-overlay" onClick={() => setShowExtendLeaseModal(false)}>
          <div className="add-tenant-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "480px" }}>
            <div className="modal-header">
              <h2>Extend Lease</h2>
              <button className="modal-close" onClick={() => setShowExtendLeaseModal(false)}>×</button>
            </div>
            <p className="modal-subtitle">
              Set a new lease end date for <strong>{tenantToChange.full_name}</strong>.</p>
            
            <form onSubmit={handleExtendLeaseSubmit}>
              <div className="form-group">
                <label>New Lease End Date <span className="required">*</span></label>
                <div className="input-with-icon">
                  <span className="input-icon">📅</span>
                  <input
                    type="date"
                    value={newLeaseEnd}
                    onChange={(e) => setNewLeaseEnd(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    required
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowExtendLeaseModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="submit-tenant-btn" disabled={extendingLease}>
                  {extendingLease ? "Saving..." : "Save New End Date"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Tenant Details Modal */}
      {showTenantDetailsModal && selectedTenant && (
        <div className="modal-overlay" onClick={() => setShowTenantDetailsModal(false)}>
          <div className="tenant-details-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowTenantDetailsModal(false)}>×</button>
            <h2>Tenant Details</h2>
            
            <div className="details-container">
              <div className="details-section">
                <h3>Personal Information</h3>
                <div className="details-grid">
                  <div className="detail-item">
                    <label>Full Name:</label>
                    <span>{selectedTenant.full_name}</span>
                  </div>
                  <div className="detail-item">
                    <label>Email:</label>
                    <span>{selectedTenant.email}</span>
                  </div>
                  <div className="detail-item">
                    <label>Phone:</label>
                    <span>{selectedTenant.phone}</span>
                  </div>
                  <div className="detail-item">
                    <label>CNIC:</label>
                    <span>{selectedTenant.cnic}</span>
                  </div>
                </div>
              </div>

              <div className="details-section">
                <h3>Property Information</h3>
                <div className="details-grid">
                  <div className="detail-item">
                    <label>Property:</label>
                    <span>{selectedTenant.property_title}</span>
                  </div>
                  <div className="detail-item">
                    <label>Address:</label>
                    <span>{selectedTenant.property_address || "N/A"}</span>
                  </div>
                  <div className="detail-item">
                    <label>Monthly Rent:</label>
                    <span>PKR {selectedTenant.monthly_rent?.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="details-section">
                <h3>Lease Information</h3>
                <div className="details-grid">
                  <div className="detail-item">
                    <label>Lease Start:</label>
                    <span>{selectedTenant.lease_start}</span>
                  </div>
                  <div className="detail-item">
                    <label>Lease End:</label>
                    <span>{selectedTenant.lease_end}</span>
                  </div>
                  <div className="detail-item">
                    <label>KYC Status:</label>
                    <span className={`status-badge ${selectedTenant.kyc_status}`}>
                      {selectedTenant.kyc_status === "pending" && "Pending"}
                      {selectedTenant.kyc_status === "approved" && "Approved"}
                      {selectedTenant.kyc_status === "rejected" && "Rejected"}
                    </span>
                  </div>
                  <div className="detail-item">
                    <label>Added On:</label>
                    <span>{new Date(selectedTenant.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setShowTenantDetailsModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TenantManagement;