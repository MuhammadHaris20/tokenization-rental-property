// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./RealEstateRWA.sol";

/**
 * @title PropertyOwnerController
 * @dev Proxy for property owner actions: KYC submission, tenant assignment,
 *      and rent withdrawal.
 *
 *      HOW msg.sender IS RESOLVED:
 *      RealEstateRWA._resolveUser() detects that msg.sender == ownerController
 *      and returns tx.origin (the real owner wallet) instead.
 *      So all on-chain state (KYC, property ownership, rent) is stored against
 *      the owner's actual wallet address.
 *
 *      DEPLOYMENT ORDER:
 *      1. Deploy RealEstateRWA
 *      2. Deploy PropertyOwnerController(rwaAddress)
 *      3. Call rwa.setOwnerController(ownerControllerAddress)
 */
contract PropertyOwnerController {
    RealEstateRWA public rwa;

    constructor(address _rwa) {
        rwa = RealEstateRWA(_rwa);
    }

    /**
     * @dev Submit KYC for the calling owner wallet (tx.origin in RWA).
     *      KYC status is stored on-chain against the real wallet, not this contract.
     */
    function submitKYC(bytes32 cnic) external {
        rwa.submitKYCFor(cnic);
    }


  function assignTenant(
    bytes32 propertyHash,
    bytes32 tenantCnic,
    uint256 monthlyRent
) external {
    rwa.assignTenant(propertyHash, tenantCnic, monthlyRent);
}



function buyTokens(
    bytes32 propertyHash,
    address seller,
    uint256 amount,
    uint256 pricePerToken
) external payable {
    rwa.executeTrade{value: msg.value}(propertyHash, seller, amount, pricePerToken);
}

    /**
     * @dev Withdraw accumulated rent for the calling owner wallet.
     *      Rent is sent to tx.origin (the real owner wallet).
     * @param propertyHash  The keccak256 hash identifying the property.
     */
    function withdrawRent(bytes32 propertyHash) external {
        rwa.withdrawRent(propertyHash);
    }
}
