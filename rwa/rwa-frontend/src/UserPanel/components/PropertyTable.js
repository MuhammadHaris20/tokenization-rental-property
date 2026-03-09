// PropertyTable.js
import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import "../../RealEstate.css";

// ModalPortal component to render modal outside main DOM
const ModalPortal = ({ children }) => {
  const [modalRoot, setModalRoot] = useState(null);

  useEffect(() => {
    // Create modal root if it doesn't exist
    let root = document.getElementById("modal-root");
    if (!root) {
      root = document.createElement("div");
      root.id = "modal-root";
      document.body.appendChild(root);
    }
    setModalRoot(root);

    // Cleanup function to remove modal root when component unmounts
    return () => {
      const root = document.getElementById("modal-root");
      if (root && root.children.length === 0) {
        document.body.removeChild(root);
      }
    };
  }, []);

  if (!modalRoot) return null;
  return ReactDOM.createPortal(children, modalRoot);
};

const PropertyTable = ({ properties = [], onAddProperty }) => {
  const [showModal, setShowModal] = useState(false);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showModal]);

  return (
    <div className="property-section">
      {/* Tokenized Properties Section */}
      <div className="property-card-container">
        <div className="card-header">
          <h2>My Properties</h2>
          <button className="add-property-btn" onClick={() => setShowModal(true)}>
            + Add Property
          </button>
        </div>

        <div className="card-content">
          {/* Empty State - No properties */}
          <div className="empty-state">
            <div className="empty-icon">🏠</div>
            <h3>No Properties Yet</h3>
            <p>Start by adding your first property to begin tokenization</p>
            <button className="primary-btn" onClick={() => setShowModal(true)}>
              ADD FIRST PROPERTY
            </button>
          </div>
        </div>
      </div>

      {/* Owned Properties Section - Empty for now */}
      <div className="property-card-container owned-properties">
        <div className="card-header">
          <h2>Owned Properties</h2>
          <span className="owned-badge">Coming Soon</span>
        </div>

        <div className="card-content">
          <div className="empty-state small">
            <div className="empty-icon">🔜</div>
            <h3>No Owned Properties Yet</h3>
            <p>Properties you fully own will appear here</p>
          </div>
        </div>
      </div>

      {/* Add Property Modal - Using Portal */}
      {showModal && (
        <ModalPortal>
          <AddPropertyModal
            onClose={() => setShowModal(false)}
            onAddProperty={onAddProperty}
          />
        </ModalPortal>
      )}
    </div>
  );
};

// AddPropertyModal component
const AddPropertyModal = ({ onClose, onAddProperty }) => {
  const [formData, setFormData] = useState({
    title: "",
    province: "",
    city: "",
    street: "",
    postalCode: "",
    type: "",
    size: "",
    value: "",
    yield: "",
    description: "",
    images: [],
  });

  const pakistanData = {
    Punjab: ["Lahore", "Faisalabad", "Rawalpindi", "Multan", "Gujranwala", "Sialkot", "Bahawalpur", "Sargodha"],
    Sindh: ["Karachi", "Hyderabad", "Sukkur", "Larkana", "Nawabshah", "Mirpur Khas"],
    "Khyber Pakhtunkhwa": ["Peshawar", "Abbottabad", "Mardan", "Swat", "Kohat", "Bannu"],
    Balochistan: ["Quetta", "Gwadar", "Khuzdar", "Turbat", "Sibi", "Zhob"],
    "Gilgit-Baltistan": ["Gilgit", "Skardu", "Hunza"],
    "Azad Jammu & Kashmir": ["Muzaffarabad", "Mirpur", "Kotli", "Rawalakot"],
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "province" && { city: "" }),
    }));
  };

  const handleImageUpload = (e) => {
    setFormData((prev) => ({
      ...prev,
      images: Array.from(e.target.files),
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const numericValue = Number(formData.value);
    const numericSize = Number(formData.size);
    const numericYield = Number(formData.yield);

    const newProperty = {
      title: formData.title,
      province: formData.province,
      city: formData.city,
      street: formData.street,
      postalCode: formData.postalCode,
      type: formData.type,
      size: numericSize,
      value: numericValue,
      yield: numericYield || 8.5,
      description: formData.description,
      images: formData.images,
      status: "Pending",
      tokens: numericValue > 0 ? Math.floor(numericValue / 1000) : 0,
    };

    onAddProperty(newProperty);
    alert("Property submitted for tokenization!");
    setFormData({
      title: "",
      province: "",
      city: "",
      street: "",
      postalCode: "",
      type: "",
      size: "",
      value: "",
      yield: "",
      description: "",
      images: [],
    });
    onClose();
  };

  // Handle click on backdrop to close modal
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">Tokenize Property</h2>
        <form onSubmit={handleSubmit}>
          <input
            name="title"
            placeholder="Property Title"
            value={formData.title}
            onChange={handleChange}
            required
          />

          <div className="location-group">
            <select
              name="province"
              value={formData.province}
              onChange={handleChange}
              className="styled-select"
              required
            >
              <option value="">Select Province</option>
              {Object.keys(pakistanData).map((prov) => (
                <option key={prov} value={prov}>
                  {prov}
                </option>
              ))}
            </select>

            <select
              name="city"
              value={formData.city}
              onChange={handleChange}
              className="styled-select"
              required
              disabled={!formData.province}
            >
              <option value="">Select City</option>
              {formData.province &&
                pakistanData[formData.province].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
            </select>
          </div>

          <input
            name="street"
            placeholder="Street Address"
            value={formData.street}
            onChange={handleChange}
            required
          />

          <input
            name="postalCode"
            placeholder="Postal Code"
            value={formData.postalCode}
            onChange={handleChange}
            required
          />

          <select
            name="type"
            value={formData.type}
            onChange={handleChange}
            className="styled-select"
            required
          >
            <option value="">Property Type</option>
            <option value="Apartment">Apartment</option>
            <option value="House">House</option>
            <option value="Commercial">Commercial</option>
            <option value="Plot">Plot</option>
            <option value="Farmhouse">Farmhouse</option>
            <option value="Villa">Villa</option>
          </select>

          <div className="form-row">
            <input
              name="size"
              type="number"
              placeholder="Size (sq.ft)"
              value={formData.size}
              onChange={handleChange}
              min="0"
              step="1"
              required
            />

            <input
              name="value"
              type="number"
              placeholder="Property Value ($)"
              value={formData.value}
              onChange={handleChange}
              min="0"
              step="1000"
              required
            />
          </div>

          <input
            name="yield"
            type="number"
            placeholder="Expected Rental Yield (%)"
            value={formData.yield}
            onChange={handleChange}
            min="0"
            max="100"
            step="0.1"
          />

          <textarea
            name="description"
            placeholder="Property Description"
            value={formData.description}
            onChange={handleChange}
            rows="4"
            required
          />

          <div className="file-upload">
            <label>Upload Property Images</label>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageUpload}
              className="file-input"
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>
              CANCEL
            </button>
            <button type="submit" className="submit-kyc-btn">
              TOKENIZE PROPERTY
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PropertyTable;