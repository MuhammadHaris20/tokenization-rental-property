// Import React library to create the component
import React from "react";

// Import external CSS file for styling

import "../../RealEstate.css";
// Define HowItWorks functional component
const HowItWorks = () => {

  // Return JSX for the "How It Works" section
  return (
    <section className="how-it-works"> {/* Main section container */}
      <div className="how-container"> {/* Inner container for layout */}

        {/* LEFT CONTENT - Steps and text */}
        <div className="how-content">

          {/* Section heading */}
          <h2>Real Estate Made Simple</h2>

          {/* Subtitle / description */}
          <p className="how-subtitle">
            Invest in rental properties even if you don’t have a lot of capital.
            Start small and earn real income.
          </p>

          {/* Steps container */}
          <div className="steps">

            {/* Step 1 card */}
            <div className="step-card">
              <span className="step-number">1</span> {/* Step number */}
              <div>
                <h3>Fractional Ownership</h3> {/* Step title */}
                <p>
                  Own a fraction of high-quality rental properties through
                  blockchain-based tokens.
                </p> {/* Step description */}
              </div>
            </div>

            {/* Step 2 card */}
            <div className="step-card">
              <span className="step-number">2</span>
              <div>
                <h3>Earn Rental Income</h3>
                <p>
                  Receive rental income directly to your wallet without managing
                  tenants or property.
                </p>
              </div>
            </div>

            {/* Step 3 card */}
            <div className="step-card">
              <span className="step-number">3</span>
              <div>
                <h3>Sell Anytime</h3>
                <p>
                  Exit easily by selling your tokens whenever you want — no long
                  waiting periods.
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* RIGHT IMAGES - Visual representation */}
        <div className="how-images">

          {/* Large luxury property image */}
          <img
            src="https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?auto=format&fit=crop&w=1200&q=80"
            alt="Luxury rental property"
            className="img-large"
          />

          {/* Modern house image */}
          <img
            src="https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=800&q=80"
            alt="Modern home"
          />

          {/* Apartment building image */}
          <img
            src="https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=800&q=80"
            alt="Apartment building"
          />

          {/* Family rental house image */}
          <img
            src="https://images.unsplash.com/photo-1576941089067-2de3c901e126?auto=format&fit=crop&w=800&q=80"
            alt="Family rental house"
          />

          {/* Suburban rental property image */}
          <img
            src="https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80"
            alt="Suburban rental property"
          />

        </div>
      </div>
    </section>
  );
};

// Export HowItWorks component so it can be used in other files
export default HowItWorks;
