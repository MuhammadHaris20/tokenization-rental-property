import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../../App.css";
import { ethers } from "ethers";
import { getEthPkrRate } from "../../utils/ethRate";
import { CONTRACT_ADDRESSES } from "../../contracts";

const Marketplace = () => {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [propertyImages, setPropertyImages] = useState([]);
  const [propertyImagesMap, setPropertyImagesMap] = useState({});
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [buyTokens, setBuyTokens] = useState("");
  const [buying, setBuying] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("All");
  const [propertyTypes, setPropertyTypes] = useState(["All"]);

  const navigate = useNavigate();

  useEffect(() => {
    const userId = localStorage.getItem("user_id");
    if (!userId) navigate("/", { replace: true });
  }, [navigate]);

  useEffect(() => { fetchSellOrders(); }, []);
  useEffect(() => { applyFilters(); }, [orders, searchQuery, selectedType]);

  const fetchSellOrders = async () => {
    try {
      setLoading(true);
      const res = await fetch("http://localhost:5000/api/properties/sell-orders");
      const result = await res.json();
      if (result.success) {
        setOrders(result.orders);
        setFilteredOrders(result.orders);
        const types = ["All", ...new Set(result.orders.map(o => o.type).filter(Boolean))];
        setPropertyTypes(types);

        for (const order of result.orders) {
          await fetchPropertyImages(order.property_id);
        }
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError("Failed to fetch marketplace listings");
    } finally {
      setLoading(false);
    }
  };

  const fetchPropertyImages = async (propertyId) => {
    try {
      const res = await fetch(`http://localhost:5000/api/properties/${propertyId}/images`);
      const result = await res.json();

      if (result.success && result.images && result.images.length > 0) {
        const imageObjects = result.images.map(img => ({
          url: img.image_url.startsWith("http")
            ? img.image_url
            : `http://localhost:5000/${img.image_url.replace(/\\/g, '/')}`,
          type: img.image_type
        }));
        setPropertyImagesMap(prev => ({ ...prev, [propertyId]: imageObjects }));
      }
    } catch (err) {
      console.error(`Error fetching images for property ${propertyId}:`, err);
    }
  };

  const applyFilters = () => {
    let filtered = [...orders];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(o =>
        o.title?.toLowerCase().includes(q) ||
        o.address?.toLowerCase().includes(q) ||
        o.city?.toLowerCase().includes(q) ||
        o.province?.toLowerCase().includes(q) ||
        o.description?.toLowerCase().includes(q)
      );
    }
    if (selectedType !== "All") filtered = filtered.filter(o => o.type === selectedType);
    setFilteredOrders(filtered);
  };

  const clearFilters = () => { setSearchQuery(""); setSelectedType("All"); };

  const formatCurrency = (amount) => {
    if (!amount) return "Rs 0";
    return new Intl.NumberFormat("en-PK", {
      style: "currency", currency: "PKR",
      minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleViewDetails = async (order) => {
    setSelectedOrder(order);
    setCurrentImageIndex(0);
    setBuyTokens("");

    let images = propertyImagesMap[order.property_id];
    if (!images || images.length === 0) {
      await fetchPropertyImages(order.property_id);
      images = propertyImagesMap[order.property_id];
    }

    if (images && images.length > 0) {
      setPropertyImages(images.map(img => img.url));
    } else {
      setPropertyImages([
        "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800",
        "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800",
      ]);
    }
  };

const handleBuy = async (order) => {
    const userId = localStorage.getItem("user_id");
    const userRole = localStorage.getItem("user_role")?.toUpperCase();

    if (!userId) { alert("Please login to invest"); return; }
    if (!buyTokens || Number(buyTokens) < 1) { alert("Enter a valid token amount."); return; }
    if (Number(buyTokens) > order.tokens_for_sale) {
      alert(`Only ${order.tokens_for_sale} tokens available.`); return;
    }

    if (userRole !== "INVESTOR" && userRole !== "OWNER" && userRole !== "TENANT") {
      alert("Only investors and property owners can buy tokens.");
      return;
    }

    setBuying(true);

    try {
      if (!window.ethereum) { alert("MetaMask not found."); setBuying(false); return; }

      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      await browserProvider.send("eth_requestAccounts", []);
      const freshSigner = await browserProvider.getSigner();

      const network = await freshSigner.provider.getNetwork();
      if (network.chainId !== 11155111n) {
        alert("Please switch MetaMask to Sepolia Testnet.");
        setBuying(false);
        return;
      }

      const ethPriceInPkr = await getEthPkrRate();

      const pricePerTokenPKR = Number(order.price_per_token);
      const tokensToBuy = Number(buyTokens);
      const pricePerTokenETH = pricePerTokenPKR / ethPriceInPkr;

      // ✅ Fix: use BigInt multiplication to avoid floating point drift
      const pricePerTokenWei = BigInt(Math.round(pricePerTokenETH * 1e18));
      const totalWei = pricePerTokenWei * BigInt(tokensToBuy);

      // For display only
      const totalETH = Number(totalWei) / 1e18;

      // ✅ Balance check before sending
      const buyerAddress = await freshSigner.getAddress();
      const balance = await browserProvider.getBalance(buyerAddress);
      if (balance < totalWei) {
        alert(
          `Insufficient ETH balance.\n\nYou need: ${totalETH.toFixed(8)} ETH\nYou have: ${(Number(balance) / 1e18).toFixed(8)} ETH\n\nPlease top up your Sepolia wallet.`
        );
        setBuying(false);
        return;
      }

      const sellerRes = await fetch(`http://localhost:5000/api/user/profile/${order.seller_id}`);
      const sellerData = await sellerRes.json();
      const sellerWallet = sellerData?.user?.wallet_address;

      if (!sellerWallet) {
        alert("Seller wallet address not found.");
        setBuying(false);
        return;
      }

      const propRes = await fetch(`http://localhost:5000/api/properties/property/${order.property_id}`);
      const propData = await propRes.json();

      if (!propData?.property?.property_hash) {
        alert("Property hash not found.");
        setBuying(false);
        return;
      }

      const propertyHashHex = "0x" + propData.property.property_hash;
      const scaledAmount = BigInt(tokensToBuy) * BigInt(10 ** 18);

      const contractAddress =
            userRole === "INVESTOR"
            ? CONTRACT_ADDRESSES.InvestorController
            : userRole === "TENANT"
            ? CONTRACT_ADDRESSES.TenantController
            : CONTRACT_ADDRESSES.PropertyOwnerController;

      if (!contractAddress) {
        alert(`Contract address for role "${userRole}" is not configured. Check contracts.js.`);
        setBuying(false);
        return;
      }

      const contractABI = [
        "function buyTokens(bytes32 propertyHash, address seller, uint256 amount, uint256 pricePerToken) external payable"
      ];

      const contract = new ethers.Contract(contractAddress, contractABI, freshSigner);

      const tx = await contract.buyTokens(
        propertyHashHex,
        sellerWallet,
        scaledAmount,
        pricePerTokenWei,
        { value: totalWei }
      );

      alert(`⏳ Transaction submitted!\nTX: ${tx.hash}\n\nWaiting for confirmation...`);
      const receipt = await tx.wait();

      // Save transaction to database
      await fetch("http://localhost:5000/api/properties/token-transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          property_id: order.property_id,
          from_user: order.seller_id,
          to_user: userId,
          amount: tokensToBuy,
          price_per_token: pricePerTokenPKR,
          total_price: pricePerTokenPKR * tokensToBuy,
          tx_type: "SECONDARY",
          blockchain_tx_hash: receipt.hash
        })
      });

      // Reduce sell order
      const reduceRes = await fetch(`http://localhost:5000/api/properties/sell-orders/${order.order_id}/reduce`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokens_sold: tokensToBuy })
      });
      const reduceResult = await reduceRes.json();

      if (!reduceResult.success) {
        console.error("Failed to reduce sell order:", reduceResult.message);
        alert(`Purchase succeeded on blockchain, but the sell order was not updated. Please contact support.\n${reduceResult.message}`);
        fetchSellOrders();
        setSelectedOrder(null);
        setBuying(false);
        return;
      }

      alert(`✅ Purchase Successful!\n\nProperty: ${order.title}\nTokens: ${tokensToBuy}\nTotal Paid: ${totalETH.toFixed(8)} ETH\nTX: ${receipt.hash}`);

      // Prompt the buyer to add the ESH token to MetaMask so their new
      // tokens are visible without needing to know/paste the contract address
      try {
        const alreadyAdded = localStorage.getItem(`Esh_token_added_${userId}`) === "true";
        if (!alreadyAdded) {
          const wasAdded = await window.ethereum.request({
            method: "wallet_watchAsset",
            params: {
              type: "ERC20",
              options: {
                address: CONTRACT_ADDRESSES.RealEstateRWA,
                symbol: "ESH",
                decimals: 18,
              },
            },
          });
          if (wasAdded) {
            localStorage.setItem(`Esh_token_added_${userId}`, "true");
          }
        }
      } catch (watchErr) {
        console.warn("wallet_watchAsset prompt failed or was dismissed:", watchErr);
      }

      setSelectedOrder(null);
      fetchSellOrders();

    } catch (err) {
      console.error("Buy error:", err);
      if (err.code === 4001 || err.code === "ACTION_REJECTED") {
        alert("Transaction rejected in MetaMask.");
      } else {
        alert("Transaction failed: " + (err.reason || err.message));
      }
    } finally {
      setBuying(false);
    }
  };

  if (loading) return (
    <div className="user-dashboard">
      <h3 className="section-title">Marketplace</h3>
      <div className="loading-container"><div className="loading-spinner"></div><p>Loading listings...</p></div>
    </div>
  );

  if (error) return (
    <div className="user-dashboard">
      <h3 className="section-title">Marketplace</h3>
      <div className="error-container"><p>❌ {error}</p><button onClick={fetchSellOrders} className="retry-btn">Retry</button></div>
    </div>
  );

  return (
    <div className="user-dashboard">
      <h3 className="section-title">Marketplace — Active Sell Orders ({filteredOrders.length})</h3>

      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="filter-search-container">
          <div className="filter-search-wrapper">
            <span className="filter-search-icon">🔍</span>
            <input type="text" className="filter-search-input" placeholder="Search by location, city, or property..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            {searchQuery && <button className="filter-search-clear" onClick={() => setSearchQuery("")}>×</button>}
          </div>
        </div>
        <div className="filter-type-container">
          <select className="filter-type-select" value={selectedType} onChange={e => setSelectedType(e.target.value)}>
            {propertyTypes.map(t => <option key={t} value={t}>{t === "All" ? "🏠 All Types" : `🏠 ${t}`}</option>)}
          </select>
        </div>
        <div className="filter-results-count">{filteredOrders.length} Listings</div>
        {(searchQuery || selectedType !== "All") && <button className="filter-clear-btn" onClick={clearFilters}><span>✕</span> Clear Filters</button>}
      </div>

      {(searchQuery || selectedType !== "All") && (
        <div className="active-filters">
          <span className="active-filters-label">Active Filters:</span>
          {searchQuery && <span className="filter-tag search-tag"><span className="filter-tag-icon">🔍</span>"{searchQuery}"<button className="filter-tag-remove" onClick={() => setSearchQuery("")}>×</button></span>}
          {selectedType !== "All" && <span className="filter-tag type-tag"><span className="filter-tag-icon">🏠</span>{selectedType}<button className="filter-tag-remove" onClick={() => setSelectedType("All")}>×</button></span>}
        </div>
      )}

      {filteredOrders.length === 0 ? (
        <div className="filter-no-results">
          <div className="filter-no-results-icon">🏪</div>
          <h3>No sell orders found</h3>
          <p>{orders.length > 0 ? "Try adjusting your filters." : "No tokens are listed for sale yet."}</p>
          {orders.length > 0 && <button className="filter-no-results-btn" onClick={clearFilters}>Clear Filters</button>}
        </div>
      ) : (
        <div className="marketplace-horizontal-list" style={{ display: "flex", flexDirection: "column", gap: "20px", marginTop: "20px" }}>
          {filteredOrders.map(order => {
            const imageObjects = propertyImagesMap[order.property_id];
            const hasImages = imageObjects && imageObjects.length > 0;
            const exteriorImageObj = hasImages ? imageObjects.find(img => img.type === 'exterior') : null;
            const thumbnailObj = exteriorImageObj || (hasImages ? imageObjects[0] : null);
            const thumbnail = thumbnailObj ? thumbnailObj.url : null;
            const imageCount = hasImages ? imageObjects.length : 0;

            return (
              <div key={order.order_id} className="property-horizontal-card" onClick={() => handleViewDetails(order)}>
                <div className="property-image-section">
                  {thumbnail ? (
                    <>
                      <img src={thumbnail} alt={order.title} className="property-image" onError={(e) => { e.target.style.display = 'none'; if (e.target.parentElement) { const fallback = e.target.parentElement.querySelector('.property-image-icon'); if (fallback) fallback.style.display = 'flex'; } }} />
                      {imageCount > 1 && <div className="image-count-badge">📷 {imageCount}</div>}
                      <span className="property-image-icon" style={{ display: 'none' }}>🏠</span>
                    </>
                  ) : (
                    <span className="property-image-icon">🏠</span>
                  )}
                  <span className="property-tokenized-badge">For Sale</span>
                </div>
                <div className="property-details-section">
                  <div>
                    <div className="property-header"><h3 className="property-title">{order.title}</h3><span className="property-type-badge">{order.type}</span></div>
                    <p className="property-location"><span>📍</span> {order.address || `${order.city}, ${order.province}`}</p>
                    <p className="property-owner"><span>👤</span> {order.seller_name}</p>
                    <p className="property-description">{order.description?.substring(0, 150)}{order.description?.length > 150 ? "..." : ""}</p>
                  </div>
                  <div className="token-info-section">
                    <div className="token-stats">
                      <div className="token-stat-item"><p className="token-stat-label">Price / Token</p><p className="token-stat-value price">{formatCurrency(order.price_per_token)}</p></div>
                      <div className="token-stat-item"><p className="token-stat-label">Tokens Available</p><p className="token-stat-value tokens">{order.tokens_for_sale.toLocaleString()}</p></div>
                      <div className="token-stat-item"><p className="token-stat-label">Total Value</p><p className="token-stat-value valuation">{formatCurrency(order.total_value)}</p></div>
                    </div>
                    <div className="property-actions">
                      <button className="btn-view-details" onClick={e => { e.stopPropagation(); handleViewDetails(order); }}>View Details</button>
                      <button className="btn-invest" onClick={e => { e.stopPropagation(); handleViewDetails(order); }}>Buy Tokens</button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Details Modal */}
      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="property-details-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>{selectedOrder.title}</h2><button className="modal-close-btn" onClick={() => setSelectedOrder(null)}>×</button></div>
            <div className="modal-body">
              {propertyImages.length > 0 && (
                <div className="image-carousel-container">
                  <div className="image-carousel">
                    {propertyImages.length > 1 && <button className="carousel-arrow carousel-arrow-left" onClick={() => setCurrentImageIndex(i => (i - 1 + propertyImages.length) % propertyImages.length)}>‹</button>}
                    <div className="carousel-main-image" onClick={() => setLightboxImage(propertyImages[currentImageIndex])}>
                      <img src={propertyImages[currentImageIndex]} alt="Property" />
                      <div className="carousel-image-overlay"><span>🔍 Click to enlarge</span></div>
                    </div>
                    {propertyImages.length > 1 && <button className="carousel-arrow carousel-arrow-right" onClick={() => setCurrentImageIndex(i => (i + 1) % propertyImages.length)}>›</button>}
                    {propertyImages.length > 1 && <div className="carousel-counter">{currentImageIndex + 1} / {propertyImages.length}</div>}
                  </div>
                  {propertyImages.length > 1 && (
                    <div className="carousel-thumbnails">
                      {propertyImages.map((img, i) => <div key={i} className={`carousel-thumbnail ${i === currentImageIndex ? "active" : ""}`} onClick={() => setCurrentImageIndex(i)}><img src={img} alt={`thumb-${i}`} /></div>)}
                    </div>
                  )}
                </div>
              )}

              <div className="details-grid">
                {[["Property Type", selectedOrder.type], ["Location", `${selectedOrder.city}, ${selectedOrder.province}`], ["Seller", selectedOrder.seller_name], ["Order ID", `#${selectedOrder.order_id}`], ["Listed", new Date(selectedOrder.created_at).toLocaleDateString()], ["Status", selectedOrder.status]].map(([label, value]) => (
                  <div key={label} className="detail-item"><p className="detail-item-label">{label}</p><p className="detail-item-value">{value}</p></div>
                ))}
              </div>

              <div className="description-section"><h4>Description</h4><p>{selectedOrder.description || "No description available."}</p></div>

              <div className="token-section">
                <h4>Buy Tokens</h4>
                <div className="token-grid">
                  <div><p className="token-grid-label">Price / Token</p><p className="token-grid-value price">{formatCurrency(selectedOrder.price_per_token)}</p></div>
                  <div><p className="token-grid-label">Available</p><p className="token-grid-value tokens">{selectedOrder.tokens_for_sale.toLocaleString()}</p></div>
                  <div><p className="token-grid-label">Total Listing</p><p className="token-grid-value total">{formatCurrency(selectedOrder.total_value)}</p></div>
                </div>
                <div style={{ marginTop: "16px", display: "flex", gap: "12px", alignItems: "flex-end" }}>
                  <div style={{ flex: 1 }}><label style={{ fontSize: "13px", fontWeight: "600", color: "#444", display: "block", marginBottom: "6px" }}>Tokens to Buy</label><input type="number" placeholder={`1 – ${selectedOrder.tokens_for_sale}`} value={buyTokens} onChange={e => setBuyTokens(e.target.value)} min="1" max={selectedOrder.tokens_for_sale} style={{ width: "100%", padding: "10px 14px", border: "1px solid #ddd", borderRadius: "8px", fontSize: "14px", boxSizing: "border-box" }} /></div>
                  <div style={{ flex: 1 }}><p style={{ fontSize: "13px", color: "#888", marginBottom: "6px" }}>You Pay</p><p style={{ fontSize: "18px", fontWeight: "700", color: "#0A2FFF" }}>{buyTokens ? formatCurrency(Number(buyTokens) * selectedOrder.price_per_token) : "—"}</p></div>
                </div>
              </div>
            </div>
            <div className="modal-footer"><button className="btn-close" onClick={() => setSelectedOrder(null)}>Close</button><button className="btn-invest" disabled={buying} onClick={() => handleBuy(selectedOrder)}>{buying ? "Processing..." : "💰 Buy Tokens"}</button></div>
          </div>
        </div>
      )}

      {lightboxImage && (
        <div className="lightbox-overlay" onClick={() => setLightboxImage(null)}>
          <button className="lightbox-close" onClick={() => setLightboxImage(null)}>×</button>
          <img src={lightboxImage} alt="Full view" className="lightbox-image" onClick={e => e.stopPropagation()} />
          <button className="lightbox-close-btn" onClick={() => setLightboxImage(null)}>Close</button>
        </div>
      )}
    </div>
  );
};

export default Marketplace;