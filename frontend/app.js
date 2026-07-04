let provider, signer, contract, connectedAddress;
let lastUploadedHash = null;

// ---------- Tabs ----------
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".panel").forEach((p) => p.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(`panel-${tab.dataset.tab}`).classList.add("active");
  });
});

// ---------- Wallet connect ----------
document.getElementById("connectBtn").addEventListener("click", connectWallet);

async function connectWallet() {
  if (!window.ethereum) {
    alert("MetaMask not found. Please install the MetaMask extension.");
    return;
  }
  provider = new ethers.BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  signer = await provider.getSigner();
  connectedAddress = await signer.getAddress();
  contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

  const network = await provider.getNetwork();
  document.getElementById("accountInfo").innerText =
    `Connected: ${connectedAddress.slice(0, 6)}...${connectedAddress.slice(-4)} (chainId ${network.chainId})`;
  document.getElementById("connectBtn").innerText = "Connected";
}

function log(elId, msg) {
  const el = document.getElementById(elId);
  el.innerText = `[${new Date().toLocaleTimeString()}] ${msg}\n` + el.innerText;
}

// ---------- INSTITUTE: upload to IPFS ----------
document.getElementById("uploadBtn").addEventListener("click", async () => {
  const fileInput = document.getElementById("certFile");
  if (!fileInput.files.length) {
    alert("Choose a certificate file first.");
    return;
  }
  const formData = new FormData();
  formData.append("file", fileInput.files[0]);

  log("instituteLog", "Uploading file to IPFS via backend...");
  try {
    const res = await fetch(`${BACKEND_URL}/api/ipfs/upload-file`, {
      method: "POST",
      body: formData
    });
    const data = await res.json();
    if (data.error) throw new Error(data.detail || data.error);

    lastUploadedHash = data.ipfsHash;
    log("instituteLog", `Uploaded! IPFS hash: ${data.ipfsHash}\nGateway: ${data.url}`);
    document.getElementById("requestBtn").disabled = false;
  } catch (err) {
    log("instituteLog", "Upload failed: " + err.message);
  }
});

// ---------- INSTITUTE: request certificate on-chain ----------
document.getElementById("requestBtn").addEventListener("click", async () => {
  if (!contract) return alert("Connect your wallet first.");
  const student = document.getElementById("studentAddress").value.trim();
  if (!ethers.isAddress(student)) return alert("Enter a valid student wallet address.");
  if (!lastUploadedHash) return alert("Upload the certificate to IPFS first.");

  try {
    log("instituteLog", "Sending requestCertificate transaction...");
    const tx = await contract.requestCertificate(student, lastUploadedHash);
    const receipt = await tx.wait();
    log("instituteLog", `Confirmed in block ${receipt.blockNumber}. Tx: ${receipt.hash}`);

    const event = receipt.logs
      .map((l) => { try { return contract.interface.parseLog(l); } catch { return null; } })
      .find((e) => e && e.name === "CertificateRequested");
    if (event) {
      log("instituteLog", `Request ID: ${event.args.requestId.toString()} — share this with the verifier.`);
    }
  } catch (err) {
    log("instituteLog", "Transaction failed: " + (err.reason || err.message));
  }
});

// ---------- VERIFIER: view request ----------
document.getElementById("viewRequestBtn").addEventListener("click", async () => {
  const id = document.getElementById("approveRequestId").value;
  if (!id) return alert("Enter a request ID.");
  try {
    const readContract = contract || new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider || new ethers.BrowserProvider(window.ethereum));
    const req = await readContract.getRequest(id);
    log("verifierLog",
      `Student: ${req.student}\nInstitute: ${req.institute}\nIPFS: ${req.ipfsHash}\n` +
      `Institute approved: ${req.instituteApproved}\nVerifier approved: ${req.verifierApproved}\n` +
      `Minted: ${req.minted}${req.minted ? ` (tokenId ${req.tokenId})` : ""}`
    );
  } catch (err) {
    log("verifierLog", "Lookup failed: " + err.message);
  }
});

// ---------- VERIFIER: approve & auto-mint ----------
document.getElementById("approveBtn").addEventListener("click", async () => {
  if (!contract) return alert("Connect your wallet first.");
  const id = document.getElementById("approveRequestId").value;
  if (!id) return alert("Enter a request ID.");

  try {
    log("verifierLog", "Sending approveCertificate transaction...");
    const tx = await contract.approveCertificate(id);
    const receipt = await tx.wait();
    log("verifierLog", `Confirmed in block ${receipt.blockNumber}. Tx: ${receipt.hash}`);

    const event = receipt.logs
      .map((l) => { try { return contract.interface.parseLog(l); } catch { return null; } })
      .find((e) => e && e.name === "CertificateMinted");
    if (event) {
      log("verifierLog", `🎉 NFT minted! Token ID: ${event.args.tokenId.toString()} to ${event.args.student}`);
    }
  } catch (err) {
    log("verifierLog", "Transaction failed: " + (err.reason || err.message));
  }
});

// ---------- PUBLIC: verify certificate ----------
document.getElementById("verifyBtn").addEventListener("click", async () => {
  const tokenId = document.getElementById("verifyTokenId").value;
  if (!tokenId) return alert("Enter a token ID.");

  document.getElementById("verifyResult").innerHTML = "";
  log("verifyLog", "Fetching certificate...");
  try {
    const res = await fetch(`${BACKEND_URL}/api/certificates/verify/${tokenId}`);
    const data = await res.json();
    if (data.error) throw new Error(data.detail || data.error);

    document.getElementById("verifyResult").innerHTML = `
      <div class="card">
        <div><span class="status-pill pill-yes">VALID</span></div>
        <div><b>Owner:</b> ${data.owner}</div>
        <div><b>IPFS Hash:</b> ${data.ipfsHash}</div>
        <div><b>View file:</b> <a href="${data.gatewayUrl}" target="_blank">${data.gatewayUrl}</a></div>
      </div>
    `;
    log("verifyLog", "Certificate found and verified on-chain.");
  } catch (err) {
    document.getElementById("verifyResult").innerHTML = `
      <div class="card"><span class="status-pill pill-no">NOT FOUND</span></div>
    `;
    log("verifyLog", "Verification failed: " + err.message);
  }
});
