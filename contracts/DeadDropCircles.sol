// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title DeadDropCircles
 * @notice On-chain "Legacy Circles" — groups of people (family, friends,
 *         university, work, custom) who share a vault of files and a member
 *         roster. Replaces the old localStorage-only `profiles` /
 *         `profileMembers` / `profileFiles` / `profileTimeline` mock domain.
 *
 * @dev File *content* never lives on-chain — only an IPFS CID pointing at an
 *      AES-256-GCM encrypted blob (see src/lib/crypto.js + src/lib/ipfs.js on
 *      the frontend). The contract stores the CID, a non-sensitive filename,
 *      and size only. Every state change emits an event; the frontend's
 *      Activity Log reads those events directly instead of a local array.
 */
contract DeadDropCircles {

    // ── Enums ────────────────────────────────────────────────────────────────
    enum Role { Member, Admin }

    // ── Structs ──────────────────────────────────────────────────────────────
    struct Circle {
        uint256 id;
        address creator;
        string  name;
        string  circleType;     // "Family" | "University" | "Work" | "Custom"
        string  description;
        uint256 createdAt;
        bool    exists;
    }

    struct Member {
        address wallet;
        string  name;
        Role    role;
        uint256 joinedAt;
    }

    struct CircleFile {
        uint256 id;
        string  name;
        string  cid;          // IPFS CID of the encrypted blob
        string  fileType;     // extension / mime hint, e.g. "pdf"
        uint256 size;         // bytes, pre-encryption
        address uploader;
        uint256 uploadedAt;
    }

    // ── Storage ──────────────────────────────────────────────────────────────
    uint256 public circleCount;

    mapping(uint256 => Circle)                     public  circles;
    mapping(uint256 => Member[])                    private circleMembers;
    mapping(uint256 => mapping(address => uint256)) private memberIndex;     // 1-based, 0 = not a member
    mapping(uint256 => CircleFile[])                private circleFiles;
    mapping(address => uint256[])                   private membershipOf;    // circles a wallet belongs to

    // ── Events ───────────────────────────────────────────────────────────────
    event CircleCreated   (uint256 indexed circleId, address indexed creator, string name, string circleType);
    event MemberAdded     (uint256 indexed circleId, address indexed wallet, string name, Role role);
    event MemberRemoved   (uint256 indexed circleId, address indexed wallet);
    event FileUploaded    (uint256 indexed circleId, uint256 indexed fileId, address indexed uploader, string name, string cid);
    event FileRemoved     (uint256 indexed circleId, uint256 indexed fileId);
    event CircleUpdated   (uint256 indexed circleId);

    // ── Modifiers ────────────────────────────────────────────────────────────
    modifier circleExists(uint256 circleId) {
        require(circles[circleId].exists, "Circle does not exist");
        _;
    }

    modifier onlyMember(uint256 circleId) {
        require(memberIndex[circleId][msg.sender] != 0, "Not a member of this circle");
        _;
    }

    modifier onlyAdmin(uint256 circleId) {
        uint256 idx = memberIndex[circleId][msg.sender];
        require(idx != 0, "Not a member of this circle");
        require(circleMembers[circleId][idx - 1].role == Role.Admin, "Admin role required");
        _;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // WRITE FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Create a new circle. The creator is automatically its first Admin.
    function createCircle(
        string calldata name,
        string calldata circleType,
        string calldata description,
        string calldata creatorName
    ) external returns (uint256 circleId) {
        require(bytes(name).length > 0, "Name required");

        circleCount++;
        circleId = circleCount;

        circles[circleId] = Circle({
            id:          circleId,
            creator:     msg.sender,
            name:        name,
            circleType:  circleType,
            description: description,
            createdAt:   block.timestamp,
            exists:      true
        });

        circleMembers[circleId].push(Member({
            wallet:   msg.sender,
            name:     creatorName,
            role:     Role.Admin,
            joinedAt: block.timestamp
        }));
        memberIndex[circleId][msg.sender] = circleMembers[circleId].length; // = 1
        membershipOf[msg.sender].push(circleId);

        emit CircleCreated(circleId, msg.sender, name, circleType);
        emit MemberAdded(circleId, msg.sender, creatorName, Role.Admin);
    }

    /// @notice Update a circle's name/type/description. Admin only.
    function updateCircle(
        uint256 circleId,
        string calldata name,
        string calldata circleType,
        string calldata description
    ) external circleExists(circleId) onlyAdmin(circleId) {
        Circle storage c = circles[circleId];
        c.name        = name;
        c.circleType  = circleType;
        c.description = description;
        emit CircleUpdated(circleId);
    }

    /// @notice Add a member to a circle. Admin only.
    function addMember(
        uint256 circleId,
        address wallet,
        string calldata name,
        Role role
    ) external circleExists(circleId) onlyAdmin(circleId) {
        require(wallet != address(0), "Zero address");
        require(memberIndex[circleId][wallet] == 0, "Already a member");

        circleMembers[circleId].push(Member({
            wallet:   wallet,
            name:     name,
            role:     role,
            joinedAt: block.timestamp
        }));
        memberIndex[circleId][wallet] = circleMembers[circleId].length;
        membershipOf[wallet].push(circleId);

        emit MemberAdded(circleId, wallet, name, role);
    }

    /// @notice Join a circle yourself via an invite flow handled off-chain (the
    ///         frontend verifies an invite code before calling this).
    function joinCircle(uint256 circleId, string calldata name) external circleExists(circleId) {
        require(memberIndex[circleId][msg.sender] == 0, "Already a member");

        circleMembers[circleId].push(Member({
            wallet:   msg.sender,
            name:     name,
            role:     Role.Member,
            joinedAt: block.timestamp
        }));
        memberIndex[circleId][msg.sender] = circleMembers[circleId].length;
        membershipOf[msg.sender].push(circleId);

        emit MemberAdded(circleId, msg.sender, name, Role.Member);
    }

    /// @notice Remove a member. Admin only; admins cannot remove themselves this way.
    function removeMember(uint256 circleId, address wallet)
        external circleExists(circleId) onlyAdmin(circleId)
    {
        uint256 idx = memberIndex[circleId][wallet];
        require(idx != 0, "Not a member");
        require(wallet != msg.sender, "Use leaveCircle to remove yourself");

        uint256 lastIdx = circleMembers[circleId].length - 1;
        if (idx - 1 != lastIdx) {
            Member memory moved = circleMembers[circleId][lastIdx];
            circleMembers[circleId][idx - 1] = moved;
            memberIndex[circleId][moved.wallet] = idx;
        }
        circleMembers[circleId].pop();
        delete memberIndex[circleId][wallet];

        emit MemberRemoved(circleId, wallet);
    }

    /// @notice Upload a file reference (encrypted blob already pinned to IPFS by the frontend).
    function uploadFile(
        uint256 circleId,
        string calldata name,
        string calldata cid,
        string calldata fileType,
        uint256 size
    ) external circleExists(circleId) onlyMember(circleId) returns (uint256 fileId) {
        require(bytes(cid).length > 0, "CID required");

        fileId = circleFiles[circleId].length;
        circleFiles[circleId].push(CircleFile({
            id:         fileId,
            name:       name,
            cid:        cid,
            fileType:   fileType,
            size:       size,
            uploader:   msg.sender,
            uploadedAt: block.timestamp
        }));

        emit FileUploaded(circleId, fileId, msg.sender, name, cid);
    }

    /// @notice Remove a file. Only the uploader or a circle admin may do this.
    function removeFile(uint256 circleId, uint256 fileId)
        external circleExists(circleId) onlyMember(circleId)
    {
        CircleFile[] storage files = circleFiles[circleId];
        require(fileId < files.length, "Invalid file id");

        bool isUploader = files[fileId].uploader == msg.sender;
        uint256 idx      = memberIndex[circleId][msg.sender];
        bool isAdmin     = idx != 0 && circleMembers[circleId][idx - 1].role == Role.Admin;
        require(isUploader || isAdmin, "Not authorized to remove this file");

        uint256 lastIdx = files.length - 1;
        if (fileId != lastIdx) {
            files[fileId] = files[lastIdx];
            files[fileId].id = fileId; // keep array-index/id in sync after swap
        }
        files.pop();

        emit FileRemoved(circleId, fileId);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // VIEW FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────

    function getMembers(uint256 circleId) external view circleExists(circleId) returns (Member[] memory) {
        return circleMembers[circleId];
    }

    function getFiles(uint256 circleId) external view circleExists(circleId) returns (CircleFile[] memory) {
        return circleFiles[circleId];
    }

    function getMyCircles(address wallet) external view returns (uint256[] memory) {
        return membershipOf[wallet];
    }

    function isMemberOf(uint256 circleId, address wallet) external view returns (bool) {
        return memberIndex[circleId][wallet] != 0;
    }

    function memberCount(uint256 circleId) external view circleExists(circleId) returns (uint256) {
        return circleMembers[circleId].length;
    }

    function fileCount(uint256 circleId) external view circleExists(circleId) returns (uint256) {
        return circleFiles[circleId].length;
    }
}
