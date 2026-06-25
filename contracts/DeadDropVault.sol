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
    }

    // ── Storage ───────────────────────────────────────────────────────────────
    mapping(address => VaultCore)                     private vaults;
    mapping(address => Beneficiary[])                 private beneficiaryList;
    mapping(address => mapping(address => bool))      private multiSigConfirmed;
    address[]                                         public  vaultOwners;

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

    // ── Modifiers ─────────────────────────────────────────────────────────────
    modifier vaultExists(address owner) {
        require(vaults[owner].exists, "Vault does not exist");
        _;
    }

    modifier onlyVaultOwner() {
        require(vaults[msg.sender].exists, "No vault for this address. Call createVault first");
        _;
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
            emit GracePeriodCancelled(msg.sender);
        }

        v.lastPing = block.timestamp;
        emit PingRecorded(msg.sender, block.timestamp);
    }

    /**
     * @notice Update vault configuration. Can be called any time while Active.
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
        v.inactivityThreshold = _thresholdDays * 1 days;
        v.gracePeriodDuration = _graceDays     * 1 days;
        v.multiSig            = _multiSig;
        v.metadataCID         = _metadataCID;
        v.finalMessageCID     = _finalMessageCID;

        emit SettingsUpdated(msg.sender);
    }

    /**
     * @notice Set or replace the entire beneficiary list.
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

        uint256 total = 0;
        for (uint256 i = 0; i < _sharesBPS.length; i++) {
            require(_wallets[i] != address(0), "Zero address not allowed");
            total += _sharesBPS[i];
        }
        require(total == 10000, "Shares must sum to 10000 (100%)");

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
     *         when the legacy releases.
     */
    function depositETH() external payable onlyVaultOwner {
        require(msg.value > 0, "Must send ETH");
        vaults[msg.sender].depositedETH += msg.value;
        emit ETHDeposited(msg.sender, msg.value);
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
     * @notice Beneficiary calls this to claim the legacy ETH once the grace period
     *         has fully expired. If multiSig is enabled, requires 2 confirmations.
     * @param owner The vault owner whose legacy to claim.
     */
    function claimLegacy(address owner) external vaultExists(owner) {
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

        // MultiSig: need 2 beneficiary confirmations before releasing
        if (v.multiSig) {
            require(!multiSigConfirmed[owner][msg.sender], "Already confirmed by this address");
            multiSigConfirmed[owner][msg.sender] = true;
            v.confirmationCount++;
            emit MultiSigConfirmed(owner, msg.sender, v.confirmationCount);
            if (v.confirmationCount < 2) return; // Waiting for second confirmation
        }

        // ── Release ────────────────────────────────────────────────────────────
        v.state = VaultState.Released;
        uint256 totalETH = v.depositedETH;
        v.depositedETH   = 0;

        for (uint256 i = 0; i < bens.length; i++) {
            uint256 share = (totalETH * bens[i].shareBPS) / 10000;
            if (share > 0) {
                (bool ok, ) = bens[i].wallet.call{value: share}("");
                require(ok, "ETH transfer to beneficiary failed");
            }
        }

        emit LegacyReleased(owner, totalETH);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CHAINLINK AUTOMATION
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Called off-chain by Chainlink Automation nodes every block.
     *         Returns upkeepNeeded=true (and the first eligible owner address
     *         encoded as performData) when any Active vault has exceeded its
     *         inactivity threshold. `checkData` is unused.
     */
    function checkUpkeep(bytes calldata /* checkData */)
        external
        view
        override
        returns (bool upkeepNeeded, bytes memory performData)
    {
        for (uint256 i = 0; i < vaultOwners.length; i++) {
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
