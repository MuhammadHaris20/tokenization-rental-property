// Import React library to create the component
import React from "react";

// Import useNavigate hook for programmatic navigation between routes
import { useNavigate } from "react-router-dom";

// Import external CSS file for styling

import "../../RealEstate.css";

// Define Hero functional component
const Hero = () => {

  // Initialize navigate function to redirect users to different routes
  const navigate = useNavigate();

  // Return JSX for the Hero section UI
  return (
    <section className="hero"> {/* Main hero section container */}

      <div className="hero-text"> {/* Left side text content */}

        {/* Main heading */}
        <h1>Easy way to find a perfect property</h1>

        {/* Subheading / description */}
        <p>
          Tokenized real-world assets for rental income and fractional ownership.
        </p>

        {/* Action buttons container */}
        <div className="hero-actions">

          {/* Button to navigate to properties page */}
          <button
            className="primary-btn"
            onClick={() => navigate("/properties")} // Redirect to /properties route
          >
            Explore Properties
          </button>

          {/* Button to navigate to dashboard page */}
          <button
            className="secondary-btn"
            onClick={() => navigate("/dashboard")} // Redirect to /dashboard route
          >
            My Dashboard
          </button>

        </div>
      </div>

      {/* Right side image container */}
      <div className="hero-image">

        {/* Display hero image */}
        <img
          src="https://images.unsplash.com/photo-1568605114967-8130f3a36994" // Image source URL
          alt="House" // Alternative text for accessibility
        />

      </div>
    </section>
  );
};

// Export Hero component for use in other files (home.js)
export default Hero;
