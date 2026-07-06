let cachedRate = null;
let cacheTime = 0;
const CACHE_TTL = 60 * 1000; // 1 minute cache

export const getEthPkrRate = async () => {
  // Return cached rate if fresh
  if (cachedRate && Date.now() - cacheTime < CACHE_TTL) {
    return cachedRate;
  }

  try {
    const res = await fetch("http://localhost:5000/api/properties/eth-pkr-rate");
    const data = await res.json();
    if (data.success && data.rate) {
      cachedRate = data.rate;
      cacheTime = Date.now();
      return cachedRate;
    }
  } catch (err) {
    console.error("Failed to fetch ETH/PKR rate:", err);
  }

  // Ultimate fallback
  return cachedRate || 850000;
};