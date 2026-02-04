// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";


interface IONTToken {
    function mint(address to, uint256 amount) external;
}

contract Campaign is ReentrancyGuard {
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

    event Contributed(address indexed contributor, uint256 amountWei, uint256 mintedOnt);
    event Finalized(bool successful, uint256 totalRaised);
    event CreatorWithdrawn(address indexed creator, uint256 amountWei);
    event Refunded(address indexed contributor, uint256 amountWei);


    error ZeroValue();
    error DeadlinePassed();
    error DeadlineNotReached();
    error AlreadyFinalized();
    error NotFinalized();
    error NotCreator();
    error NotSuccessful();
    error CampaignSuccessful();
    error NothingToRefund();

    constructor(
        address _creator,
        string memory _title,
        uint256 _goalWei,
        uint256 _deadline,
        address _ontToken,
        uint256 _rate
    ) {
        creator = _creator;
        title = _title;
        goalWei = _goalWei;
        deadline = _deadline;
        ontToken = IONTToken(_ontToken);
        rate = _rate;
    }


    function contribute() external payable nonReentrant {
        if (finalized) revert AlreadyFinalized();
        if (block.timestamp >= deadline) revert DeadlinePassed();
        if (msg.value == 0) revert ZeroValue();

        contributions[msg.sender] += msg.value;
        totalRaised += msg.value;

        uint256 mintAmount = msg.value * rate;
        ontToken.mint(msg.sender, mintAmount);

        emit Contributed(msg.sender, msg.value, mintAmount);
    }


    function finalize() external {
        if (block.timestamp < deadline) revert DeadlineNotReached();
        if (finalized) revert AlreadyFinalized();

        finalized = true;
        successful = totalRaised >= goalWei;

        emit Finalized(successful, totalRaised);
    }

    function withdrawCreator() external nonReentrant {
        if (!finalized) revert NotFinalized();
        if (!successful) revert NotSuccessful();
        if (msg.sender != creator) revert NotCreator();

        uint256 amount = address(this).balance;

        (bool ok, ) = payable(creator).call{value: amount}("");
        require(ok, "ETH transfer failed");

        emit CreatorWithdrawn(creator, amount);
    }


    function refund() external nonReentrant {
        if (!finalized) revert NotFinalized();
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
        return (
            creator,
            title,
            goalWei,
            deadline,
            totalRaised,
            finalized,
            successful,
            address(this).balance
        );
    }
}
