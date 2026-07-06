// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./RealEstateRWA.sol";

/**
 * @title TenantController
 * @dev Proxy for tenant actions: KYC submission and rent payment.
 *
 *      HOW msg.sender IS RESOLVED:
 *      RealEstateRWA._resolveUser() detects that msg.sender == tenantController
 *      and returns tx.origin (the real tenant wallet) instead.
 *      So KYC status and rent payment records are stored against the tenant's wallet.
 *
 *      DEPLOYMENT ORDER:
 *      1. Deploy RealEstateRWA
 *      2. Deploy TenantController(rwaAddress)
 *      3. Call rwa.setTenantController(tenantControllerAddress)
 */
contract TenantController {
    RealEstateRWA public rwa;

    constructor(address _rwaAddress) {
        rwa = RealEstateRWA(_rwaAddress);
    }

    /**
     * @dev Submit KYC for the calling tenant wallet (tx.origin in RWA).
     *      Stored on-chain against the real wallet address, not this contract.
     */
    function submitKYC(bytes32 CNIC) external {
        rwa.submitKYCFor(CNIC);
    }

    /**
     * @dev Pay rent for a property. ETH is forwarded to RWA.
     *      The tenant identity is resolved as tx.origin in RWA.
     */
    function payRent(bytes32 propertyHash) external payable {
        rwa.payRent{value: msg.value}(propertyHash);
    }

       function buyTokens(
    bytes32 propertyHash,
    address seller,
    uint256 amount,
    uint256 pricePerToken
) external payable {
    rwa.executeTrade{value: msg.value}(propertyHash, seller, amount, pricePerToken);
}

function withdrawRent(bytes32 propertyHash) external {
    rwa.withdrawRent(propertyHash);
}
}
