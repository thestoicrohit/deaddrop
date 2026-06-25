// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title DeadDropCapsules
 * @notice On-chain Memory Capsules — time-locked or condition-locked containers
 *         for photos, letters, and voice notes. Replaces the old localStorage
 *         `capsules` / `capsuleContent` / `reactions` mock domain.
 *
 * @dev As with DeadDropCircles, only IPFS CIDs of encrypted blobs are stored
 *      on-chain — never raw content. `unlockDate` is enforced by `isUnlocked()`;
 *      the frontend should refuse to decrypt/display content client-side until
 *      that returns true, but real secrecy comes from the AES key not being
 *      revealed (see src/lib/crypto.js), not from this check alone — anyone can
 *      always read public chain state.
 */
contract DeadDropCapsules {

    // ── Enums ────────────────────────────────────────────────────────────────
    enum CapsuleType  { Private, Shared, TimeLocked, Legacy }
    enum ContentType  { Photo, Letter, Voice }

    // ── Structs ──────────────────────────────────────────────────────────────
    struct Capsule {
        uint256     id;
        address     owner;
        string      title;
        CapsuleType capsuleType;
        string      contentPreview;
        uint256     circleId;     // 0 = not linked to a circle
        uint256     createdAt;
        uint256     unlockDate;   // 0 = no time lock
        bool        exists;
    }

    struct ContentItem {
        uint256     id;
        ContentType itemType;
        string      cid;     // IPFS CID of the encrypted blob
        string      label;   // short caption / filename (also encrypted client-side)
        uint256     addedAt;
    }

    // ── Storage ──────────────────────────────────────────────────────────────
    uint256 public capsuleCount;

    mapping(uint256 => Capsule)                    public  capsules;
    mapping(uint256 => ContentItem[])               private capsuleContent;
    mapping(address => uint256[])                   private ownerCapsules;

    // reactions[capsuleId] = [candleCount, heartCount, blossomCount]
    mapping(uint256 => uint256[3])                  private reactionCounts;
    // bit i set => msg.sender has reacted with reaction i on this capsule
    mapping(uint256 => mapping(address => uint8))   private userReactionBits;

    // ── Events ───────────────────────────────────────────────────────────────
    event CapsuleCreated (uint256 indexed capsuleId, address indexed owner, string title, CapsuleType capsuleType);
    event ContentAdded   (uint256 indexed capsuleId, uint256 indexed itemId, ContentType itemType, string cid);
    event ContentRemoved (uint256 indexed capsuleId, uint256 indexed itemId);
    event Reacted        (uint256 indexed capsuleId, address indexed reactor, uint8 reactionIndex, bool on);

    // ── Modifiers ────────────────────────────────────────────────────────────
    modifier capsuleExists(uint256 capsuleId) {
        require(capsules[capsuleId].exists, "Capsule does not exist");
        _;
    }

    modifier onlyOwner(uint256 capsuleId) {
        require(capsules[capsuleId].owner == msg.sender, "Not the capsule owner");
        _;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // WRITE FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────

    function createCapsule(
        string calldata title,
        CapsuleType capsuleType,
        string calldata contentPreview,
        uint256 circleId,
        uint256 unlockDate
    ) external returns (uint256 capsuleId) {
        require(bytes(title).length > 0, "Title required");

        capsuleCount++;
        capsuleId = capsuleCount;

        capsules[capsuleId] = Capsule({
            id:             capsuleId,
            owner:          msg.sender,
            title:          title,
            capsuleType:    capsuleType,
            contentPreview: contentPreview,
            circleId:       circleId,
            createdAt:      block.timestamp,
            unlockDate:     unlockDate,
            exists:         true
        });
        ownerCapsules[msg.sender].push(capsuleId);

        emit CapsuleCreated(capsuleId, msg.sender, title, capsuleType);
    }

    function updateCapsule(
        uint256 capsuleId,
        string calldata title,
        string calldata contentPreview
    ) external capsuleExists(capsuleId) onlyOwner(capsuleId) {
        Capsule storage c = capsules[capsuleId];
        c.title          = title;
        c.contentPreview = contentPreview;
    }

    function deleteCapsule(uint256 capsuleId) external capsuleExists(capsuleId) onlyOwner(capsuleId) {
        capsules[capsuleId].exists = false;
    }

    function addContent(
        uint256 capsuleId,
        ContentType itemType,
        string calldata cid,
        string calldata label
    ) external capsuleExists(capsuleId) onlyOwner(capsuleId) returns (uint256 itemId) {
        require(bytes(cid).length > 0, "CID required");

        itemId = capsuleContent[capsuleId].length;
        capsuleContent[capsuleId].push(ContentItem({
            id:      itemId,
            itemType: itemType,
            cid:      cid,
            label:    label,
            addedAt:  block.timestamp
        }));

        emit ContentAdded(capsuleId, itemId, itemType, cid);
    }

    function removeContent(uint256 capsuleId, uint256 itemId)
        external capsuleExists(capsuleId) onlyOwner(capsuleId)
    {
        ContentItem[] storage items = capsuleContent[capsuleId];
        require(itemId < items.length, "Invalid item id");

        uint256 lastIdx = items.length - 1;
        if (itemId != lastIdx) {
            items[itemId] = items[lastIdx];
            items[itemId].id = itemId;
        }
        items.pop();

        emit ContentRemoved(capsuleId, itemId);
    }

    /// @notice Toggle a reaction. reactionIndex: 0 = candle, 1 = heart, 2 = blossom.
    function react(uint256 capsuleId, uint8 reactionIndex) external capsuleExists(capsuleId) {
        require(reactionIndex < 3, "Invalid reaction index");

        uint8 bit  = uint8(1 << reactionIndex);
        uint8 bits = userReactionBits[capsuleId][msg.sender];
        bool wasOn = (bits & bit) != 0;

        if (wasOn) {
            userReactionBits[capsuleId][msg.sender] = bits & ~bit;
            if (reactionCounts[capsuleId][reactionIndex] > 0) {
                reactionCounts[capsuleId][reactionIndex] -= 1;
            }
        } else {
            userReactionBits[capsuleId][msg.sender] = bits | bit;
            reactionCounts[capsuleId][reactionIndex] += 1;
        }

        emit Reacted(capsuleId, msg.sender, reactionIndex, !wasOn);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // VIEW FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────

    function getContent(uint256 capsuleId) external view capsuleExists(capsuleId) returns (ContentItem[] memory) {
        return capsuleContent[capsuleId];
    }

    function getMyCapsules(address owner) external view returns (uint256[] memory) {
        return ownerCapsules[owner];
    }

    function getReactions(uint256 capsuleId) external view returns (uint256[3] memory) {
        return reactionCounts[capsuleId];
    }

    function getUserReactions(uint256 capsuleId, address user) external view returns (uint8) {
        return userReactionBits[capsuleId][user];
    }

    function isUnlocked(uint256 capsuleId) external view capsuleExists(capsuleId) returns (bool) {
        Capsule memory c = capsules[capsuleId];
        if (c.unlockDate == 0) return true;
        return block.timestamp >= c.unlockDate;
    }

    function contentCount(uint256 capsuleId) external view capsuleExists(capsuleId) returns (uint256) {
        return capsuleContent[capsuleId].length;
    }
}
