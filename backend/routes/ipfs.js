const express = require("express");
const multer = require("multer");
const axios = require("axios");
const FormData = require("form-data");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const PINATA_FILE_URL = "https://api.pinata.cloud/pinning/pinFileToIPFS";
const PINATA_JSON_URL = "https://api.pinata.cloud/pinning/pinJSONToIPFS";

function pinataHeaders() {
  if (process.env.PINATA_JWT) {
    return { Authorization: `Bearer ${process.env.PINATA_JWT}` };
  }
  return {
    pinata_api_key: process.env.PINATA_API_KEY,
    pinata_secret_api_key: process.env.PINATA_SECRET_API_KEY
  };
}

/**
 * POST /api/ipfs/upload-file
 * multipart/form-data with field "file" — e.g. the certificate PDF/image.
 * Returns { ipfsHash, url }
 */
router.post("/upload-file", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded (field name: file)" });

    const data = new FormData();
    data.append("file", req.file.buffer, { filename: req.file.originalname });

    const response = await axios.post(PINATA_FILE_URL, data, {
      maxBodyLength: Infinity,
      headers: { ...data.getHeaders(), ...pinataHeaders() }
    });

    const ipfsHash = response.data.IpfsHash;
    res.json({ ipfsHash, url: `https://gateway.pinata.cloud/ipfs/${ipfsHash}` });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "IPFS file upload failed", detail: err.response?.data || err.message });
  }
});

/**
 * POST /api/ipfs/upload-json
 * body: certificate metadata JSON, e.g.
 * { studentName, course, institute, issueDate, fileHash }
 * Returns { ipfsHash, url }
 */
router.post("/upload-json", async (req, res) => {
  try {
    const metadata = req.body;
    if (!metadata || Object.keys(metadata).length === 0) {
      return res.status(400).json({ error: "Empty metadata body" });
    }

    const response = await axios.post(PINATA_JSON_URL, metadata, {
      headers: { "Content-Type": "application/json", ...pinataHeaders() }
    });

    const ipfsHash = response.data.IpfsHash;
    res.json({ ipfsHash, url: `https://gateway.pinata.cloud/ipfs/${ipfsHash}` });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "IPFS JSON upload failed", detail: err.response?.data || err.message });
  }
});

module.exports = router;
