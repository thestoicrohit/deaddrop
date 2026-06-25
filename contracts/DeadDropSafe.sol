// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title DeadDropSafe
 * @notice On-chain Private Safe — per-wallet encrypted entries (crypto keys,
 *         letters, voice notes, passwords, documents, photos). Replaces the
 *         old localStorage-only `safeData` mock domain.
 *
 * @dev IMPORTANT privacy note: a public blockchain cannot hide *that* an entry
 *      exists — it can only hide its *content*. Both `label` and `cid` here
 *      MUST be ciphertext produced client-side (see src/lib/crypto.js) before
 *      this contract ever sees them. Only `category` and timestamps are
 *      readable in the clear on-chain (e.g. "this address has 3 CryptoKey
 *      entries created on these dates"), which is the disclosed trade-off of
 *      moving the safe fully on-chain instead of keeping it in localStorage.
 */
contract DeadDropSafe {

    enum SafeCategory { CryptoKey, Letter, VoiceNote, Password, Document, Photo }

    struct SafeEntry {
        uint256      id;
        SafeCategory category;
        string       label;   // ciphertext — never plaintext
        string       cid;     // IPFS CID of the encrypted blob (ciphertext payload)
        uint256       addedAt;
        bool          deleted;
    }

    mapping(address => SafeEntry[]) private entries;

    event SafeEntryAdded   (address indexed owner, uint256 indexed entryId, SafeCategory category);
    event SafeEntryRemoved (address indexed owner, uint256 indexed entryId);
    event SafeEntryUpdated (address indexed owner, uint256 indexed entryId);

    /// @notice Add an encrypted entry to the caller's own safe.
    function addEntry(
        SafeCategory category,
        string calldata label,
        string calldata cid
    ) external returns (uint256 entryId) {
        entryId = entries[msg.sender].length;
        entries[msg.sender].push(SafeEntry({
            id:       entryId,
            category: category,
            label:    label,
            cid:      cid,
            addedAt:  block.timestamp,
            deleted:  false
        }));

        emit SafeEntryAdded(msg.sender, entryId, category);
    }

    /// @notice Overwrite the label/cid of one of the caller's own entries (e.g. password rotation).
    function updateEntry(
        uint256 entryId,
        string calldata label,
        string calldata cid
    ) external {
        require(entryId < entries[msg.sender].length, "Invalid entry id");
        SafeEntry storage e = entries[msg.sender][entryId];
        require(!e.deleted, "Entry was deleted");
        e.label = label;
        e.cid   = cid;

        emit SafeEntryUpdated(msg.sender, entryId);
    }

    /// @notice Soft-delete one of the caller's own entries.
    function removeEntry(uint256 entryId) external {
        require(entryId < entries[msg.sender].length, "Invalid entry id");
        entries[msg.sender][entryId].deleted = true;

        emit SafeEntryRemoved(msg.sender, entryId);
    }

    /// @notice Returns every non-deleted entry of `category` belonging to `owner`.
    ///         Anyone can call this (it's a public ledger) — content is
    ///         meaningless without the owner's encryption key.
    function getEntries(address owner, SafeCategory category)
        external view returns (SafeEntry[] memory result)
    {
        SafeEntry[] storage all = entries[owner];
        uint256 count = 0;
        for (uint256 i = 0; i < all.length; i++) {
            if (!all[i].deleted && all[i].category == category) count++;
        }

        result = new SafeEntry[](count);
        uint256 j = 0;
        for (uint256 i = 0; i < all.length; i++) {
            if (!all[i].deleted && all[i].category == category) {
                result[j] = all[i];
                j++;
            }
        }
    }

    /// @notice Returns every non-deleted entry across all categories for `owner`.
    function getAllEntries(address owner) external view returns (SafeEntry[] memory result) {
        SafeEntry[] storage all = entries[owner];
        uint256 count = 0;
        for (uint256 i = 0; i < all.length; i++) {
            if (!all[i].deleted) count++;
        }

        result = new SafeEntry[](count);
        uint256 j = 0;
        for (uint256 i = 0; i < all.length; i++) {
            if (!all[i].deleted) {
                result[j] = all[i];
                j++;
            }
        }
    }

    function entryCount(address owner) external view returns (uint256) {
        return entries[owner].length;
    }
}
