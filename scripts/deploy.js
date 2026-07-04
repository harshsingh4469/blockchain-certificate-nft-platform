const hre = require("hardhat");
require("dotenv").config();

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying CertificateNFT with account:", deployer.address);

  const CertificateNFT = await hre.ethers.getContractFactory("CertificateNFT");
  const contract = await CertificateNFT.deploy(deployer.address);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("CertificateNFT deployed to:", address);

  // Optionally grant roles right away if addresses are provided in .env
  const { ISSUER_ADDRESS, VERIFIER_ADDRESS } = process.env;

  if (ISSUER_ADDRESS) {
    const tx1 = await contract.addInstitute(ISSUER_ADDRESS);
    await tx1.wait();
    console.log("Granted INSTITUTE_ROLE to:", ISSUER_ADDRESS);
  }

  if (VERIFIER_ADDRESS) {
    const tx2 = await contract.addVerifier(VERIFIER_ADDRESS);
    await tx2.wait();
    console.log("Granted VERIFIER_ROLE to:", VERIFIER_ADDRESS);
  }

  console.log("\nSave this address into backend/.env and frontend/config.js:");
  console.log("CONTRACT_ADDRESS =", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
