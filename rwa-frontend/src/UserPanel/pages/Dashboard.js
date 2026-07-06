import { ethers } from "ethers";
import { useWeb3 } from "../../hooks/useWeb3";
import { useContracts } from "../../hooks/useContracts";
import React, { useState, useEffect, useCallback } from "react";
import Navbar from "../components/navbar";
import TenantManagement from "../components/TenantManagement";
import PropertyTable from "../components/PropertyTable";
import { useNavigate } from "react-router-dom";
import "../../App.css";
import InvestorControllerABI from "../../abis/InvestorController.json";
import PropertyOwnerControllerABI from "../../abis/PropertyOwnerController.json";
import TenantControllerABI from "../../abis/TenantController.json";
import { CONTRACT_ADDRESSES } from "../../contracts";
import { getEthPkrRate } from "../../utils/ethRate";

// ─────────────────────────────────────────────────────────────────────────────
// HoldingsRow — defined at module level to avoid re-mount on every render
// ─────────────────────────────────────────────────────────────────────────────
const HoldingsRow = ({ holding, userId, formatCurrency }) => {
  const [availableToSell, setAvailableToSell] = useState(null);
  const tokensOwned = Number(holding.tokens_owned || 0);
  const tokenPrice = Number(holding.avg_price_per_token ?? holding.mint_token_price ?? 0);
  const amountPaid = Number(holding.amount_paid || tokensOwned * tokenPrice);
  const currentValue = Number(holding.current_value || 0);

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const res = await fetch(
          `http://localhost:5000/api/properties/owner-balance/${holding.property_id}/${userId}`
        );
        const data = await res.json();
        if (data.success) setAvailableToSell(data.availableToSell);
      } catch (err) {
        console.error("Error fetching balance:", err);
      }
    };
    if (userId) fetchBalance();
  }, [holding.property_id, userId]);

  return (
    <tr>
      <td className="property-name-cell">
        <span className="property-icon">🏠</span>
        <span className="property-name">{holding.title}</span>
      </td>
      <td>{holding.type || "N/A"}</td>
      <td>
        {holding.city}, {holding.province}
      </td>
      <td>
        <span className="token-holdings-badge">{tokensOwned.toLocaleString()}</span>
      </td>
      <td>{formatCurrency(tokenPrice)}</td>
      <td className="amount-paid-value">{formatCurrency(amountPaid)}</td>
      <td className="current-value">{formatCurrency(currentValue)}</td>
      <td>
        <span
          className={`status-badge ${
            holding.property_status === "Tokenized" ? "status-active" : "status-pending"
          }`}
        >
          {holding.property_status}
        </span>
      </td>
      <td>
        {availableToSell !== null && (
          <span className="available-to-sell-badge">📤 {availableToSell} available to sell</span>
        )}
      </td>
    </tr>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard
// ─────────────────────────────────────────────────────────────────────────────
const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [kycStatus, setKycStatus] = useState("pending");
  const [showKycModal, setShowKycModal] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [refreshProperties, setRefreshProperties] = useState(false);
  const [loading, setLoading] = useState(false);
  const [walletError, setWalletError] = useState("");
  const [kycSubmitError, setKycSubmitError] = useState("");
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState("");
  const [hasNameChanged, setHasNameChanged] = useState(false);
  const [hasTokenizedProperty, setHasTokenizedProperty] = useState(false);
  const [EshTokenAdded, setEshTokenAdded] = useState(false);
  const [recentActivity, setRecentActivity] = useState([]);

  const [userData, setUserData] = useState({
    user_id: null,
    name: "",
    email: "",
    avatar: null,
    profile_pic: null,
    role: "",
    walletBalance: 0,
    walletBalanceEth: 0,
    totalInvestment: 0,
    propertiesOwned: 0,
    monthlyIncome: 0,
    roi: 0,
    totalTokensOwned: 0,
    mintedTokensOwned: 0,
  });

  const navigate = useNavigate();
  const { signer } = useWeb3();
  const { rwa, investorController, propertyOwnerController } = useContracts(signer);

  useEffect(() => {
    const userId = localStorage.getItem("user_id");
    if (!userId) navigate("/", { replace: true });
  }, [navigate]);

  useEffect(() => {
    const userId = localStorage.getItem("user_id");
    const userName = localStorage.getItem("user_name");
    const userEmail = localStorage.getItem("user_email");
    const userRole = localStorage.getItem("user_role") || "user";
    if (userId) {
      setUserData((prev) => ({
        ...prev,
        user_id: userId,
        name: userName || "User",
        email: userEmail || "",
        role: userRole,
      }));
      fetchUserProfile(userId);
    }
  }, []);

  useEffect(() => {
    if (userData.user_id) {
      const alreadyAdded =
        localStorage.getItem(`Esh_token_added_${userData.user_id}`) === "true";
      setEshTokenAdded(alreadyAdded);
    }
  }, [userData.user_id]);

  useEffect(() => {
    if (!signer) return;
    const run = async () => {
      try {
        const address = await signer.getAddress();
        if (address) {
          localStorage.setItem("wallet_address", address);
          fetchEthBalancePkr(address);
        }
      } catch (err) {
        console.error("Error getting wallet address:", err);
      }
    };
    run();
    const interval = setInterval(run, 60000);
    return () => clearInterval(interval);
  }, [signer]);

  useEffect(() => {
    const checkTokenizedProperties = async () => {
      if (!userData.user_id || userData.role !== "OWNER") return;
      try {
        const response = await fetch(
          `http://localhost:5000/api/properties/my-properties?user_id=${userData.user_id}&role=${userData.role}`
        );
        const result = await response.json();
        if (result.success && result.properties) {
          setHasTokenizedProperty(result.properties.some((p) => p.status === "Tokenized"));
        }
      } catch (err) {
        console.error("Error checking tokenized properties:", err);
      }
    };
    checkTokenizedProperties();
  }, [userData.user_id, userData.role]);

  useEffect(() => {
    const fetchKycStatus = async () => {
      try {
        if (!userData.user_id) return;
        const response = await fetch(`http://localhost:5000/api/kyc/status/${userData.user_id}`);
        const data = await response.json();
        if (response.ok) {
          let mappedStatus = "pending";
          switch (data.status) {
            case "Approved":
              mappedStatus = "approved";
              break;
            case "Rejected":
              mappedStatus = "rejected";
              break;
            case "Pending":
              mappedStatus = "submitted";
              break;
            default:
              mappedStatus = "pending";
          }
          setKycStatus(mappedStatus);
        }
      } catch (err) {
        console.error("Error fetching KYC status:", err);
      }
    };
    if (userData.user_id) {
      fetchKycStatus();
      const interval = setInterval(fetchKycStatus, 30000);
      return () => clearInterval(interval);
    }
  }, [userData.user_id]);

  useEffect(() => {
    const fetchRecentActivity = async () => {
      if (!userData.user_id) return;
      try {
        const res = await fetch(
          `http://localhost:5000/api/properties/recent-activity/${userData.user_id}`
        );
        const result = await res.json();
        if (result.success) setRecentActivity(result.activity || []);
      } catch (err) {
        console.error("Error fetching recent activity:", err);
      }
    };
    if (userData.user_id) fetchRecentActivity();
  }, [userData.user_id]);

  const fetchEthBalancePkr = async (walletAddress) => {
    try {
      const addr = walletAddress || localStorage.getItem("wallet_address");
      if (!window.ethereum || !addr) return;
      const provider = new ethers.BrowserProvider(window.ethereum);
      const balanceWei = await provider.getBalance(addr);
      const balanceEth = parseFloat(ethers.formatEther(balanceWei));
      const ethPkrRate = await getEthPkrRate();
      const balancePkr = Math.round(balanceEth * ethPkrRate);
      setUserData((prev) => ({ ...prev, walletBalance: balancePkr, walletBalanceEth: balanceEth }));
    } catch (err) {
      console.error("Error fetching ETH balance:", err);
    }
  };

  const fetchUserProfile = async (userId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/user/profile/${userId}`);
      const result = await response.json();
      if (result.success && result.user) {
        setUserData((prev) => ({
          ...prev,
          profile_pic: result.user.profile_pic,
          name: result.user.full_name || prev.name,
          email: result.user.email || prev.email,
          role: result.user.role || prev.role,
        }));
      }

      const role =
        result?.user?.role || localStorage.getItem("user_role") || "INVESTOR";
      const propRes = await fetch(
        `http://localhost:5000/api/properties/my-properties?user_id=${userId}&role=${role}`
      );
      const propData = await propRes.json();
      const ownedPropertiesCount = propData.success
        ? (propData.properties || []).filter((p) =>
            ["Pending", "Approved", "Tokenized"].includes(p.status)
          ).length
        : 0;

      const invRes = await fetch(
        `http://localhost:5000/api/properties/investment-summary/${userId}`
      );
      const invData = await invRes.json();

      setUserData((prev) => ({
        ...prev,
        totalInvestment: Number(invData?.totalInvested) || 0,
        propertiesOwned:
          role === "OWNER"
            ? ownedPropertiesCount
            : Number(invData?.propertiesCount) || 0,
      }));

      const holdRes = await fetch(
        `http://localhost:5000/api/properties/my-holdings/${userId}`
      );
      const holdData = await holdRes.json();
      const boughtTokens = holdData.success ? Number(holdData.totalTokens) || 0 : 0;

      const currentRole =
        result?.user?.role || localStorage.getItem("user_role") || "INVESTOR";
      let mintedTokens = 0;
      if (currentRole === "OWNER") {
        const mintedRes = await fetch(
          `http://localhost:5000/api/properties/my-properties?user_id=${userId}&role=OWNER`
        );
        const mintedData = await mintedRes.json();
        if (mintedData.success) {
          mintedTokens = mintedData.properties
            .filter((p) => p.status === "Tokenized")
            .reduce((sum, p) => sum + Number(p.tokens || 0), 0);
        }
      }

      setUserData((prev) => ({
        ...prev,
        totalTokensOwned: boughtTokens,
        mintedTokensOwned: mintedTokens,
      }));
    } catch (err) {
      console.error("Error fetching profile:", err);
    }
  };

  const handleProfilePicUpload = async () => {
    if (!selectedFile) {
      alert("Please select a file first");
      return;
    }
    const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
    if (!allowedTypes.includes(selectedFile.type)) {
      alert("Only JPEG and PNG images are allowed");
      return;
    }
    if (selectedFile.size > 2 * 1024 * 1024) {
      alert("File size must be less than 2MB");
      return;
    }
    setUploading(true);
    const formData = new FormData();
    formData.append("user_id", userData.user_id);
    formData.append("profile_pic", selectedFile);
    try {
      const response = await fetch("http://localhost:5000/api/user/upload-profile-pic", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();
      if (result.success) {
        setUserData((prev) => ({ ...prev, profile_pic: result.profile_pic_url }));
        setShowProfileModal(false);
        setSelectedFile(null);
        alert("Profile picture updated successfully!");
      } else {
        alert(result.message || "Failed to upload profile picture");
      }
    } catch (err) {
      alert("Error uploading profile picture. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const startEditingName = () => {
    setTempName(userData.name);
    setEditingName(true);
    setHasNameChanged(false);
  };
  const cancelEditingName = () => {
    setEditingName(false);
    setTempName("");
    setHasNameChanged(false);
  };
  const handleNameInputChange = (e) => {
    setTempName(e.target.value);
    setHasNameChanged(e.target.value !== userData.name);
  };

  const handleUpdateProfile = async () => {
    let updated = false;
    if (hasNameChanged && tempName.trim() && tempName.trim() !== userData.name) {
      try {
        const response = await fetch(`http://localhost:5000/api/user/profile/${userData.user_id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            full_name: tempName.trim(),
            email: userData.email,
            wallet_address: localStorage.getItem("wallet_address") || "",
          }),
        });
        const result = await response.json();
        if (result.success) {
          setUserData((prev) => ({ ...prev, name: tempName.trim() }));
          localStorage.setItem("user_name", tempName.trim());
          updated = true;
        } else {
          alert("Failed to update name: " + result.message);
          return;
        }
      } catch (err) {
        alert("Error updating name");
        return;
      }
    }
    if (selectedFile) {
      if (!selectedFile.type.startsWith("image/")) {
        alert("Please select a valid image file");
        return;
      }
      if (selectedFile.size > 2 * 1024 * 1024) {
        alert("File size must be less than 2MB");
        return;
      }
      setUploading(true);
      const formData = new FormData();
      formData.append("user_id", userData.user_id);
      formData.append("profile_pic", selectedFile);
      try {
        const response = await fetch("http://localhost:5000/api/user/upload-profile-pic", {
          method: "POST",
          body: formData,
        });
        const result = await response.json();
        if (result.success) {
          setUserData((prev) => ({ ...prev, profile_pic: result.profile_pic_url }));
          updated = true;
        } else {
          alert(result.message || "Failed to upload profile picture");
          setUploading(false);
          return;
        }
      } catch (err) {
        alert("Error uploading profile picture");
        setUploading(false);
        return;
      }
      setUploading(false);
    }
    if (updated) {
      alert("Profile updated successfully!");
      setShowProfileModal(false);
      setEditingName(false);
      setTempName("");
      setHasNameChanged(false);
      setSelectedFile(null);
    } else {
      alert("No changes made");
    }
  };

  const getInitials = (name) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getProfileImageUrl = () => {
    if (userData.profile_pic) {
      if (userData.profile_pic.startsWith("http")) return userData.profile_pic;
      return `http://localhost:5000/${userData.profile_pic.replace(/\\/g, "/")}`;
    }
    return null;
  };

  const provinces = [
    "Punjab",
    "Sindh",
    "Khyber Pakhtunkhwa",
    "Balochistan",
    "Gilgit-Baltistan",
    "Azad Jammu & Kashmir",
    "Islamabad Capital Territory",
  ];

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");
    setShowForgotPassword(false);
    const { currentPassword, newPassword, confirmPassword } = passwordData;
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("All fields are required");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return;
    }
    if (!/[A-Z]/.test(newPassword)) {
      setPasswordError("Password must contain at least one uppercase letter");
      return;
    }
    if (!/[0-9]/.test(newPassword)) {
      setPasswordError("Password must contain at least one number");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }
    setUpdatingPassword(true);
    try {
      const response = await fetch("http://localhost:5000/api/auth/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userData.user_id,
          currentPassword,
          newPassword,
        }),
      });
      const result = await response.json();
      if (result.success) {
        setPasswordSuccess("Password updated successfully!");
        setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        setPasswordError(result.message);
        if (
          result.message.toLowerCase().includes("incorrect") ||
          result.message.toLowerCase().includes("invalid")
        )
          setShowForgotPassword(true);
      }
    } catch (err) {
      setPasswordError("Server error. Please try again.");
    } finally {
      setUpdatingPassword(false);
    }
  };

  const validateFileSize = (file) => file.size <= 1 * 1024 * 1024;

  const validateForm = (formData) => {
    const errors = {};
    const cnicDigits = (formData.get("cnic") || "").replace(/\D/g, "");
    if (cnicDigits.length !== 13) errors.cnic = "CNIC must be exactly 13 digits";
    ["cnicFront", "cnicBack", "selfie", "addressProof"].forEach((name) => {
      const file = formData.get(name);
      if (file && file.size > 0 && !validateFileSize(file))
        errors[name] = "File size must be less than 1MB";
    });
    return errors;
  };

 const handleKYCSubmit = async (e) => {
    e.preventDefault();

    setWalletError("");
    setKycSubmitError("");
    setFormErrors({});

    const normalizedRole = userData?.role?.toUpperCase();

    if (!normalizedRole) {
      setKycSubmitError("User role not found.");
      return;
    }

    if (
      normalizedRole !== "INVESTOR" &&
      normalizedRole !== "OWNER" &&
      normalizedRole !== "TENANT"
    ) {
      setKycSubmitError(
        `KYC submission is not available for your role: "${userData?.role}"`
      );
      return;
    }

    // ── Wallet connection check ──────────────────────────────────────────────
    if (!signer) {
      setWalletError("Please connect your wallet before submitting KYC.");
      return;
    }

    try {
      const network = await signer.provider.getNetwork();
      if (network.chainId !== 11155111n) {
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: "0xaa36a7" }],
          });
        } catch (switchError) {
          if (switchError.code === 4902) {
            try {
              await window.ethereum.request({
                method: "wallet_addEthereumChain",
                params: [
                  {
                    chainId: "0xaa36a7",
                    chainName: "Sepolia Testnet",
                    nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
                    rpcUrls: ["https://eth-sepolia.g.alchemy.com/v2/HrVITqg1ewCLjDjmJGgCr"],
                    blockExplorerUrls: ["https://sepolia.etherscan.io"],
                  },
                ],
              });
            } catch {
              setWalletError("Failed to add Sepolia network.");
              return;
            }
          } else if (switchError.code === 4001) {
            setWalletError("You rejected the network switch.");
            return;
          } else {
            setWalletError("Failed to switch network.");
            return;
          }
        }
        const newNetwork = await signer.provider.getNetwork();
        if (newNetwork.chainId !== 11155111n) {
          setWalletError("Network switch did not complete.");
          return;
        }
      }
    } catch {
      setWalletError("Could not verify network.");
      return;
    }

    // ── Resolve fresh signer ─────────────────────────────────────────────────
    let freshSigner;
    try {
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      freshSigner = await browserProvider.getSigner();
    } catch {
      setWalletError("Failed to connect to MetaMask.");
      return;
    }

    // ── Pre-flight on-chain check ────────────────────────────────────────────
    // For TENANT: if on-chain is 0 (None), we always allow submission even if
    // a stuck/failed DB record exists from a previous attempt.
    // For INVESTOR/OWNER: existing behaviour unchanged.
    let onChainStatusBeforeSubmit = 0;
    try {
      const rwaAbi = ["function kycStatus(address) view returns (uint8)"];
      const rwaCheck = new ethers.Contract(
        CONTRACT_ADDRESSES.RealEstateRWA,
        rwaAbi,
        freshSigner
      );
      const walletAddr = await freshSigner.getAddress();
      onChainStatusBeforeSubmit = Number(await rwaCheck.kycStatus(walletAddr));

      console.log(
        `[KYC Pre-check] Wallet: ${walletAddr} | Role: ${normalizedRole} | On-chain status: ${onChainStatusBeforeSubmit}`
      );
      // 0 = None, 1 = Pending, 2 = Verified, 3 = Rejected

      if (onChainStatusBeforeSubmit === 1) {
        setKycSubmitError(
          `KYC already submitted on-chain for wallet ${walletAddr.slice(0, 6)}...${walletAddr.slice(-4)} and is pending admin review.`
        );
        return;
      }
      if (onChainStatusBeforeSubmit === 2) {
        setKycSubmitError(
          `Your KYC is already verified on-chain for wallet ${walletAddr.slice(0, 6)}...${walletAddr.slice(-4)}.`
        );
        return;
      }
      // status 0 (None) or 3 (Rejected) → allow submission to proceed
    } catch (checkErr) {
      console.warn("Non-critical pre-check failed:", checkErr.message);
    }

    // ── Main submission ──────────────────────────────────────────────────────
    setLoading(true);
    try {
      const formData = new FormData(e.target);
      const errors = validateForm(formData);
      if (Object.keys(errors).length > 0) {
        setFormErrors(errors);
        return;
      }

      const cnic = formData.get("cnic");
      const cnicDigits = cnic.replace(/\D/g, "");
      const cnicHash = ethers.keccak256(ethers.toUtf8Bytes(cnicDigits));

      // ── Resolve contract for this role ─────────────────────────────────────
      let contractAddress, contractABI;

      if (normalizedRole === "INVESTOR") {
        contractAddress = CONTRACT_ADDRESSES.InvestorController;
        contractABI = InvestorControllerABI.abi;
      } else if (normalizedRole === "OWNER") {
        contractAddress = CONTRACT_ADDRESSES.PropertyOwnerController;
        contractABI = PropertyOwnerControllerABI.abi;
      } else {
        // TENANT
        contractAddress = CONTRACT_ADDRESSES.TenantController;
        contractABI = TenantControllerABI.abi;
      }

      if (!contractAddress) {
        setKycSubmitError(
          `Contract address for role "${normalizedRole}" is not configured. ` +
            `Please check CONTRACT_ADDRESSES in contracts.js and ensure TenantController is set.`
        );
        return;
      }

      const hasSubmitKYC =
        contractABI &&
        contractABI.some(
          (item) => item.type === "function" && item.name === "submitKYC"
        );
      if (!hasSubmitKYC) {
        setKycSubmitError(
          `The ABI for "${normalizedRole}" does not contain a submitKYC function. ` +
            `Check TenantController.json in your abis folder.`
        );
        return;
      }

      console.log(`[KYC] Submitting for role ${normalizedRole}`);
      console.log(`[KYC] Contract address: ${contractAddress}`);

      // ── Send on-chain transaction ──────────────────────────────────────────
      let txHash;
      try {
        const freshContract = new ethers.Contract(
          contractAddress,
          contractABI,
          freshSigner
        );
        const tx = await freshContract.submitKYC(cnicHash);
        console.log(`[KYC] TX sent: ${tx.hash}`);
        const receipt = await tx.wait();
        console.log(
          `[KYC] TX confirmed: ${receipt.hash}, status: ${receipt.status}`
        );

        if (receipt.status === 0) {
          setKycSubmitError("On-chain transaction reverted. Please try again.");
          return;
        }
        txHash = receipt.hash;
      } catch (blockchainError) {
        console.error("[KYC] Blockchain error:", blockchainError);
        if (
          blockchainError.code === 4001 ||
          blockchainError.code === "ACTION_REJECTED"
        ) {
          setKycSubmitError("You rejected the transaction in MetaMask.");
        } else {
          setKycSubmitError(
            blockchainError?.reason ||
              blockchainError?.message ||
              "On-chain transaction failed."
          );
        }
        return;
      }

      // ── Save to database ───────────────────────────────────────────────────
      // KEY FIX: For TENANT (or any role) where on-chain was 0 (None) before
      // this submission, a stuck DB record may exist from a previous failed
      // attempt. We pass a flag so the backend can UPDATE instead of INSERT.
      const walletAddress = await freshSigner.getAddress();
      formData.append("wallet_address", walletAddress);
      formData.append("tx_hash", txHash);

      // Tell the backend: "on-chain was None before this TX, so if a DB record
      // exists just overwrite it — it was a stuck/failed previous attempt."
      if (onChainStatusBeforeSubmit === 0) {
        formData.append("force_resubmit", "true");
      }

      try {
        const response = await fetch(
          `http://localhost:5000/api/kyc/submit/${userData.user_id}`,
          { method: "POST", body: formData }
        );
        const data = await response.json();
        if (!response.ok) {
          setKycSubmitError(data.message || "Failed to save KYC data.");
          return;
        }
      } catch {
        setKycSubmitError(
          "On-chain TX succeeded but failed to save to database. TX hash: " +
            txHash
        );
        return;
      }

      // ── Success ────────────────────────────────────────────────────────────
      setKycStatus("submitted");
      setShowKycModal(false);
      setWalletError("");
      setKycSubmitError("");
      setFormErrors({});
      alert("KYC submitted successfully! ✅");
    } catch (error) {
      console.error("[KYC] Unexpected error:", error);
      setKycSubmitError(error?.reason || error?.message || "Unexpected error.");
    } finally {
      setLoading(false);
    }
  };
  
  const handleMobileChange = (e) => {
    if (!e.target.value.startsWith("+92"))
      e.target.value = "+92" + e.target.value.replace(/\D/g, "").replace(/^92/, "");
    let digits = e.target.value.slice(3).replace(/\D/g, "").slice(0, 10);
    e.target.value = "+92" + digits;
  };

  const handleCnicChange = (e) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 5 && value.length <= 12)
      value = value.slice(0, 5) + "-" + value.slice(5);
    else if (value.length > 12)
      value =
        value.slice(0, 5) + "-" + value.slice(5, 12) + "-" + value.slice(12, 13);
    e.target.value = value;
  };

  const handleDobChange = (e) => {
    const today = new Date();
    const eighteenYearsAgo = new Date();
    eighteenYearsAgo.setFullYear(today.getFullYear() - 18);
    const selected = new Date(e.target.value);
    if (selected > today) {
      alert("Date of birth cannot be in the future.");
      e.target.value = "";
    } else if (selected > eighteenYearsAgo) {
      alert("You must be at least 18 years old.");
      e.target.value = "";
    }
  };

  const closeKycModal = () => {
    setShowKycModal(false);
    setWalletError("");
    setKycSubmitError("");
    setFormErrors({});
  };

  const getKycBannerContent = () => {
    switch (kycStatus) {
      case "pending":
        return {
          icon: "🔔",
          title: "KYC Verification Required",
          message: "Complete your KYC to start investing in properties",
          buttonText: "Complete KYC Now",
          buttonAction: () => setShowKycModal(true),
          bannerClass: "kyc-banner-pending",
        };
      case "submitted":
        return {
          icon: "⏳",
          title: "KYC Under Review",
          message: "Your KYC is submitted and pending verification.",
          buttonText: "Check Status",
          buttonAction: () => setShowKycModal(true),
          bannerClass: "kyc-banner-submitted",
        };
      case "rejected":
        return {
          icon: "❌",
          title: "KYC Verification Failed",
          message:
            "Your documents were rejected. Please resubmit with correct information.",
          buttonText: "Resubmit KYC",
          buttonAction: () => setShowKycModal(true),
          bannerClass: "kyc-banner-rejected",
        };
      case "approved":
        return {
          icon: "✅",
          title: "KYC Verified Successfully",
          message:
            "Your identity has been verified. You can now invest and tokenize properties.",
          buttonText: "View Status",
          buttonAction: () => setShowKycModal(true),
          bannerClass: "kyc-banner-approved",
        };
      default:
        return null;
    }
  };

  if (!userData.user_id) {
    return (
      <>
        <Navbar />
        <div className="user-dashboard">
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading dashboard...</p>
          </div>
        </div>
      </>
    );
  }

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return "PKR 0";
    return `PKR${Number(amount).toLocaleString()}`;
  };

  const renderTopStats = () => {
    if (userData.role === "TENANT") {
      return (
        <div className="stats-grid">
          <div className="stat-card primary">
            <div className="stat-icon">📊</div>
            <div className="stat-details">
              <h3>{formatCurrency(userData.totalInvestment)}</h3>
              <p>Total Investment</p>
            </div>
          </div>
          <div className="stat-card warning">
            <div className="stat-icon">🛒</div>
            <div className="stat-details">
              <h3>{Number(userData.totalTokensOwned).toLocaleString()}</h3>
              <p>Tokens Bought</p>
            </div>
          </div>
          <div className="stat-card info">
            <div className="stat-icon">💼</div>
            <div className="stat-details">
              <h3>
                {formatCurrency(userData.walletBalance)}
                {userData.walletBalanceEth > 0 && (
                  <span className="eth-balance-sub">
                    ({userData.walletBalanceEth.toFixed(4)} ETH)
                  </span>
                )}
              </h3>
              <p>Wallet Balance</p>
            </div>
          </div>
        </div>
      );
    }

    if (userData.role === "OWNER") {
      return (
        <div className="stats-grid">
          <div className="stat-card primary">
            <div className="stat-icon">📊</div>
            <div className="stat-details">
              <h3>{formatCurrency(userData.totalInvestment)}</h3>
              <p>Total Investment</p>
            </div>
          </div>
          <div className="stat-card success">
            <div className="stat-icon">🏠</div>
            <div className="stat-details">
              <h3>{userData.propertiesOwned}</h3>
              <p>Properties Listed</p>
            </div>
          </div>
          <div className="stat-card warning">
            <div className="stat-icon">🪙</div>
            <div className="stat-details">
              <h3>{Number(userData.mintedTokensOwned).toLocaleString()}</h3>
              <p>Minted Tokens</p>
            </div>
          </div>
          <div className="stat-card info">
            <div className="stat-icon">💼</div>
            <div className="stat-details">
              <h3>
                {formatCurrency(userData.walletBalance)}
                {userData.walletBalanceEth > 0 && (
                  <span className="eth-balance-sub">
                    ({userData.walletBalanceEth.toFixed(4)} ETH)
                  </span>
                )}
              </h3>
              <p>Wallet Balance</p>
            </div>
          </div>
        </div>
      );
    }

    // INVESTOR
    return (
      <div className="stats-grid">
        <div className="stat-card primary">
          <div className="stat-icon">📊</div>
          <div className="stat-details">
            <h3>{formatCurrency(userData.totalInvestment)}</h3>
            <p>Total Investment</p>
          </div>
        </div>
        <div className="stat-card success">
          <div className="stat-icon">🏠</div>
          <div className="stat-details">
            <h3>{userData.propertiesOwned}</h3>
            <p>Properties Invested In</p>
          </div>
        </div>
        <div className="stat-card warning">
          <div className="stat-icon">🛒</div>
          <div className="stat-details">
            <h3>{Number(userData.totalTokensOwned).toLocaleString()}</h3>
            <p>Tokens Bought</p>
          </div>
        </div>
        <div className="stat-card info">
          <div className="stat-icon">💰</div>
          <div className="stat-details">
            <h3>{formatCurrency(userData.monthlyIncome)}</h3>
            <p>Monthly Income</p>
          </div>
        </div>

        
      </div>
    );
  };

  return (
    <>
      <Navbar />
      <div className="user-dashboard">
        <div className="dashboard-topbar">
          <div className="topbar-title">
            <h1>My Dashboard</h1>
          </div>
          <div className="topbar-profile">
            <div className="profile-dropdown" onClick={() => setShowProfileModal(true)}>
              {getProfileImageUrl() ? (
                <img
                  src={getProfileImageUrl()}
                  alt="Profile"
                  className="profile-avatar"
                  onError={(e) => {
                    e.target.style.display = "none";
                    e.target.parentElement
                      .querySelector(".profile-initials")
                      .style.display = "flex";
                  }}
                />
              ) : null}
              <div className="profile-initials">{getInitials(userData.name)}</div>
              <div className="profile-info">
                <span className="profile-name">{userData.name}</span>
                <span className="profile-role">{userData.role || "Investor"}</span>
              </div>
            </div>
          </div>
        </div>

        {getKycBannerContent() && (
          <div className={`kyc-banner ${getKycBannerContent().bannerClass}`}>
            <div className="kyc-banner-content">
              <span className="kyc-icon">{getKycBannerContent().icon}</span>
              <div className="kyc-text">
                <strong>{getKycBannerContent().title}</strong>
                <p>{getKycBannerContent().message}</p>
              </div>
              {kycStatus !== "approved" && (
                <button
                  className="kyc-banner-btn"
                  onClick={getKycBannerContent().buttonAction}
                >
                  {getKycBannerContent().buttonText}
                </button>
              )}
            </div>
          </div>
        )}

        <div className="welcome-section">
          <h2>Welcome back, {userData.name}!</h2>
          <p>Here's what's happening with your portfolio today.</p>
        </div>

        {userData.role === "OWNER" && hasTokenizedProperty && !EshTokenAdded && (
          <div className="metamask-banner">
            <div>
              <strong className="metamask-banner-title">
                🦊 See your property tokens in MetaMask
              </strong>
              <p className="metamask-banner-text">
                Click to add Esh token to your wallet.
              </p>
            </div>
            <button
              className="metamask-add-btn"
              onClick={async () => {
                if (!window.ethereum) {
                  alert("MetaMask not found.");
                  return;
                }
                try {
                  const wasAdded = await window.ethereum.request({
                    method: "wallet_watchAsset",
                    params: {
                      type: "ERC20",
                      options: {
                        address: CONTRACT_ADDRESSES.RealEstateRWA,
                        symbol: "Esh",
                        decimals: 18,
                      },
                    },
                  });
                  if (wasAdded) {
                    localStorage.setItem(
                      `Esh_token_added_${userData.user_id}`,
                      "true"
                    );
                    setEshTokenAdded(true);
                    alert("✅ Esh token added!");
                  }
                } catch (err) {
                  alert("Failed: " + err.message);
                }
              }}
            >
              🦊 Add Esh to MetaMask
            </button>
          </div>
        )}

        {renderTopStats()}

        <div className="dashboard-tabs">
          {userData.role === "OWNER" ? (
            <>
              <button
                className={`tab-btn ${activeTab === "overview" ? "active" : ""}`}
                onClick={() => setActiveTab("overview")}
              >
                📊 Overview
              </button>
              <button
                className={`tab-btn ${activeTab === "properties" ? "active" : ""}`}
                onClick={() => setActiveTab("properties")}
              >
                🏠 My Properties
              </button>
              <button
                className={`tab-btn ${activeTab === "portfolio" ? "active" : ""}`}
                onClick={() => setActiveTab("portfolio")}
              >
                📊 My Portfolio
              </button>
              <button
                className={`tab-btn ${activeTab === "tenants" ? "active" : ""}`}
                onClick={() => setActiveTab("tenants")}
              >
                👥 Tenant Management
              </button>
              <button
                className={`tab-btn ${activeTab === "rental-income" ? "active" : ""}`}
                onClick={() => setActiveTab("rental-income")}
              >
                💰 Rental Income
              </button>
              <button
                className={`tab-btn ${activeTab === "settings" ? "active" : ""}`}
                onClick={() => setActiveTab("settings")}
              >
                ⚙️ Settings
              </button>
            </>
       ) : userData.role === "TENANT" ? (
  <>
    <button
      className={`tab-btn ${activeTab === "overview" ? "active" : ""}`}
      onClick={() => setActiveTab("overview")}
    >
      📊 Overview
    </button>
    <button
      className={`tab-btn ${activeTab === "my-rental" ? "active" : ""}`}
      onClick={() => setActiveTab("my-rental")}
    >
      🏠 My Rental
    </button>
    <button
      className={`tab-btn ${activeTab === "properties" ? "active" : ""}`}
      onClick={() => setActiveTab("properties")}
    >
      🏠 My Properties
    </button>
    <button
                className={`tab-btn ${activeTab === "portfolio" ? "active" : ""}`}
                onClick={() => setActiveTab("portfolio")}
              >
                📊 My Portfolio
              </button>
    <button
      className={`tab-btn ${activeTab === "pay-rent" ? "active" : ""}`}
      onClick={() => setActiveTab("pay-rent")}
    >
      💰 Pay Rent
    </button>
    
<button
  className={`tab-btn ${activeTab === "rental-income" ? "active" : ""}`}
  onClick={() => setActiveTab("rental-income")}
>
  💰 Rental Income
</button>
    <button
      className={`tab-btn ${activeTab === "settings" ? "active" : ""}`}
      onClick={() => setActiveTab("settings")}
    >
      ⚙️ Settings
    </button>
  </>
          ) : ( //userData.role === "Investor"
            <>
              <button
                className={`tab-btn ${activeTab === "overview" ? "active" : ""}`}
                onClick={() => setActiveTab("overview")}
              >
                📊 Overview
              </button>
              <button
                className={`tab-btn ${activeTab === "properties" ? "active" : ""}`}
                onClick={() => setActiveTab("properties")}
              >
                🏠 My Properties
              </button>
              <button
                className={`tab-btn ${activeTab === "portfolio" ? "active" : ""}`}
                onClick={() => setActiveTab("portfolio")}
              >
                📊 My Portfolio
              </button>
              <button
                className={`tab-btn ${activeTab === "marketplace" ? "active" : ""}`}
                onClick={() => setActiveTab("marketplace")}
              >
                🛒 Marketplace
              </button>
              <button
                className={`tab-btn ${activeTab === "transactions" ? "active" : ""}`}
                onClick={() => setActiveTab("transactions")}
              >
                📜 Transactions
              </button>
              
               <button
                 className={`tab-btn ${activeTab === "rental-income" ? "active" : ""}`}
                  onClick={() => setActiveTab("rental-income")}
                      >
                      💰 Rental Income
              </button>
              <button
                className={`tab-btn ${activeTab === "settings" ? "active" : ""}`}
                onClick={() => setActiveTab("settings")}
              >
                ⚙️ Settings
              </button>
            </>
          )}
        </div>

        <div className="tab-content">
          {activeTab === "marketplace" && userData.role === "INVESTOR" && (
            <MyMarketplaceContent userId={userData.user_id} />
          )}

          {userData.role === "TENANT" && activeTab === "my-rental" && (
            <div className="tenant-rental-section">
              <h3 className="section-title">My Rental Information</h3>
              <TenantRentalDetails userId={userData.user_id} />
            </div>
          )}



{userData.role === "TENANT" && activeTab === "pay-rent" && (
  <TenantPayRent userId={userData.user_id} />
)}

          {userData.role === "OWNER" && activeTab === "tenants" && (
            <TenantManagement
              ownerId={userData.user_id}
              isKycApproved={kycStatus === "approved"}
            />
          )}

         {activeTab === "rental-income" && (
          <RentalIncomeTab userId={userData.user_id} userRole={userData.role} />
           )}
        

          {userData.role === "INVESTOR" && activeTab === "transactions" && (
            <RealTransactionsTab userId={userData.user_id} />
          )}

          {activeTab === "overview" && (
            <>
              <h3 className="section-title">Quick Actions</h3>
              <div className="quick-actions-grid">
                {userData.role !== "TENANT" && (
                  <div
                    className="action-card"
                    onClick={() =>
                      setActiveTab(
                        userData.role === "OWNER" ? "portfolio" : "marketplace"
                      )
                    }
                  >
                    <span className="action-icon">🔍</span>
                    <h4>Browse Properties</h4>
                    <p>Explore available investment opportunities</p>
                  </div>
                )}
                {userData.role !== "TENANT" && (
                  <>
                    <div
                      className="action-card"
                      onClick={() => setActiveTab("portfolio")}
                    >
                      <span className="action-icon">📊</span>
                      <h4>View Portfolio</h4>
                      <p>Check your token holdings</p>
                    </div>
                    <div
                      className="action-card"
                      onClick={() => setActiveTab("properties")}
                    >
                      <span className="action-icon">💰</span>
                      <h4>My Properties</h4>
                      <p>View or tokenize your property</p>
                    </div>
                    <div
                      className="action-card"
                      onClick={() => setActiveTab("portfolio")}
                    >
                      <span className="action-icon">💸</span>
                      <h4>My Sell Orders</h4>
                      <p>View or manage your active listings</p>
                    </div>
                  </>
                )}
                {userData.role === "TENANT" && (
                  <>
                    <div
                      className="action-card"
                      onClick={() => setActiveTab("my-rental")}
                    >
                      <span className="action-icon">🏠</span>
                      <h4>View My Rental</h4>
                      <p>Check your rental details</p>
                    </div>
                    <div
                      className="action-card"
                      onClick={() => setShowKycModal(true)}
                    >
                      <span className="action-icon">✅</span>
                      <h4>Complete KYC</h4>
                      <p>Verify your identity</p>
                    </div>
                  </>
                )}
              </div>

              <div className="recent-activity-card">
                <h3>Recent Activity</h3>
                <div className="activity-timeline">
                  {recentActivity.length === 0 ? (
                    <p className="no-activity-text">No recent activity yet.</p>
                  ) : (
                    recentActivity.slice(0, 5).map((activity, idx) => (
                      <div key={idx} className="timeline-item">
                        <div className="timeline-dot"></div>
                        <div className="timeline-content">
                          <p className="timeline-title">
                            {activity.tx_type === "SECONDARY"
                              ? `Bought ${activity.amount} token${
                                  activity.amount > 1 ? "s" : ""
                                } of `
                              : `Received ${activity.amount} token${
                                  activity.amount > 1 ? "s" : ""
                                } of `}
                            <strong>{activity.property_title}</strong>
                            {activity.from_name ? ` from ${activity.from_name}` : ""}
                          </p>
                          <p className="timeline-meta">
                            PKR{Number(activity.total_price).toLocaleString()} •{" "}
                            {new Date(activity.created_at).toLocaleDateString("en-PK")}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}

       {activeTab === "properties" && (
            <div className="properties-section">
              <PropertiesTab userId={userData.user_id} userRole={userData.role} />
            </div>
          )}

     {activeTab === "portfolio" && (
            <UnifiedPortfolioTab
              userId={userData.user_id} 
              userRole={userData.role}
            />
          )}

          {activeTab === "settings" && (
            <div className="settings-section">
              <h3 className="section-title">Account Settings</h3>
              <div className="settings-card">
                <h4>Reset Password</h4>
                <form className="password-reset-form" onSubmit={handlePasswordUpdate}>
                  <input
                    type="password"
                    placeholder="Current Password"
                    value={passwordData.currentPassword}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, currentPassword: e.target.value })
                    }
                  />
                  <input
                    type="password"
                    placeholder="New Password"
                    value={passwordData.newPassword}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, newPassword: e.target.value })
                    }
                  />
                  <input
                    type="password"
                    placeholder="Confirm New Password"
                    value={passwordData.confirmPassword}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                    }
                  />
                  {passwordError && <p className="password-error">{passwordError}</p>}
                  {passwordSuccess && (
                    <p className="password-success">{passwordSuccess}</p>
                  )}
                  {showForgotPassword && (
                    <a href="/forgot-password" className="forgot-password-link">
                      Reset Password
                    </a>
                  )}
                  <button
                    type="submit"
                    className="primary-btn update-password-btn"
                    disabled={updatingPassword}
                  >
                    {updatingPassword ? "Updating..." : "Update Password"}
                  </button>
                </form>
              </div>
              <div className="settings-card">
                <h4>KYC Verification</h4>
                <div className="kyc-status">
                  <span className={`kyc-badge ${kycStatus}`}>
                    {kycStatus === "pending" && "Not Submitted"}
                    {kycStatus === "submitted" && "Under Review"}
                    {kycStatus === "approved" && "Verified"}
                    {kycStatus === "rejected" && "Rejected"}
                  </span>
                  {kycStatus !== "approved" && (
                    <button
                      className="view-details-btn"
                      onClick={() => setShowKycModal(true)}
                    >
                      {kycStatus === "submitted"
                        ? "View Status"
                        : kycStatus === "rejected"
                        ? "Resubmit KYC"
                        : "Complete KYC"}
                    </button>
                  )}
                </div>
                {kycStatus === "submitted" && (
                  <p className="kyc-status-message">
                    Your KYC application is being reviewed.
                  </p>
                )}
                {kycStatus === "rejected" && (
                  <p className="kyc-status-message rejection-text">
                    Your KYC was rejected. Please resubmit.
                  </p>
                )}
                {kycStatus === "pending" && (
                  <p className="kyc-status-message">
                    Complete KYC to unlock all features.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Profile Modal ───────────────────────────────────────────────────── */}
      {showProfileModal && (
        <div
          className="modal-overlay"
          onClick={() => {
            setShowProfileModal(false);
            cancelEditingName();
            setSelectedFile(null);
          }}
        >
          <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
            <div className="profile-modal-header">
              <button
                className="modal-close profile-modal-close"
                onClick={() => {
                  setShowProfileModal(false);
                  cancelEditingName();
                  setSelectedFile(null);
                }}
              >
                ×
              </button>
              <h2>My Profile</h2>
              <p>Manage your personal information</p>
            </div>
            <div className="profile-avatar-container">
              {getProfileImageUrl() ? (
                <img
                  src={getProfileImageUrl()}
                  alt="Profile"
                  className="profile-avatar-large"
                />
              ) : (
                <div className="profile-avatar-initials">
                  {getInitials(userData.name)}
                </div>
              )}
              <div
                className="profile-avatar-edit"
                onClick={() =>
                  document.getElementById("profile-pic-input").click()
                }
              >
                📷
              </div>
            </div>
            <div className="profile-modal-body">
              <div className="profile-info-item">
                <span className="profile-info-label">Full Name</span>
                {editingName ? (
                  <input
                    type="text"
                    className="profile-edit-input"
                    value={tempName}
                    onChange={handleNameInputChange}
                    placeholder={userData.name}
                    autoFocus
                    onBlur={() => {
                      if (!hasNameChanged) cancelEditingName();
                    }}
                  />
                ) : (
                  <div className="profile-info-value">
                    {userData.name}
                    <button className="profile-edit-btn" onClick={startEditingName}>
                      ✎
                    </button>
                  </div>
                )}
              </div>
              <div className="profile-info-item">
                <span className="profile-info-label">Email</span>
                <span className="profile-info-value">{userData.email}</span>
              </div>
              <div className="profile-info-item">
                <span className="profile-info-label">Role</span>
                <span className="profile-info-value-role">
                  {userData.role || "Investor"}
                </span>
              </div>
              <div className="profile-picture-section">
                <label className="profile-picture-label">Profile Picture</label>
                <input
                  id="profile-pic-input"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setSelectedFile(e.target.files[0])}
                  className="profile-file-input"
                />
                <small className="profile-file-hint">Max 2MB • JPG, PNG</small>
              </div>
            </div>
            <div className="profile-modal-footer">
              <button
                className="profile-btn-close"
                onClick={() => {
                  setShowProfileModal(false);
                  cancelEditingName();
                  setSelectedFile(null);
                }}
              >
                Close
              </button>
              <button
                className="profile-btn-update"
                onClick={handleUpdateProfile}
                disabled={uploading}
              >
                {uploading ? "Updating..." : "Update Profile"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── KYC Modal ───────────────────────────────────────────────────────── */}
      {showKycModal && (
        <div className="modal-overlay" onClick={closeKycModal}>
          <div className="kyc-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeKycModal}>
              ×
            </button>
            {kycStatus === "submitted" ? (
              <>
                <h2>KYC Verification Status</h2>
                <div className="kyc-status-view">
                  <div className="status-icon">⏳</div>
                  <h3>Under Review</h3>
                  <p>
                    Your KYC documents are currently being verified by our team.
                  </p>
                  <div className="status-timeline">
                    <div className="timeline-step completed">
                      <span className="step-number">1</span>
                      <div className="step-content">
                        <h4>Documents Submitted</h4>
                        <p>{new Date().toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="timeline-step active">
                      <span className="step-number">2</span>
                      <div className="step-content">
                        <h4>Under Review</h4>
                        <p>Estimated time: 1-2 business days</p>
                      </div>
                    </div>
                    <div className="timeline-step">
                      <span className="step-number">3</span>
                      <div className="step-content">
                        <h4>Verification Complete</h4>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <h2>KYC Verification</h2>
                <p className="kyc-subtitle">
                  Please provide the following documents and information for
                  verification
                </p>
                {kycStatus === "rejected" && (
                  <div className="rejection-message">
                    <strong>Previous submission was rejected.</strong>
                    <p>
                      Please ensure all documents are clear and information matches
                      your ID proof.
                    </p>
                  </div>
                )}
                <form onSubmit={handleKYCSubmit} className="kyc-form">
                  <p className="kyc-subtitle">
                    Please complete your identity verification to unlock all features.
                  </p>
                  <div className="form-section">
                    <h3>Personal Information</h3>
                    <div className="form-group">
                      <label>
                        Full Name <span className="required">*</span>
                      </label>
                      <input name="fullName" placeholder="As per CNIC" required />
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>
                          CNIC Number <span className="required">*</span>
                        </label>
                        <input
                          name="cnic"
                          placeholder="12345-1234567-1"
                          onChange={handleCnicChange}
                          required
                        />
                        <span className="field-hint">Format: XXXXX-XXXXXXX-X</span>
                        {formErrors.cnic && (
                          <span className="error">{formErrors.cnic}</span>
                        )}
                      </div>
                      <div className="form-group">
                        <label>
                          Date of Birth <span className="required">*</span>
                        </label>
                        <input
                          type="date"
                          name="dob"
                          onChange={handleDobChange}
                          required
                        />
                      </div>
                    </div>
                  </div>
                  <div className="form-section">
                    <h3>Address Information</h3>
                    <div className="form-group">
                      <label>
                        Street Address <span className="required">*</span>
                      </label>
                      <input
                        name="permanentAddress"
                        placeholder="Enter your address"
                        required
                      />
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>
                          City <span className="required">*</span>
                        </label>
                        <input name="city" required />
                      </div>
                      <div className="form-group">
                        <label>
                          Province <span className="required">*</span>
                        </label>
                        <select name="province" required>
                          <option value="">Select Province</option>
                          {provinces.map((p) => (
                            <option key={p}>{p}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>
                          Postal Code <span className="required">*</span>
                        </label>
                        <input name="postalCode" required />
                      </div>
                      <div className="form-group">
                        <label>Current Address (Optional)</label>
                        <input name="currentAddress" />
                      </div>
                    </div>
                  </div>
                  <div className="form-section">
                    <h3>Contact Information</h3>
                    <div className="form-row">
                      <div className="form-group">
                        <label>
                          Mobile Number <span className="required">*</span>
                        </label>
                        <input
                          name="mobileNumber"
                          defaultValue="+92"
                          onChange={handleMobileChange}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>
                          Email <span className="required">*</span>
                        </label>
                        <input type="email" name="email" required />
                      </div>
                    </div>
                  </div>
                  <div className="form-section">
                    <h3>Occupation & Income</h3>
                    <div className="form-group">
                      <label>
                        Occupation <span className="required">*</span>
                      </label>
                      <select name="occupation" required>
                        <option value="">Select occupation</option>
                        <option>Student</option>
                        <option>Employed</option>
                        <option>Business</option>
                        <option>Freelancer</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-section">
                    <h3>Document Uploads</h3>
                    <div className="form-group">
                      <label>
                        CNIC Front <span className="required">*</span>
                      </label>
                      <input type="file" name="cnicFront" accept="image/*" required />
                      {formErrors.cnicFront && (
                        <span className="error">{formErrors.cnicFront}</span>
                      )}
                    </div>
                    <div className="form-group">
                      <label>
                        CNIC Back <span className="required">*</span>
                      </label>
                      <input type="file" name="cnicBack" accept="image/*" required />
                      {formErrors.cnicBack && (
                        <span className="error">{formErrors.cnicBack}</span>
                      )}
                    </div>
                    <div className="form-group">
                      <label>
                        Selfie with CNIC <span className="required">*</span>
                      </label>
                      <input type="file" name="selfie" accept="image/*" required />
                      {formErrors.selfie && (
                        <span className="error">{formErrors.selfie}</span>
                      )}
                    </div>
                    <div className="form-group">
                      <label>
                        Address Proof <span className="required">*</span>
                      </label>
                      <input
                        type="file"
                        name="addressProof"
                        accept="image/*"
                        required
                      />
                      {formErrors.addressProof && (
                        <span className="error">{formErrors.addressProof}</span>
                      )}
                    </div>
                  </div>
                  {walletError && (
                    <div className="wallet-error">
                      <span className="wallet-error-icon">⚠️</span>
                      <div>
                        <strong>Wallet not connected</strong>
                        <p>{walletError}</p>
                      </div>
                    </div>
                  )}
                  {kycSubmitError && (
                    <div className="kyc-submit-error">
                      <span className="kyc-submit-error-icon">🚫</span>
                      <div>
                        <strong>KYC Submission Failed</strong>
                        <p>{kycSubmitError}</p>
                      </div>
                    </div>
                  )}
                  <div className="form-checkbox">
                    <input type="checkbox" required />
                    <label>
                      I confirm that all the information provided is accurate and
                      belongs to me.
                    </label>
                  </div>
                  <div className="modal-actions">
                    <button
                      type="button"
                      className="cancel-btn"
                      onClick={closeKycModal}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="submit-kyc-btn"
                      disabled={loading}
                    >
                      {loading ? "Submitting..." : "Submit KYC"}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// UnifiedPortfolioTab
// ─────────────────────────────────────────────────────────────────────────────
const UnifiedPortfolioTab = ({ userId, userRole }) => {
  const [holdings, setHoldings] = useState([]);
  const [listings, setListings] = useState([]);
  const [soldActivity, setSoldActivity] = useState([]);
  const [totalTokens, setTotalTokens] = useState(0);
  const [totalValue, setTotalValue] = useState(0);
  const [totalProfit, setTotalProfit] = useState(0);
  const [loadingHoldings, setLoadingHoldings] = useState(true);
  const [loadingListings, setLoadingListings] = useState(true);
  const [selectedListing, setSelectedListing] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    fetchAll();
    const timer = setInterval(fetchAll, 30000);
    return () => clearInterval(timer);
  }, [userId]);

  const fetchAll = () => {
    fetchHoldings();
    fetchListings();
    fetchSoldActivity();
  };

  const fetchHoldings = async () => {
    setLoadingHoldings(true);
    try {
      const res = await fetch(
        `http://localhost:5000/api/properties/my-holdings/${userId}`
      );
      const result = await res.json();
      if (result.success) {
        setHoldings(result.holdings);
        setTotalTokens(result.totalTokens);
        setTotalValue(result.totalValue);
      }
      const profitRes = await fetch(
        `http://localhost:5000/api/properties/profit-summary/${userId}`
      );
      const profitData = await profitRes.json();
      if (profitData.success) setTotalProfit(Number(profitData.totalProfit) || 0);
    } catch (err) {
      console.error("Error fetching holdings:", err);
    } finally {
      setLoadingHoldings(false);
    }
  };

  const fetchListings = async () => {
    setLoadingListings(true);
    try {
      const response = await fetch(
        `http://localhost:5000/api/properties/my-listings?user_id=${userId}`
      );
      const result = await response.json();
      if (result.success) setListings(result.listings);
    } catch (err) {
      console.error("Error fetching listings:", err);
    } finally {
      setLoadingListings(false);
    }
  };

  const fetchSoldActivity = async () => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/properties/sold-activity/${userId}`
      );
      const result = await response.json();
      if (result.success) setSoldActivity(result.activity);
    } catch (err) {
      console.error("Error fetching sold activity:", err);
    }
  };

  const handleCancelListing = async (listingId) => {
    const listing = listings.find(
      (l) => (l.listing_id || l.order_id) === listingId
    );
    if (listing) {
      const originalTokens = Number(
        listing.original_tokens ||
          listing.initial_tokens ||
          listing.tokens_for_sale
      );
      const remaining = Number(listing.tokens_for_sale);
      const tokensSold = originalTokens - remaining;
      if (tokensSold > 0) {
        alert(
          `Cannot cancel this listing because ${tokensSold} token(s) have already been sold.`
        );
        return;
      }
    }
    if (!window.confirm("Cancel this listing? This action cannot be undone."))
      return;
    try {
      const res = await fetch(
        `http://localhost:5000/api/properties/cancel-listing/${listingId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: userId }),
        }
      );
      const result = await res.json();
      if (result.success) {
        alert("Listing cancelled successfully");
        fetchListings();
        fetchHoldings();
      } else {
        alert(result.message);
      }
    } catch {
      alert("Error cancelling listing");
    }
  };

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return "PKR 0";
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-PK", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "status-active";
      case "sold":
        return "status-sold";
      default:
        return "status-pending";
    }
  };

  return (
    <div className="portfolio-section">
      <style>{`
        .unified-table thead tr,
        .unified-table thead tr:hover { background: #0A2FFF !important; color: #fff !important; }
        .unified-table thead th { background: #0A2FFF !important; color: #fff !important; position: sticky; top: 0; z-index: 10; }
      `}</style>

      <div className="stats-grid portfolio-stats-grid">
        <div className="stat-card primary">
          <div className="stat-icon">🪙</div>
          <div className="stat-details">
            <h3>{Number(totalTokens).toLocaleString()}</h3>
            <p>Bought Tokens</p>
          </div>
        </div>
        <div className="stat-card success">
          <div className="stat-icon">💹</div>
          <div className="stat-details">
            <h3
              className={
                totalProfit > 0
                  ? "profit-positive"
                  : totalProfit < 0
                  ? "profit-negative"
                  : ""
              }
            >
              {totalProfit >= 0 ? "+" : ""}
              {formatCurrency(totalProfit)}
            </h3>
            <p>Total Profit Earned</p>
          </div>
        </div>
        <div className="stat-card warning">
          <div className="stat-icon">📈</div>
          <div className="stat-details">
            <h3>{formatCurrency(totalValue)}</h3>
            <p>Current Portfolio Value</p>
          </div>
        </div>
        <div className="stat-card info">
          <div className="stat-icon">🏠</div>
          <div className="stat-details">
            <h3>{holdings.length}</h3>
            <p>Properties Invested In</p>
          </div>
        </div>
      </div>

      {soldActivity.length > 0 && (
        <div className="recent-sales-activity">
          <h4 className="recent-sales-title">🔔 Recent Sales Activity</h4>
          {soldActivity.slice(0, 5).map((activity, i) => (
            <div key={i} className="sales-activity-item">
              <span className="sales-activity-icon">💰</span>
              <div>
                <p className="sales-activity-text">
                  <strong>{activity.amount}</strong> token
                  {Number(activity.amount) > 1 ? "s" : ""} of{" "}
                  <strong>{activity.property_title}</strong> sold to{" "}
                  <strong>{activity.buyer_name}</strong>
                </p>
                <p className="sales-activity-meta">
                  {formatCurrency(activity.total_price)} •{" "}
                  {formatDate(activity.created_at)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="sell-orders-header">
        <h3 className="section-title">🏪 My Sell Orders ({listings.length})</h3>
        <button className="refresh-btn" onClick={fetchAll}>
          🔄 Refresh
        </button>
      </div>

      {loadingListings ? (
        <p className="loading-text">Loading sell orders...</p>
      ) : listings.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🏪</div>
          <h3>No Active Sell Orders</h3>
          <p>
            Go to <strong>My Properties</strong> tab and click "List for Sale" to
            create a sell order.
          </p>
        </div>
      ) : (
        <div className="listings-table-container">
          <table className="listings-table unified-table">
            <thead>
              <tr>
                <th>Property</th>
                <th>Price/Token</th>
                <th>Tokens Listed</th>
                <th>Tokens Remaining</th>
                <th>Tokens Sold</th>
                <th>Total Value</th>
                <th>Listed On</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {listings.map((listing) => {
                const originalTokens = Number(
                  listing.original_tokens ||
                    listing.initial_tokens ||
                    listing.tokens_for_sale
                );
                const remaining = Number(listing.tokens_for_sale);
                const tokensSold = originalTokens - remaining;
                const pctSold =
                  originalTokens > 0
                    ? Math.round((tokensSold / originalTokens) * 100)
                    : 0;

                return (
                  <tr key={listing.listing_id || listing.order_id}>
                    <td className="property-name-cell">
                      <span className="property-icon">🏠</span>
                      <span className="property-name">{listing.title}</span>
                    </td>
                    <td>{formatCurrency(listing.price_per_token)}</td>
                    <td className="property-name">{originalTokens}</td>
                    <td>
                      <span
                        className={`tokens-remaining-badge ${
                          remaining === 0 ? "sold-out" : ""
                        }`}
                      >
                        {remaining}
                      </span>
                    </td>
                    <td>
                      <div className="tokens-sold-container">
                        <span
                          className={`tokens-sold-count ${
                            tokensSold > 0 ? "" : "zero"
                          }`}
                        >
                          {tokensSold}
                        </span>
                        {tokensSold > 0 && (
                          <>
                            <div className="progress-bar-container">
                              <div
                                className="progress-bar-fill"
                                style={{ width: `${pctSold}%` }}
                              />
                            </div>
                            <span className="progress-percent">{pctSold}%</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td>{formatCurrency(listing.total_value)}</td>
                    <td>{formatDate(listing.created_at)}</td>
                    <td>
                      <span
                        className={`status-badge ${getStatusBadgeClass(
                          listing.status
                        )}`}
                      >
                        {listing.status}
                      </span>
                    </td>
                    <td>
                      <div className="listing-action-buttons">
                        <button
                          className="action-btn view-btn"
                          onClick={() => {
                            setSelectedListing(listing);
                            setShowDetailsModal(true);
                          }}
                        >
                          👁️ View
                        </button>
                        {listing.status === "Active" && (
                          <button
                            className="cancel-listing-btn"
                            onClick={() =>
                              handleCancelListing(
                                listing.listing_id || listing.order_id
                              )
                            }
                          >
                            ✕ Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <h3 className="section-title">🪙 My Token Holdings by Property</h3>

      {loadingHoldings ? (
        <p className="loading-text">Loading token holdings...</p>
      ) : holdings.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <h3>No Token Holdings Yet</h3>
          <p>
            {userRole === "OWNER"
              ? "Once your property is tokenized, your tokens will appear here."
              : "Buy tokens from the marketplace to see your portfolio here."}
          </p>
        </div>
      ) : (
        <div className="listings-table-container">
          <table className="listings-table unified-table">
            <thead>
              <tr>
                <th>Property</th>
                <th>Type</th>
                <th>Location</th>
                <th>Tokens Owned</th>
                <th>Price/Token</th>
                <th>Amount Paid</th>
                <th>Current Value</th>
                <th>Status</th>
                <th>Available to Sell</th>
              </tr>
            </thead>
            <tbody>
              {holdings.map((h) => (
                <HoldingsRow
                  key={h.property_id}
                  holding={h}
                  userId={userId}
                  formatCurrency={formatCurrency}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showDetailsModal && selectedListing && (
        <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div
            className="listing-details-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>{selectedListing.title}</h2>
              <button
                className="modal-close-btn"
                onClick={() => setShowDetailsModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="details-grid">
                {[
                  [
                    "Location",
                    `${selectedListing.city}, ${selectedListing.province}`,
                  ],
                  ["Price/Token", formatCurrency(selectedListing.price_per_token)],
                  [
                    "Original Tokens Listed",
                    Number(
                      selectedListing.original_tokens ||
                        selectedListing.initial_tokens ||
                        selectedListing.tokens_for_sale
                    ),
                  ],
                  ["Tokens Remaining", selectedListing.tokens_for_sale],
                  [
                    "Tokens Sold",
                    Number(
                      selectedListing.original_tokens ||
                        selectedListing.initial_tokens ||
                        selectedListing.tokens_for_sale
                    ) - Number(selectedListing.tokens_for_sale),
                  ],
                  ["Status", selectedListing.status],
                  ["Listed On", formatDate(selectedListing.created_at)],
                ].map(([label, value]) => (
                  <div key={label} className="detail-item">
                    <label>{label}:</label>
                    <span>{value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-close"
                onClick={() => setShowDetailsModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MyMarketplaceContent
// ─────────────────────────────────────────────────────────────────────────────
const MyMarketplaceContent = ({ userId }) => {
  const [listings, setListings] = useState([]);
  const [soldActivity, setSoldActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedListing, setSelectedListing] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    fetchMyListings();
    fetchSoldActivity();
    const timer = setInterval(() => {
      fetchMyListings();
      fetchSoldActivity();
    }, 30000);
    return () => clearInterval(timer);
  }, [userId]);

  const fetchMyListings = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `http://localhost:5000/api/properties/my-listings?user_id=${userId}`
      );
      const result = await response.json();
      if (result.success) setListings(result.listings);
      else setError(result.message);
    } catch {
      setError("Failed to fetch your listings");
    } finally {
      setLoading(false);
    }
  };

  const fetchSoldActivity = async () => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/properties/sold-activity/${userId}`
      );
      const result = await response.json();
      if (result.success) setSoldActivity(result.activity);
    } catch (err) {
      console.error("Error fetching sold activity:", err);
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return "PKR 0";
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-PK", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "status-active";
      case "sold":
        return "status-sold";
      default:
        return "status-pending";
    }
  };

  const handleCancelListing = async (listingId) => {
    const listing = listings.find(
      (l) => (l.listing_id || l.order_id) === listingId
    );
    if (listing) {
      const originalTokens = Number(
        listing.original_tokens ||
          listing.initial_tokens ||
          listing.tokens_for_sale
      );
      const remaining = Number(listing.tokens_for_sale);
      const tokensSold = originalTokens - remaining;
      if (tokensSold > 0) {
        alert(
          `Cannot cancel this listing because ${tokensSold} token(s) have already been sold.`
        );
        return;
      }
    }
    if (!window.confirm("Cancel this listing?")) return;
    try {
      const res = await fetch(
        `http://localhost:5000/api/properties/cancel-listing/${listingId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: userId }),
        }
      );
      const result = await res.json();
      if (result.success) {
        alert("Listing cancelled");
        fetchMyListings();
      } else alert(result.message);
    } catch {
      alert("Error cancelling listing");
    }
  };

  if (loading)
    return (
      <div className="my-marketplace-section">
        <p>Loading...</p>
      </div>
    );
  if (error)
    return (
      <div className="my-marketplace-section">
        <p className="error-text">Error: {error}</p>
      </div>
    );

  return (
    <div className="my-marketplace-section">
      <div className="marketplace-header">
        <h3 className="section-title">
          My Marketplace Listings ({listings.length})
        </h3>
        <button
          className="refresh-btn"
          onClick={() => {
            fetchMyListings();
            fetchSoldActivity();
          }}
        >
          🔄 Refresh
        </button>
      </div>

      {soldActivity.length > 0 && (
        <div className="recent-sales-activity">
          <h4 className="recent-sales-title">🔔 Recent Sales Activity</h4>
          {soldActivity.map((activity, i) => (
            <div key={i} className="sales-activity-item">
              <span className="sales-activity-icon">💰</span>
              <div>
                <p className="sales-activity-text">
                  <strong>{activity.amount}</strong> token
                  {Number(activity.amount) > 1 ? "s" : ""} of{" "}
                  <strong>{activity.property_title}</strong> sold to{" "}
                  <strong>{activity.buyer_name}</strong>
                </p>
                <p className="sales-activity-meta">
                  {formatCurrency(activity.total_price)} •{" "}
                  {formatDate(activity.created_at)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {listings.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🏪</div>
          <h3>No Listings Found</h3>
          <p>
            Go to <strong>My Properties</strong> tab and click "List for Sale".
          </p>
        </div>
      ) : (
        <div className="listings-table-container">
          <style>{`.listings-table thead tr, .listings-table thead tr:hover { background: #0A2FFF !important; color: #fff !important; } .listings-table thead th { background: #0A2FFF !important; color: #fff !important; position: sticky; top: 0; z-index: 10; }`}</style>
          <table className="listings-table">
            <thead>
              <tr>
                <th>Property</th>
                <th>Price/Token</th>
                <th>Tokens Listed</th>
                <th>Tokens Remaining</th>
                <th>Tokens Sold</th>
                <th>Total Value</th>
                <th>Listed On</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {listings.map((listing) => {
                const originalTokens = Number(
                  listing.original_tokens ||
                    listing.initial_tokens ||
                    listing.tokens_for_sale
                );
                const remaining = Number(listing.tokens_for_sale);
                const tokensSold = originalTokens - remaining;
                const pctSold =
                  originalTokens > 0
                    ? Math.round((tokensSold / originalTokens) * 100)
                    : 0;

                return (
                  <tr key={listing.listing_id || listing.order_id}>
                    <td className="property-name-cell">
                      <span className="property-icon">🏠</span>
                      <span className="property-name">{listing.title}</span>
                    </td>
                    <td>{formatCurrency(listing.price_per_token)}</td>
                    <td className="property-name">{originalTokens}</td>
                    <td>
                      <span
                        className={`tokens-remaining-badge ${
                          remaining === 0 ? "sold-out" : ""
                        }`}
                      >
                        {remaining}
                      </span>
                    </td>
                    <td>
                      <div className="tokens-sold-container">
                        <span
                          className={`tokens-sold-count ${
                            tokensSold > 0 ? "" : "zero"
                          }`}
                        >
                          {tokensSold}
                        </span>
                        {tokensSold > 0 && (
                          <>
                            <div className="progress-bar-container">
                              <div
                                className="progress-bar-fill"
                                style={{ width: `${pctSold}%` }}
                              />
                            </div>
                            <span className="progress-percent">{pctSold}%</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td>{formatCurrency(listing.total_value)}</td>
                    <td>{formatDate(listing.created_at)}</td>
                    <td>
                      <span
                        className={`status-badge ${getStatusBadgeClass(
                          listing.status
                        )}`}
                      >
                        {listing.status}
                      </span>
                    </td>
                    <td>
                      <div className="listing-action-buttons">
                        <button
                          className="action-btn view-btn"
                          onClick={() => {
                            setSelectedListing(listing);
                            setShowDetailsModal(true);
                          }}
                        >
                          👁️ View
                        </button>
                        {listing.status === "Active" && (
                          <button
                            className="cancel-listing-btn"
                            onClick={() =>
                              handleCancelListing(
                                listing.listing_id || listing.order_id
                              )
                            }
                          >
                            ✕ Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showDetailsModal && selectedListing && (
        <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div
            className="listing-details-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>{selectedListing.title}</h2>
              <button
                className="modal-close-btn"
                onClick={() => setShowDetailsModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="details-grid">
                {[
                  [
                    "Location",
                    `${selectedListing.city}, ${selectedListing.province}`,
                  ],
                  ["Price/Token", formatCurrency(selectedListing.price_per_token)],
                  [
                    "Original Tokens Listed",
                    Number(
                      selectedListing.original_tokens ||
                        selectedListing.initial_tokens ||
                        selectedListing.tokens_for_sale
                    ),
                  ],
                  ["Tokens Remaining", selectedListing.tokens_for_sale],
                  [
                    "Tokens Sold",
                    Number(
                      selectedListing.original_tokens ||
                        selectedListing.initial_tokens ||
                        selectedListing.tokens_for_sale
                    ) - Number(selectedListing.tokens_for_sale),
                  ],
                  ["Status", selectedListing.status],
                  ["Listed On", formatDate(selectedListing.created_at)],
                ].map(([label, value]) => (
                  <div key={label} className="detail-item">
                    <label>{label}:</label>
                    <span>{value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-close"
                onClick={() => setShowDetailsModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// RealTransactionsTab
// ─────────────────────────────────────────────────────────────────────────────
const RealTransactionsTab = ({ userId }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTx = async () => {
      try {
        const res = await fetch(
          `http://localhost:5000/api/properties/recent-activity/${userId}`
        );
        const result = await res.json();
        if (result.success) setTransactions(result.activity || []);
      } catch (err) {
        console.error("Error fetching transactions:", err);
      } finally {
        setLoading(false);
      }
    };
    if (userId) fetchTx();
  }, [userId]);

  const formatCurrency = (amount) => {
    if (!amount) return "PKR 0";
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) return <p className="loading-transactions">Loading transactions...</p>;

  return (
    <div className="transactions-section">
      <h3 className="section-title">Transaction History</h3>
      {transactions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📜</div>
          <h3>No Transactions Yet</h3>
          <p>Your token purchases will appear here.</p>
        </div>
      ) : (
        <table className="transactions-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Property</th>
              <th>Tokens</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx, i) => (
              <tr key={i}>
                <td>{new Date(tx.created_at).toLocaleDateString("en-PK")}</td>
                <td>
                  <span className="tx-type buy">
                    {tx.tx_type === "SECONDARY" ? "BUY" : "MINT"}
                  </span>
                </td>
                <td>{tx.property_title}</td>
                <td>{tx.amount}</td>
                <td>{formatCurrency(tx.total_price)}</td>
                <td>
                  <span className="status-badge completed">Completed</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// PropertiesTab
// ─────────────────────────────────────────────────────────────────────────────
const PropertiesTab = ({ userId, userRole }) => {
  const [properties, setProperties] = useState([]);
  const [holdings, setHoldings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const res = await fetch(
          `http://localhost:5000/api/properties/my-properties?user_id=${userId}&role=${userRole}`
        );
        const result = await res.json();
        if (result.success) {
          setProperties(
            result.properties.map((p) => ({
              ...p,
              yield: p.rentalYield || p.yield || 0,
            }))
          );
        }

        const holdRes = await fetch(
          `http://localhost:5000/api/properties/my-holdings/${userId}`
        );
        const holdData = await holdRes.json();
        if (holdData.success) {
          setHoldings(holdData.holdings);
        }
      } catch (err) {
        console.error("Error fetching properties/holdings:", err);
      } finally {
        setLoading(false);
      }
    };
    if (userId) fetchAll();
  }, [userId, userRole]);

  if (loading)
    return <p className="loading-transactions">Loading properties...</p>;

  return (
    <PropertyTable
      properties={properties}
      holdings={holdings}
      userId={userId}
      userRole={userRole}
    />
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// TenantRentalDetails
// ─────────────────────────────────────────────────────────────────────────────
const TenantRentalDetails = ({ userId }) => {
  const [tenantData, setTenantData] = useState(null);
  const [kycRequestStatus, setKycRequestStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    fetchTenantDetails();
    fetchKycStatus();
  }, [userId]);

  const fetchTenantDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `http://localhost:5000/api/tenants/tenant/${userId}`
      );
      const data = await response.json();
      if (data.success) setTenantData(data.tenant);
      else setError(data.error || "Failed to fetch tenant details");
    } catch {
      setError("Server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchKycStatus = async () => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/kyc/status/${userId}`
      );
      const data = await response.json();
      setKycRequestStatus(data.status);
    } catch {}
  };

  const getKycStatusBadge = () => {
    if (kycRequestStatus === "Approved")
      return <span className="status-badge approved">Verified ✓</span>;
    if (kycRequestStatus === "Pending")
      return <span className="status-badge submitted">Under Review</span>;
    if (kycRequestStatus === "Rejected")
      return <span className="status-badge rejected">Rejected</span>;
    return <span className="status-badge not-submitted">Not Submitted</span>;
  };

  const formatDate = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-PK", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "N/A";
  const formatCurrency = (a) =>
    a
      ? new Intl.NumberFormat("en-PK", {
          style: "currency",
          currency: "PKR",
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(a)
      : "PKR 0";

  if (loading)
    return (
      <div className="rental-info-card">
        <div className="loading-spinner">Loading your rental details...</div>
      </div>
    );
  if (error)
    return (
      <div className="rental-info-card">
        <div className="error-message">{error}</div>
        <button
          className="retry-btn"
          onClick={() => {
            fetchTenantDetails();
            fetchKycStatus();
          }}
        >
          Retry
        </button>
      </div>
    );
 if (!tenantData)
    return (
      <div className="rental-info-card">
        <div className="empty-state">
          <div className="empty-icon">🏠</div>
          <h3>No Rental Information Found</h3>
          <p>You haven't been assigned to any property yet.</p>
        </div>
      </div>
    );

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const leaseEnded = tenantData.lease_end && new Date(tenantData.lease_end) < today;

 return (
    <>
      {leaseEnded && (
        <div className="lease-ended-banner">
          <span className="lease-ended-icon">🚪</span>
          <div className="lease-ended-text">
            <strong>Lease Ended</strong>
            <p>
              Your lease at <strong>{tenantData.property_title}</strong> ended on{" "}
              <strong>{formatDate(tenantData.lease_end)}</strong>. You are no longer an
              active tenant of this property. If you're renting again, the owner will need
              to add you as a tenant for the new lease.
            </p>
          </div>
        </div>
      )}

      <div className="rental-info-card">
        <div className="rental-details">
          {[
            ["Property", tenantData.property_title],
            ["Property Address", tenantData.property_address],
            ["Monthly Rent", formatCurrency(tenantData.monthly_rent)],
            [
              "Lease Period",
              `${formatDate(tenantData.lease_start)} - ${formatDate(
                tenantData.lease_end
              )}`,
            ],
            ["Owner Name", tenantData.owner_name],
            ["Owner Email", tenantData.owner_email],
          ].map(([label, value]) => (
            <div key={label} className="detail-row">
              <span className="detail-label">{label}:</span>
              <span className="detail-value">{value || "N/A"}</span>
            </div>
          ))}
          <div className="detail-row">
            <span className="detail-label">KYC Status:</span>
            <span className="detail-value">{getKycStatusBadge()}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Lease Status:</span>
            <span className="detail-value">
              {leaseEnded ? (
                <span className="status-badge expired">Expired</span>
              ) : (
                <span className="status-badge active">Active</span>
              )}
            </span>
          </div>
        </div>
        <button
          className="view-details-btn full-width"
          onClick={() => setShowDetailsModal(true)}
        >
          📋 View Full Details
        </button>
      </div>
      {showDetailsModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowDetailsModal(false)}
        >
          <div
            className="tenant-rental-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => setShowDetailsModal(false)}
            >
              ×
            </button>
           <h2>Rental Agreement Details</h2>
            <div className="details-container">
              <div className="details-section">
                <h3>Property Information</h3>
                <div className="details-grid">
                  <div className="detail-item">
                    <label>Property:</label>
                    <span>{tenantData.property_title || "N/A"}</span>
                  </div>
                  <div className="detail-item">
                    <label>Address:</label>
                    <span>{tenantData.property_address || "N/A"}</span>
                  </div>
                  <div className="detail-item">
                    <label>Monthly Rent:</label>
                    <span>{formatCurrency(tenantData.monthly_rent)}</span>
                  </div>
                </div>
              </div>

              <div className="details-section">
                <h3>Lease Information</h3>
                <div className="details-grid">
                  <div className="detail-item">
                    <label>Lease Start:</label>
                    <span>{formatDate(tenantData.lease_start)}</span>
                  </div>
                  <div className="detail-item">
                    <label>Lease End:</label>
                    <span>{formatDate(tenantData.lease_end)}</span>
                  </div>
                  <div className="detail-item">
                    <label>Lease Status:</label>
                    <span>
                      {leaseEnded ? (
                        <span className="status-badge expired">Expired</span>
                      ) : (
                        <span className="status-badge active">Active</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <div className="details-section">
                <h3>Owner Information</h3>
                <div className="details-grid">
                  <div className="detail-item">
                    <label>Owner Name:</label>
                    <span>{tenantData.owner_name || "N/A"}</span>
                  </div>
                  <div className="detail-item">
                    <label>Owner Email:</label>
                    <span>{tenantData.owner_email || "N/A"}</span>
                  </div>
                  <div className="detail-item">
                    <label>KYC Status:</label>
                    <span>{getKycStatusBadge()}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button
                className="cancel-btn"
                onClick={() => setShowDetailsModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const TenantTokenHoldings = ({ userId }) => {
  const [holdings, setHoldings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalTokens, setTotalTokens] = useState(0);
  const [totalValue, setTotalValue] = useState(0);
  const [totalPaid, setTotalPaid] = useState(0);

  useEffect(() => {
    if (userId) fetchHoldings();
  }, [userId]);

  const fetchHoldings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/properties/my-holdings/${userId}`);
      const result = await res.json();
      if (result.success) {
        setHoldings(result.holdings);
        setTotalTokens(result.totalTokens);
        setTotalValue(result.totalValue);
        const paid = result.holdings.reduce((sum, h) => sum + Number(h.amount_paid || 0), 0);
        setTotalPaid(paid);
      }
    } catch (err) {
      console.error("Error fetching tenant token holdings:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return "PKR 0";
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) return <p className="loading-text">Loading token holdings...</p>;

  return (
    <div className="token-holdings-section">
      <div className="stats-grid portfolio-stats-grid">
        <div className="stat-card primary">
          <div className="stat-icon">🪙</div>
          <div className="stat-details">
            <h3>{Number(totalTokens).toLocaleString()}</h3>
            <p>Tokens Purchased</p>
          </div>
        </div>
        <div className="stat-card warning">
          <div className="stat-icon">💸</div>
          <div className="stat-details">
            <h3>{formatCurrency(totalPaid)}</h3>
            <p>Total Amount Paid</p>
          </div>
        </div>
        <div className="stat-card success">
          <div className="stat-icon">📈</div>
          <div className="stat-details">
            <h3>{formatCurrency(totalValue)}</h3>
            <p>Current Portfolio Value</p>
          </div>
        </div>
        <div className="stat-card info">
          <div className="stat-icon">🏠</div>
          <div className="stat-details">
            <h3>{holdings.length}</h3>
            <p>Properties Invested In</p>
          </div>
        </div>
      </div>

      <h3 className="section-title">🪙 Tokens Purchased from Marketplace</h3>

      {holdings.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🪙</div>
          <h3>No Token Holdings Yet</h3>
          <p>Tokens you purchase from the marketplace will appear here.</p>
        </div>
      ) : (
        <div className="listings-table-container">
          <table className="listings-table tenant-holdings-table">
            <thead>
              <tr>
                <th>Property</th>
                <th>Type</th>
                <th>Location</th>
                <th>Tokens Owned</th>
                <th>Price / Token</th>
                <th>Amount Paid</th>
                <th>Current Value</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {holdings.map((h) => {
                const tokensOwned = Number(h.tokens_owned || 0);
                const tokenPrice = Number(h.token_price || 0);
                const amountPaid = Number(h.amount_paid || tokensOwned * tokenPrice);
                const currentValue = Number(h.current_value || 0);
                return (
                  <tr key={h.property_id}>
                    <td className="property-name-cell">
                      <span className="property-icon">🏠</span>
                      <span className="property-name">{h.title}</span>
                    </td>
                    <td>{h.type || "N/A"}</td>
                    <td>{h.city}, {h.province}</td>
                    <td>
                      <span className="token-holdings-badge">{tokensOwned.toLocaleString()}</span>
                    </td>
                    <td>{formatCurrency(tokenPrice)}</td>
                    <td className="amount-paid-value">{formatCurrency(amountPaid)}</td>
                    <td className="current-value">{formatCurrency(currentValue)}</td>
                    <td>
                      <span className={`status-badge ${h.property_status === "Tokenized" ? "status-active" : "status-pending"}`}>
                        {h.property_status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const TenantPayRent = ({ userId }) => {
  const [tenantData, setTenantData]     = useState(null);
  const [loading, setLoading]           = useState(true);
  const [paying, setPaying]             = useState(false);
  const [payError, setPayError]         = useState("");
  const [paySuccess, setPaySuccess]     = useState("");
  const [ethRate, setEthRate]           = useState(null);
  const [currentMonthPaid, setCurrentMonthPaid] = useState(false);
  const [currentMonthPayment, setCurrentMonthPayment] = useState(null);
  const [paymentHistory, setPaymentHistory]     = useState([]);
  const [showSlip, setShowSlip]         = useState(null); // payment object for slip

  const monthYear = new Date().toISOString().slice(0, 7);
  const monthLabel = new Date().toLocaleString("en-PK", { month: "long", year: "numeric" });
  const dueDay     = 10;
  const today      = new Date().getDate();
  const isOverdue  = today > dueDay && !currentMonthPaid;

  useEffect(() => {
    if (userId) {
      fetchTenantDetails();
      fetchRentStatus();
      fetchPaymentHistory();
      loadEthRate();
    }
  }, [userId]);

  const fetchTenantDetails = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`http://localhost:5000/api/tenants/tenant/${userId}`);
      const data = await res.json();
      if (data.success) setTenantData(data.tenant);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchRentStatus = async () => {
    try {
      const res  = await fetch(`http://localhost:5000/api/properties/rent-status/${userId}`);
      const data = await res.json();
      if (data.success) {
        setCurrentMonthPaid(data.paid);
        setCurrentMonthPayment(data.payment || null);
      }
    } catch (err) { console.error(err); }
  };

  const fetchPaymentHistory = async () => {
    try {
      const res  = await fetch(`http://localhost:5000/api/properties/rent-payments/${userId}`);
      const data = await res.json();
      if (data.success) setPaymentHistory(data.payments);
    } catch (err) { console.error(err); }
  };

  const loadEthRate = async () => {
    try { setEthRate(await getEthPkrRate()); } catch (err) { console.error(err); }
  };

  // ── Generate & download PDF slip ─────────────────────────────────────────
  const downloadSlip = (payment) => {
    const slipWindow = window.open("", "_blank");
    const dateStr    = new Date(payment.paid_at).toLocaleString("en-PK");
    const monthStr   = payment.month_year;
    const ethVal     = Number(payment.amount_eth).toFixed(8);
    const pkrVal     = Number(payment.amount_pkr).toLocaleString();

    slipWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Rent Receipt — ${monthStr}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #1a1a2e; }
          .header { text-align: center; border-bottom: 3px solid #0A2FFF; padding-bottom: 20px; margin-bottom: 30px; }
          .header h1 { color: #0A2FFF; margin: 0; font-size: 28px; }
          .header p  { margin: 5px 0; color: #666; }
          .badge { display: inline-block; background: #22c55e; color: white; padding: 6px 18px; border-radius: 20px; font-weight: bold; font-size: 14px; margin: 10px 0; }
          .section { background: #f8faff; border: 1px solid #e0e7ff; border-radius: 10px; padding: 20px; margin-bottom: 20px; }
          .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
          .row:last-child { border-bottom: none; }
          .label { color: #666; font-size: 14px; }
          .value { font-weight: bold; font-size: 14px; }
          .tx { font-size: 11px; word-break: break-all; color: #0A2FFF; }
          .footer { text-align: center; margin-top: 30px; color: #999; font-size: 12px; border-top: 1px solid #eee; padding-top: 15px; }
          .watermark { color: #22c55e; font-size: 18px; font-weight: bold; text-align: center; margin: 15px 0; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🏠 Real World Assets</h1>
          <p>Blockchain-Verified Rent Receipt</p>
          <div class="badge">✅ PAID</div>
        </div>

        <div class="section">
          <div class="row"><span class="label">Receipt For</span><span class="value">${monthStr}</span></div>
          <div class="row"><span class="label">Property</span><span class="value">${payment.property_title || "—"}</span></div>
          <div class="row"><span class="label">Amount (PKR)</span><span class="value">PKR ${pkrVal}</span></div>
          <div class="row"><span class="label">Amount (ETH)</span><span class="value">${ethVal} ETH</span></div>
          <div class="row"><span class="label">Paid On</span><span class="value">${dateStr}</span></div>
          <div class="row"><span class="label">Payment Method</span><span class="value">Blockchain (Sepolia)</span></div>
        </div>

        <div class="section">
          <div class="row"><span class="label">Blockchain TX Hash</span></div>
          <div class="tx">${payment.blockchain_tx_hash}</div>
          <div style="margin-top:10px;">
            <a href="https://sepolia.etherscan.io/tx/${payment.blockchain_tx_hash}" target="_blank" style="color:#0A2FFF;font-size:13px;">
              🔗 Verify on Sepolia Etherscan
            </a>
          </div>
        </div>

        <div class="watermark">🔒 Verified on Ethereum Sepolia Blockchain</div>

        <div class="footer">
          <p>This receipt was auto-generated by the Real World Assets platform.</p>
          <p>Tenant User ID: ${payment.tenant_user_id} | Generated: ${new Date().toLocaleString("en-PK")}</p>
        </div>

        <script>window.onload = () => window.print();</script>
      </body>
      </html>
    `);
    slipWindow.document.close();
  };

  const handlePayRent = async () => {
    setPayError("");
    setPaySuccess("");

    if (!tenantData) { setPayError("No rental information found."); return; }
    if (!window.ethereum) { setPayError("MetaMask not found."); return; }
    if (currentMonthPaid) { setPayError(`Rent for ${monthLabel} is already paid.`); return; }

    setPaying(true);
    try {
      // Get property hash
      const propRes  = await fetch(`http://localhost:5000/api/properties/property/${tenantData.property_id}`);
      const propData = await propRes.json();
      if (!propData?.property?.property_hash) {
        setPayError("Property hash not found.");
        return;
      }
      const propertyHashHex = "0x" + propData.property.property_hash;

      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      await browserProvider.send("eth_requestAccounts", []);

      // Switch to Sepolia
      const network = await browserProvider.getNetwork();
      if (network.chainId !== 11155111n) {
        try {
          await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0xaa36a7" }] });
        } catch {
          setPayError("Please switch MetaMask to Sepolia Testnet.");
          return;
        }
      }

      const freshSigner  = await browserProvider.getSigner();
      const walletAddr   = await freshSigner.getAddress();

      // KYC check
      const rwaAbi   = ["function kycStatus(address) view returns (uint8)"];
      const rwaCheck = new ethers.Contract(CONTRACT_ADDRESSES.RealEstateRWA, rwaAbi, freshSigner);
      if (Number(await rwaCheck.kycStatus(walletAddr)) !== 2) {
        setPayError("Your KYC must be verified on-chain before paying rent.");
        return;
      }

      // Get exact Wei from chain
      const rwaReadAbi = ["function properties(bytes32) view returns (bool,bool,bool,uint256,bytes32,uint256)"];
      const rwaRead    = new ethers.Contract(CONTRACT_ADDRESSES.RealEstateRWA, rwaReadAbi, browserProvider);
      const onChain    = await rwaRead.properties(propertyHashHex);
      const monthlyRentWei = onChain[5]; // uint256 monthlyRent

      // Balance check
      const balance = await browserProvider.getBalance(walletAddr);
      if (balance < monthlyRentWei) {
        const need = parseFloat(ethers.formatEther(monthlyRentWei)).toFixed(6);
        const have = parseFloat(ethers.formatEther(balance)).toFixed(6);
        setPayError(`Insufficient ETH. Need: ${need} ETH, Have: ${have} ETH`);
        return;
      }

      if (!CONTRACT_ADDRESSES.TenantController) {
        setPayError("TenantController not configured.");
        return;
      }

      // Send transaction
      const tenantABI      = ["function payRent(bytes32 propertyHash) external payable"];
      const tenantContract = new ethers.Contract(CONTRACT_ADDRESSES.TenantController, tenantABI, freshSigner);
      const tx             = await tenantContract.payRent(propertyHashHex, { value: monthlyRentWei });

      setPaySuccess(`⏳ TX submitted: ${tx.hash}\nWaiting for confirmation...`);
      const receipt = await tx.wait();

      if (receipt.status === 0) { setPayError("Transaction reverted."); setPaySuccess(""); return; }

      const amountEth = parseFloat(ethers.formatEther(monthlyRentWei));
      const amountPkr = Number(tenantData.monthly_rent);

      // Save to DB
      await fetch("http://localhost:5000/api/properties/rent-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_user_id:     userId,
          property_id:        tenantData.property_id,
          amount_wei:         monthlyRentWei.toString(),
          amount_pkr:         amountPkr,
          amount_eth:         amountEth,
          blockchain_tx_hash: receipt.hash,
          month_year:         monthYear,
        }),
      });

      setPaySuccess(`✅ Rent paid for ${monthLabel}!\nAmount: PKR ${amountPkr.toLocaleString()} (${amountEth.toFixed(6)} ETH)\nTX: ${receipt.hash}`);
      setCurrentMonthPaid(true);
      fetchRentStatus();
      fetchPaymentHistory();

    } catch (err) {
      if (err.code === 4001 || err.code === "ACTION_REJECTED") setPayError("Transaction rejected in MetaMask.");
      else setPayError(err?.reason || err?.message || "Transaction failed.");
    } finally {
      setPaying(false);
    }
  };

  const formatDate     = (d) => d ? new Date(d).toLocaleDateString("en-PK", { year: "numeric", month: "long", day: "numeric" }) : "N/A";
  const formatCurrency = (a) => a ? new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", minimumFractionDigits: 0 }).format(a) : "PKR 0";
  const rentInEth      = tenantData && ethRate ? (Number(tenantData.monthly_rent) / ethRate) : null;
  const isLeaseExpired = tenantData && new Date(tenantData.lease_end) < new Date();

  if (loading) return <p className="loading-text">Loading rental details...</p>;
  if (!tenantData) return (
    <div className="empty-state">
      <div className="empty-icon">🏠</div>
      <h3>No Rental Found</h3>
      <p>You haven't been assigned to any property yet.</p>
    </div>
  );

  return (
    <div className="pay-rent-section">
      <h3 className="section-title">💰 Pay Rent</h3>

      {/* ── Current Month Status Banner ─────────────────── */}
      {currentMonthPaid ? (
        <div style={{ background: "#f0fdf4", border: "2px solid #22c55e", borderRadius: 12, padding: "16px 20px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 28 }}>✅</span>
            <div>
              <p style={{ margin: 0, fontWeight: "bold", color: "#16a34a", fontSize: 16 }}>Rent Paid for {monthLabel}</p>
              {currentMonthPayment && (
                <p style={{ margin: 0, color: "#555", fontSize: 13 }}>
                  Paid on {new Date(currentMonthPayment.paid_at).toLocaleDateString("en-PK")} &nbsp;·&nbsp;
                  PKR {Number(currentMonthPayment.amount_pkr).toLocaleString()}
                </p>
              )}
            </div>
          </div>
          {currentMonthPayment && (
            <button
              onClick={() => downloadSlip(currentMonthPayment)}
              style={{ background: "#0A2FFF", color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", cursor: "pointer", fontWeight: "bold", fontSize: 14 }}
            >
              📄 Download Receipt
            </button>
          )}
        </div>
      ) : (
        <div style={{ background: isOverdue ? "#fef2f2" : "#fffbeb", border: `2px solid ${isOverdue ? "#ef4444" : "#f59e0b"}`, borderRadius: 12, padding: "14px 20px", marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 24 }}>{isOverdue ? "🔴" : "🔔"}</span>
          <div>
            <p style={{ margin: 0, fontWeight: "bold", color: isOverdue ? "#dc2626" : "#92400e" }}>
              {isOverdue ? `Rent Overdue for ${monthLabel}` : `Rent Due by 10th ${monthLabel}`}
            </p>
            <p style={{ margin: 0, fontSize: 13, color: "#666" }}>
              {isOverdue ? "Please pay immediately to avoid issues." : `Pay before the 10th to stay on time. Today is the ${today}${["st","nd","rd"][today-1]||"th"}.`}
            </p>
          </div>
        </div>
      )}

      {/* ── Pay Card ─────────────────────────────────────── */}
      <div className="pay-rent-card">
        <div className="pay-rent-property-header">
          <span className="pay-rent-property-icon">🏠</span>
          <div className="pay-rent-property-info">
            <h4 className="pay-rent-property-title">{tenantData.property_title}</h4>
            <p className="pay-rent-property-address">{tenantData.property_address || "Address not available"}</p>
          </div>
          <span className={`status-badge ${isLeaseExpired ? "status-expired" : "status-active"}`}>
            {isLeaseExpired ? "Lease Expired" : "Active Lease"}
          </span>
        </div>

        <div className="pay-rent-details-grid">
          {[
            ["Monthly Rent (PKR)", <span className="pay-rent-amount">{formatCurrency(tenantData.monthly_rent)}</span>],
            ["Equivalent in ETH",  <span className="pay-rent-eth">{rentInEth !== null ? `≈ ${rentInEth.toFixed(6)} ETH` : "Calculating..."}</span>],
            ["Lease Start",        formatDate(tenantData.lease_start)],
            ["Lease End",          formatDate(tenantData.lease_end)],
            ["Property Owner",     tenantData.owner_name || "N/A"],
            ["Owner Email",        tenantData.owner_email || "N/A"],
          ].map(([label, value]) => (
            <div key={label} className="pay-rent-detail-item">
              <span className="pay-rent-detail-label">{label}</span>
              <span className="pay-rent-detail-value">{value}</span>
            </div>
          ))}
        </div>

        <div className="pay-rent-rate-banner">
          <span>ℹ️</span>
          <span>Current ETH/PKR Rate: <strong>{ethRate ? `1 ETH = PKR ${ethRate.toLocaleString()}` : "Loading..."}</strong>. Rent is stored on-chain in Wei.</span>
        </div>

        {payError   && <div className="pay-rent-error"><span>⚠️</span><div><strong>Payment Failed</strong><p>{payError}</p></div></div>}
        {paySuccess && <div className="pay-rent-success"><span>✅</span><div><strong>Payment Successful</strong><pre className="pay-rent-success-text">{paySuccess}</pre></div></div>}

        {isLeaseExpired ? (
          <div className="pay-rent-expired-notice"><p>⚠️ Your lease has expired. You cannot pay rent.</p></div>
        ) : currentMonthPaid ? (
          <div style={{ textAlign: "center", padding: "16px", background: "#f0fdf4", borderRadius: 10, color: "#16a34a", fontWeight: "bold" }}>
            ✅ Rent already paid for {monthLabel}
          </div>
        ) : (
          <button className="pay-rent-btn" onClick={handlePayRent} disabled={paying}>
            {paying ? (<><span className="pay-rent-spinner"></span>Processing...</>) : (
              <>💰 Pay Rent — {formatCurrency(tenantData.monthly_rent)}
                {rentInEth !== null && <span className="pay-rent-btn-eth">≈ {rentInEth.toFixed(6)} ETH</span>}
              </>
            )}
          </button>
        )}

        <p className="pay-rent-disclaimer">
          🔒 Rent is paid on-chain via TenantController by using MetaMask wallet.
        </p>
      </div>

      {/* ── Payment History ───────────────────────────────── */}
      {paymentHistory.length > 0 && (
        <div style={{ marginTop: 30 }}>
          <h4 className="section-title">📜 Payment History</h4>
          <div className="listings-table-container">
            <table className="listings-table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Property</th>
                  <th>Amount (PKR)</th>
                  <th>Amount (ETH)</th>
                  <th>Paid On</th>
                  <th>Status</th>
                  <th>Receipt</th>
                </tr>
              </thead>
              <tbody>
                {paymentHistory.map((p) => (
                  <tr key={p.payment_id}>
                    <td><strong>{p.month_year}</strong></td>
                    <td>{p.property_id}</td>
                    <td>{formatCurrency(p.amount_pkr)}</td>
                    <td>{Number(p.amount_eth).toFixed(6)} ETH</td>
                    <td>{new Date(p.paid_at).toLocaleDateString("en-PK")}</td>
                    <td><span className="status-badge status-active">✅ Paid</span></td>
                    <td>
                      <button
                        onClick={() => downloadSlip(p)}
                        style={{ background: "#0A2FFF", color: "#fff", border: "none", borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 12 }}
                      >
                        📄 Receipt
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
  
};

// ─────────────────────────────────────────────────────────────────────────────
// RentalIncomeTab — INVESTOR, OWNER, TENANT
// ─────────────────────────────────────────────────────────────────────────────
const RentalIncomeTab = ({ userId, userRole }) => {
  const [holdings, setHoldings] = useState([]);
  const [withdrawalHistory, setWithdrawalHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState({});
  const [messages, setMessages] = useState({});


  const fetchWithdrawalHistory = async () => {
    try {
      const res = await fetch(
        `http://localhost:5000/api/properties/rent-withdrawals/${userId}`
      );
      const result = await res.json();
      if (result.success) {
        setWithdrawalHistory(result.withdrawals);
      }
    } catch (err) {
      console.error("Error fetching withdrawal history:", err);
    }
  };

  const fetchHoldings = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `http://localhost:5000/api/properties/my-holdings/${userId}`
      );
      const result = await res.json();
      let combinedHoldings = result.success ? [...result.holdings] : [];

      if (userRole?.toUpperCase() === "OWNER") {
        const ownerRes = await fetch(
          `http://localhost:5000/api/properties/owner-property-holdings/${userId}`
        );
        const ownerResult = await ownerRes.json();

        if (ownerResult.success && ownerResult.holdings.length > 0) {
          const existingIds = new Set(combinedHoldings.map((h) => h.property_id));
          for (const oh of ownerResult.holdings) {
            if (!existingIds.has(oh.property_id)) {
              combinedHoldings.push(oh);
            } else {
              const idx = combinedHoldings.findIndex((h) => h.property_id === oh.property_id);
              if (idx !== -1) combinedHoldings[idx].tokens_owned = oh.tokens_owned;
            }
          }
        }
      }

      setHoldings(combinedHoldings);
    } catch (err) {
      console.error("Error fetching holdings:", err);
    } finally {
      setLoading(false);
    }
  };

  // ── useEffect AFTER functions are defined ────────────────────────────────
  useEffect(() => {
    if (userId) {
      fetchHoldings();
      fetchWithdrawalHistory();
    }
  }, [userId]);

  // ... rest of the component (formatCurrency, handleWithdrawRent, return JSX)
  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return "PKR 0";

    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleWithdrawRent = async (holding) => {
    const propertyId = holding.property_id;

    setWithdrawing((prev) => ({
      ...prev,
      [propertyId]: true,
    }));

    setMessages((prev) => ({
      ...prev,
      [propertyId]: null,
    }));

    try {
      if (!window.ethereum) {
        setMessages((prev) => ({
          ...prev,
          [propertyId]: {
            type: "error",
            text: "MetaMask not found.",
          },
        }));

        return;
      }

      const { ethers } = await import("ethers");

      const browserProvider = new ethers.BrowserProvider(window.ethereum);

      await browserProvider.send("eth_requestAccounts", []);

      // ── Switch to Sepolia ─────────────────────────────
      const network = await browserProvider.getNetwork();

      if (network.chainId !== 11155111n) {
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: "0xaa36a7" }],
          });
        } catch {
          setMessages((prev) => ({
            ...prev,
            [propertyId]: {
              type: "error",
              text: "Please switch MetaMask to Sepolia Testnet.",
            },
          }));

          return;
        }
      }

      const freshSigner = await browserProvider.getSigner();

      const walletAddr = await freshSigner.getAddress();

      // ── KYC Check ─────────────────────────────────────
      const rwaAbi = [
        "function kycStatus(address) view returns (uint8)",
      ];

      const rwaCheck = new ethers.Contract(
        CONTRACT_ADDRESSES.RealEstateRWA,
        rwaAbi,
        freshSigner
      );

      if (Number(await rwaCheck.kycStatus(walletAddr)) !== 2) {
        setMessages((prev) => ({
          ...prev,
          [propertyId]: {
            type: "error",
            text:
              "Your KYC must be verified on-chain before withdrawing.",
          },
        }));

        return;
      }

      // ── Fetch Property Hash ──────────────────────────
      const propRes = await fetch(
        `http://localhost:5000/api/properties/property/${propertyId}`
      );

      const propData = await propRes.json();

      if (!propData?.property?.property_hash) {
        setMessages((prev) => ({
          ...prev,
          [propertyId]: {
            type: "error",
            text: "Property hash not found.",
          },
        }));

        return;
      }

      const propertyHashHex =
        "0x" + propData.property.property_hash;

     // ── Check Pending Rent ───────────────────────────
      const rwaReadAbi = [
        "function getPendingRent(bytes32,address) view returns (uint256)",
        "function balances(bytes32,address) view returns (uint256)",
      ];

      const rwaRead = new ethers.Contract(
        CONTRACT_ADDRESSES.RealEstateRWA,
        rwaReadAbi,
        browserProvider
      );

      const [pendingWei, bal] = await Promise.all([
        rwaRead.getPendingRent(propertyHashHex, walletAddr),
        rwaRead.balances(propertyHashHex, walletAddr),
      ]);

      console.log("[Rent Debug]", {
        bal: bal.toString(),
        pendingWei: pendingWei.toString(),
        walletAddr,
        propertyHashHex,
      });

      if (pendingWei <= 0n) {
        setMessages((prev) => ({
          ...prev,
          [propertyId]: {
            type: "error",
            text:
              "No rent available to withdraw for this property yet.",
          },
        }));

        return;
      }

      // ── Pick Controller ──────────────────────────────
      const normalizedRole = userRole?.toUpperCase();

      let controllerAddress;

      if (normalizedRole === "OWNER") {
        controllerAddress =
          CONTRACT_ADDRESSES.PropertyOwnerController;
      } else if (normalizedRole === "TENANT") {
        controllerAddress =
          CONTRACT_ADDRESSES.TenantController;
      } else {
        controllerAddress =
          CONTRACT_ADDRESSES.InvestorController;
      }

      if (!controllerAddress) {
        setMessages((prev) => ({
          ...prev,
          [propertyId]: {
            type: "error",
            text: `Controller not configured for role: ${userRole}`,
          },
        }));

        return;
      }

      const controllerABI = [
        "function withdrawRent(bytes32 propertyHash) external",
      ];

      const controller = new ethers.Contract(
        controllerAddress,
        controllerABI,
        freshSigner
      );

      // ── Send Transaction ─────────────────────────────
      const tx = await controller.withdrawRent(
        propertyHashHex
      );

      setMessages((prev) => ({
        ...prev,
        [propertyId]: {
          type: "info",
          text: `⏳ TX submitted: ${tx.hash}\nWaiting for confirmation...`,
        },
      }));

      const receipt = await tx.wait();

      if (receipt.status === 0) {
        setMessages((prev) => ({
          ...prev,
          [propertyId]: {
            type: "error",
            text: "Transaction reverted on-chain.",
          },
        }));

        return;
      }

      // ── Calculate Amounts ────────────────────────────
      const ethWithdrawn = parseFloat(
        ethers.formatEther(pendingWei)
      );

      const tokenBalance = Number(
        bal / BigInt(10 ** 18)
      );

      // ── Save to Database ─────────────────────────────
      // ── Save to Database ─────────────────────────────
      let dbSaveOk = false;
      let dbSaveMessage = "";
      try {
        const dbRes = await fetch(
          "http://localhost:5000/api/properties/rent-withdrawal",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              user_id: userId,
              property_id: propertyId,
              token_balance: tokenBalance,
              amount_eth: ethWithdrawn,
              blockchain_tx_hash: receipt.hash,
            }),
          }
        );
        const dbData = await dbRes.json();
        dbSaveOk = dbRes.ok && dbData.success;
        dbSaveMessage = dbData.message || "";
      } catch (dbErr) {
        console.error("DB save failed for withdrawal:", dbErr);
        dbSaveMessage = dbErr.message;
      }

      if (dbSaveOk) {
        setMessages((prev) => ({
          ...prev,
          [propertyId]: {
            type: "success",
            text: `✅ Rent withdrawn!\n${ethWithdrawn.toFixed(
              6
            )} ETH sent to your wallet.\nTX: ${receipt.hash}`,
          },
        }));
      } else {
        setMessages((prev) => ({
          ...prev,
          [propertyId]: {
            type: "error",
            text: `⚠️ ETH was sent on-chain (TX: ${receipt.hash}), but saving the record failed: ${dbSaveMessage}. Please contact support with this TX hash.`,
          },
        }));
      }

      fetchWithdrawalHistory();

    } catch (err) {
      const msg =
        err.code === 4001 ||
        err.code === "ACTION_REJECTED"
          ? "Transaction rejected in MetaMask."
          : err?.reason ||
            err?.message ||
            "Withdrawal failed.";

      setMessages((prev) => ({
        ...prev,
        [propertyId]: {
          type: "error",
          text: msg,
        },
      }));
    } finally {
      setWithdrawing((prev) => ({
        ...prev,
        [propertyId]: false,
      }));
    }
  };

  if (loading) {
    return (
      <p className="rental_distribution_loading_text">
        Loading rental income...
      </p>
    );
  }

  return (
    <div className="rental_distribution_section">

      <h3 className="rental_distribution_title">
        💰 Rental Income
      </h3>

      <p className="rental_distribution_subtitle">
        Withdraw your share of rental income for each property
        you hold tokens in.
      </p>

      {/* ───────────────── Property Cards ───────────────── */}
      {holdings.length === 0 ? (
        <div className="rental_distribution_empty_state">

          <div className="rental_distribution_empty_icon">
            💰
          </div>

          <h3>No Rental Income Yet</h3>

          <p>
            {userRole === "OWNER"
              ? "Once your property has a tenant paying rent, your income will appear here."
              : "Hold tokens in a tokenized property to earn rental income."}
          </p>
        </div>
      ) : (
        <div className="rental_distribution_grid">
          {holdings.map((h) => {
            const propertyId = h.property_id;

            const tokensOwned = Number(
              h.tokens_owned || 0
            );

            const msg = messages[propertyId];

            const isWithdrawing =
              withdrawing[propertyId] || false;

            return (
              <div
                key={propertyId}
                className="rental_distribution_card"
              >

                {/* Header */}
                <div className="rental_distribution_header">

                  <span className="rental_distribution_house_icon">
                    🏠
                  </span>

                  <div>
                    <p className="rental_distribution_property_title">
                      {h.title}
                    </p>

                    <p className="rental_distribution_location">
                      {h.city}, {h.province}
                    </p>
                  </div>
                </div>

                <div className="rental_distribution_divider" />

                {/* Stats */}
                <div className="rental_distribution_stats">

                  <div className="rental_distribution_stat_box">
                    <p className="rental_distribution_tokens">
                      {tokensOwned.toLocaleString()}
                    </p>

                    <p className="rental_distribution_label">
                      Tokens Owned
                    </p>
                  </div>

                  <div className="rental_distribution_stat_box">
                    <p className="rental_distribution_price">
                      {formatCurrency(h.avg_price_per_token ?? h.mint_token_price ?? h.token_price)}
                    </p>

                    <p className="rental_distribution_label">
                      Price / Token
                    </p>
                  </div>

                  <div className="rental_distribution_stat_box">
                    <span
                      className={`rental_distribution_status_badge ${
                        h.property_status === "Tokenized"
                          ? "rental_distribution_status_tokenized"
                          : "rental_distribution_status_pending"
                      }`}
                    >
                      {h.property_status}
                    </span>
                  </div>
                </div>

                {/* Message */}
                {msg && (
                  <div
                    className={`rental_distribution_message ${
                      msg.type === "success"
                        ? "rental_distribution_success"
                        : msg.type === "error"
                        ? "rental_distribution_error"
                        : "rental_distribution_info"
                    }`}
                  >
                    {msg.text}
                  </div>
                )}

                {/* Button */}
                <button
                  onClick={() => handleWithdrawRent(h)}
                  disabled={
                    isWithdrawing ||
                    h.property_status !== "Tokenized"
                  }
                  className={`rental_distribution_button ${
                    h.property_status !== "Tokenized"
                      ? "rental_distribution_button_disabled"
                      : ""
                  }`}
                >
                  {isWithdrawing ? (
                    <>
                      <span className="rental_distribution_spinner" />
                      Withdrawing...
                    </>
                  ) : h.property_status !== "Tokenized" ? (
                    "⏳ Not Tokenized Yet"
                  ) : (
                    "💸 Get Monthly Rent"
                  )}
                </button>

               
              </div>
            );
          })}
        </div>
      )}

      {/* ─────────────── Withdrawal History ─────────────── */}
      {withdrawalHistory.length > 0 && (
        <div className="rental_distribution_history_section">

          <h4 className="rental_distribution_title">
            📜 Withdrawal History
          </h4>

          <div className="rental_distribution_table_container">

            <table className="rental_distribution_table">

              <thead>
                <tr>
                  <th>Property</th>
                  <th>Rent Period</th>
                  <th>Tokens Held</th>
                  <th>Amount Withdrawn</th>
                  <th>Date</th>
                  <th>TX Hash</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {withdrawalHistory.map((w) => (
                  <tr key={w.distribution_id}>

                    <td>
                      <span className="rental_distribution_property_icon">
                        🏠
                      </span>{" "}

                      <span className="rental_distribution_property_name">
                        {w.property_title}
                      </span>

                      <br />

                      <small className="rental_distribution_location_small">
                        {w.city}, {w.province}
                      </small>
                    </td>

                    <td>
                      <strong>{w.month_year}</strong>
                    </td>

                    <td>
                      {Number(
                        w.token_balance || 0
                      ).toLocaleString()}
                    </td>

                    <td>
                      {w.amount_paid &&
                      Number(w.amount_paid) > 0 ? (
                        <span className="rental_distribution_amount_paid">
                          {formatCurrency(w.amount_paid)}
                        </span>
                      ) : (
                        <span className="rental_distribution_eth_only">
                          ETH only
                        </span>
                      )}
                    </td>

                    <td>
                      {w.claimed_at
                        ? new Date(
                            w.claimed_at
                          ).toLocaleDateString("en-PK")
                        : "—"}
                    </td>

                    <td>
                      {w.blockchain_tx_hash ? (
                        <a
                          href={`https://sepolia.etherscan.io/tx/${w.blockchain_tx_hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rental_distribution_tx_link"
                        >
                          {w.blockchain_tx_hash.slice(0, 10)}
                          ...
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>

                    <td>
                      <span className="rental_distribution_claimed_badge">
                        ✅ Claimed
                      </span>
                    </td>

                  </tr>
                ))}
              </tbody>

            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;