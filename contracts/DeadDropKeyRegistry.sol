// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title DeadDropKeyRegistry
 * @notice On-chain registry mapping a wallet address to a secp256k1 *identity*
 *         public key, so that any other user (e.g. a vault owner) can encrypt a
 *         symmetric content key to a beneficiary's identity key (ECIES) before
 *         that beneficiary has ever interacted with them directly.
 *
 * @dev Why this isn't the wallet's native public key: browser wallets (MetaMask
 *      etc.) don't expose a raw ECDH/decrypt operation over the account's real
 *      private key, so a beneficiary could never reproduce the shared secret to
 *      decrypt anything wrapped to their *actual* wallet key. Instead, the
 *      frontend (src/lib/crypto.js) derives a deterministic, wallet-independent
 *      "identity keypair" as follows:
 *        1. The user signs one fixed, app-defined message with `personal_sign`
 *           (free — never touches the chain).
 *        2. `keccak256(signature)` becomes a 32-byte secp256k1 private scalar.
 *           Because step 1 is deterministic for a given wallet + message, the
 *           user can always re-derive the same scalar later just by signing
 *           again — no key storage, no key export needed.
 *        3. The corresponding public key is computed locally and registered
 *           here via `registerPublicKey()`.
 *      Anyone can then ECDH against this public key; only the original wallet
 *      owner can reproduce the private scalar (by re-signing) to decrypt.
 *      Binding to `msg.sender` comes from the transaction signature alone —
 *      there's no address-derivation relationship between this key and the
 *      wallet's real key, so none is checked here.
 */
contract DeadDropKeyRegistry {

    mapping(address => bytes) private publicKeys;

    event PublicKeyRegistered(address indexed wallet);

    /**
     * @notice Register the caller's uncompressed identity public key (64 bytes,
     *         no 0x04 prefix). See contract-level docs for how it's derived.
     */
    function registerPublicKey(bytes calldata pubKey) external {
        require(pubKey.length == 64, "Public key must be 64 bytes");

        publicKeys[msg.sender] = pubKey;
        emit PublicKeyRegistered(msg.sender);
    }

    /// @notice Returns the registered public key for `who`, or empty bytes if none.
    function getPublicKey(address who) external view returns (bytes memory) {
        return publicKeys[who];
    }

    /// @notice Whether `who` has registered a public key yet.
    function hasPublicKey(address who) external view returns (bool) {
        return publicKeys[who].length == 64;
    }
}
