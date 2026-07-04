const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CertificateNFT", function () {
  let contract, admin, institute, verifier, student, outsider;
  const SAMPLE_IPFS_HASH = "bafybeigdyrztxyz1234examplecertificatehash";

  beforeEach(async function () {
    [admin, institute, verifier, student, outsider] = await ethers.getSigners();

    const CertificateNFT = await ethers.getContractFactory("CertificateNFT");
    contract = await CertificateNFT.deploy(admin.address);
    await contract.waitForDeployment();

    await contract.connect(admin).addInstitute(institute.address);
    await contract.connect(admin).addVerifier(verifier.address);
  });

  it("does not mint until both institute and verifier approve", async function () {
    await contract.connect(institute).requestCertificate(student.address, SAMPLE_IPFS_HASH);

    const req = await contract.getRequest(1);
    expect(req.instituteApproved).to.equal(true);
    expect(req.verifierApproved).to.equal(false);
    expect(req.minted).to.equal(false);
    expect(await contract.totalCertificates()).to.equal(0);
  });

  it("mints the NFT to the student automatically after dual approval", async function () {
    await contract.connect(institute).requestCertificate(student.address, SAMPLE_IPFS_HASH);
    await expect(contract.connect(verifier).approveCertificate(1))
      .to.emit(contract, "CertificateMinted")
      .withArgs(1, 1, student.address, SAMPLE_IPFS_HASH);

    expect(await contract.ownerOf(1)).to.equal(student.address);
    expect(await contract.tokenURI(1)).to.equal(SAMPLE_IPFS_HASH);

    const [owner, ipfsHash, valid] = await contract.verifyCertificate(1);
    expect(owner).to.equal(student.address);
    expect(ipfsHash).to.equal(SAMPLE_IPFS_HASH);
    expect(valid).to.equal(true);
  });

  it("rejects requests from addresses without INSTITUTE_ROLE", async function () {
    await expect(
      contract.connect(outsider).requestCertificate(student.address, SAMPLE_IPFS_HASH)
    ).to.be.revertedWith(/AccessControl: account .* is missing role/);
  });

  it("rejects approvals from addresses without VERIFIER_ROLE", async function () {
    await contract.connect(institute).requestCertificate(student.address, SAMPLE_IPFS_HASH);
    await expect(
      contract.connect(outsider).approveCertificate(1)
    ).to.be.revertedWith(/AccessControl: account .* is missing role/);
  });

  it("prevents double approval / double minting of the same request", async function () {
    await contract.connect(institute).requestCertificate(student.address, SAMPLE_IPFS_HASH);
    await contract.connect(verifier).approveCertificate(1);
    await expect(contract.connect(verifier).approveCertificate(1)).to.be.revertedWith(
      "Already approved by a verifier"
    );
  });
});
