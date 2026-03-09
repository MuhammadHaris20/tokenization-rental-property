// Import React and useState hook for managing component state
import React, { useState } from "react";

// Import external CSS styling for real estate components

import "../../RealEstate.css";

// PropertyTable component receives properties as props
const PropertyTable = ({ properties }) => {

  // State to control whether modal is visible or not
  const [showModal, setShowModal] = useState(false);

  // State to store and manage the list of properties
  const [propertiesList, setPropertiesList] = useState(properties);

  // Function to handle adding a new property
  const handleAddProperty = (newProperty) => {
    // Add the new property to the existing list using spread operator
    setPropertiesList([...propertiesList, newProperty]);

    // Close the modal after adding property
    setShowModal(false);
  };

  // JSX returned by PropertyTable component
  return (
    <div className="table-container"> {/* Main table container */}

      <div className="table-header"> {/* Header section */}
        <h3>My Properties</h3> {/* Section title */}

        <button
          className="add-btn"
          onClick={() => setShowModal(true)} // Open modal when clicked
        >
          + Add Property
        </button>
      </div>

      {/* If no properties exist, show empty state message */}
      {propertiesList.length === 0 ? (
        <p className="empty-state">
          You do not own any properties yet.
        </p>
      ) : (
        // Otherwise show properties table
        <table>
          <thead>
            <tr>
              <th>Property</th>
              <th>Status</th>
              <th>Tokens Owned</th>
              <th>Rental Yield</th>
            </tr>
          </thead>
          <tbody>
            {/* Loop through properties list and display each property */}
            {propertiesList.map((p, index) => (
              <tr key={index}> {/* Unique key for each row */}
                <td>{p.title}</td> {/* Property title */}
                <td>{p.status}</td> {/* Property status */}
                <td>{p.tokens}</td> {/* Number of tokens owned */}
                <td>{p.yield}%</td> {/* Rental yield percentage */}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Show AddPropertyModal only if showModal is true */}
      {showModal && (
        <AddPropertyModal 
          onClose={() => setShowModal(false)}  // Close modal callback
          onAddProperty={handleAddProperty}   // Add property callback
        />
      )}
    </div>
  );
};

// AddPropertyModal component receives onClose and onAddProperty as props
const AddPropertyModal = ({ onClose, onAddProperty }) => {

  // State to store form input values
  const [formData, setFormData] = useState({
    title: "",         // Property title
    province: "",      // Selected province
    city: "",          // Selected city
    type: "",          // Property type
    value: "",         // Property value
    yield: "",         // Expected rental yield
    description: "",   // Property description
    images: [],        // Uploaded images
  });

  // Object containing Pakistan provinces and their cities
  const pakistanData = {
    "Punjab": ["Lahore", "Faisalabad", "Rawalpindi", "Multan", "Gujranwala", "Sialkot", "Bahawalpur", "Sargodha"],
    "Sindh": ["Karachi", "Hyderabad", "Sukkur", "Larkana", "Nawabshah", "Mirpur Khas"],
    "Khyber Pakhtunkhwa": ["Peshawar", "Abbottabad", "Mardan", "Swat", "Kohat", "Bannu"],
    "Balochistan": ["Quetta", "Gwadar", "Khuzdar", "Turbat", "Sibi", "Zhob"],
    "Gilgit-Baltistan": ["Gilgit", "Skardu", "Hunza"],
    "Azad Jammu & Kashmir": ["Muzaffarabad", "Mirpur", "Kotli", "Rawalakot"]
  };

  // Handle text/select input changes
  const handleChange = (e) => {
    setFormData({
      ...formData,                 // Keep previous form data
      [e.target.name]: e.target.value, // Update changed field
    });
  };

  // Handle image file upload
  const handleImageUpload = (e) => {
    setFormData({
      ...formData,
      images: e.target.files, // Store uploaded files
    });
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault(); // Prevent page refresh
    
    // Create a new property object
    const newProperty = {
      title: formData.title,
      status: "Pending", // Default initial status
      tokens: Math.floor(formData.value / 1000), // Example token calculation
      yield: formData.yield,
      province: formData.province,
      city: formData.city,
      type: formData.type,
      value: formData.value,
      description: formData.description,
    };

    // Log form data to console
    console.log("Property Data:", formData);
    console.log("New Property Added:", newProperty);
    
    // Call parent function to add property to table
    onAddProperty(newProperty);
    
    // Show success message
    alert("Property submitted for tokenization!");
    
    // Reset form after submission
    setFormData({
      title: "",
      province: "",
      city: "",
      type: "",
      value: "",
      yield: "",
      description: "",
      images: [],
    });
  };

  // JSX returned by modal component
  return (
    <div className="modal-backdrop"> {/* Background overlay covering the page */}
      <div className="modal"> {/* Modal box */}
        <h2 className="modal-title">Tokenize Property</h2>

        {/* Form with submit handler */}
        <form onSubmit={handleSubmit}>

          {/* Property title input */}
          <input
            name="title"
            placeholder="Property Title"
            value={formData.title}
            onChange={handleChange}
            required
          />

          {/* Province and City dropdown group */}
          <div className="location-group">

            {/* Province dropdown */}
            <select 
              name="province" 
              value={formData.province}
              onChange={handleChange}
              className="styled-select"
              required
            >
              <option value="">Select Province</option>

              {/* Loop through provinces */}
              {Object.keys(pakistanData).map(province => (
                <option key={province} value={province}>
                  {province}
                </option>
              ))}
            </select>

            {/* City dropdown */}
            <select 
              name="city" 
              value={formData.city}
              onChange={handleChange}
              className="styled-select"
              required
              disabled={!formData.province} // Disabled if no province selected
            >
              <option value="">Select City</option>

              {/* Show cities based on selected province */}
              {formData.province && pakistanData[formData.province].map(city => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>

          {/* Property type dropdown */}
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

          {/* Property value input */}
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

          {/* Rental yield input */}
          <input
            name="yield"
            type="number"
            placeholder="Expected Rental Yield (%)"
            value={formData.yield}
            onChange={handleChange}
            min="0"
            max="100"
            step="0.1"
            required
          />

          {/* Description textarea */}
          <textarea
            name="description"
            placeholder="Property Description"
            value={formData.description}
            onChange={handleChange}
            rows="4"
            required
          />

          {/* File upload section */}
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

          {/* Modal action buttons */}
          <div className="modal-actions">

            {/* Cancel button */}
            <button type="button" className="cancel-btn" onClick={onClose}>
              Cancel
            </button>

            {/* Submit button */}
            <button type="submit" className="primary-btn">
              Tokenize Property
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Export PropertyTable component for use in other files (Dashboard.js)
export default PropertyTable;
