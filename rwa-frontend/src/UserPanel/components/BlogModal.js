// Import React library to create the component
import React from "react";

// Import external CSS file for styling

import "../../RealEstate.css";
// Define BlogModal functional component
// It receives two props: blog (blog data) and onClose (function to close modal)
const BlogModal = ({ blog, onClose }) => {

  // Return JSX that renders the modal UI
  return (
    <div className="modal-backdrop"> {/* Background overlay covering the page */}
      
      <div className="modal-content"> {/* Main modal container */}

        {/* Close button (X icon) that triggers onClose function when clicked */}
        <span className="close-btn" onClick={onClose}>
          ✖
        </span>

        {/* Display blog image */}
        <img src={blog.image} alt={blog.title} />

        {/* Display blog title */}
        <h2>{blog.title}</h2>

        {/* Display full blog content */}
        <p>{blog.full}</p>

      </div>
    </div>
  );
};

// Export BlogModal component so it can be used in other files (Blog.js)
export default BlogModal;
