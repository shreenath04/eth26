// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title InvestmentPool
 * @notice DeFi pool: LPs deposit for shares; borrowers request loans; owner approves.
 */
contract InvestmentPool is Ownable, ReentrancyGuard {
    constructor() Ownable(msg.sender) {}

    uint256 public totalShares;
    uint256 public totalLoaned;
    uint256 public totalRepaid;
    uint256 public constant INTEREST_RATE_BPS = 500; // 5% = 500 bps
    uint256 public constant COLLATERAL_BPS = 15000;  // 150% = 15000 bps

    mapping(address => uint256) public lpShares;
    mapping(address => uint256[]) private _userLoanIds;

    enum LoanStatus {
        Requested,
        Approved,
        Withdrawn,
        Repaid,
        Denied,
        Defaulted
    }

    struct LoanRequest {
        address borrower;
        uint256 amount;
        uint256 durationDays;
        string purpose;
        LoanStatus status;
        uint256 requestTime;
        uint256 withdrawnAt;
        uint256 principalOwed;
        uint256 amountRepaid;
        uint256 collateral;
    }

    LoanRequest[] public loanRequests;

    event Deposit(address indexed lp, uint256 amount, uint256 shares);
    event LoanRequested(uint256 indexed id, address indexed borrower, uint256 amount, uint256 durationDays, string purpose);
    event LoanApproved(uint256 indexed id);
    event LoanDenied(uint256 indexed id);
    event LoanWithdrawn(uint256 indexed id, address indexed borrower, uint256 amount);
    event LoanRepaid(uint256 indexed id, uint256 amount);
    event LoanDefaulted(uint256 indexed id, uint256 collateralToPool, uint256 returnedToBorrower);
    event LPWithdraw(address indexed lp, uint256 amount, uint256 shares);

    error InsufficientBalance();
    error InsufficientCollateral();
    error InvalidAmount();
    error LoanNotApproved();
    error LoanNotRequested();
    error LoanNotFound();
    error Unauthorized();
    error InsufficientLiquidity();

    /// @notice Deposit ETH, receive LP shares
    function deposit() external payable nonReentrant {
        if (msg.value == 0) revert InvalidAmount();
        uint256 shares;
        if (totalShares == 0) {
            shares = msg.value;
        } else {
            uint256 poolBalance = address(this).balance - msg.value;
            shares = (msg.value * totalShares) / poolBalance;
        }
        totalShares += shares;
        lpShares[msg.sender] += shares;
        emit Deposit(msg.sender, msg.value, shares);
    }

    /// @notice Request a loan; must send 150% of amount as collateral (e.g. 10 ETH loan => 15 ETH collateral)
    function requestLoan(
        uint256 amount,
        uint256 durationDays,
        string calldata purposeTextOrHash
    ) external payable {
        if (amount == 0) revert InvalidAmount();
        uint256 requiredCollateral = (amount * COLLATERAL_BPS) / 10000;
        if (msg.value < requiredCollateral) revert InsufficientCollateral();
        if (address(this).balance + msg.value < amount) revert InsufficientBalance();

        uint256 id = loanRequests.length;
        loanRequests.push(
            LoanRequest({
                borrower: msg.sender,
                amount: amount,
                durationDays: durationDays,
                purpose: purposeTextOrHash,
                status: LoanStatus.Requested,
                requestTime: block.timestamp,
                withdrawnAt: 0,
                principalOwed: amount,
                amountRepaid: 0,
                collateral: msg.value
            })
        );
        _userLoanIds[msg.sender].push(id);
        emit LoanRequested(id, msg.sender, amount, durationDays, purposeTextOrHash);
    }

    /// @notice Owner approves a loan request
    function approveLoan(uint256 requestId) external onlyOwner {
        if (requestId >= loanRequests.length) revert LoanNotFound();
        LoanRequest storage req = loanRequests[requestId];
        if (req.status != LoanStatus.Requested) revert LoanNotRequested();
        if (address(this).balance < req.amount) revert InsufficientBalance();

        req.status = LoanStatus.Approved;
        emit LoanApproved(requestId);
    }

    /// @notice Owner denies a loan request; returns collateral to borrower
    function denyLoan(uint256 requestId) external onlyOwner nonReentrant {
        if (requestId >= loanRequests.length) revert LoanNotFound();
        LoanRequest storage req = loanRequests[requestId];
        if (req.status != LoanStatus.Requested) revert LoanNotRequested();
        req.status = LoanStatus.Denied;
        uint256 refund = req.collateral;
        req.collateral = 0;
        if (refund > 0) {
            (bool ok, ) = payable(req.borrower).call{ value: refund }("");
            require(ok, "Refund failed");
        }
        emit LoanDenied(requestId);
    }

    /// @notice Borrower withdraws approved loan
    function withdrawLoan(uint256 requestId) external nonReentrant {
        if (requestId >= loanRequests.length) revert LoanNotFound();
        LoanRequest storage req = loanRequests[requestId];
        if (req.status != LoanStatus.Approved) revert LoanNotApproved();
        if (msg.sender != req.borrower) revert Unauthorized();
        if (address(this).balance < req.amount) revert InsufficientLiquidity();

        req.status = LoanStatus.Withdrawn;
        req.withdrawnAt = block.timestamp;
        totalLoaned += req.amount;

        (bool ok, ) = payable(msg.sender).call{ value: req.amount }("");
        require(ok, "Transfer failed");
        emit LoanWithdrawn(requestId, msg.sender, req.amount);
    }

    /// @notice Borrower repays loan (principal + interest); on full repayment collateral is returned
    function repayLoan(uint256 requestId) external payable nonReentrant {
        if (requestId >= loanRequests.length) revert LoanNotFound();
        LoanRequest storage req = loanRequests[requestId];
        if (req.status != LoanStatus.Withdrawn) revert LoanNotApproved();
        if (msg.sender != req.borrower) revert Unauthorized();

        uint256 owed = getAmountOwed(requestId);
        if (msg.value < owed) revert InvalidAmount();

        req.amountRepaid += msg.value;
        totalRepaid += msg.value;

        if (msg.value >= owed) {
            req.status = LoanStatus.Repaid;
            uint256 collateralReturn = req.collateral;
            req.collateral = 0;
            if (collateralReturn > 0) {
                (bool ok, ) = payable(msg.sender).call{ value: collateralReturn }("");
                require(ok, "Collateral return failed");
            }
        }

        emit LoanRepaid(requestId, msg.value);
    }

    /// @notice Owner closes a defaulted loan: debt covered from collateral, remainder to pool; excess collateral to borrower
    function closeLoanAsDefault(uint256 requestId) external onlyOwner nonReentrant {
        if (requestId >= loanRequests.length) revert LoanNotFound();
        LoanRequest storage req = loanRequests[requestId];
        if (req.status != LoanStatus.Withdrawn) revert LoanNotApproved();

        uint256 owed = getAmountOwed(requestId);
        uint256 col = req.collateral;
        if (col == 0) revert InvalidAmount();

        req.collateral = 0;
        req.status = LoanStatus.Defaulted;
        totalRepaid += (owed < col ? owed : col);

        if (col > owed) {
            (bool ok, ) = payable(req.borrower).call{ value: col - owed }("");
            require(ok, "Return to borrower failed");
        }
        emit LoanDefaulted(requestId, (owed < col ? owed : col), (col > owed ? col - owed : 0));
    }

    /// @notice LP withdraws by burning shares
    function withdrawInvestment(uint256 sharesToBurn) external nonReentrant {
        if (sharesToBurn == 0 || lpShares[msg.sender] < sharesToBurn) revert InvalidAmount();
        uint256 poolBalance = address(this).balance;
        uint256 totalS = totalShares;
        uint256 amount = (sharesToBurn * poolBalance) / totalS;
        if (amount > availableLiquidity()) revert InsufficientLiquidity();

        lpShares[msg.sender] -= sharesToBurn;
        totalShares = totalS - sharesToBurn;

        (bool ok, ) = payable(msg.sender).call{ value: amount }("");
        require(ok, "Transfer failed");
        emit LPWithdraw(msg.sender, amount, sharesToBurn);
    }

    // ---- View functions ----

    function totalPoolBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /// @notice ETH available for new loans (balance minus reserved for Approved and locked collateral)
    function availableLiquidity() public view returns (uint256) {
        uint256 reserved;
        for (uint256 i = 0; i < loanRequests.length; i++) {
            LoanRequest storage r = loanRequests[i];
            if (r.status == LoanStatus.Approved) reserved += r.amount;
            if (r.status == LoanStatus.Requested || r.status == LoanStatus.Withdrawn) reserved += r.collateral;
        }
        uint256 balance = address(this).balance;
        return balance > reserved ? balance - reserved : 0;
    }

    /// @notice Amount owed for a withdrawn loan (principal + interest minus paid)
    function getAmountOwed(uint256 requestId) public view returns (uint256) {
        if (requestId >= loanRequests.length) revert LoanNotFound();
        LoanRequest storage req = loanRequests[requestId];
        if (req.status != LoanStatus.Withdrawn && req.status != LoanStatus.Repaid && req.status != LoanStatus.Defaulted) return 0;
        if (req.status == LoanStatus.Defaulted) return 0;
        uint256 principal = req.principalOwed;
        if (req.amountRepaid >= principal) return 0;
        uint256 principalRemaining = principal - req.amountRepaid;
        uint256 startTime = req.withdrawnAt > 0 ? req.withdrawnAt : req.requestTime;
        uint256 elapsed = block.timestamp - startTime;
        uint256 interest = (principalRemaining * INTEREST_RATE_BPS * elapsed) / (365 days * 10000);
        return principalRemaining + interest;
    }

    function getLoanRequest(uint256 id) external view returns (
        address borrower,
        uint256 amount,
        uint256 durationDays,
        string memory purpose,
        LoanStatus status,
        uint256 requestTime,
        uint256 withdrawnAt,
        uint256 principalOwed,
        uint256 amountRepaid,
        uint256 collateral
    ) {
        if (id >= loanRequests.length) revert LoanNotFound();
        LoanRequest storage r = loanRequests[id];
        return (
            r.borrower,
            r.amount,
            r.durationDays,
            r.purpose,
            r.status,
            r.requestTime,
            r.withdrawnAt,
            r.principalOwed,
            r.amountRepaid,
            r.collateral
        );
    }

    function getUserLoanIds(address user) external view returns (uint256[] memory) {
        return _userLoanIds[user];
    }

    function getLoanRequestCount() external view returns (uint256) {
        return loanRequests.length;
    }
}
