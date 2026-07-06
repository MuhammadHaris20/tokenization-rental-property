import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import logo from "../../images/logo.jpeg";
import metamaskIcon from "../../images/wallet.png";
import "../../RealEstate.css";
import { useWeb3 } from "../../hooks/useWeb3";
import { useAuth } from "../../context/AuthContext";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  const {
    account,
    balance,
    chainId,
    loading: walletLoading,
    connect: handleConnectWallet,
    disconnect: handleDisconnectWallet,
    shortenAddress,
    isConnected,
  } = useWeb3();

  const handleLogout = () => {
    logout();                         // clears auth state and localStorage
    navigate("/", { replace: true }); // redirect to login, replace history
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="navbar">
      {/* Logo */}
      <div className="logo">
        <Link to="/home" className="logo-with-text">
          <img src={logo} alt="Real Estate Logo" className="logo-img" />
          <span className="logo-text">Real Estate</span>
        </Link>
      </div>

      {/* Navigation Links */}
      <div className="nav-links-container">
        <ul className="nav-links">
          <li><Link to="/home" className={isActive("/home") ? "active" : ""}>Home</Link></li>
          <li><Link to="/dashboard" className={isActive("/dashboard") ? "active" : ""}>My Dashboard</Link></li>
          <li><Link to="/marketplace" className={isActive("/marketplace") ? "active" : ""}>Marketplace</Link></li>
          <li><Link to="/about" className={isActive("/about") ? "active" : ""}>About</Link></li>
          <li><Link to="/blog" className={isActive("/blog") ? "active" : ""}>Blog</Link></li>
          <li><Link to="/blog#contact">Contact</Link></li>
        </ul>
      </div>

      {/* Wallet + Logout */}
      <div className="login-btn-container">
        {isConnected ? (
          <div
            className="wallet-icon-btn connected"
            title={`${shortenAddress(account)} | ${parseFloat(balance).toFixed(4)} ETH | Chain: ${chainId}`}
          >
            <img src={metamaskIcon} alt="MetaMask" className="metamask-icon-img" />
            <button className="wallet-disconnect-btn" onClick={handleDisconnectWallet}>✕</button>
          </div>
        ) : (
          <button
            className="wallet-icon-btn"
            onClick={handleConnectWallet}
            disabled={walletLoading}
            title="Connect your wallet"
          >
            {walletLoading ? (
              <span className="wallet-spinner" />
            ) : (
              <img src={metamaskIcon} alt="MetaMask" className="metamask-icon-img" />
            )}
          </button>
        )}

        <button className="login-btn" onClick={handleLogout}>Logout</button>
      </div>
    </nav>
  );
};

export default Navbar;