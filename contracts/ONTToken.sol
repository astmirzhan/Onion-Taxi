// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract ONTToken is ERC20, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    
    // 1. Fixed Max Supply = 50,000,000 ONT
    uint256 public constant MAX_SUPPLY = 50_000_000 * 10**18;
    
    error CapExceeded();

    constructor(address treasury) ERC20("Onion Taxi Token", "ONT") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        
        // 2. Mint 20% (10M) to Treasury immediately
        uint256 treasuryAmount = (MAX_SUPPLY * 20) / 100; // 10,000,000
        _mint(treasury, treasuryAmount);
    }

    // 3. Official mint function with CAP check
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        if (totalSupply() + amount > MAX_SUPPLY) {
            revert CapExceeded();
        }
        _mint(to, amount);
    }

    // 4. Helper to check how many tokens can still be minted
    function remainingMintableSupply() external view returns (uint256) {
        if (totalSupply() >= MAX_SUPPLY) {
            return 0;
        }
        return MAX_SUPPLY - totalSupply();
    }
}
