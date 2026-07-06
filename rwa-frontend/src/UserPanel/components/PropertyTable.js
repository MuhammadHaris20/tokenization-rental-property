import React, { useState, useEffect } from "react";
import "../../RealEstate.css";

const PropertyTable = ({ properties, holdings = [], userId, userRole: userRoleProp }) => {
  const [showModal, setShowModal] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [propertiesList, setPropertiesList] = useState(properties || []);
  const [userRole, setUserRole] = useState("");
  const [kycStatus, setKycStatus] = useState("Not Submitted");
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [hasActiveProperty, setHasActiveProperty] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem("user_role") || "INVESTOR";
    setUserRole(role);
    
    const fetchKyc = async () => {
      const userId = localStorage.getItem("user_id");
      if (!userId) return;
      try {
        const res = await fetch(`http://localhost:5000/api/kyc/status/${userId}`);
        const data = await res.json();
        setKycStatus(data.status || "Not Submitted");
      } catch (err) {
        console.error("Error fetching KYC status:", err);
      }
    };
    fetchKyc();
  }, []);

  useEffect(() => {
    const list = properties || [];
    setPropertiesList(list);
    const active = list.some(p =>
      p.status === 'Pending' || p.status === 'Approved' || p.status === 'Tokenized'
    );
    setHasActiveProperty(active);
  }, [properties]);

  const handleAddProperty = (newProperty) => {
    setPropertiesList([...propertiesList, newProperty]);
    setShowModal(false);
  };

  const handleRoleUpgraded = () => {
    setShowRoleModal(false);
    window.location.reload();
  };

  const handleOpenSellOrder = (property) => {
    setSelectedProperty(property);
    setShowSellModal(true);
  };

const handleAddClick = () => {
  if (userRole !== "OWNER") {
    setShowRoleModal(true);  
    return;
  }
  if (kycStatus === "Approved" && !hasActiveProperty) {
    setShowModal(true);
  }
};

const isTenant = (userRoleProp || userRole) === "TENANT";

return (
    <div className="table-container">
      {!isTenant && (
        <div className="table-header">
          <h3>My Properties</h3>

          <div className="add-property-wrapper">
            <div
              className="add-property-btn-container"
              onMouseEnter={() => (hasActiveProperty || kycStatus !== "Approved") && setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
            >
              <button
                className={`add-btn ${(hasActiveProperty || kycStatus !== "Approved") ? "add-btn-disabled" : ""}`}
                onClick={handleAddClick}
                disabled={hasActiveProperty || kycStatus !== "Approved"}
              >
                + Add Property
              </button>

              {showTooltip && (hasActiveProperty || kycStatus !== "Approved") && (
                <div className="add-property-tooltip">
                  {hasActiveProperty
                    ? "⚠️ You already have an active property."
                    : kycStatus === "Pending"
                    ? "⚠️ Your KYC is pending approval."
                    : kycStatus === "Rejected"
                    ? "⚠️ Your KYC was rejected."
                    : "⚠️ Complete KYC verification first."}
                  <div className="tooltip-arrow" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── OWNED PROPERTIES TABLE ── */}
      {!isTenant && (!propertiesList || propertiesList.length === 0 ? (
        <p className="empty-state">You do not own any properties yet.</p>
      ) : (
        <table className="properties-table">
          <thead>
            <tr>
              <th>Property</th>
              <th>Status</th>
              <th>You Own</th>
              <th>Rental Yield</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {propertiesList?.map((p, index) => (
              <tr key={index}>
                <td>{p.title}</td>
                <td>{p.status}</td>
                <td>{p.tokens}</td>
                <td>{p.yield}%</td>
                <td>
                  {p.status === "Tokenized" && (
                    <button
                      className="sell-order-btn"
                      onClick={() => handleOpenSellOrder({ ...p, is_original_owner: true })}
                    >
                      + Sell Order
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ))}
      {/* ── BOUGHT TOKEN HOLDINGS TABLE ── */}
      {holdings.length > 0 && (
        <div style={{ marginTop: "32px" }}>
          <h3 style={{ marginBottom: "12px" }}>🪙 Tokens Purchased from Marketplace</h3>
          <table className="properties-table">
            <thead>
              <tr>
                <th>Property</th>
                <th>Location</th>
                <th>You Own</th>
                <th>Token Price</th>
                <th>Your Ownership %</th>
                <th>Current Value</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {holdings.map((h, index) => {
                const tokensOwned = Number(h.tokens_owned || 0);
                const tokenPrice = Number(h.token_price || 0);
                const currentValue = Number(h.current_value || 0);

                // ownership % = tokens_owned / total_supply of that property
                // my-holdings returns tokens_owned; we need total supply
                // use token_price and property value OR fetch from tokenization_records
                // For now approximate: owned / (property value / token_price)
                // Actually backend my-holdings doesn't return total_supply directly,
                // so we calculate from current_value context — best to show if available
                const totalSupplyApprox = h.total_supply || 0;
                const ownershipPct = totalSupplyApprox > 0
                  ? ((tokensOwned / totalSupplyApprox) * 100).toFixed(2)
                  : null;

                return (
                  <tr key={index}>
                    <td>{h.title}</td>
                    <td>{h.city}, {h.province}</td>
                    <td><span className="token-holdings-badge">{tokensOwned.toLocaleString()}</span></td>
                    <td>PKR {tokenPrice.toLocaleString()}</td>
                    <td>
                      {ownershipPct !== null ? (
                        <span className="ownership-badge">
                          {ownershipPct}%
                        </span>
                      ) : (
                        <span style={{ color: "#888", fontSize: "12px" }}>N/A</span>
                      )}
                    </td>
                    <td>PKR {currentValue.toLocaleString()}</td>
                    <td>
                      <span className={`status-badge ${h.property_status === "Tokenized" ? "status-active" : "status-pending"}`}>
                        {h.property_status}
                      </span>
                    </td>
                    <td>
                      {h.property_status === "Tokenized" && (
                        <button
                          className="sell-order-btn"
                          onClick={() => handleOpenSellOrder({
                            property_id: h.property_id,
                            title: h.title,
                            tokens: totalSupplyApprox,
                            token_price: tokenPrice,
                            property_hash: h.property_hash,
                            status: h.property_status,
                            is_original_owner: false, 
                          })}
                        >
                          + Sell Order
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <AddPropertyModal
          onClose={() => setShowModal(false)}
          onAddProperty={handleAddProperty}
        />
      )}

      {showSellModal && selectedProperty && (
        <SellOrderModal
          property={selectedProperty}
          onClose={() => { setShowSellModal(false); setSelectedProperty(null); }}
        />
      )}

      {showRoleModal && (
        <RoleUpgradeModal
          userId={localStorage.getItem("user_id")}
          onClose={() => setShowRoleModal(false)}
          onSuccess={handleRoleUpgraded}
        />
      )}
    </div>
  );
};

// ============================================================
// ADD PROPERTY MODAL (Multi-step form)
// ============================================================
const AddPropertyModal = ({ onClose, onAddProperty }) => {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: "", province: "", city: "", type: "",
    value: "", yield: "", description: "",
    size: "", size_unit: "sq_ft",
    street: "", postal_code: "",
  });

  const [interiorFiles, setInteriorFiles] = useState([]);
  const [exteriorFiles, setExteriorFiles] = useState([]);
  const [interiorPreviews, setInteriorPreviews] = useState([]);
  const [exteriorPreviews, setExteriorPreviews] = useState([]);

  const [legalDocs, setLegalDocs] = useState({
    titleDeed: null, valuationCertificate: null, taxBills: null,
  });

  const pakistanData = {
    "Punjab": ["Lahore", "Faisalabad", "Rawalpindi", "Multan", "Gujranwala", "Sialkot", "Bahawalpur", "Sargodha"],
    "Sindh": ["Karachi", "Hyderabad", "Sukkur", "Larkana", "Nawabshah", "Mirpur Khas"],
    "Khyber Pakhtunkhwa": ["Peshawar", "Abbottabad", "Mardan", "Swat", "Kohat", "Bannu"],
    "Balochistan": ["Quetta", "Gwadar", "Khuzdar", "Turbat", "Sibi", "Zhob"],
    "Gilgit-Baltistan": ["Gilgit", "Skardu", "Hunza"],
    "Azad Jammu & Kashmir": ["Muzaffarabad", "Mirpur", "Kotli", "Rawalakot"],
    "Islamabad Capital Territory": ["Islamabad"],
  };

  const handlePostalCodeChange = (e) => {
    const value = e.target.value;
    const numericValue = value.replace(/\D/g, '');
    setFormData({ ...formData, postal_code: numericValue });
  };

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

const handlePhotoUpload = (e, type) => {
  const files = Array.from(e.target.files);
  
  if (type === "interior") {
    setInteriorFiles(prev => {
      const combined = [...prev, ...files].slice(0, 10);
      setInteriorPreviews(combined.map(f => URL.createObjectURL(f)));
      return combined;
    });
  } else {
    setExteriorFiles(prev => {
      const combined = [...prev, ...files].slice(0, 10);
      setExteriorPreviews(combined.map(f => URL.createObjectURL(f)));
      return combined;
    });
  }
};

  const removePhoto = (type, index) => {
    if (type === "interior") {
      const updated = interiorFiles.filter((_, i) => i !== index);
      setInteriorFiles(updated);
      setInteriorPreviews(updated.map(f => URL.createObjectURL(f)));
    } else {
      const updated = exteriorFiles.filter((_, i) => i !== index);
      setExteriorFiles(updated);
      setExteriorPreviews(updated.map(f => URL.createObjectURL(f)));
    }
  };

  const handleLegalDocChange = (e, docType) =>
    setLegalDocs({ ...legalDocs, [docType]: e.target.files[0] });

  const canProceed = () => {
    if (step === 1) {
      return formData.title && formData.province && formData.city &&
             formData.type && formData.value && formData.yield &&
             formData.description && formData.size;
    }
    if (step === 2) {
      return interiorFiles.length >= 2 && exteriorFiles.length >= 2;
    }
    return true;
  };

const handleSubmit = async () => {
  if (!legalDocs.titleDeed || !legalDocs.valuationCertificate || !legalDocs.taxBills) {
    alert("Please upload all three legal documents.");
    return;
  }

  setSubmitting(true);
  try {
    const ownerId = localStorage.getItem("user_id");
    const address = `${formData.street ? formData.street + ", " : ""}${formData.city}, ${formData.province}, Pakistan`;

    const propForm = new FormData();
    propForm.append("user_id", ownerId);
    propForm.append("title", formData.title);
    propForm.append("province", formData.province);
    propForm.append("city", formData.city);
    propForm.append("type", formData.type);
    propForm.append("value", formData.value);
    propForm.append("rentalYield", formData.yield);   // ← backend reads rentalYield OR yield
    propForm.append("description", formData.description);
    propForm.append("size", formData.size);
    propForm.append("size_unit", formData.size_unit);
    propForm.append("street", formData.street);
    propForm.append("postal_code", formData.postal_code);
    propForm.append("address", address);
    propForm.append("country", "Pakistan");
    propForm.append("tokens", Math.floor(Number(formData.value) / 1000));

    // Legal docs
    propForm.append("titleDeed", legalDocs.titleDeed);
    propForm.append("valuationCertificate", legalDocs.valuationCertificate);
    propForm.append("taxBills", legalDocs.taxBills);

    // ✅ Use correct field names matching backend multer config
    interiorFiles.forEach(f => propForm.append("interiorImages", f));
    exteriorFiles.forEach(f => propForm.append("exteriorImages", f));

    const propRes = await fetch("http://localhost:5000/api/properties/add-property", {
      method: "POST",
      body: propForm,
    });
    const propResult = await propRes.json();

    if (!propResult.success) {
      alert("Failed to submit property: " + propResult.message);
      return;
    }

    alert("✅ Property submitted for listing!");
    onAddProperty({
      title: formData.title,
      status: "Pending",
      tokens: Math.floor(Number(formData.value) / 1000),
      yield: formData.yield,
      province: formData.province,
      city: formData.city,
      type: formData.type,
      value: formData.value,
      description: formData.description,
    });

  } catch (err) {
    alert("Error submitting property: " + err.message);
    console.error(err);
  } finally {
    setSubmitting(false);
  }
};

  const stepLabels = ["Property Details", "Photos", "Legal Documents"];

  return (
    <div className="modal-backdrop">
      <div className="modal property-modal-container">
        <h2 className="modal-title">List Property for Tokenization</h2>

        <div className="step-indicator">
          {stepLabels.map((label, i) => {
            const num = i + 1;
            const active = step === num;
            const done = step > num;
            return (
              <div key={num} className="step-item">
                {i > 0 && (
                  <div className={`step-line step-line-left ${done ? "step-line-active" : ""}`} />
                )}
                {i < stepLabels.length - 1 && (
                  <div className={`step-line step-line-right ${(done || active) && step > num ? "step-line-active" : ""}`} />
                )}
                <div className={`step-circle ${done ? "step-circle-done" : active ? "step-circle-active" : ""}`}>
                  {done ? "✓" : num}
                </div>
                <p className={`step-label ${active ? "step-label-active" : ""}`}>
                  {label}
                </p>
              </div>
            );
          })}
        </div>

        {step === 1 && (
          <div>
            <p className="step-title">🏠 Property Details</p>
            <input name="title" placeholder="Property Title *" value={formData.title}
              onChange={handleChange} required className="property-form-input" />
            <div className="location-group">
              <select name="province" value={formData.province} onChange={handleChange}
                className="styled-select" required>
                <option value="">Select Province *</option>
                {Object.keys(pakistanData).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <select name="city" value={formData.city} onChange={handleChange}
                className="styled-select" required disabled={!formData.province}>
                <option value="">Select City *</option>
                {formData.province && pakistanData[formData.province].map(c =>
                  <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <input name="street" placeholder="Street / Address" value={formData.street}
              onChange={handleChange} className="property-form-input" />
            <input name="postal_code" placeholder="Postal Code" value={formData.postal_code}
              onChange={handlePostalCodeChange} className="property-form-input"
              type="text" inputMode="numeric" maxLength="10"
              onKeyPress={(e) => { if (!/[0-9]/.test(e.key)) e.preventDefault(); }}
              onPaste={(e) => {
                e.preventDefault();
                const pastedText = e.clipboardData.getData('text');
                const numericOnly = pastedText.replace(/\D/g, '');
                setFormData({ ...formData, postal_code: numericOnly });
              }} />
            <select name="type" value={formData.type} onChange={handleChange}
              className="styled-select" required>
              <option value="">Property Type *</option>
              {["Apartment", "House", "Commercial", "Plot", "Farmhouse", "Villa"].map(t =>
                <option key={t} value={t}>{t}</option>)}
            </select>
            <div className="size-group">
              <input name="size" type="number" placeholder="Property Size *" value={formData.size}
                onChange={handleChange} min="0" className="property-form-input" />
              <select name="size_unit" value={formData.size_unit} onChange={handleChange}
                className="styled-select size-select">
                <option value="sq_ft">sq ft</option>
                <option value="sq_m">sq m</option>
                <option value="marla">Marla</option>
                <option value="kanal">Kanal</option>
              </select>
            </div>
            <input name="value" type="number" placeholder="Property Value (PKR) *" value={formData.value}
              onChange={handleChange} min="0" step="1000" required className="property-form-input" />
            <input name="yield" type="number" placeholder="Expected Rental Yield (%) *" value={formData.yield}
              onChange={handleChange} min="0" max="100" step="0.1" required className="property-form-input" />
            <textarea name="description" placeholder="Property Description *" value={formData.description}
              onChange={handleChange} rows="4" required className="property-form-input" />
            {formData.value && (
              <p className="token-estimate">
                💡 Estimated tokens: <strong>{Math.floor(Number(formData.value) / 1000).toLocaleString()}</strong>
                &nbsp;(1 token = PKR 1,000)
              </p>
            )}
          </div>
        )}

        {step === 2 && (
          <div>
            <p className="step-title">📸 Property Photos</p>
            <p className="step-subtitle">Upload at least 2 interior and 2 exterior photos (max 10 each).</p>
            <div className="photo-section">
              <div className="photo-section-header">
                <p className="photo-section-title">🛋️ Interior Photos</p>
                <span className={`photo-count ${interiorFiles.length >= 2 ? "photo-count-valid" : "photo-count-invalid"}`}>
                  {interiorFiles.length}/10 {interiorFiles.length < 2 && "(min 2 required)"}
                </span>
              </div>
              {interiorFiles.length < 10 && (
                <label className="upload-label">
                  <span className="upload-icon">+</span>
                  <span className="upload-text">Add Interior Photos</span>
                  <input type="file" multiple accept="image/*" className="hidden-file-input"
                    onChange={(e) => handlePhotoUpload(e, "interior")} />
                </label>
              )}
              {interiorPreviews.length > 0 && (
                <div className="photo-grid">
                  {interiorPreviews.map((src, i) => (
                    <div key={i} className="photo-thumb-container">
                      <img src={src} alt={`interior-${i}`} className="photo-thumb-img" />
                      <button onClick={() => removePhoto("interior", i)} className="photo-remove-btn">×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="photo-section">
              <div className="photo-section-header">
                <p className="photo-section-title">🏡 Exterior Photos</p>
                <span className={`photo-count ${exteriorFiles.length >= 2 ? "photo-count-valid" : "photo-count-invalid"}`}>
                  {exteriorFiles.length}/10 {exteriorFiles.length < 2 && "(min 2 required)"}
                </span>
              </div>
              {exteriorFiles.length < 10 && (
                <label className="upload-label">
                  <span className="upload-icon">+</span>
                  <span className="upload-text">Add Exterior Photos</span>
                  <input type="file" multiple accept="image/*" className="hidden-file-input"
                    onChange={(e) => handlePhotoUpload(e, "exterior")} />
                </label>
              )}
              {exteriorPreviews.length > 0 && (
                <div className="photo-grid">
                  {exteriorPreviews.map((src, i) => (
                    <div key={i} className="photo-thumb-container">
                      <img src={src} alt={`exterior-${i}`} className="photo-thumb-img" />
                      <button onClick={() => removePhoto("exterior", i)} className="photo-remove-btn">×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <p className="step-title">📄 Legal Documents</p>
            <p className="step-subtitle">All three documents are required for listing approval.</p>
            {[
              { key: "titleDeed", label: "Title Deed / Ownership Proof", icon: "📜" },
              { key: "valuationCertificate", label: "Valuation Certificate", icon: "📊" },
              { key: "taxBills", label: "Tax / Utility Bills", icon: "🧾" },
            ].map(({ key, label, icon }) => (
              <div key={key} className="legal-doc-row">
                <div className="legal-doc-info">
                  <span className="legal-doc-icon">{icon}</span>
                  <div>
                    <p className="legal-doc-label">{label}</p>
                    {legalDocs[key] && <p className="legal-doc-filename">✓ {legalDocs[key].name}</p>}
                  </div>
                </div>
                <label className="small-upload-btn">
                  {legalDocs[key] ? "Change" : "Upload"}
                  <input type="file" accept="image/*,application/pdf" className="hidden-file-input"
                    onChange={(e) => handleLegalDocChange(e, key)} />
                </label>
              </div>
            ))}
            <div className="summary-box">
              <strong>Summary</strong>
              <p>🏠 {formData.title} — {formData.type}</p>
              <p>📍 {formData.city}, {formData.province}</p>
              <p>💰 PKR {Number(formData.value).toLocaleString()}</p>
              <p>📸 {interiorFiles.length} interior + {exteriorFiles.length} exterior photos</p>
            </div>
          </div>
        )}

        <div className="modal-actions">
          <button type="button" className="cancel-btn"
            onClick={step === 1 ? onClose : () => setStep(s => s - 1)}>
            {step === 1 ? "Cancel" : "← Back"}
          </button>
          {step < 3 ? (
            <button type="button" className="submit-btn"
              disabled={!canProceed()}
              onClick={() => setStep(s => s + 1)}>
              Next →
            </button>
          ) : (
            <button type="button" className="submit-btn"
              disabled={submitting || !legalDocs.titleDeed || !legalDocs.valuationCertificate || !legalDocs.taxBills}
              onClick={handleSubmit}>
              {submitting ? "Submitting..." : "📋 Submit for Listing"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================
// SELL ORDER MODAL - With 70% Sell Limit & Confirmation Dialog
// ============================================================
const SellOrderModal = ({ property, onClose }) => {
  const [tokensForSale, setTokensForSale] = useState("");
  const [pricePerToken, setPricePerToken] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // ✅ Real balance from server
  const [ownedTokens, setOwnedTokens] = useState(0);
  const [listedTokens, setListedTokens] = useState(0);
  const [availableToSell, setAvailableToSell] = useState(0);

  const originalTokenPrice = property.token_price || 0;
  const totalSupply = property.tokens || 0;
  const isOriginalOwner = property.is_original_owner === true;
  const minRetainTokens = isOriginalOwner ? Math.floor(totalSupply * 0.3) : 0;

  useEffect(() => {
    const fetchRealBalance = async () => {
      try {
        const userId = localStorage.getItem("user_id");
        const res = await fetch(
          `http://localhost:5000/api/properties/owner-balance/${property.property_id}/${userId}`
        );
        const data = await res.json();
        if (data.success) {
          setOwnedTokens(data.ownedTokens);
          setListedTokens(data.listedTokens);
          setAvailableToSell(data.availableToSell);
        }
      } catch (err) {
        console.error("Error fetching owner balance:", err);
      } finally {
        setLoadingBalance(false);
      }
    };
    fetchRealBalance();
  }, [property.property_id]);

  // 70% rule only for original owner
  const maxSellable70pct = isOriginalOwner ? Math.floor(totalSupply * 0.7) : totalSupply;
  const alreadySold = totalSupply - ownedTokens;
  const remainingSellable = isOriginalOwner
    ? Math.min(
        availableToSell,
        Math.max(0, maxSellable70pct - alreadySold - listedTokens)
      )
    : availableToSell;

  const tokensNum = Number(tokensForSale) || 0;
  const totalRevenue = tokensNum && pricePerToken ? tokensNum * Number(pricePerToken) : 0;
  const profit = tokensNum && pricePerToken
    ? (Number(pricePerToken) - originalTokenPrice) * tokensNum : 0;
  const afterSaleKeep = ownedTokens - listedTokens - tokensNum;

  const handleTokensChange = (e) => {
    const value = Number(e.target.value);
    if (value > remainingSellable) {
      alert(
        `You can only list ${remainingSellable} more tokens.\n` +
        `You own: ${ownedTokens} | Already listed: ${listedTokens} | Already sold to others: ${totalSupply - ownedTokens}`
      );
      setTokensForSale("");
      return;
    }
    setTokensForSale(e.target.value);
  };

  const handleSubmitClick = (e) => {
    e.preventDefault();
    console.log("Submit clicked"); // Debug log
    
    // Validate fields before showing dialog
    if (!tokensForSale || !pricePerToken) { 
      alert("Please fill all fields."); 
      return; 
    }
    if (tokensNum < 1) { 
      alert("Minimum 1 token required."); 
      return; 
    }
    if (tokensNum > remainingSellable) {
      alert(`You can only list ${remainingSellable} more tokens.`); 
      return;
    }
    
    // Show confirmation dialog
    setShowConfirmDialog(true);
  };

  const handleConfirmSubmit = async () => {
    setSubmitting(true);
    setShowConfirmDialog(false);
    
    try {
      const sellerId = localStorage.getItem("user_id");
      const res = await fetch("http://localhost:5000/api/properties/sell-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          property_id: property.property_id,
          seller_id: sellerId,
          tokens_for_sale: tokensNum,
          price_per_token: Number(pricePerToken),
        }),
      });
      const result = await res.json();
      if (result.success) {
        alert(`✅ Sell order created! Listing ${tokensNum} tokens.`);
        onClose();
      } else {
        alert("❌ " + result.message);
      }
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingBalance) {
    return (
      <div className="modal-backdrop">
        <div className="modal sell-order-modal">
          <h2 className="modal-title">Create Sell Order</h2>
          <p style={{ textAlign: "center", padding: "40px" }}>⏳ Loading your token balance...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="modal-backdrop">
        <div className="modal sell-order-modal">
          <h2 className="modal-title">Create Sell Order</h2>
          <p className="sell-order-subtitle">
            🏠 {property.title} &nbsp;|&nbsp; You own: <strong>{ownedTokens} tokens</strong>
          </p>

          <div className="token-limit-info">
            <div className="limit-info-card">
              <span className="limit-label">📊 Total Minted:</span>
              <strong>{totalSupply}</strong>
            </div>
            <div className="limit-info-card">
              <span className="limit-label">🪙 You Own:</span>
              <strong>{ownedTokens} tokens</strong>
            </div>
            {isOriginalOwner && (
              <div className="limit-info-card">
                <span className="limit-label">🔒 Must Retain (30%):</span>
                <strong className="retain-amount">{minRetainTokens} tokens</strong>
              </div>
            )}
            <div className="limit-info-card">
              <span className="limit-label">📈 Already Listed:</span>
              <strong>{listedTokens} tokens</strong>
            </div>
            <div className="limit-info-card">
              <span className="limit-label">✨ Available to Sell:</span>
              <strong className="available-amount">{remainingSellable} tokens</strong>
            </div>
            <div className="limit-info-card highlight">
              <span className="limit-label">💎 Tokens You Keep:</span>
              <strong>{Math.max(0, afterSaleKeep)} tokens</strong>
            </div>
          </div>

          <label className="sell-label">Property Hash</label>
          <input className="property-form-input property-hash-input" value={property.property_hash || "N/A"} readOnly />

          <label className="sell-label">Number of Tokens to Sell</label>
          <input
            type="number"
            placeholder={`Max: ${remainingSellable}`}
            value={tokensForSale}
            onChange={handleTokensChange}
            min="1"
            max={remainingSellable}
            className="property-form-input"
            disabled={remainingSellable <= 0}
          />
          {remainingSellable <= 0 && (
            <p style={{ color: "red", fontSize: "13px", marginTop: "4px" }}>
              ⚠️ No tokens available to list. All owned tokens are either sold or already listed.
            </p>
          )}

          <label className="sell-label">Price Per Token (PKR)</label>
          <input
            type="number"
            placeholder="e.g. 1000"
            value={pricePerToken}
            onChange={e => setPricePerToken(e.target.value)}
            min="1"
            step="0.01"
            className="property-form-input"
          />

          <div className="sell-order-summary">
            <div className="sell-summary-row">
              <span>Total Revenue:</span>
              <strong className="sell-summary-revenue">PKR {totalRevenue.toLocaleString()}</strong>
            </div>
            <div className="sell-summary-row">
              <span>Original Token Price:</span>
              <span>PKR {originalTokenPrice.toLocaleString()}</span>
            </div>
            <div className="sell-summary-divider" />
            <div className="sell-summary-row">
              <span>Estimated Profit:</span>
              <strong className={profit >= 0 ? "sell-profit-positive" : "sell-profit-negative"}>
                {profit >= 0 ? "+" : ""}PKR {profit.toLocaleString()}
              </strong>
            </div>
            <div className="sell-summary-divider" />
            <div className="sell-summary-row">
              <span>After Sale You Keep:</span>
              <strong>{Math.max(0, afterSaleKeep)} tokens</strong>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>Cancel</button>
            <button
              type="button"
              className="submit-btn"
              disabled={submitting || !tokensForSale || !pricePerToken || remainingSellable <= 0}
              onClick={handleSubmitClick}
            >
              {submitting ? "Posting..." : "📤 Post Sell Order"}
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="confirm-dialog-backdrop" onClick={() => setShowConfirmDialog(false)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-dialog-icon">⚠️</div>
            <h3 className="confirm-dialog-title">Listing Cannot Be Cancelled</h3>
            <p className="confirm-dialog-message">
              Once a token is purchased from this sell order, you will not be able to cancel or modify this listing.<br /><br />
              Are you sure you want to proceed with posting this sell order?
            </p>
            <div className="confirm-dialog-actions">
              <button 
                className="confirm-dialog-no" 
                onClick={() => setShowConfirmDialog(false)}
              >
                No, Cancel
              </button>
              <button 
                className="confirm-dialog-yes" 
                onClick={handleConfirmSubmit}
                disabled={submitting}
              >
                {submitting ? "Posting..." : "Yes, Post Order"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// ============================================================
// ROLE UPGRADE MODAL
// ============================================================
const RoleUpgradeModal = ({ userId, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [upgraded, setUpgraded] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`http://localhost:5000/api/user/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "OWNER" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Something went wrong. Please try again.");
      }
      localStorage.setItem("user_role", "OWNER");
      setUpgraded(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="role-upgrade-backdrop">
      <div className="role-upgrade-box">
        <div className="role-upgrade-topbar" />
        <button className="role-upgrade-close" onClick={onClose}>✕</button>
        {!upgraded ? (
          <>
            <div className="role-upgrade-icon">🏡</div>
            <h2 className="role-upgrade-headline">Your properties deserve to be on the map.</h2>
            <p className="role-upgrade-subcopy">
              You're currently signed in as an <strong>Investor</strong>.<br />
              Switch to <strong>Property Owner</strong> in one click —
              list, tokenize, and earn from your real estate, all in one place.
            </p>
            <div className="role-upgrade-pills">
              {["✅ List unlimited properties", "🔐 Tokenize your assets", "💸 Earn rental income", "📊 Track performance"].map(b => (
                <span key={b} className="role-upgrade-pill">{b}</span>
              ))}
            </div>
            <button className="role-upgrade-cta" onClick={handleUpgrade} disabled={loading}>
              {loading ? "Upgrading your account…" : "🚀 Become a Property Owner — It's Free"}
            </button>
            {error && <p className="role-upgrade-error">⚠️ {error}</p>}
            <p className="role-upgrade-disclaimer">Your investor portfolio stays 100% intact. You simply unlock new superpowers.</p>
          </>
        ) : (
          <div className="role-upgrade-success">
            <div className="role-upgrade-success-icon">🎉</div>
            <h2 className="role-upgrade-headline">Welcome to the Owner Club!</h2>
            <p className="role-upgrade-subcopy">Your account has been upgraded to <strong>Property Owner</strong>.<br />You can now list and tokenize your properties.</p>
            <button className="role-upgrade-cta" onClick={onSuccess}>Continue — List My First Property →</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertyTable;