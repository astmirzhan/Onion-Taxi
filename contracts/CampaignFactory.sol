// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Campaign.sol";

interface IONTAccessControl {
    function grantRole(bytes32 role, address account) external;
    function MINTER_ROLE() external view returns (bytes32);
}

/// @title Factory that allows anyone to create crowdfunding campaigns
contract CampaignFactory {
    address public immutable ontToken;
    uint256 public immutable rate;

    address[] private campaigns;

    event CampaignCreated(
        address indexed creator,
        address indexed campaign,
        string title,
        uint256 goalWei,
        uint256 deadline
    );

    constructor(address _ontToken, uint256 _rate) {
        ontToken = _ontToken;
        rate = _rate;
    }

    /// @notice Anyone can create a campaign. Campaign gets MINTER_ROLE to mint ONT rewards.
    function createCampaign(
        string memory title,
        uint256 goalWei,
        uint256 durationSeconds
    ) external returns (address campaignAddress) {
        require(durationSeconds > 0, "duration=0");

        uint256 deadline = block.timestamp + durationSeconds;

        Campaign campaign = new Campaign(
            msg.sender,
            title,
            goalWei,
            deadline,
            ontToken,
            rate
        );

        campaignAddress = address(campaign);

        // Factory must have admin rights for MINTER_ROLE (granted in deploy script)
        IONTAccessControl(ontToken).grantRole(
            IONTAccessControl(ontToken).MINTER_ROLE(),
            campaignAddress
        );

        campaigns.push(campaignAddress);

        emit CampaignCreated(msg.sender, campaignAddress, title, goalWei, deadline);
    }

    function getCampaigns() external view returns (address[] memory) {
        return campaigns;
    }

    function campaignsCount() external view returns (uint256) {
        return campaigns.length;
    }
}