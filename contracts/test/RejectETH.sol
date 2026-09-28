// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title RejectETH
 * @notice Test-only helper. A contract that reverts on any ETH it receives.
 *         Used to prove DeadDropVault's pull-payment release can't be bricked
 *         by a single beneficiary whose address refuses ETH.
 */
contract RejectETH {
    // No receive()/fallback() that accepts value, and this one reverts loudly
    // so a push-payment would fail.
    receive() external payable {
        revert("RejectETH: I reject all ETH");
    }

    /// @notice Pull funds from a vault on behalf of this contract.
    function withdrawFrom(address vault) external {
        (bool ok, ) = vault.call(abi.encodeWithSignature("withdraw()"));
        require(ok, "withdraw failed");
    }

    /// @notice Trigger a claim from this contract (it is the beneficiary).
    function claimFrom(address vault, address owner) external {
        (bool ok, ) = vault.call(abi.encodeWithSignature("claimLegacy(address)", owner));
        require(ok, "claim failed");
    }
}
