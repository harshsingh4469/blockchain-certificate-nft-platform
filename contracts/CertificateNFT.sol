// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title CertificateNFT
 * @notice SIH 2025 (Secure6) — Blockchain-based platform issuing academic
 *         certificates as NFTs, with dual verification (Institute + External Body)
 *         before minting. Certificate/document contents live off-chain on
 *         IPFS; only the IPFS hash (as tokenURI) and verification state live
 *         on-chain, keeping gas costs low while remaining tamper-proof.
 *
 * Flow:
 *  1. An address with INSTITUTE_ROLE calls requestCertificate() for a student,
 *     pointing at an IPFS hash of the certificate/metadata JSON.
 *  2. An address with VERIFIER_ROLE (e.g. NPTEL/UGC/NAAC) calls
 *     approveCertificate() for that request.
 *  3. Once BOTH approvals exist, the NFT is minted automatically to the
 *     student's wallet — no separate "mint" transaction needed.
 */
contract CertificateNFT is ERC721URIStorage, AccessControl {
    bytes32 public constant INSTITUTE_ROLE = keccak256("INSTITUTE_ROLE");
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");

    uint256 private _requestIdCounter;
    uint256 private _tokenIdCounter;

    struct CertificateRequest {
        address student;
        address institute;
        address verifier;
        string ipfsHash;      // IPFS CID of certificate/metadata JSON
        bool instituteApproved;
        bool verifierApproved;
        bool minted;
        uint256 tokenId;
    }

    mapping(uint256 => CertificateRequest) public requests; // requestId => request

    event CertificateRequested(uint256 indexed requestId, address indexed student, address indexed institute, string ipfsHash);
    event CertificateVerifierApproved(uint256 indexed requestId, address indexed verifier);
    event CertificateMinted(uint256 indexed requestId, uint256 indexed tokenId, address indexed student, string ipfsHash);

    constructor(address admin) ERC721("Secure6 Academic Certificate", "S6CERT") {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    // ---------- Admin: role management ----------

    function addInstitute(address institute) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(INSTITUTE_ROLE, institute);
    }

    function addVerifier(address verifier) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(VERIFIER_ROLE, verifier);
    }

    function removeInstitute(address institute) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(INSTITUTE_ROLE, institute);
    }

    function removeVerifier(address verifier) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(VERIFIER_ROLE, verifier);
    }

    // ---------- Step 1: Institute requests a certificate ----------

    function requestCertificate(address student, string calldata ipfsHash)
        external
        onlyRole(INSTITUTE_ROLE)
        returns (uint256 requestId)
    {
        require(student != address(0), "Invalid student address");
        require(bytes(ipfsHash).length > 0, "IPFS hash required");

        _requestIdCounter += 1;
        requestId = _requestIdCounter;

        requests[requestId] = CertificateRequest({
            student: student,
            institute: msg.sender,
            verifier: address(0),
            ipfsHash: ipfsHash,
            instituteApproved: true,
            verifierApproved: false,
            minted: false,
            tokenId: 0
        });

        emit CertificateRequested(requestId, student, msg.sender, ipfsHash);
    }

    // ---------- Step 2: External body approves -> auto-mint on dual approval ----------

    function approveCertificate(uint256 requestId) external onlyRole(VERIFIER_ROLE) {
        CertificateRequest storage req = requests[requestId];
        require(req.student != address(0), "Request does not exist");
        require(req.instituteApproved, "Institute has not approved yet");
        require(!req.verifierApproved, "Already approved by a verifier");
        require(!req.minted, "Already minted");

        req.verifierApproved = true;
        req.verifier = msg.sender;
        emit CertificateVerifierApproved(requestId, msg.sender);

        // Dual approval complete -> mint NFT to student
        _tokenIdCounter += 1;
        uint256 newTokenId = _tokenIdCounter;

        _safeMint(req.student, newTokenId);
        _setTokenURI(newTokenId, req.ipfsHash);

        req.minted = true;
        req.tokenId = newTokenId;

        emit CertificateMinted(requestId, newTokenId, req.student, req.ipfsHash);
    }

    // ---------- Read helpers ----------

    function getRequest(uint256 requestId) external view returns (CertificateRequest memory) {
        return requests[requestId];
    }

    function totalRequests() external view returns (uint256) {
        return _requestIdCounter;
    }

    function totalCertificates() external view returns (uint256) {
        return _tokenIdCounter;
    }

    /// @notice Convenience method for verifiers/employers: is this token a genuine,
    ///         dual-approved certificate, and who currently owns it?
    function verifyCertificate(uint256 tokenId)
        external
        view
        returns (address owner, string memory ipfsHash, bool valid)
    {
        owner = ownerOf(tokenId); // reverts if token doesn't exist
        ipfsHash = tokenURI(tokenId);
        valid = true;
    }

    // Required override due to multiple inheritance (ERC721URIStorage, AccessControl)
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721URIStorage, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
