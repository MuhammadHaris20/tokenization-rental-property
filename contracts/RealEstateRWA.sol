// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract RealEstateRWA is ERC20, AccessControl {

    // =====================================================
    // ROLES
    // =====================================================

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OWNER_ROLE = keccak256("OWNER_ROLE");

    constructor() ERC20("RWA Property Share", "Esh") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(OWNER_ROLE, msg.sender);
    }

    bool public adminControllerSet;
    bool public investorControllerSet;
    bool public tenantControllerSet;
    bool public ownerControllerSet;

    address public adminController;
    address public investorController;
    address public tenantController;
    address public ownerController;

    function setAdminController(address controller) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(!adminControllerSet, "Already set");
        require(controller != address(0), "Invalid address");
        _grantRole(ADMIN_ROLE, controller);
        adminController = controller;
        adminControllerSet = true;
    }

    function setInvestorController(address controller) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(!investorControllerSet, "Already set");
        require(controller != address(0), "Invalid address");
        investorController = controller;
        investorControllerSet = true;
    }

    function setTenantController(address controller) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(!tenantControllerSet, "Already set");
        require(controller != address(0), "Invalid address");
        tenantController = controller;
        tenantControllerSet = true;
    }

    function setOwnerController(address controller) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(!ownerControllerSet, "Already set");
        require(controller != address(0), "Invalid address");
        ownerController = controller;
        ownerControllerSet = true;
    }

    // =====================================================
    // ENUMS
    // =====================================================

    enum KYCStatus { None, Pending, Verified, Rejected }

    // =====================================================
    // STRUCTS
    // =====================================================

    struct Property {
        bool exists;
        bool approved;
        bool tokenized;
        uint256 totalSupply;
        bytes32 tenant;
        uint256 monthlyRent;
    }

    // =====================================================
    // STATE VARIABLES
    // =====================================================

    bool private internalTransfer;
    mapping(address => KYCStatus) public kycStatus;
    mapping(address => bytes32) private cnicHash;

    mapping(bytes32 => Property) public properties;
    mapping(bytes32 => address) public propertyOwner;

    mapping(bytes32 => mapping(address => uint256)) public balances;

    // Global accumulator: increases every time rent is paid
    mapping(bytes32 => uint256) public accRentPerToken;

    // ─── CHANGED: replaced rentDebt with lastSnapshotAcc ───────────────
    // Stores the value of accRentPerToken at the moment the user last acted
    // (bought tokens, sold tokens, or withdrew rent).
    // Everything BEFORE this value is invisible to the user — they can't claim it.
    mapping(bytes32 => mapping(address => uint256)) public lastSnapshotAcc;

    mapping(bytes32 => bool) public propertyFrozen;

    // =====================================================
    // EVENTS
    // =====================================================

    event KYCSubmitted(address indexed user, bytes32 cnicHash);
    event KYCApproved(address indexed user);
    event KYCRejected(address indexed user);

    event PropertyApproved(bytes32 indexed propertyHash);
    event PropertyCreated(bytes32 indexed propertyHash, address indexed owner);
    event TokensMinted(bytes32 indexed propertyHash, uint256 totalSupply);

    event TenantAssigned(bytes32 indexed propertyHash, bytes32 tenant, uint256 rentAmount);

    event RentPaid(bytes32 indexed propertyHash, address indexed tenant, uint256 amount);
    event RentWithdrawn(bytes32 indexed propertyHash, address indexed investor, uint256 amount);

    event PropertyFrozen(bytes32 indexed propertyHash);
    event PropertyUnfrozen(bytes32 indexed propertyHash);

    event TokensTransferred(
        bytes32 indexed propertyHash,
        address indexed seller,
        address indexed buyer,
        uint256 amount,
        uint256 pricePerToken,
        uint256 totalPrice
    );

    // ─── NEW EVENT: emitted on every snapshot so your DB indexer can record it ──
    // pendingAtSnapshot = the rent crystallised for this user at this moment.
    // Your backend listens for this and updates rent_snapshots table.
    event RentSnapshotted(
        bytes32 indexed propertyHash,
        address indexed user,
        uint256 accSnapshot,       // the global acc value recorded
        uint256 pendingAtSnapshot  // how much rent was earned up to this point
    );

    // =====================================================
    // MODIFIERS
    // =====================================================

    modifier onlyVerified(address user) {
        require(kycStatus[user] == KYCStatus.Verified, "KYC not verified");
        _;
    }

    modifier onlyApprovedProperty(bytes32 propertyHash) {
        require(properties[propertyHash].approved, "Property not approved");
        _;
    }

    modifier onlyTokenizedProperty(bytes32 propertyHash) {
        require(properties[propertyHash].tokenized, "Not tokenized");
        _;
    }

    modifier notFrozen(bytes32 propertyHash) {
        require(!propertyFrozen[propertyHash], "Property frozen");
        _;
    }

    // =====================================================
    // INTERNAL HELPERS
    // =====================================================

    function _resolveUser() internal view returns (address) {
        if (
            msg.sender == adminController   ||
            msg.sender == investorController ||
            msg.sender == tenantController  ||
            msg.sender == ownerController
        ) {
            return tx.origin;
        }
        return msg.sender;
    }

    // ─── NEW INTERNAL: computes pending rent for a user without writing state ──
    // pending = balance × (currentAcc − userSnapshot) / 1e18
    function _pendingRent(bytes32 propertyHash, address user) internal view returns (uint256) {
        uint256 acc      = accRentPerToken[propertyHash];
        uint256 snapshot = lastSnapshotAcc[propertyHash][user];
        uint256 bal      = balances[propertyHash][user];

        if (bal == 0 || acc <= snapshot) return 0;
        return (bal * (acc - snapshot)) / 1e18;
    }

    // =====================================================
    // KYC
    // =====================================================

    function submitKYCFor(bytes32 _cnicHash) external {
        address user = _resolveUser();
        require(_cnicHash != bytes32(0), "Invalid hash");
        require(
            kycStatus[user] == KYCStatus.None ||
            kycStatus[user] == KYCStatus.Rejected,
            "KYC already submitted"
        );
        cnicHash[user] = _cnicHash;
        kycStatus[user] = KYCStatus.Pending;
        emit KYCSubmitted(user, _cnicHash);
    }

    function approveKYC(address user) external onlyRole(ADMIN_ROLE) {
        require(kycStatus[user] == KYCStatus.Pending, "Not pending");
        kycStatus[user] = KYCStatus.Verified;
        emit KYCApproved(user);
    }

    function rejectKYC(address user) external onlyRole(ADMIN_ROLE) {
        require(kycStatus[user] == KYCStatus.Pending, "Not pending");
        kycStatus[user] = KYCStatus.Rejected;
        emit KYCRejected(user);
    }

    // =====================================================
    // PROPERTY
    // =====================================================

    function createAndApproveProperty(bytes32 propertyHash, address owner)
        external
        onlyRole(ADMIN_ROLE)
    {
        require(!properties[propertyHash].exists, "Property exists");
        require(owner != address(0), "Invalid owner");
        require(kycStatus[owner] == KYCStatus.Verified, "Owner not verified");

        properties[propertyHash] = Property({
            exists: true,
            approved: true,
            tokenized: false,
            totalSupply: 0,
            tenant: bytes32(0),
            monthlyRent: 0
        });

        propertyOwner[propertyHash] = owner;

        emit PropertyCreated(propertyHash, owner);
        emit PropertyApproved(propertyHash);
    }

    function mintTokens(bytes32 propertyHash, uint256 totalSupply)
        external
        onlyRole(ADMIN_ROLE)
    {
        require(properties[propertyHash].approved,   "Not approved");
        require(!properties[propertyHash].tokenized, "Already tokenized");
        require(totalSupply > 0,                     "Invalid supply");

        uint256 scaledSupply = totalSupply * (10 ** decimals());

        properties[propertyHash].tokenized   = true;
        properties[propertyHash].totalSupply = scaledSupply;

        address owner = propertyOwner[propertyHash];
        balances[propertyHash][owner] = scaledSupply;

        // Owner's snapshot starts at current acc (0 at mint time, but correct if
        // somehow tokens are minted after rent has already been paid — edge case safety)
        lastSnapshotAcc[propertyHash][owner] = accRentPerToken[propertyHash];

        _mint(owner, scaledSupply);
        emit TokensMinted(propertyHash, totalSupply);
    }

    // =====================================================
    // ASSIGN TENANT
    // =====================================================

    function assignTenant(
        bytes32 propertyHash,
        bytes32 tenantCnic,
        uint256 monthlyRent
    )
        external
        onlyApprovedProperty(propertyHash)
    {
        address caller = _resolveUser();
        require(properties[propertyHash].exists,       "Property not found");
        require(caller == propertyOwner[propertyHash], "Only owner");
        require(monthlyRent > 0,                       "Invalid rent");
        require(tenantCnic != bytes32(0),              "Invalid CNIC hash");

        properties[propertyHash].tenant      = tenantCnic;
        properties[propertyHash].monthlyRent = monthlyRent;

        emit TenantAssigned(propertyHash, tenantCnic, monthlyRent);
    }

    // =====================================================
    // TRADE 
    // =====================================================

    function executeTrade(
        bytes32 propertyHash,
        address seller,
        uint256 amount,
        uint256 pricePerToken
    )
        external
        payable
        notFrozen(propertyHash)
    {
        address buyer = _resolveUser();

        require(kycStatus[buyer]  == KYCStatus.Verified, "Buyer KYC not verified");
        require(kycStatus[seller] == KYCStatus.Verified, "Seller KYC not verified");
        require(buyer != seller,                         "Cannot buy from yourself");
        require(amount > 0,                              "Invalid amount");
        require(
            balances[propertyHash][seller] >= amount,
            "Seller has insufficient tokens"
        );

        uint256 totalPrice = (amount * pricePerToken) / 1e18;
        require(msg.value == totalPrice, "Incorrect ETH sent");

        uint256 acc = accRentPerToken[propertyHash];

        // ── SELLER: crystallise their earned rent before balance drops ──────
        // How much has the seller earned since their last snapshot?
        uint256 sellerPending = _pendingRent(propertyHash, seller);
        // Record the current acc as seller's new snapshot.
        // Their crystallised rent (sellerPending) is emitted so DB can store it.
        lastSnapshotAcc[propertyHash][seller] = acc;
        emit RentSnapshotted(propertyHash, seller, acc, sellerPending);

        // ── BUYER: handle snapshot depending on whether they already hold tokens ──
        if (balances[propertyHash][buyer] == 0) {
            // First purchase: set snapshot to NOW so buyer cannot claim
            // any rent paid before this moment (enforces "earn from next month" rule)
            lastSnapshotAcc[propertyHash][buyer] = acc;
            emit RentSnapshotted(propertyHash, buyer, acc, 0);
        }
        // If buyer already has tokens their existing snapshot stays untouched —
        // they have already earned rent since that snapshot, don't reset it.

        // ── Update balances ─────────────────────────────────────────────────
        balances[propertyHash][seller] -= amount;
        balances[propertyHash][buyer]  += amount;

        // ── ERC20 mirror transfer ────────────────────────────────────────────
        internalTransfer = true;
        _transfer(seller, buyer, amount);
        internalTransfer = false;

        // ── Pay seller ───────────────────────────────────────────────────────
        (bool success, ) = seller.call{value: msg.value}("");
        require(success, "ETH transfer to seller failed");

        emit TokensTransferred(propertyHash, seller, buyer, amount, pricePerToken, totalPrice);
    }

    // =====================================================
    // RENT  
    // =====================================================

    function payRent(bytes32 propertyHash)
        external
        payable
        onlyApprovedProperty(propertyHash)
        onlyTokenizedProperty(propertyHash)
        notFrozen(propertyHash)
    {
        address caller = _resolveUser();
        Property storage property = properties[propertyHash];

        require(cnicHash[caller] == property.tenant, "Not tenant");
        require(msg.value == property.monthlyRent,   "Full rent required");

        // Increases the global accumulator — all current holders earn proportionally
        accRentPerToken[propertyHash] +=
            (msg.value * 1e18) / property.totalSupply;

        emit RentPaid(propertyHash, caller, msg.value);
    }

    function withdrawRent(bytes32 propertyHash)
        external
        notFrozen(propertyHash)
    {
        address caller = _resolveUser();
        require(kycStatus[caller] == KYCStatus.Verified, "KYC not verified");

        uint256 userBalance = balances[propertyHash][caller];
        require(userBalance > 0, "No tokens");

        uint256 acc      = accRentPerToken[propertyHash];
        uint256 snapshot = lastSnapshotAcc[propertyHash][caller];

        // pending = tokens × (globalAcc − userSnapshot) / 1e18
        uint256 pending = (userBalance * (acc - snapshot)) / 1e18;
        require(pending > 0,                      "No rent to withdraw");
        require(address(this).balance >= pending, "Insufficient contract balance");

        // ─── KEY CHANGE: set snapshot TO current acc (not += pending) ───────
        // This marks "everything up to now has been paid out"
        lastSnapshotAcc[propertyHash][caller] = acc;

        (bool success, ) = caller.call{value: pending}("");
        require(success, "Transfer failed");

        emit RentWithdrawn(propertyHash, caller, pending);
    }

    // =====================================================
    // VIEW: PENDING RENT  ← NEW
    // =====================================================

    // Call this from your frontend to show live pending rent.
    // Returns only the on-chain portion (tokens earned since last snapshot).
    // Add DB crystallised amount on top for total pending display.
    function getPendingRent(bytes32 propertyHash, address user)
        external
        view
        returns (uint256 pending)
    {
        return _pendingRent(propertyHash, user);
    }

    // =====================================================
    // BLOCK DIRECT ERC20 TRANSFERS
    // =====================================================

    function _update(address from, address to, uint256 amount)
        internal
        override
    {
        require(
            internalTransfer || from == address(0) || to == address(0),
            "Direct transfers disabled"
        );
        super._update(from, to, amount);
    }

    // =====================================================
    // FREEZE
    // =====================================================

    function freezeProperty(bytes32 propertyHash)
        external
        onlyRole(ADMIN_ROLE)
    {
        propertyFrozen[propertyHash] = true;
        emit PropertyFrozen(propertyHash);
    }

    function unfreezeProperty(bytes32 propertyHash)
        external
        onlyRole(ADMIN_ROLE)
    {
        propertyFrozen[propertyHash] = false;
        emit PropertyUnfrozen(propertyHash);
    }
}