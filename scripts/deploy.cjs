const { ethers } = require("hardhat");
const fs   = require("fs");
const path = require("path");

// Deploys all six DeadDrop contracts and writes their addresses to
// deployments/<network>.json plus prints a ready-to-paste .env block.
//
// The contracts are independent of one another (no constructor wiring
// between them), so deployment order doesn't matter functionally — they're
// just listed in the order they appear in the app's feature set.
const CONTRACTS = [
  { key: "VAULT",       name: "DeadDropVault",       envVar: "VITE_VAULT_ADDRESS" },
  { key: "KEY_REGISTRY", name: "DeadDropKeyRegistry", envVar: "VITE_KEY_REGISTRY_ADDRESS" },
  { key: "CIRCLES",      name: "DeadDropCircles",     envVar: "VITE_CIRCLES_ADDRESS" },
  { key: "CAPSULES",     name: "DeadDropCapsules",    envVar: "VITE_CAPSULES_ADDRESS" },
  { key: "SAFE",         name: "DeadDropSafe",        envVar: "VITE_SAFE_ADDRESS" },
  { key: "CREDENTIALS",  name: "DeadDropCredentials", envVar: "VITE_CREDENTIALS_ADDRESS" },
];

async function main() {
  const [deployer] = await ethers.getSigners();
  const network     = await ethers.provider.getNetwork();

  console.log("=".repeat(60));
  console.log("DeadDrop — deploying all contracts");
  console.log("=".repeat(60));
  console.log("Network          :", network.name, `(chainId ${network.chainId})`);
  console.log("Deployer address :", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance :", ethers.formatEther(balance), "ETH");

  if (balance === 0n) {
    console.error("\n❌  Deployer wallet has 0 ETH.");
    console.error("Get Sepolia ETH from: https://sepoliafaucet.com\n");
    process.exit(1);
  }

  const deployed = {};

  for (const { key, name } of CONTRACTS) {
    console.log(`\nDeploying ${name}...`);
    const Factory   = await ethers.getContractFactory(name);
    const contract   = await Factory.deploy();
    await contract.waitForDeployment();
    const address    = await contract.getAddress();
    deployed[key]    = { name, address };
    console.log(`✅  ${name} deployed at ${address}`);
  }

  // ── Persist addresses to deployments/<network>.json ──────────────────────
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) fs.mkdirSync(deploymentsDir);

  const outFile = path.join(deploymentsDir, `${network.name === "unknown" ? network.chainId : network.name}.json`);
  const record  = {
    network: network.name,
    chainId: Number(network.chainId),
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    contracts: deployed,
  };
  fs.writeFileSync(outFile, JSON.stringify(record, null, 2));

  console.log("\n" + "=".repeat(60));
  console.log("Saved deployment record:", path.relative(process.cwd(), outFile));
  console.log("=".repeat(60));

  console.log("\nNext step — paste these into your .env (frontend):\n");
  for (const { envVar, key } of CONTRACTS) {
    console.log(`${envVar}=${deployed[key].address}`);
  }

  console.log("\nVerify on Etherscan (sepolia only):");
  for (const { name, key } of CONTRACTS) {
    console.log(`npx hardhat verify --network sepolia ${deployed[key].address}  # ${name}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
