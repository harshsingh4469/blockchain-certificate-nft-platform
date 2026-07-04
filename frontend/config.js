// Fill these in after running `npm run deploy:sepolia` (or deploy:local)
const CONTRACT_ADDRESS = "0xPasteDeployedContractAddressHere";
const BACKEND_URL = "http://localhost:4000";

// Minimal ABI — same functions the backend uses, plus write functions for the UI.
const CONTRACT_ABI = [
  "function requestCertificate(address student, string ipfsHash) returns (uint256)",
  "function approveCertificate(uint256 requestId)",
  "function getRequest(uint256 requestId) view returns (tuple(address student, address institute, address verifier, string ipfsHash, bool instituteApproved, bool verifierApproved, bool minted, uint256 tokenId))",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function verifyCertificate(uint256 tokenId) view returns (address owner, string ipfsHash, bool valid)",
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function INSTITUTE_ROLE() view returns (bytes32)",
  "function VERIFIER_ROLE() view returns (bytes32)",
  "event CertificateRequested(uint256 indexed requestId, address indexed student, address indexed institute, string ipfsHash)",
  "event CertificateMinted(uint256 indexed requestId, uint256 indexed tokenId, address indexed student, string ipfsHash)"
];
