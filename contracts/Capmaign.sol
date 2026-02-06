// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IONTToken {
    function mint(address to, uint256 amount) external;
    function remainingMintableSupply() external view returns (uint256);
}

contract Campaign is ReentrancyGuard {
    address public immutable feeRecipient;
    uint256 public constant PLATFORM_FEE_PERCENT = 3;

    address public immutable creator;
    IONTToken public immutable ontToken;
    uint256 public immutable goalWei;
    uint256 public immutable deadline;
    uint256 public immutable rate; 

    string public title;

    uint256 public totalRaised;
    bool public finalized;
    bool public successful;

    mapping(address => uint256) public contributions;

    // Events
    event Contributed(address indexed contributor, uint256 amountWei);
    event RewardMinted(address indexed contributor, uint256 ethAmount, uint256 expectedReward, uint256 mintedReward, uint256 remainingSupply);
    event Cancelled(address indexed contributor, uint256 amountWei);
    event Finalized(bool successful, uint256 totalRaised);
    event CreatorWithdrawn(address indexed creator, uint256 amountWei);
    event FeePaid(address indexed recipient, uint256 amountWei);
    event Refunded(address indexed contributor, uint256 amountWei);

    // Errors
    error ZeroValue();
    error DeadlinePassed();
    error AlreadyFinalized();
    error NotCreator();
    error NotSuccessful();
    error CampaignSuccessful();
    error NothingToRefund();
    error CampaignStillActive();

    constructor(
        address _creator,
        string memory _title,
        uint256 _goalWei,
        uint256 _deadline,
        address _ontToken,
        uint256 _rate,
        address _feeRecipient
    ) {
        creator = _creator;
        title = _title;
        goalWei = _goalWei;
        deadline = _deadline;
        ontToken = IONTToken(_ontToken);
        rate = _rate;
        feeRecipient = _feeRecipient;
    }

    function _autoFinalize() internal {
        if (!finalized && block.timestamp >= deadline) {
            finalized = true;
            successful = totalRaised >= goalWei;
            emit Finalized(successful, totalRaised);
        }
    }

    // New Donate Logic: PARTIAL Minting
    function contribute() external payable nonReentrant {
        if (finalized) revert AlreadyFinalized();
        if (block.timestamp >= deadline) revert DeadlinePassed();
        if (msg.value == 0) revert ZeroValue();

        // 1. Accept ETH
        contributions[msg.sender] += msg.value;
        totalRaised += msg.value;

        emit Contributed(msg.sender, msg.value);

        // 2. Calculate Reward
        uint256 expectedReward = msg.value * rate;
        uint256 remaining = ontToken.remainingMintableSupply();
        uint256 mintedAmount = 0;

        // 3. Partial Mint Logic
        if (remaining > 0) {
            if (remaining >= expectedReward) {
                mintedAmount = expectedReward;
            } else {
                mintedAmount = remaining; // Mint whatever is left
            }
            // Mint tokens
            ontToken.mint(msg.sender, mintedAmount);
        }

        emit RewardMinted(msg.sender, msg.value, expectedReward, mintedAmount, remaining > mintedAmount ? remaining - mintedAmount : 0);

        // 4. Check Goal
        if (totalRaised >= goalWei) {
            finalized = true;
            successful = true;
            emit Finalized(true, totalRaised);
        }
    }

    function cancelContribution() external nonReentrant {
        if (finalized) revert AlreadyFinalized();
        if (block.timestamp >= deadline) revert DeadlinePassed();

        uint256 amount = contributions[msg.sender];
        if (amount == 0) revert NothingToRefund();

        contributions[msg.sender] = 0;
        totalRaised -= amount;

        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        require(ok, "ETH transfer failed");

        emit Cancelled(msg.sender, amount);
    }

    function withdrawCreator() external nonReentrant {
        _autoFinalize();
        
        if (!finalized) revert CampaignStillActive();
        if (!successful) revert NotSuccessful();
        if (msg.sender != creator) revert NotCreator();

        uint256 totalBalance = address(this).balance;
        uint256 fee = (totalBalance * PLATFORM_FEE_PERCENT) / 100;
        uint256 creatorShare = totalBalance - fee;

        // 1. Pay Platform Fee to deployer/treasury
        (bool feeOk, ) = payable(feeRecipient).call{value: fee}("");
        require(feeOk, "Fee transfer failed");
        emit FeePaid(feeRecipient, fee);

        // 2. Pay Creator
        (bool ok, ) = payable(creator).call{value: creatorShare}("");
        require(ok, "ETH transfer failed");

        emit CreatorWithdrawn(creator, creatorShare);
    }

    function refund() external nonReentrant {
        _autoFinalize();
        
        if (!finalized) revert CampaignStillActive();
        if (successful) revert CampaignSuccessful();

        uint256 amount = contributions[msg.sender];
        if (amount == 0) revert NothingToRefund();

        contributions[msg.sender] = 0;

        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        require(ok, "ETH transfer failed");

        emit Refunded(msg.sender, amount);
    }

    function getSummary()
        external
        view
        returns (
            address _creator,
            string memory _title,
            uint256 _goalWei,
            uint256 _deadline,
            uint256 _totalRaised,
            bool _finalized,
            bool _successful,
            uint256 _contractBalance
        )
    {
        bool _isFinalized = finalized || block.timestamp >= deadline;
        bool _isSuccessful = successful || (block.timestamp >= deadline && totalRaised >= goalWei);
        
        return (
            creator,
            title,
            goalWei,
            deadline,
            totalRaised,
            _isFinalized,
            _isSuccessful,
            address(this).balance
        );
    }
}
