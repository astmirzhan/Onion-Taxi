// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract ONTToken is ERC20, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    
    // --- CONSTANTS ---
    uint256 public constant MAX_SUPPLY = 30_000_000 * 10**18;
    
    error CapExceeded();

    // --- INITIALIZATION ---
    constructor(address treasury) ERC20("Onion Taxi Token", "ONT") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        
        // Treasury Allocation (20%)
        uint256 treasuryAmount = (MAX_SUPPLY * 20) / 100;
        _mint(treasury, treasuryAmount);
    }

    // --- MINT LOGIC ---
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        if (totalSupply() + amount > MAX_SUPPLY) {
            revert CapExceeded();
        }
        _mint(to, amount);
    }

    // --- VIEW FUNCTIONS ---
    function remainingMintableSupply() external view returns (uint256) {
        if (totalSupply() >= MAX_SUPPLY) {
            return 0;
        }
        return MAX_SUPPLY - totalSupply();
    }
}
