// Minimal ABI — only the functions/events the backend and frontend actually call.
// After deployment, you can swap this for the full ABI from
// artifacts/contracts/CertificateNFT.sol/CertificateNFT.json if you prefer.
module.exports = [
  "function requestCertificate(address student, string ipfsHash) returns (uint256)",
  "function approveCertificate(uint256 requestId)",
  "function getRequest(uint256 requestId) view returns (tuple(address student, address institute, address verifier, string ipfsHash, bool instituteApproved, bool verifierApproved, bool minted, uint256 tokenId))",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function verifyCertificate(uint256 tokenId) view returns (address owner, string ipfsHash, bool valid)",
  "function totalRequests() view returns (uint256)",
  "function totalCertificates() view returns (uint256)",
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function INSTITUTE_ROLE() view returns (bytes32)",
  "function VERIFIER_ROLE() view returns (bytes32)",
  "event CertificateRequested(uint256 indexed requestId, address indexed student, address indexed institute, string ipfsHash)",
  "event CertificateVerifierApproved(uint256 indexed requestId, address indexed verifier)",
  "event CertificateMinted(uint256 indexed requestId, uint256 indexed tokenId, address indexed student, string ipfsHash)"
];
