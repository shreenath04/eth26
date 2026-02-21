const { expect } = require("chai");
const { ethers } = require("hardhat");

// LoanStatus: Requested=0, Approved=1, Withdrawn=2, Repaid=3, Denied=4, Defaulted=5
// Collateral = 150% of loan amount
describe("InvestmentPool", function () {
  let pool;
  let owner;
  let depositor1;
  let depositor2;
  let borrower;

  beforeEach(async function () {
    [owner, depositor1, depositor2, borrower] = await ethers.getSigners();
    const InvestmentPool = await ethers.getContractFactory("InvestmentPool");
    pool = await InvestmentPool.deploy();
    await pool.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the deployer as owner", async function () {
      expect(await pool.owner()).to.equal(owner.address);
    });
  });

  describe("Deposits (LP)", function () {
    it("Should accept ETH and mint LP shares", async function () {
      await pool.connect(depositor1).deposit({ value: ethers.parseEther("10") });
      expect(await pool.lpShares(depositor1.address)).to.equal(ethers.parseEther("10"));
      expect(await pool.totalShares()).to.equal(ethers.parseEther("10"));
    });

    it("Should allow multiple depositors and prorate shares", async function () {
      await pool.connect(depositor1).deposit({ value: ethers.parseEther("10") });
      await pool.connect(depositor2).deposit({ value: ethers.parseEther("10") });
      expect(await pool.totalShares()).to.be.gte(ethers.parseEther("20"));
      expect(await pool.lpShares(depositor2.address)).to.be.gt(0n);
    });
  });

  describe("Withdrawals (LP)", function () {
    it("Should allow LP to withdraw by burning shares", async function () {
      await pool.connect(depositor1).deposit({ value: ethers.parseEther("10") });
      const shares = await pool.lpShares(depositor1.address);
      const before = await ethers.provider.getBalance(depositor1.address);
      const tx = await pool.connect(depositor1).withdrawInvestment(shares);
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      const after = await ethers.provider.getBalance(depositor1.address);
      expect(after).to.equal(before + ethers.parseEther("10") - gasUsed);
      expect(await pool.lpShares(depositor1.address)).to.equal(0n);
    });
  });

  describe("Loans", function () {
    beforeEach(async function () {
      await pool.connect(depositor1).deposit({ value: ethers.parseEther("100") });
    });

    it("Should allow loan requests with 150% collateral", async function () {
      await pool.connect(borrower).requestLoan(
        ethers.parseEther("10"),
        30,
        "Business expansion",
        { value: ethers.parseEther("15") }
      );
      const req = await pool.getLoanRequest(0);
      expect(req[0]).to.equal(borrower.address);
      expect(req[1]).to.equal(ethers.parseEther("10"));
      expect(req[4]).to.equal(0); // Requested
      expect(req[9]).to.equal(ethers.parseEther("15")); // collateral
    });

    it("Should allow owner to approve then borrower withdrawLoan", async function () {
      await pool.connect(borrower).requestLoan(
        ethers.parseEther("10"),
        30,
        "Personal",
        { value: ethers.parseEther("15") }
      );
      await pool.connect(owner).approveLoan(0);
      const reqAfter = await pool.getLoanRequest(0);
      expect(reqAfter[4]).to.equal(1); // Approved

      const before = await ethers.provider.getBalance(borrower.address);
      const tx = await pool.connect(borrower).withdrawLoan(0);
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      const after = await ethers.provider.getBalance(borrower.address);
      expect(after - before).to.equal(ethers.parseEther("10") - gasUsed);

      const reqFinal = await pool.getLoanRequest(0);
      expect(reqFinal[4]).to.equal(2); // Withdrawn
    });

    it("Should allow owner to deny loan and return collateral", async function () {
      await pool.connect(borrower).requestLoan(
        ethers.parseEther("10"),
        30,
        "Personal",
        { value: ethers.parseEther("15") }
      );
      const before = await ethers.provider.getBalance(borrower.address);
      const tx = await pool.connect(owner).denyLoan(0);
      const receipt = await tx.wait();
      const gasOwner = receipt.gasUsed * receipt.gasPrice;
      const after = await ethers.provider.getBalance(borrower.address);
      expect(after - before).to.equal(ethers.parseEther("15")); // collateral returned
      const req = await pool.getLoanRequest(0);
      expect(req[4]).to.equal(4); // Denied
    });

    it("Should allow borrower to repay after withdrawLoan and get collateral back", async function () {
      await pool.connect(borrower).requestLoan(
        ethers.parseEther("5"),
        30,
        "Personal",
        { value: ethers.parseEther("7.5") }
      );
      await pool.connect(owner).approveLoan(0);
      await pool.connect(borrower).withdrawLoan(0);

      const owed = await pool.getAmountOwed(0);
      const payAmount = owed + ethers.parseEther("0.01");
      const before = await ethers.provider.getBalance(borrower.address);
      const tx = await pool.connect(borrower).repayLoan(0, { value: payAmount });
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      const after = await ethers.provider.getBalance(borrower.address);
      // Borrower spent payAmount + gas, received 7.5 ETH collateral back
      expect(after).to.equal(before - payAmount - gasUsed + ethers.parseEther("7.5"));

      const req = await pool.getLoanRequest(0);
      expect(req[4]).to.equal(3); // Repaid
    });

    it("Should allow owner to close loan as default and keep collateral for debt", async function () {
      await pool.connect(borrower).requestLoan(
        ethers.parseEther("5"),
        30,
        "Default test",
        { value: ethers.parseEther("7.5") }
      );
      await pool.connect(owner).approveLoan(0);
      await pool.connect(borrower).withdrawLoan(0);
      await pool.connect(owner).closeLoanAsDefault(0);
      const req = await pool.getLoanRequest(0);
      expect(req[4]).to.equal(5); // Defaulted
    });
  });
});
