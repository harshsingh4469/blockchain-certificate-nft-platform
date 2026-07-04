require("dotenv").config();
const express = require("express");
const cors = require("cors");

const ipfsRoutes = require("./routes/ipfs");
const certificateRoutes = require("./routes/certificates");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ status: "ok", service: "cert-nft-backend (Secure6)" });
});

app.use("/api/ipfs", ipfsRoutes);
app.use("/api/certificates", certificateRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});
