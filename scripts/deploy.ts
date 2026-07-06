import { ethers } from "ethers";
import * as fs from "fs";
import { fileURLToPath } from "url";
import * as path from "path";
import * as dotenv from "dotenv";
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CACHE_FILE = path.join(__dirname, "../deployed-addresses.json");

interface DeployedAddresses {
  rwa?: string;
  adminController?: string;
  investorController?: string;
  tenantController?: string;
  ownerController?: string;
}

function loadCache(): DeployedAddresses {
  if (fs.existsSync(CACHE_FILE)) {
    return JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
  }
  return {};
}

function saveCache(addresses: DeployedAddresses) {
  fs.writeFileSync(CACHE_FILE, JSON.stringify(addresses, null, 2));
}

function getArtifact(contractName: string) {
  const artifactPath = path.join(
    __dirname,
    `../artifacts/contracts/${contractName}.sol/${contractName}.json`
  );
  if (!fs.existsSync(artifactPath)) {
    throw new Error(`Artifact not found: ${artifactPath}\nRun: npx hardhat compile`);
  }
  return JSON.parse(fs.readFileSync(artifactPath, "utf8"));
}

async function deployIfNeeded(
  name: string,
  cachedAddress: string | undefined,
  signer: ethers.Wallet,
  constructorArgs: unknown[] = []
): Promise<{ address: string; contract: ethers.BaseContract }> {
  if (cachedAddress) {
    console.log(`⏭️  ${name} already deployed at: ${cachedAddress} (skipping)`);
    const artifact = getArtifact(name);
    const contract = new ethers.Contract(cachedAddress, artifact.abi, signer);
    return { address: cachedAddress, contract };
  }

  const artifact = getArtifact(name);
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, signer);

  console.log(`🚀 Deploying ${name}...`);
  const contract = await factory.deploy(...constructorArgs);
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log(`✅ ${name} deployed at: ${address}`);
  return { address, contract };
}

async function main() {
  const rpcUrl = process.env.SEPOLIA_RPC_URL;
  const privateKey = process.env.PRIVATE_KEY;

  if (!rpcUrl || !privateKey) {
    throw new Error("Missing SEPOLIA_RPC_URL or PRIVATE_KEY in .env");
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const signer = new ethers.Wallet(`0x${privateKey}`, provider);

  console.log("\n👛 Deploying from:", signer.address);
  console.log("─".repeat(50));

  const cache = loadCache();

  // 1. Deploy RealEstateRWA
  const { address: rwaAddress, contract: rwa } = await deployIfNeeded(
    "RealEstateRWA",
    cache.rwa,
    signer
  );
  cache.rwa = rwaAddress;
  saveCache(cache);

  // 2. Deploy AdminController
  const { address: adminAddress } = await deployIfNeeded(
    "AdminController",
    cache.adminController,
    signer,
    [rwaAddress]
  );
  cache.adminController = adminAddress;
  saveCache(cache);

  // 3. Deploy InvestorController
  const { address: investorAddress } = await deployIfNeeded(
    "InvestorController",
    cache.investorController,
    signer,
    [rwaAddress]
  );
  cache.investorController = investorAddress;
  saveCache(cache);

  // 4. Deploy TenantController
  const { address: tenantAddress } = await deployIfNeeded(
    "TenantController",
    cache.tenantController,
    signer,
    [rwaAddress]
  );
  cache.tenantController = tenantAddress;
  saveCache(cache);

  // 5. Deploy PropertyOwnerController
  const { address: ownerAddress } = await deployIfNeeded(
    "PropertyOwnerController",
    cache.ownerController,
    signer,
    [rwaAddress]
  );
  cache.ownerController = ownerAddress;
  saveCache(cache);

  // 6. Register controllers on RealEstateRWA
  console.log("\n📋 Registering controllers on RealEstateRWA...");
  console.log("─".repeat(50));

  const rwaArtifact = getArtifact("RealEstateRWA");
  const rwaContract = new ethers.Contract(rwaAddress, rwaArtifact.abi, signer);

  const adminControllerSet: boolean = await rwaContract.adminControllerSet();
  if (!adminControllerSet) {
    console.log("🔗 Setting AdminController...");
    const tx = await rwaContract.setAdminController(adminAddress);
    await tx.wait();
    console.log("✅ AdminController registered");
  } else {
    console.log("⏭️  AdminController already registered (skipping)");
  }

  const investorControllerSet: boolean = await rwaContract.investorControllerSet();
  if (!investorControllerSet) {
    console.log("🔗 Setting InvestorController...");
    const tx = await rwaContract.setInvestorController(investorAddress);
    await tx.wait();
    console.log("✅ InvestorController registered");
  } else {
    console.log("⏭️  InvestorController already registered (skipping)");
  }

  const tenantControllerSet: boolean = await rwaContract.tenantControllerSet();
  if (!tenantControllerSet) {
    console.log("🔗 Setting TenantController...");
    const tx = await rwaContract.setTenantController(tenantAddress);
    await tx.wait();
    console.log("✅ TenantController registered");
  } else {
    console.log("⏭️  TenantController already registered (skipping)");
  }

  const ownerControllerSet: boolean = await rwaContract.ownerControllerSet();
  if (!ownerControllerSet) {
    console.log("🔗 Setting PropertyOwnerController...");
    const tx = await rwaContract.setOwnerController(ownerAddress);
    await tx.wait();
    console.log("✅ PropertyOwnerController registered");
  } else {
    console.log("⏭️  PropertyOwnerController already registered (skipping)");
  }

  // 7. Summary
  console.log("\n" + "═".repeat(50));
  console.log("🎉 DEPLOYMENT COMPLETE");
  console.log("═".repeat(50));
  console.log(`RealEstateRWA          : ${rwaAddress}`);
  console.log(`AdminController        : ${adminAddress}`);
  console.log(`InvestorController     : ${investorAddress}`);
  console.log(`TenantController       : ${tenantAddress}`);
  console.log(`PropertyOwnerController: ${ownerAddress}`);
  console.log("═".repeat(50));
  console.log(`\n📄 Addresses saved to: deployed-addresses.json`);
}

main().catch((error) => {
  console.error("\n❌ Deployment failed:", error);
  process.exit(1);
});