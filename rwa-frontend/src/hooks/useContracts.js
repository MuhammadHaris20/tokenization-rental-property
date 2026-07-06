import { useMemo } from "react";
import { ethers } from "ethers";
import { CONTRACT_ADDRESSES } from "../contracts";
import RealEstateRWA from "../abis/RealEstateRWA.json";
import InvestorController from "../abis/InvestorController.json";
import PropertyOwnerController from "../abis/PropertyOwnerController.json";
import AdminController from "../abis/AdminController.json";
import TenantController from "../abis/TenantController.json";

export const useContracts = (signer) => {
  const rwa = useMemo(() => {
    if (!signer) return null;
    try {
      return new ethers.Contract(CONTRACT_ADDRESSES.RealEstateRWA, RealEstateRWA.abi, signer);
    } catch (err) {
      console.error("Failed to initialize RealEstateRWA:", err);
      return null;
    }
  }, [signer]);

  const investorController = useMemo(() => {
    if (!signer) return null;
    try {
      return new ethers.Contract(CONTRACT_ADDRESSES.InvestorController, InvestorController.abi, signer);
    } catch (err) {
      console.error("Failed to initialize InvestorController:", err);
      return null;
    }
  }, [signer]);

  const propertyOwnerController = useMemo(() => {
    if (!signer) return null;
    try {
      return new ethers.Contract(CONTRACT_ADDRESSES.PropertyOwnerController, PropertyOwnerController.abi, signer);
    } catch (err) {
      console.error("Failed to initialize PropertyOwnerController:", err);
      return null;
    }
  }, [signer]);

  const adminController = useMemo(() => {
    if (!signer) return null;
    try {
      return new ethers.Contract(CONTRACT_ADDRESSES.AdminController, AdminController.abi, signer);
    } catch (err) {
      console.error("Failed to initialize AdminController:", err);
      return null;
    }
  }, [signer]);

  const tenantController = useMemo(() => {
    if (!signer) return null;
    try {
      return new ethers.Contract(CONTRACT_ADDRESSES.TenantController, TenantController.abi, signer);
    } catch (err) {
      console.error("Failed to initialize TenantController:", err);
      return null;
    }
  }, [signer]);

  return { rwa, investorController, propertyOwnerController, adminController, tenantController };
};