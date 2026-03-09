// Import Navbar component (though not currently used in this file)
import Navbar from "../components/navbar";

// Import Hero component (top section of homepage)
import Hero from "../components/Hero";

// Import HowItWorks component (explains platform process)
import HowItWorks from "../components/HowItWorks";

// Define Home functional component
const Home = () => {
  return (
    // React Fragment (<> </>) allows returning multiple elements
    // without adding an extra div to the DOM
    <>
      {/* Hero section component */}
      <Hero />

      {/* How It Works section component */}
      <HowItWorks />
    </>
  );
};

// Export Home component 
// Export component so it can be used in other files
export default Home;
