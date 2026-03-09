// Import React and specific hooks from React
import React, { useState, useEffect, useRef } from "react";

// Import routing hooks to access URL and navigation
import { useLocation, useNavigate } from "react-router-dom";

// Import BlogModal component (used to show full blog details in a popup)
import BlogModal from "../components/BlogModal";

// Import CSS styling

import "../../App.css";


// Array containing blog data
const blogs = [
  {
    // Blog title
    title: "Tokenized Real Estate: The Future",

    // Blog image URL
    image: "https://images.unsplash.com/photo-1560518883-ce09059eeffa",

    // Short preview description
    short: "Tokenization is revolutionizing property investment by enabling fractional ownership.",

    // Full blog content (shown in modal)
    full:
      "Tokenized real estate allows investors to buy fractions of property using blockchain technology. This improves liquidity, transparency, and global accessibility while reducing entry barriers."
  },
  {
    title: "Why Blockchain is Changing Property Ownership",
    image: "https://images.unsplash.com/photo-1501183638710-841dd1904471",
    short: "Blockchain introduces trustless, secure and immutable property records.",
    full:
      "Using blockchain, property records become immutable and verifiable. Smart contracts automate ownership transfers, rental income distribution, and eliminate middlemen."
  },
  {
    title: "Passive Income Through Rental Yield",
    image: "https://images.unsplash.com/photo-1494526585095-c41746248156",
    short: "Invest small, own fractions, and receive steady rental returns—without the burden of maintenance, paperwork, or high upfront capital.",
    full:
      "With tokenized rentals, investors earn proportional rental yield automatically. This enables passive income streams with minimal management effort."
  }
];

// Main Blog component
const Blog = () => {

  // State to store which blog is selected (for modal)
  const [selectedBlog, setSelectedBlog] = useState(null);

  // Reference to the contact section (used for scrolling)
  const contactRef = useRef(null);

  // Get current URL location (used to check hash)
  const location = useLocation();

  // Hook for programmatic navigation (not used currently but available)
  const navigate = useNavigate();

  // Effect runs when URL hash changes
  useEffect(() => {

    // If URL contains #contact and reference exists
    if (location.hash === "#contact" && contactRef.current) {

      // Scroll smoothly to contact section
      contactRef.current.scrollIntoView({ behavior: "smooth" });
    }

  }, [location.hash]); // Dependency: runs when hash changes

  // Function to handle contact form submission
  const handleContactSubmit = async (e) => {
  e.preventDefault();

  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData.entries());

  try {
    const response = await fetch("http://localhost:5000/api/contact", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (response.ok) {
      alert("Message sent successfully ✅");
      e.target.reset();
    } else {
      alert(result.message || "Failed to send message ❌");
    }
  } catch (error) {
    console.error("Contact error:", error);
    alert("Server error ❌");
  }
};

  // Component return (JSX UI)
  return (
    <div className="blog-page">

      {/* Blog Section */}
      <section className="blogs-section fade-in">

        {/* Section heading */}
        <h1 className="section-title">Insights & Market Trends</h1>

        {/* Blog grid layout */}
        <div className="blog-grid">

          {/* Loop through blogs array */}
          {blogs.map((blog, index) => (

            // Blog card container
            <div
              className="blog-card"
              key={index} // Unique key for React rendering
              onClick={() => setSelectedBlog(blog)} // Open modal on click
            >

              {/* Blog image */}
              <img src={blog.image} alt={blog.title} />

              {/* Blog content section */}
              <div className="blog-content">

                {/* Blog title */}
                <h3>{blog.title}</h3>

                {/* Short description */}
                <p>{blog.short}</p>

                {/* Read more button */}
                <button className="read-btn">
                  Read More
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Contact Section */}
      <section className="contact-section" ref={contactRef} id="contact">

        {/* Contact container wrapper */}
        <div className="contact-container">

          {/* Contact heading */}
          <h2 className="contact-title">Contact Us</h2>

          {/* Subtitle */}
          <p className="contact-subtitle">
            Have questions? Get in touch with our team
          </p>

          <div className="contact-content">

            {/* Contact information section */}
            <div className="contact-info">

              {/* Email card */}
              <div className="info-card">
                <div className="info-icon">📧</div>
                <h3>Email Us</h3>
                <p>support@realestatetoken.com</p>
              </div>

              {/* Phone card */}
              <div className="info-card">
                <div className="info-icon">📞</div>
                <h3>Call Us</h3>
                <p>+92 300 1234567</p>
              </div>

              {/* Location card */}
              <div className="info-card">
                <div className="info-icon">📍</div>
                <h3>Visit Us</h3>
                <p>Karachi, Pakistan</p>
              </div>
            </div>

            {/* Contact form */}
            <form className="contact-form" onSubmit={handleContactSubmit}>

              {/* Row for name & email */}
              <div className="form-row">

                {/* Full name field */}
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    name="name"
                    placeholder="Your name"
                    required
                  />
                </div>

                {/* Email field */}
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    placeholder="Your email"
                    required
                  />
                </div>
              </div>

              {/* Subject field */}
              <div className="form-group">
                <label>Subject</label>
                <input
                  type="text"
                  name="subject"
                  placeholder="Subject"
                  required
                />
              </div>

              {/* Message textarea */}
              <div className="form-group">
                <label>Message</label>
                <textarea
                  name="message"
                  placeholder="Your message..."
                  rows="5"
                  required
                ></textarea>
              </div>

              {/* Submit button */}
              <button type="submit" className="contact-submit-btn">
                Send Message
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* If a blog is selected, show BlogModal */}
      {selectedBlog && (
        <BlogModal
          blog={selectedBlog} // Pass selected blog data
          onClose={() => setSelectedBlog(null)} // Close modal handler
        />
      )}
    </div>
  );
};

// Export Blog component so it can be used in other files
export default Blog;
