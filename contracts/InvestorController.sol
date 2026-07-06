// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./RealEstateRWA.sol";

/**
 * @title InvestorController
 * @dev Proxy for investor actions: KYC submission, token trading, rent withdrawal.
 *
 *      HOW msg.sender IS RESOLVED:
 *      RealEstateRWA._resolveUser() detects that msg.sender == investorController
 *      and returns tx.origin (the real investor wallet) instead.
 *      So all on-chain state (KYC, balances, rent) is stored against the investor's wallet.
 *
 *      DEPLOYMENT ORDER:
 *      1. Deploy RealEstateRWA
 *      2. Deploy InvestorController(rwaAddress)
 *      3. Call rwa.setInvestorController(investorControllerAddress)
 */
contract InvestorController {
    RealEstateRWA public rwa;

    constructor(address _rwa) {
        rwa = RealEstateRWA(_rwa);
    }

    /**
     * @dev Submit KYC for the calling investor wallet (tx.origin in RWA).
     *      Stored on-chain against the real wallet address, not this contract.
     */
    function submitKYC(bytes32 cnic) external {
        rwa.submitKYCFor(cnic);
    }

    /**
     * @dev Buy tokens from a seller. ETH is forwarded through this contract to RWA,
     *      which then sends it to the seller. The buyer identity is resolved as tx.origin.
     */
function buyTokens(
    bytes32 propertyHash,
    address seller,
    uint256 amount,
    uint256 pricePerToken
) external payable {
    rwa.executeTrade{value: msg.value}(propertyHash, seller, amount, pricePerToken);
}

    /**
     * @dev Withdraw accumulated rent for the calling investor wallet.
     *      Rent is sent to tx.origin (the real investor wallet).
     */
  function withdrawRent(bytes32 propertyHash) external {
    rwa.withdrawRent(propertyHash);
}
}
