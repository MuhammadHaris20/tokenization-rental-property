// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./RealEstateRWA.sol";

/**
 * @title AdminController
 * @dev Proxy for admin-only operations (KYC approval, property management, freeze).
 *      This contract must be granted ADMIN_ROLE via setAdminController() on RealEstateRWA.
 */
contract AdminController {
    RealEstateRWA public rwa;

    constructor(address _rwa) {
        rwa = RealEstateRWA(_rwa);
    }

    function approveKYC(address user) external {
        rwa.approveKYC(user);
    }

    function rejectKYC(address user) external {
        rwa.rejectKYC(user);
    }

    function createAndApproveProperty(bytes32 propertyHash, address owner) external {
        rwa.createAndApproveProperty(propertyHash, owner);
    }

    function mintTokens(bytes32 hash, uint256 supply) external {
        rwa.mintTokens(hash, supply);
    }

    function freezeProperty(bytes32 hash) external {
        rwa.freezeProperty(hash);
    }

    function unfreezeProperty(bytes32 hash) external {
        rwa.unfreezeProperty(hash);
    }
}
