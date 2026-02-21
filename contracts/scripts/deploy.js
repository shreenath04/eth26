const hre = require("hardhat");

async function main() {
  console.log("Deploying InvestmentPool...");
  const InvestmentPool = await hre.ethers.getContractFactory("InvestmentPool");
  const pool = await InvestmentPool.deploy();
  await pool.waitForDeployment();
  const address = await pool.getAddress();
  console.log("InvestmentPool deployed to:", address);
  console.log("Owner:", await pool.owner());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
