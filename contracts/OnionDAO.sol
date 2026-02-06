// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title Simple DAO Gate + Staking for Voting (educational)
contract OnionDAO is ReentrancyGuard {
    IERC20 public immutable ont;

    // --- RULES ---
    uint256 public immutable MIN_BALANCE_TO_VOTE; // must hold at least this much
    uint256 public immutable MIN_STAKE_TO_VOTE;   // must stake at least this much to vote

    // --- STATE ---
    mapping(address => uint256) public staked;

    struct Proposal {
        string description;
        uint256 deadline;
        uint256 yesVotes;
        uint256 noVotes;
        bool executed;
    }

    Proposal[] public proposals;

    mapping(uint256 => mapping(address => bool)) public hasVoted;

    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event ProposalCreated(uint256 indexed proposalId, string description, uint256 deadline);
    event Voted(uint256 indexed proposalId, address indexed voter, bool support, uint256 weight);
    event Executed(uint256 indexed proposalId, bool passed);

    error AmountZero();
    error NotEligible();
    error StakeTooLow();
    error ProposalEnded();
    error ProposalNotEnded();
    error AlreadyVoted();
    error AlreadyExecuted();

    constructor(
        address ontToken,
        uint256 minBalanceToVote,
        uint256 minStakeToVote
    ) {
        ont = IERC20(ontToken);
        MIN_BALANCE_TO_VOTE = minBalanceToVote;
        MIN_STAKE_TO_VOTE = minStakeToVote;
    }

    // --- ELIGIBILITY CHECKS ---
    function isEligible(address user) public view returns (bool) {
        return ont.balanceOf(user) >= MIN_BALANCE_TO_VOTE;
    }

    function votingPower(address user) public view returns (uint256) {
        return staked[user];
    }

    // --- STAKING LOGIC ---
    function stake(uint256 amount) external nonReentrant {
        if (amount == 0) revert AmountZero();
        if (!isEligible(msg.sender)) revert NotEligible();

        // user must approve first: ont.approve(dao, amount)
        bool ok = ont.transferFrom(msg.sender, address(this), amount);
        require(ok, "transferFrom failed");

        staked[msg.sender] += amount;

        emit Staked(msg.sender, amount);
    }

    function unstake(uint256 amount) external nonReentrant {
        if (amount == 0) revert AmountZero();
        require(staked[msg.sender] >= amount, "not enough staked");

        staked[msg.sender] -= amount;

        bool ok = ont.transfer(msg.sender, amount);
        require(ok, "transfer failed");

        emit Unstaked(msg.sender, amount);
    }

    // --- GOVERNANCE LOGIC ---
    function createProposal(string calldata description, uint256 durationSeconds) external returns (uint256) {
        require(durationSeconds > 0, "duration=0");

        uint256 deadline = block.timestamp + durationSeconds;
        proposals.push(
            Proposal({
                description: description,
                deadline: deadline,
                yesVotes: 0,
                noVotes: 0,
                executed: false
            })
        );

        uint256 id = proposals.length - 1;
        emit ProposalCreated(id, description, deadline);
        return id;
    }

    function vote(uint256 proposalId, bool support) external {
        Proposal storage p = proposals[proposalId];

        if (block.timestamp >= p.deadline) revert ProposalEnded();
        if (hasVoted[proposalId][msg.sender]) revert AlreadyVoted();

        if (!isEligible(msg.sender)) revert NotEligible();
        if (staked[msg.sender] < MIN_STAKE_TO_VOTE) revert StakeTooLow();

        uint256 weight = votingPower(msg.sender); 
        hasVoted[proposalId][msg.sender] = true;

        if (support) p.yesVotes += weight;
        else p.noVotes += weight;

        emit Voted(proposalId, msg.sender, support, weight);
    }

    function execute(uint256 proposalId) external {
        Proposal storage p = proposals[proposalId];

        if (block.timestamp < p.deadline) revert ProposalNotEnded();
        if (p.executed) revert AlreadyExecuted();

        p.executed = true;

        bool passed = p.yesVotes > p.noVotes;
        emit Executed(proposalId, passed);
    }

    function proposalsCount() external view returns (uint256) {
        return proposals.length;
    }
}