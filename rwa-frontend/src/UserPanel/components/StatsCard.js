// Import React library to create functional components
import React from "react";

// Import CSS for styling the StatsCard component
import "../App.css";

// Define a functional component called StatsCard
// This component accepts properties: 'title' and 'value'
const StatsCard = ({ title, value }) => {
  // JSX returned by the component
  return (
    <div className="stats-card"> {/* Container div for the stats card */}
      <h3>{title}</h3> {/* Display the title (e.g., "Total Investment") */}
      <p>{value}</p> {/* Display the value  (e.g., "$1000") */}
    </div>
  );
};

// Export the StatsCard component so it can be used in other files
export default StatsCard;
