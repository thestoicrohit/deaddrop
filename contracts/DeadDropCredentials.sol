// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title DeadDropCredentials
 * @notice A minimal, self-contained ERC-721 implementation (no external
 *         dependencies) for the Organizations feature: universities and
 *         companies mint verifiable credential NFTs — degree certificates,
 *         offer letters, equity agreements — directly to a recipient's wallet.
 * @dev Implements ERC-721 (balanceOf, ownerOf, transfers, approvals,
 *      Transfer/Approval events) plus ERC-165 `supportsInterface`, so the
 *      tokens show up correctly in wallets and NFT explorers. Credential
 *      *content* (institution name, date, details) lives in a JSON file on
 *      IPFS — `tokenURI` resolves to `ipfs://<metadataCID>`.
 */
contract DeadDropCredentials {

    string public constant name   = "DeadDrop Credential";
    string public constant symbol = "DDCRED";

    struct Credential {
        uint256 tokenId;
        address issuer;
        address recipient;
        string  credentialType; // "Degree" | "OfferLetter" | "Equity" | custom
        string  title;
        string  metadataCID;    // IPFS JSON: { institution, date, details, ... }
        uint256 issuedAt;
        bool    revoked;
    }

    address public admin;
    uint256 public tokenCount;

    mapping(uint256 => Credential)                  public  credentials;
    mapping(uint256 => address)                      private _owners;
    mapping(address => uint256)                      private _balances;
    mapping(uint256 => address)                      private _tokenApprovals;
    mapping(address => mapping(address => bool))     private _operatorApprovals;
    mapping(address => bool)                         public  verifiedIssuers;
    mapping(address => uint256[])                    private recipientTokens;

    event Transfer            (address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval            (address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll      (address indexed owner, address indexed operator, bool approved);
    event IssuerStatusChanged (address indexed issuer, bool verified);
    event CredentialIssued    (uint256 indexed tokenId, address indexed issuer, address indexed recipient, string credentialType);
    event CredentialRevoked   (uint256 indexed tokenId);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    modifier onlyVerifiedIssuer() {
        require(verifiedIssuers[msg.sender], "Not a verified issuer");
        _;
    }

    constructor() {
        admin = msg.sender;
        verifiedIssuers[msg.sender] = true;
        emit IssuerStatusChanged(msg.sender, true);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ISSUER MANAGEMENT
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Admin verifies (or revokes) an organization's right to issue credentials.
    function setIssuer(address issuer, bool verified) external onlyAdmin {
        verifiedIssuers[issuer] = verified;
        emit IssuerStatusChanged(issuer, verified);
    }

    function transferAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "Zero address");
        admin = newAdmin;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CREDENTIAL ISSUANCE
    // ─────────────────────────────────────────────────────────────────────────

    function issueCredential(
        address recipient,
        string calldata credentialType,
        string calldata title,
        string calldata metadataCID
    ) external onlyVerifiedIssuer returns (uint256 tokenId) {
        require(recipient != address(0), "Zero address");

        tokenCount++;
        tokenId = tokenCount;

        credentials[tokenId] = Credential({
            tokenId:        tokenId,
            issuer:         msg.sender,
            recipient:      recipient,
            credentialType: credentialType,
            title:          title,
            metadataCID:    metadataCID,
            issuedAt:       block.timestamp,
            revoked:        false
        });

        _owners[tokenId] = recipient;
        _balances[recipient] += 1;
        recipientTokens[recipient].push(tokenId);

        emit Transfer(address(0), recipient, tokenId);
        emit CredentialIssued(tokenId, msg.sender, recipient, credentialType);
    }

    /// @notice The original issuer can revoke a credential it issued (e.g. correction of an error).
    ///         Revocation is a status flag, not a burn — the NFT remains in the holder's wallet
    ///         as a record, but `credentials[id].revoked` becomes true.
    function revokeCredential(uint256 tokenId) external {
        Credential storage c = credentials[tokenId];
        require(c.issuer == msg.sender, "Only the issuer can revoke");
        require(!c.revoked, "Already revoked");
        c.revoked = true;
        emit CredentialRevoked(tokenId);
    }

    function getCredentialsOf(address recipient) external view returns (uint256[] memory) {
        return recipientTokens[recipient];
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        require(_owners[tokenId] != address(0), "Nonexistent token");
        return string(abi.encodePacked("ipfs://", credentials[tokenId].metadataCID));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ERC-721 STANDARD INTERFACE
    // ─────────────────────────────────────────────────────────────────────────

    function balanceOf(address owner) external view returns (uint256) {
        require(owner != address(0), "Zero address");
        return _balances[owner];
    }

    function ownerOf(uint256 tokenId) public view returns (address) {
        address o = _owners[tokenId];
        require(o != address(0), "Nonexistent token");
        return o;
    }

    function approve(address to, uint256 tokenId) external {
        address owner_ = ownerOf(tokenId);
        require(
            msg.sender == owner_ || _operatorApprovals[owner_][msg.sender],
            "Not authorized to approve"
        );
        _tokenApprovals[tokenId] = to;
        emit Approval(owner_, to, tokenId);
    }

    function getApproved(uint256 tokenId) external view returns (address) {
        require(_owners[tokenId] != address(0), "Nonexistent token");
        return _tokenApprovals[tokenId];
    }

    function setApprovalForAll(address operator, bool approved) external {
        require(operator != msg.sender, "Cannot approve self");
        _operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function isApprovedForAll(address owner, address operator) external view returns (bool) {
        return _operatorApprovals[owner][operator];
    }

    function transferFrom(address from, address to, uint256 tokenId) public {
        require(ownerOf(tokenId) == from, "From is not the owner");
        require(to != address(0), "Zero address");
        require(
            msg.sender == from ||
            msg.sender == _tokenApprovals[tokenId] ||
            _operatorApprovals[from][msg.sender],
            "Not authorized to transfer"
        );

        delete _tokenApprovals[tokenId];
        _balances[from] -= 1;
        _balances[to]   += 1;
        _owners[tokenId] = to;

        emit Transfer(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes calldata data) external {
        transferFrom(from, to, tokenId);
        if (to.code.length > 0) {
            (bool ok, bytes memory ret) = to.call(
                abi.encodeWithSignature(
                    "onERC721Received(address,address,uint256,bytes)",
                    msg.sender, from, tokenId, data
                )
            );
            require(ok, "Receiver call failed");
            bytes4 selector = abi.decode(ret, (bytes4));
            require(selector == 0x150b7a02, "Receiver rejected token");
        }
    }

    function safeTransferFrom(address from, address to, uint256 tokenId) external {
        this.safeTransferFrom(from, to, tokenId, "");
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == 0x80ac58cd  // ERC721
            || interfaceId == 0x5b5e139f  // ERC721Metadata
            || interfaceId == 0x01ffc9a7; // ERC165
    }
}
