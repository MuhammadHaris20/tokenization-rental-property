// hooks/useWeb3.js
import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";

export const useWeb3 = () => {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(false);

  // ─── Save Wallet to DB ────────────────────────────────────────────
  const saveWalletToDB = async (walletAddress) => {
    const userId = localStorage.getItem("user_id");
    if (!userId) {
      console.warn("No user_id in localStorage, skipping wallet save");
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/api/user/save-wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet_address: walletAddress, user_id: userId }),
      });

      const data = await res.json();
      if (!res.ok) {
        console.warn("Wallet save failed:", data.message || data.error);
      } else {
        console.log("✅ Wallet saved to DB:", walletAddress);
      }
    } catch (err) {
      console.error("Failed to save wallet to DB:", err);
    }
  };

  // ─── Connect Wallet ───────────────────────────────────────────────
  const connect = useCallback(async () => {
    if (!window.ethereum) {
      const alreadyTriedReload = sessionStorage.getItem("metamaskReloadAttempted");
      if (alreadyTriedReload) {
        sessionStorage.removeItem("metamaskReloadAttempted");
        alert("MetaMask is not installed. You will be redirected to install it.");
        window.open("https://metamask.io/download/", "_blank");
      } else {
        sessionStorage.setItem("metamaskReloadAttempted", "true");
        alert("MetaMask not detected. Restarting page to detect it...");
        window.location.reload();
      }
      return;
    }

    sessionStorage.removeItem("metamaskReloadAttempted");

    try {
      setLoading(true);

      await window.ethereum.request({ method: "eth_requestAccounts" });

      const _provider = new ethers.BrowserProvider(window.ethereum);
      const _signer = await _provider.getSigner();
      const _account = await _signer.getAddress();
      const _network = await _provider.getNetwork();
      const _balance = await _provider.getBalance(_account);

      setProvider(_provider);
      setSigner(_signer);
      setAccount(_account);
      setChainId(Number(_network.chainId));
      setBalance(ethers.formatEther(_balance));

      localStorage.setItem("walletAddress", _account);

      // ─── Save wallet address to DB ────────────────────────────────
      await saveWalletToDB(_account.toLowerCase());

    } catch (err) {
      if (err.code === 4001) {
        alert("Connection rejected. Please approve the MetaMask request.");
      } else {
        alert("Failed to connect wallet. Please try again.");
      }
      console.error("Wallet connect error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── Disconnect Wallet ────────────────────────────────────────────
  const disconnect = useCallback(() => {
    setProvider(null);
    setSigner(null);
    setAccount(null);
    setChainId(null);
    setBalance(null);
    localStorage.removeItem("walletAddress");
  }, []);

  // ─── Auto-reconnect on page load ──────────────────────────────────
  useEffect(() => {
    const savedAddress = localStorage.getItem("walletAddress");
    if (window.ethereum && savedAddress) {
      connect();
    }
  }, [connect]);

  // ─── Listen for account/chain changes ────────────────────────────
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        disconnect();
      } else {
        connect();
      }
    };

    const handleChainChanged = (newChainId) => {
      console.log("Network changed to:", parseInt(newChainId, 16));
      window.location.reload();
    };

    const handleDisconnect = () => disconnect();

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);
    window.ethereum.on("disconnect", handleDisconnect);

    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener("chainChanged", handleChainChanged);
      window.ethereum.removeListener("disconnect", handleDisconnect);
    };
  }, [connect, disconnect]);

  // ─── Helper: shorten address ──────────────────────────────────────
  const shortenAddress = (addr) =>
    addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "";

  return {
    provider,
    signer,
    account,
    chainId,
    balance,
    loading,
    connect,
    disconnect,
    shortenAddress,
    isConnected: !!account,
  };
};