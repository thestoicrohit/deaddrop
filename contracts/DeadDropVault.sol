// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// Chainlink Automation compatible interface — implemented inline so the
// contract has no npm dependency on @chainlink/contracts at deploy time.
// Register this contract as a Custom Logic upkeep on automation.chain.link.
interface AutomationCompatibleInterface {
    function checkUpkeep(bytes calldata checkData) external returns (bool upkeepNeeded, bytes memory performData);
    function performUpkeep(bytes calldata performData) external;
}

/**
 * @title DeadDropVault
 * @notice Automated digital legacy vault — store, configure, and auto-release your
 *         on-chain assets and encrypted metadata to beneficiaries upon inactivity.
 * @dev Deployed on Ethereum Sepolia testnet for the DeadDrop dApp.
 *      Implements Chainlink Automation (AutomationCompatibleInterface) so that
 *      grace periods are triggered trustlessly without any manual call.
 *      Register this contract as a Custom Logic upkeep on automation.chain.link.
 *
 * Flow:
 *  1. Owner calls createVault() to register on-chain.
 *  2. Owner calls ping() periodically to prove they are alive.
 *  3. Owner calls setBeneficiaries() + depositETH() to configure their legacy.
 *  4. Chainlink Automation calls checkUpkeep() every block; if any Active vault
 *     has exceeded its inactivity threshold, performUpkeep() triggers its grace
 *     period automatically. Anyone can still call triggerGracePeriod() manually.
 *  5. If the owner is still silent after the grace period, beneficiaries call
 *     claimLegacy() to receive their ETH share.
 *  6. Owner can cancel the grace period by calling ping() before it expires.
 */
contract DeadDropVault is AutomationCompatibleInterface {

    // ── Enums ─────────────────────────────────────────────────────────────────
    enum VaultState { Active, GracePeriod, Released }

    // ── Structs ───────────────────────────────────────────────────────────────
    struct Beneficiary {
        address payable wallet;
        uint256 shareBPS;   // basis points: 10000 = 100%
        string  name;
    }

    struct VaultCore {
        bool       exists;
        VaultState state;
        uint256    lastPing;
        uint256    inactivityThreshold;  // seconds
        uint256    gracePeriodDuration;  // seconds
        bool       multiSig;
        uint256    gracePeriodStart;
        uint256    depositedETH;
        string     metadataCID;          // IPFS CID for encrypted vault metadata
        string     finalMessageCID;      // IPFS CID for final message
        uint256    confirmationCount;    // multiSig confirmation counter
        uint256    confirmationEpoch;    // bumped whenever prior confirmations must be invalidated
    }

    // ── Storage ───────────────────────────────────────────────────────────────
    mapping(address => VaultCore)                     private vaults;
    mapping(address => Beneficiary[])                 private beneficiaryList;
    // Stores the epoch a beneficiary confirmed in, rather than a bare bool, so
    // ping() (cancelling a grace period) and setBeneficiaries() can invalidate
    // every prior confirmation for a vault in O(1) by bumping confirmationEpoch,
    // instead of needing to iterate/clear an unbounded mapping. A confirmation
    // only counts if its stored epoch matches the vault's *current* epoch.
    mapping(address => mapping(address => uint256))   private multiSigConfirmedEpoch;
    address[]                                         public  vaultOwners;

    // Pull-payment ledger: when a legacy is released, each beneficiary's share is
    // *credited* here rather than pushed. Beneficiaries then call withdraw() to
    // pull their own funds. This prevents a single beneficiary whose address
    // reverts on receiving ETH from blocking the release for everyone else.
    // Keyed by beneficiary address and accumulated across every vault they're in.
    mapping(address => uint256)                       public  pendingWithdrawals;

    // Reentrancy guard (1 = not entered, 2 = entered). A plain integer flag
    // keeps the contract dependency-free (no OpenZeppelin import).
    uint256 private _reentrancyStatus = 1;

    // ── Events ────────────────────────────────────────────────────────────────
    event VaultCreated       (address indexed owner, uint256 threshold, uint256 gracePeriod);
    event PingRecorded       (address indexed owner, uint256 timestamp);
    event SettingsUpdated    (address indexed owner);
    event BeneficiariesSet   (address indexed owner, uint256 count);
    event ETHDeposited       (address indexed owner, uint256 amount);
    event GracePeriodStarted (address indexed owner, uint256 endTime);
    event GracePeriodCancelled(address indexed owner);
    event MultiSigConfirmed  (address indexed owner, address indexed confirmer, uint256 count);
    event LegacyReleased     (address indexed owner, uint256 totalETH);
    event ShareCredited      (address indexed owner, address indexed beneficiary, uint256 amount);
    event Withdrawn          (address indexed beneficiary, uint256 amount);
    event OwnerWithdrew      (address indexed owner, uint256 amount);

    // ── Modifiers ─────────────────────────────────────────────────────────────
    modifier vaultExists(address owner) {
        require(vaults[owner].exists, "Vault does not exist");
        _;
    }

    modifier onlyVaultOwner() {
        require(vaults[msg.sender].exists, "No vault for this address. Call createVault first");
        _;
    }

    modifier nonReentrant() {
        require(_reentrancyStatus == 1, "Reentrant call");
        _reentrancyStatus = 2;
        _;
        _reentrancyStatus = 1;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // WRITE FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Register a new vault on-chain. Called once per address.
     * @param _thresholdDays  Inactivity threshold in days (minimum 30).
     * @param _graceDays      Grace period before legacy releases (minimum 7).
     */
    function createVault(uint256 _thresholdDays, uint256 _graceDays) external {
        require(!vaults[msg.sender].exists,  "Vault already exists for this address");
        require(_thresholdDays >= 30,        "Threshold must be >= 30 days");
        require(_graceDays     >= 7,         "Grace period must be >= 7 days");

        VaultCore storage v   = vaults[msg.sender];
        v.exists              = true;
        v.state               = VaultState.Active;
        v.lastPing            = block.timestamp;
        v.inactivityThreshold = _thresholdDays * 1 days;
        v.gracePeriodDuration = _graceDays     * 1 days;
        v.multiSig            = false;
        // Start at 1, not 0 — multiSigConfirmedEpoch defaults to 0 for anyone
        // who has never confirmed, so epoch 0 would look identical to "already
        // confirmed in epoch 0" and wrongly block a beneficiary's first-ever
        // confirmation.
        v.confirmationEpoch   = 1;

        vaultOwners.push(msg.sender);
        emit VaultCreated(msg.sender, _thresholdDays * 1 days, _graceDays * 1 days);
    }

    /**
     * @notice Record an alive ping — resets the inactivity clock.
     *         If called during the grace period, it cancels the grace period
     *         and returns the vault to Active state.
     */
    function ping() external onlyVaultOwner {
        VaultCore storage v = vaults[msg.sender];
        require(v.state != VaultState.Released, "Legacy already released");

        if (v.state == VaultState.GracePeriod) {
            v.state               = VaultState.Active;
            v.confirmationCount   = 0;
            v.confirmationEpoch  += 1; // invalidate every prior multiSig confirmation
            emit GracePeriodCancelled(msg.sender);
        }

        v.lastPing = block.timestamp;
        emit PingRecorded(msg.sender, block.timestamp);
    }

    /**
     * @notice Update vault configuration. Only while Active — once a grace
     *         period has started, settings (including gracePeriodDuration)
     *         are locked so they can't be stretched out from under waiting
     *         beneficiaries. Ping (or wait for release) to change them again.
     * @param _thresholdDays   New inactivity threshold in days.
     * @param _graceDays       New grace period in days.
     * @param _multiSig        Require 2 beneficiary confirmations before release.
     * @param _metadataCID     IPFS CID for encrypted vault metadata (optional).
     * @param _finalMessageCID IPFS CID for the final encrypted message (optional).
     */
    function updateSettings(
        uint256 _thresholdDays,
        uint256 _graceDays,
        bool    _multiSig,
        string  calldata _metadataCID,
        string  calldata _finalMessageCID
    ) external onlyVaultOwner {
        require(_thresholdDays >= 30, "Threshold must be >= 30 days");
        require(_graceDays     >= 7,  "Grace period must be >= 7 days");

        VaultCore storage v   = vaults[msg.sender];
        require(v.state == VaultState.Active, "Vault must be Active to update settings");
        v.inactivityThreshold = _thresholdDays * 1 days;
        v.gracePeriodDuration = _graceDays     * 1 days;
        v.multiSig            = _multiSig;
        v.metadataCID         = _metadataCID;
        v.finalMessageCID     = _finalMessageCID;

        emit SettingsUpdated(msg.sender);
    }

    /**
     * @notice Set or replace the entire beneficiary list. Only while Active
     *         — locked once a grace period has started so the list (and the
     *         multiSig quorum it defines) can't shift under beneficiaries
     *         who are already waiting on a release.
     *         All existing beneficiaries are cleared before the new list is saved.
     * @param _wallets    Beneficiary wallet addresses.
     * @param _sharesBPS  Share of the estate in basis points (must sum to 10000).
     * @param _names      Display names for each beneficiary.
     */
    function setBeneficiaries(
        address payable[] calldata _wallets,
        uint256[]         calldata _sharesBPS,
        string[]          calldata _names
    ) external onlyVaultOwner {
        require(_wallets.length > 0,                  "At least one beneficiary required");
        require(_wallets.length == _sharesBPS.length, "Arrays must be same length");
        require(_wallets.length == _names.length,     "Arrays must be same length");

        VaultCore storage v = vaults[msg.sender];
        require(v.state == VaultState.Active, "Vault must be Active to change beneficiaries");

        uint256 total = 0;
        for (uint256 i = 0; i < _sharesBPS.length; i++) {
            require(_wallets[i] != address(0), "Zero address not allowed");
            total += _sharesBPS[i];
        }
        require(total == 10000, "Shares must sum to 10000 (100%)");

        // Defense in depth: even though the Active-only guard above already
        // prevents a mid-grace-period swap, always invalidate any leftover
        // confirmations when the beneficiary set itself changes.
        v.confirmationCount  = 0;
        v.confirmationEpoch += 1;

        delete beneficiaryList[msg.sender];
        for (uint256 i = 0; i < _wallets.length; i++) {
            beneficiaryList[msg.sender].push(Beneficiary({
                wallet:   _wallets[i],
                shareBPS: _sharesBPS[i],
                name:     _names[i]
            }));
        }

        emit BeneficiariesSet(msg.sender, _wallets.length);
    }

    /**
     * @notice Deposit ETH into the vault. This ETH will be split among beneficiaries
     *         when the legacy releases. Beneficiaries must be set first — otherwise
     *         a released legacy would have no one able to claim it, and ETH sent in
     *         would have no path back out (see withdrawDeposit for the owner's own
     *         recovery path while still Active).
     */
    function depositETH() external payable onlyVaultOwner {
        require(msg.value > 0, "Must send ETH");
        require(beneficiaryList[msg.sender].length > 0, "Set beneficiaries before depositing");
        vaults[msg.sender].depositedETH += msg.value;
        emit ETHDeposited(msg.sender, msg.value);
    }

    /**
     * @notice Owner-side escape hatch: withdraw some or all of your own
     *         deposited ETH back out, any time the vault is still Active.
     *         Locked once a grace period starts so beneficiaries who are
     *         already waiting on a release can't have the funds pulled out
     *         from under them.
     * @param amount Amount in wei to withdraw (must be <= current deposit).
     */
    function withdrawDeposit(uint256 amount) external onlyVaultOwner nonReentrant {
        VaultCore storage v = vaults[msg.sender];
        require(v.state == VaultState.Active, "Can only withdraw while Active");
        require(amount > 0 && amount <= v.depositedETH, "Invalid amount");

        v.depositedETH -= amount;

        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        require(ok, "Withdrawal failed");

        emit OwnerWithdrew(msg.sender, amount);
    }

    /**
     * @notice Anyone can call this to move the vault into grace period once the
     *         owner's inactivity threshold has passed.
     * @param owner The vault owner to check.
     */
    function triggerGracePeriod(address owner) external vaultExists(owner) {
        VaultCore storage v = vaults[owner];
        require(v.state == VaultState.Active, "Vault must be in Active state");
        require(
            block.timestamp >= v.lastPing + v.inactivityThreshold,
            "Owner is still within the activity window"
        );

        v.state            = VaultState.GracePeriod;
        v.gracePeriodStart = block.timestamp;

        emit GracePeriodStarted(owner, block.timestamp + v.gracePeriodDuration);
    }

    /**
     * @notice Beneficiary calls this to release the legacy once the grace period
     *         has fully expired. If multiSig is enabled, requires up to 2
     *         confirmations (capped at the beneficiary count so a single-
     *         beneficiary vault can never deadlock).
     *
     * @dev Uses the pull-payment pattern: rather than pushing ETH to every
     *      beneficiary in one transaction (where a single reverting recipient
     *      would block the whole release), this credits each beneficiary's share
     *      to `pendingWithdrawals`. Each beneficiary then calls withdraw() to
     *      pull their own funds. `nonReentrant` is defense-in-depth; the function
     *      already follows checks-effects-interactions (no external calls here).
     * @param owner The vault owner whose legacy to release.
     */
    function claimLegacy(address owner) external vaultExists(owner) nonReentrant {
        VaultCore storage v = vaults[owner];
        require(v.state == VaultState.GracePeriod, "Vault must be in GracePeriod state");
        require(
            block.timestamp >= v.gracePeriodStart + v.gracePeriodDuration,
            "Grace period has not ended yet"
        );

        // Verify the caller is a registered beneficiary
        Beneficiary[] storage bens = beneficiaryList[owner];
        bool isBen = false;
        for (uint256 i = 0; i < bens.length; i++) {
            if (bens[i].wallet == payable(msg.sender)) { isBen = true; break; }
        }
        require(isBen, "Caller is not a registered beneficiary");

        // MultiSig: require confirmations before releasing. Cap the requirement
        // at the beneficiary count so a vault with a single beneficiary (or any
        // count < 2) can never lock its funds waiting for a confirmation that
        // can never arrive.
        if (v.multiSig) {
            require(
                multiSigConfirmedEpoch[owner][msg.sender] != v.confirmationEpoch,
                "Already confirmed by this address"
            );
            multiSigConfirmedEpoch[owner][msg.sender] = v.confirmationEpoch;
            v.confirmationCount++;
            emit MultiSigConfirmed(owner, msg.sender, v.confirmationCount);
            uint256 required = bens.length < 2 ? bens.length : 2;
            if (v.confirmationCount < required) return; // Waiting for next confirmation
        }

        // ── Release (credit only — no external calls) ────────────────────────────
        v.state = VaultState.Released;
        uint256 totalETH = v.depositedETH;
        v.depositedETH   = 0;

        for (uint256 i = 0; i < bens.length; i++) {
            uint256 share = (totalETH * bens[i].shareBPS) / 10000;
            if (share > 0) {
                pendingWithdrawals[bens[i].wallet] += share;
                emit ShareCredited(owner, bens[i].wallet, share);
            }
        }

        emit LegacyReleased(owner, totalETH);
    }

    /**
     * @notice Withdraw all ETH credited to the caller from any released legacies.
     *         Each beneficiary pulls their own funds, so one address that reverts
     *         on receipt can never block another beneficiary's withdrawal.
     */
    function withdraw() external nonReentrant {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "Nothing to withdraw");

        // Effects before interaction (checks-effects-interactions).
        pendingWithdrawals[msg.sender] = 0;

        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        require(ok, "ETH withdrawal failed");

        emit Withdrawn(msg.sender, amount);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CHAINLINK AUTOMATION
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Called off-chain by Chainlink Automation nodes every block.
     *         Returns upkeepNeeded=true (and the first eligible owner address
     *         encoded as performData) when any Active vault has exceeded its
     *         inactivity threshold.
     *
     * @dev `vaultOwners` only ever grows, so scanning the whole array in one
     *      call would eventually exceed the gas bound and silently stop the
     *      automation for *every* vault. To stay scalable, `checkData` may
     *      encode a `(uint256 start, uint256 end)` index window — register one
     *      upkeep per window so each scan stays bounded. An empty `checkData`
     *      preserves the original behaviour and scans the full array.
     */
    function checkUpkeep(bytes calldata checkData)
        external
        view
        override
        returns (bool upkeepNeeded, bytes memory performData)
    {
        uint256 start = 0;
        uint256 end   = vaultOwners.length;
        if (checkData.length > 0) {
            (uint256 s, uint256 e) = abi.decode(checkData, (uint256, uint256));
            start = s;
            end   = e < vaultOwners.length ? e : vaultOwners.length;
        }

        for (uint256 i = start; i < end; i++) {
            address owner = vaultOwners[i];
            VaultCore storage v = vaults[owner];
            if (
                v.exists &&
                v.state == VaultState.Active &&
                block.timestamp >= v.lastPing + v.inactivityThreshold
            ) {
                return (true, abi.encode(owner));
            }
        }
        return (false, bytes(""));
    }

    /**
     * @notice Called on-chain by the Chainlink Automation node when
     *         checkUpkeep returns true. Decodes the owner address from
     *         performData and triggers their grace period.
     *         Reverts are silently swallowed by the Automation network, so
     *         we guard with the same conditions as checkUpkeep.
     */
    function performUpkeep(bytes calldata performData) external override {
        address owner = abi.decode(performData, (address));
        VaultCore storage v = vaults[owner];
        require(v.exists,                                                      "Vault does not exist");
        require(v.state == VaultState.Active,                                  "Vault not Active");
        require(block.timestamp >= v.lastPing + v.inactivityThreshold,        "Still within activity window");

        v.state            = VaultState.GracePeriod;
        v.gracePeriodStart = block.timestamp;

        emit GracePeriodStarted(owner, block.timestamp + v.gracePeriodDuration);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // VIEW FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────

    function hasVault(address owner) external view returns (bool) {
        return vaults[owner].exists;
    }

    function getVaultInfo(address owner)
        external view vaultExists(owner)
        returns (
            uint8   state,
            uint256 lastPing,
            uint256 inactivityThreshold,
            uint256 gracePeriodDuration,
            uint256 gracePeriodStart,
            uint256 depositedETH,
            bool    multiSig,
            uint256 beneficiaryCount
        )
    {
        VaultCore storage v = vaults[owner];
        return (
            uint8(v.state),
            v.lastPing,
            v.inactivityThreshold,
            v.gracePeriodDuration,
            v.gracePeriodStart,
            v.depositedETH,
            v.multiSig,
            beneficiaryList[owner].length
        );
    }

    function getBeneficiaries(address owner)
        external view vaultExists(owner)
        returns (
            address[] memory wallets,
            uint256[] memory shares,
            string[]  memory names
        )
    {
        Beneficiary[] storage bens = beneficiaryList[owner];
        uint256 len = bens.length;
        wallets = new address[](len);
        shares  = new uint256[](len);
        names   = new string[](len);
        for (uint256 i = 0; i < len; i++) {
            wallets[i] = bens[i].wallet;
            shares[i]  = bens[i].shareBPS;
            names[i]   = bens[i].name;
        }
    }

    function getNextPingDeadline(address owner)
        external view vaultExists(owner)
        returns (uint256)
    {
        VaultCore storage v = vaults[owner];
        return v.lastPing + v.inactivityThreshold;
    }

    function isGracePeriodOver(address owner)
        external view vaultExists(owner)
        returns (bool)
    {
        VaultCore storage v = vaults[owner];
        if (v.state != VaultState.GracePeriod) return false;
        return block.timestamp >= v.gracePeriodStart + v.gracePeriodDuration;
    }

    function getVaultCount() external view returns (uint256) {
        return vaultOwners.length;
    }

    /// @notice Read back the IPFS CIDs set via createVault()/updateSettings().
    ///         `vaults` is a private mapping (it embeds a Beneficiary[] elsewhere
    ///         in storage), so these two string fields need an explicit getter —
    ///         there is no Solidity-generated accessor for them.
    function getVaultCIDs(address owner)
        external view vaultExists(owner)
        returns (string memory metadataCID, string memory finalMessageCID)
    {
        VaultCore storage v = vaults[owner];
        return (v.metadataCID, v.finalMessageCID);
    }
}
