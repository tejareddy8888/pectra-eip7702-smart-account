// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {MultiSendCallOnly} from "./MultiSendCallOnly.sol";
import {ECDSA} from "./helpers/ECDSA.sol";
import {P256} from "./helpers/P256.sol";
import {WebAuthnP256} from "./helpers/WebAuthnP256.sol";

/// @title ExperimentDelegation
/// @author jxom <https://github.com/jxom>
/// @notice Experimental EIP-7702 delegation contract that allows authorized Keys to invoke calls on behalf of an Authority.
/// @dev WARNING: THIS CONTRACT IS AN EXPERIMENT AND HAS NOT BEEN AUDITED.
contract ExperimentDelegation is MultiSendCallOnly {
    ////////////////////////////////////////////////////////////////////////
    // Data Structures
    ////////////////////////////////////////////////////////////////////////

    /// @notice A Key that can be used to authorize calls.
    /// @custom:property authorized - Whether the key is authorized.
    /// @custom:property publicKey - ECDSA public key.
    /// @custom:property expiry - Unix timestamp at which the key expires.
    struct Key {
        bool authorized;
        uint256 expiry;
        ECDSA.PublicKey publicKey;
    }

    ////////////////////////////////////////////////////////////////////////
    // Errors
    ////////////////////////////////////////////////////////////////////////

    /// @notice Thrown when a key is expired.
    error KeyExpired();

    /// @notice Thrown when a key is not authorized.
    error KeyNotAuthorized();

    /// @notice Thrown when the sender is not the Authority.
    error InvalidAuthority();

    /// @notice Thrown when a signature is invalid.
    error InvalidSignature();

    ////////////////////////////////////////////////////////////////////////
    // Functions
    ////////////////////////////////////////////////////////////////////////

    /// @notice List of keys associated with the Authority.
    Key[] public keys;

    /// @notice Internal nonce used for replay protection.
    uint256 public nonce;

    /// @notice Authorizes a new public key.
    /// @param publicKey - The public key to authorize.
    /// @param expiry - The Unix timestamp at which the key expires.
    function authorize(ECDSA.PublicKey calldata publicKey, uint256 expiry) public returns (uint32 keyIndex) {
        if (msg.sender != address(this)) revert InvalidAuthority();

        Key memory key = Key({authorized: true, expiry: expiry, publicKey: publicKey});
        keys.push(key);

        return uint32(keys.length - 1);
    }

    /// @notice Authorizes a new public key on behalf of the Authority, provided the Authority's signature.
    /// @param publicKey - The public key to authorize.
    /// @param expiry - The Unix timestamp at which the key expires.
    /// @param signature - EOA secp256k1 signature over the public key.
    function authorize(
        ECDSA.PublicKey calldata publicKey,
        uint256 expiry,
        ECDSA.RecoveredSignature calldata signature
    ) public returns (uint32 keyIndex) {
        bytes32 digest = keccak256(abi.encodePacked(nonce++, publicKey.x, publicKey.y, expiry));
        address signer = ecrecover(digest, signature.yParity == 0 ? 27 : 28, bytes32(signature.r), bytes32(signature.s));
        if (signer != address(this)) revert InvalidSignature();

        Key memory key = Key({authorized: true, expiry: expiry, publicKey: publicKey});
        keys.push(key);

        return uint32(keys.length - 1);
    }

    /// @notice Revokes an authorized public key.
    /// @param keyIndex - The index of the public key to revoke.
    function revoke(uint32 keyIndex) public {
        if (msg.sender != address(this)) revert InvalidAuthority();
        keys[keyIndex].authorized = false;
    }

    /// @notice Revokes an authorized public key on behalf of the Authority, provided the Authority's signature.
    /// @param keyIndex - The index of the public key to revoke.
    /// @param signature - EOA secp256k1 signature over the public key index.
    function revoke(uint32 keyIndex, ECDSA.RecoveredSignature calldata signature) public {
        bytes32 digest = keccak256(abi.encodePacked(nonce++, keyIndex));
        address signer = ecrecover(digest, signature.yParity == 0 ? 27 : 28, bytes32(signature.r), bytes32(signature.s));
        if (signer != address(this)) revert InvalidSignature();
        keys[keyIndex].authorized = false;
    }

    /// @notice Executes a set of calls.
    /// @param calls - The calls to execute.
    function execute(bytes memory calls) public {
        if (msg.sender != address(this)) revert InvalidAuthority();
        multiSend(calls);
    }

    /// @notice Executes a set of calls on behalf of the Authority, provided a P256 signature over the calls and a public key index.
    /// @param calls - The calls to execute.
    /// @param signature - The P256 signature over the calls: `p256.sign(keccak256(nonce ‖ calls))`.
    /// @param keyIndex - The index of the authorized public key to use.
    /// @param prehash - Whether to SHA-256 hash the digest.
    function execute(bytes memory calls, ECDSA.Signature memory signature, uint32 keyIndex, bool prehash) public {
        bytes32 digest = keccak256(abi.encodePacked(nonce++, calls));
        if (prehash) digest = sha256(abi.encodePacked(digest));

        Key memory key = keys[keyIndex];
        if (!key.authorized) revert KeyNotAuthorized();
        if (key.expiry > 0 && key.expiry < block.timestamp) revert KeyExpired();

        if (!P256.verify(digest, signature, key.publicKey)) {
            revert InvalidSignature();
        }

        multiSend(calls);
    }

    /// @notice Executes a set of calls on behalf of the Authority, provided a WebAuthn-wrapped P256 signature over the calls, the WebAuthn metadata, and an invoker index.
    /// @param calls - The calls to execute.
    /// @param signature - The WebAuthn-wrapped P256 signature over the calls: `p256.sign(keccak256(nonce ‖ calls))`.
    /// @param metadata - The WebAuthn metadata.
    /// @param keyIndex - The index of the authorized public key to use.
    function execute(bytes memory calls, ECDSA.Signature memory signature, WebAuthnP256.Metadata memory metadata, uint32 keyIndex) public {
        bytes32 challenge = keccak256(abi.encodePacked(nonce++, calls));

        Key memory key = keys[keyIndex];
        if (!key.authorized) revert KeyNotAuthorized();
        if (key.expiry > 0 && key.expiry < block.timestamp) revert KeyExpired();

        if (!WebAuthnP256.verify(challenge, metadata, signature, key.publicKey)) revert InvalidSignature();

        multiSend(calls);
    }

    fallback() external payable {}
    receive() external payable {}
}
