const express = require("express");
const axios = require("axios");
const { ethers } = require("ethers");
const contractAbi = require("../contractAbi");

const router = express.Router();

function getContract() {
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  return new ethers.Contract(process.env.CONTRACT_ADDRESS, contractAbi, provider);
}

/**
 * GET /api/certificates/request/:requestId
 * Returns the on-chain CertificateRequest struct for a given requestId.
 */
router.get("/request/:requestId", async (req, res) => {
  try {
    const contract = getContract();
    const request = await contract.getRequest(req.params.requestId);
    res.json({
      student: request.student,
      institute: request.institute,
      verifier: request.verifier,
      ipfsHash: request.ipfsHash,
      instituteApproved: request.instituteApproved,
      verifierApproved: request.verifierApproved,
      minted: request.minted,
      tokenId: request.tokenId.toString()
    });
  } catch (err) {
    res.status(404).json({ error: "Request not found", detail: err.message });
  }
});

/**
 * GET /api/certificates/verify/:tokenId
 * Public verification endpoint: owner + IPFS metadata for a minted certificate NFT.
 * This is what an employer/university verifier would hit.
 */
router.get("/verify/:tokenId", async (req, res) => {
  try {
    const contract = getContract();
    const [owner, ipfsHash, valid] = await contract.verifyCertificate(req.params.tokenId);

    let metadata = null;
    try {
      const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
      const metaResp = await axios.get(ipfsUrl, { timeout: 8000 });
      metadata = metaResp.data;
    } catch (e) {
      // Metadata might be a raw file (PDF/image) rather than JSON — that's fine.
      metadata = { note: "Content is not JSON metadata (likely a raw file). View at gateway URL." };
    }

    res.json({
      tokenId: req.params.tokenId,
      owner,
      ipfsHash,
      gatewayUrl: `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
      valid,
      metadata
    });
  } catch (err) {
    res.status(404).json({ error: "Certificate not found or not yet minted", detail: err.message });
  }
});

/**
 * GET /api/certificates/stats
 * Quick dashboard numbers.
 */
router.get("/stats", async (req, res) => {
  try {
    const contract = getContract();
    const [totalRequests, totalCertificates] = await Promise.all([
      contract.totalRequests(),
      contract.totalCertificates()
    ]);
    res.json({
      totalRequests: totalRequests.toString(),
      totalCertificates: totalCertificates.toString()
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch stats", detail: err.message });
  }
});

module.exports = router;
