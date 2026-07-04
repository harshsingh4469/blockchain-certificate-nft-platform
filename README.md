# Secure6 — Blockchain-Based Academic Certificate NFT Platform

SIH 2025 · Problem Statement 25127 · Theme: Blockchain & Cybersecurity

A working prototype matching the idea submitted in the SIH deck: certificates
are issued as NFTs only after **dual verification** (the issuing Institute +
an external body like NPTEL/UGC/NAAC), with the certificate file itself
stored off-chain on **IPFS** and only the hash + verification state kept
on-chain for tamper-proof, low-cost verification.

## Architecture

```
contracts/CertificateNFT.sol   Solidity smart contract (OpenZeppelin ERC-721 + AccessControl)
scripts/deploy.js              Deploys the contract, optionally grants roles
test/CertificateNFT.test.js    Hardhat test suite

backend/                       Express API
  routes/ipfs.js               Uploads files/JSON to IPFS via Pinata
  routes/certificates.js       Read-only lookups (request status, verify, stats)
  server.js                    Entry point

frontend/                      Static demo UI (no build step)
  index.html / app.js          MetaMask + ethers.js — Institute / Verifier / Public Verify tabs
```

**Why the frontend talks to the contract directly (via MetaMask), not through
the backend:** institute and verifier wallets sign their own transactions —
their private keys never touch the server. The backend only handles the
IPFS upload (which needs a secret Pinata key) and public read-only lookups.

**Tech stack** (matches the SIH slide): Solidity + OpenZeppelin (ERC-721),
Hardhat (a modern, actively-maintained equivalent to Truffle/Ganache —
swap back to Truffle if your team prefers it), IPFS + Pinata, ethers.js,
MetaMask, Express/Node.js.

## How the flow works

1. **Institute** uploads the certificate file → gets back an IPFS hash →
   calls `requestCertificate(studentAddress, ipfsHash)`. Requires `INSTITUTE_ROLE`.
2. **External verifier** (NPTEL/UGC/NAAC) calls `approveCertificate(requestId)`.
   Requires `VERIFIER_ROLE`.
3. The moment both approvals exist, the contract **automatically mints** the
   NFT straight to the student's wallet — no separate mint transaction.
4. **Anyone** (employer, another institute) can verify a certificate by
   Token ID — no wallet needed, just a public read call.

## Setup

### 1. Smart contract

```bash
npm install
cp .env.example .env
# Fill in RPC_URL (e.g. Sepolia via Infura/Alchemy) and PRIVATE_KEY (deployer wallet)

npx hardhat test              # run the test suite
npx hardhat run scripts/deploy.js --network sepolia
```

Note the deployed contract address printed at the end.

> **No testnet ETH / API keys yet?** Run `npx hardhat node` in one terminal
> to spin up a local blockchain, then deploy with
> `npx hardhat run scripts/deploy.js --network localhost` in another. Import
> one of the printed local private keys into MetaMask (custom RPC
> `http://127.0.0.1:8545`, chain ID `31337`) to test end-to-end for free.

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env
# Fill in PINATA_API_KEY / PINATA_SECRET_API_KEY (free tier at pinata.cloud),
# RPC_URL, and CONTRACT_ADDRESS from the deploy step

npm start   # runs on http://localhost:4000
```

### 3. Frontend

Edit `frontend/config.js`:
- `CONTRACT_ADDRESS` → the address from step 1
- `BACKEND_URL` → `http://localhost:4000` (or wherever you host the backend)

Then just open `frontend/index.html` in a browser (or serve it with any
static server, e.g. `npx serve frontend`). Connect MetaMask to the same
network you deployed to.

### 4. Grant roles

The deploy script can auto-grant roles if you set `ISSUER_ADDRESS` /
`VERIFIER_ADDRESS` in the root `.env` before deploying. Otherwise, as the
contract admin, call `addInstitute(address)` / `addVerifier(address)`
manually (e.g. via a Hardhat console or a small script) with the wallet
addresses your institute and verifier will use in MetaMask.

## Demo script (for judges)

1. Connect MetaMask as the **institute** wallet → Institute tab → upload a
   sample certificate PDF → Request Certificate On-Chain → note the Request ID.
2. Switch MetaMask to the **verifier** wallet → Verifier tab → paste the
   Request ID → View Request (shows institute-approved, not yet minted) →
   Approve & Mint.
3. Switch to the **Public Verify** tab (no wallet needed) → enter the Token
   ID from step 2 → see the owner address and the IPFS-hosted certificate.

## Extending this prototype

- **PDF/image parsing** (mentioned in the slide's tech stack — pdfplumber,
  Pillow): add a small Python microservice that extracts text/metadata from
  uploaded certificates before pinning to IPFS, for automated field
  validation.
- **Firebase auth**: layer role-based login on top of wallet addresses for
  a friendlier institute/verifier onboarding flow.
- **Batch issuance**: add a `requestCertificateBatch` function for
  institutes issuing many certificates at once (reduces per-transaction
  gas overhead, addressing the "Blockchain Costs" challenge from the deck).
- **Algorand version**: the Solidity contract logic maps directly to
  Algorand's ASA + smart contract model if you want the faster/cheaper
  chain mentioned as an alternative on the slide.

## Security notes

- Institute/verifier roles are enforced on-chain via OpenZeppelin
  `AccessControl` — only the contract admin can grant/revoke them.
- The backend never holds institute/verifier private keys; all state-changing
  transactions are signed client-side via MetaMask.
- For production, put the Pinata keys behind proper secrets management and
  add rate-limiting/auth to the upload endpoints so only authenticated
  institutes can pin files.
