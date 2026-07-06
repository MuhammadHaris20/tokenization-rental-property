// Import React library
import React from "react";

// Import global CSS styling file
import "../../App.css";
// Import logo image from images folder

import logo from "../../images/logo.jpeg";

// Define About functional component
const About = () => {
  return (
    // Main wrapper div for the entire About page
    <div className="about-page">

      {/* HERO SECTION */}
      {/* Top section introducing the company */}
      <section className="about-hero fade-in">

        {/* Container for hero content */}
        <div className="about-hero-content">

          {/* Decorative glowing background element */}
          <div className="hero-glow"></div>

          {/* Main hero title */}
          <h1 className="hero-title">About Us</h1>

          {/* Subtitle description */}
          <p className="hero-subtitle">
            Making real estate investment accessible, transparent, and borderless
            through blockchain-powered tokenization.
          </p>

          {/* Statistics section */}
          <div className="hero-stats">

            {/* Single stat item */}
            <div className="stat-item">
              <span className="stat-number">10K+</span> {/* Statistic number */}
              <span className="stat-label">Properties Listed</span> {/* Label */}
            </div>

            <div className="stat-item">
              <span className="stat-number">50K+</span>
              <span className="stat-label">Active Investors</span>
            </div>

            <div className="stat-item">
              <span className="stat-number">$100M+</span>
              <span className="stat-label">Assets Tokenized</span>
            </div>

          </div>
        </div>
      </section>

      {/* WHO WE ARE SECTION */}
      <section className="about-section fade-in">

        {/* Content container for consistent layout */}
        <div className="section-container">

          {/* Section heading area */}
          <div className="section-header">

            {/* Small badge label above title */}
            <span className="section-badge">Our Story</span>

            {/* Section title */}
            <h2 className="section-title">Who We Are</h2>

            {/* Decorative underline below title */}
            <div className="title-underline"></div>
          </div>

          {/* Main content area (image + text) */}
          <div className="section-content">

            {/* Image container */}
            <div className="content-image">

              {/* Logo wrapper container */}
              <div className="logo-container">

                {/* Company logo image */}
                <img 
                  src={logo}  // Image source imported earlier
                  alt="Real Estate Logo"  // Alt text for accessibility
                  className="about-logo"  // Styling class
                />

                {/* Decorative background elements */}
                <div className="logo-decoration"></div>
                <div className="logo-decoration-2"></div>
              </div>
            </div>

            {/* Text content area */}
            <div className="content-text">

              {/* Main introduction paragraph */}
              <p className="lead-text">
                We are a next-generation real estate investment platform focused on
                tokenizing real-world rental properties. Our mission is to remove
                traditional barriers such as high capital requirements, lack of
                liquidity, and limited access to premium properties.
              </p>

              {/* Supporting paragraph */}
              <p className="regular-text">
                Founded in 2023, we combine cutting-edge blockchain technology with
                traditional real estate expertise to create a platform where anyone
                can invest in premium properties with confidence and ease.
              </p>

            </div>
          </div>
        </div>
      </section>

      {/* OUR MISSION SECTION */}
      <section className="about-section alt fade-in">

        <div className="section-container">

          {/* Section header */}
          <div className="section-header">
            <span className="section-badge">Our Purpose</span>
            <h2 className="section-title">Our Mission</h2>
            <div className="title-underline"></div>
          </div>

          {/* Grid of mission cards */}
          <div className="mission-cards">

            {/* Individual mission card */}
            <div className="mission-card">
              <div className="mission-icon">🎯</div> {/* Icon */}
              <h3>Democratize Ownership</h3> {/* Title */}
              <p>Enable fractional investments in premium real estate for everyone</p>
            </div>

            <div className="mission-card">
              <div className="mission-icon">⚡</div>
              <h3>Boost Liquidity</h3>
              <p>Transform illiquid real estate assets into tradable tokens</p>
            </div>

            <div className="mission-card">
              <div className="mission-icon">🔒</div>
              <h3>Ensure Transparency</h3>
              <p>Leverage blockchain for immutable ownership records</p>
            </div>

            <div className="mission-card">
              <div className="mission-icon">🌍</div>
              <h3>Global Access</h3>
              <p>Break geographical barriers to real estate investment</p>
            </div>

          </div>
        </div>
      </section>

      {/* WHY TOKENIZED REAL ESTATE SECTION */}
      <section className="about-section fade-in">

        <div className="section-container">

          {/* Section heading */}
          <div className="section-header">
            <span className="section-badge">The Advantage</span>
            <h2 className="section-title">Why Tokenized Real Estate?</h2>
            <div className="title-underline"></div>
          </div>

          {/* Feature cards grid */}
          <div className="features-grid">

            {/* Individual feature card */}
            <div className="feature-card">
              <div className="feature-icon">💰</div>
              <h3>Low Minimum Investment</h3>
              <p>Start with as little as $100 and build your portfolio gradually</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">🏢</div>
              <h3>Premium Properties</h3>
              <p>Access luxury real estate that was previously out of reach</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">🔗</div>
              <h3>Blockchain Security</h3>
              <p>Every transaction is recorded on an immutable ledger</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">🔄</div>
              <h3>Automated Income</h3>
              <p>Receive rental payments directly to your digital wallet</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">🌐</div>
              <h3>Global Marketplace</h3>
              <p>Buy and sell tokens 24/7 from anywhere in the world</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">📈</div>
              <h3>Value Growth</h3>
              <p>Benefit from both rental income and property appreciation</p>
            </div>

          </div>
        </div>
      </section>

      {/* VISION SECTION */}
      <section className="about-section alt fade-in">

        <div className="section-container">

          {/* Section heading */}
          <div className="section-header">
            <span className="section-badge">Future Forward</span>
            <h2 className="section-title">Our Vision</h2>
            <div className="title-underline"></div>
          </div>

          {/* Vision content wrapper */}
          <div className="vision-content">

            {/* Vision text area */}
            <div className="vision-text">

              {/* Vision quote */}
              <p className="vision-quote">
                "We envision a future where real estate investment is as simple as
                buying digital assets—secure, liquid, and accessible to everyone,
                regardless of location or financial background."
              </p>

              {/* Highlight bullet points */}
              <div className="vision-highlights">

                <div className="highlight-item">
                  <div className="highlight-dot"></div>
                  <span>Complete democratization of real estate ownership</span>
                </div>

                <div className="highlight-item">
                  <div className="highlight-dot"></div>
                  <span>Borderless investment opportunities</span>
                </div>

                <div className="highlight-item">
                  <div className="highlight-dot"></div>
                  <span>Seamless integration with Web3 ecosystems</span>
                </div>

              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CALL TO ACTION SECTION */}
      <section className="about-cta fade-in">

        {/* CTA container */}
        <div className="cta-container">

          {/* CTA main heading */}
          <h2 className="cta-title">Ready to Start Your Investment Journey?</h2>

          {/* CTA supporting text */}
          <p className="cta-subtitle">
            Join thousands of investors already earning passive income through tokenized real estate
          </p>

          {/* CTA buttons */}
          <div className="cta-buttons">

            {/* Primary button */}
            <button className="cta-btn primary">Get Started Now</button>

            {/* Secondary button */}
            <button className="cta-btn secondary">Schedule a Demo</button>

          </div>
        </div>
      </section>

    </div>
  );
};

// Export the About component so it can be used in other files
export default About;
