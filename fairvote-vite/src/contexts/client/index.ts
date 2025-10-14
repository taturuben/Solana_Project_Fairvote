import { v4 as uuidv4 } from "uuid";
import { canonicalize } from 'json-canonicalize';
import * as cryptoUtils from './cryptography';
import { Keypair } from "@solana/web3.js";
import * as nacl from 'tweetnacl';
import {
  ElectionData,
  EncryptedVote,
  EncryptionParameters,
  ElectionResponse,
  VotersResponse,
  ApiResponse,
  SuccessResponse,
  ErrorResponse,
  ElectionResult,
  ORZKProof,
  EncryptionKeyResponse,
  VotingRequestResponse,
} from "./types";
import bs58 from "bs58";

/**
 * FairVote API Client
 * Provides a typed interface to interact with the FairVote API
 */
export class APIClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    // Remove trailing slash if present
    this.baseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;

    // Enable BigInt serialization
    (BigInt.prototype as any).toJSON = function() {
      return this.toString();
    }
  }

  // ============================================================================
  // Election Management
  // ============================================================================

  /**
   * Create a new election
   * @param wallet - Owner's wallet address (base58)
   * @param electionUUID - Unique election identifier
   * @param electionData - Election questions and options
   * @returns An object with the uuid of the created election and its address on the blockchain
   */
  async createElection(
    wallet: string,
    electionData: ElectionData
  ): Promise<{
    uuid: string,
    address: string,
  }> {
    const electionUUID = uuidv4();

    const response = await fetch(
      `${this.baseUrl}/${wallet}/election/${electionUUID}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(electionData),
      }
    );
    console.log(`createElection returned response: ${response}`);

    const data = await response.json() as ApiResponse<{ address: string }>;
    if (data.status === "error") {
      console.log(`Error in createElection: ${JSON.stringify(data)}`);
      throw new Error(data.message);
    }
    
    console.log("createElection", JSON.stringify(data));
    return {
      uuid: electionUUID,
      address: data.data.address
    };
  }

  /**
   * Get public encryption key for an election
   * @param electionUUID - Election identifier
   * @returns Encryption parameters (p, q, g, y)
   */
  async getEncryptionKey(electionUUID: string): Promise<EncryptionParameters> {
    const response = await fetch(
      `${this.baseUrl}/${electionUUID}/encryption_key`
    );

    const data = await response.json() as ApiResponse<EncryptionParameters>;
    if (data.status === "error") {
      throw new Error(data.message);
    }

    return data.data as EncryptionParameters;
  }

  /**
   * Get all the pending voting requests for a particular election
   * @param electionUUID - Election identifier
   * @returns A list of voting requests
   */
  async getVotingRequests(electionUUID: string): Promise<VotingRequestResponse> {
    const response = await fetch(
      `${this.baseUrl}/${electionUUID}/votingRequests`
    );

    const data = await response.json() as ApiResponse<VotingRequestResponse>;

    if (data.status === "error") {
      throw new Error(data.message);
    }

    return data.data;
  }

  /**
   * Get all elections owned by a wallet
   * @param wallet - Owner's wallet address
   * @returns Array of elections with their data and requests
   */
  async getElections(wallet: string): Promise<ElectionResponse[]> {
    const response = await fetch(`${this.baseUrl}/${wallet}/elections`);

    const data = await response.json() as ApiResponse<ElectionResponse[]>;
    if (data.status === "error") {
      throw new Error(data.message);
    }

    console.log("getElections", data.data);
    return (data as SuccessResponse<ElectionResponse[]>).data;
  }

  // ============================================================================
  // Voting Rights Management
  // ============================================================================

  /**
   * Request voting rights for an election
   * @param electionUUID - Election identifier
   * @param userAddress - User's public key (base58)
   */
  async requestVotingRight(
    electionUUID: string,
    userAddress: string
  ): Promise<void> {
    const response = await fetch(
      `${this.baseUrl}/${electionUUID}/requestVotingRight`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: userAddress }),
      }
    );

    const data = await response.json() as ApiResponse<any>;
    if (data.status === "error") {
      throw new Error(data.message);
    }
  }

  /**
   * Approve a voting request (requires owner signature)
   * @param votingRequestUUID - Request identifier
   * @param signature - Owner's signature (base58)
   */
  async approveRequest(
    votingRequestUUID: string,
    signature: string
  ): Promise<void> {
    const response = await fetch(
      `${this.baseUrl}/${votingRequestUUID}/approveRequest`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signature }),
      }
    );

    const data = await response.json() as ApiResponse<any>;
    if (data.status === "error") {
      throw new Error(data.message);
    }
  }

  /**
   * Deny a voting request (requires owner signature)
   * @param votingRequestUUID - Request identifier
   * @param signature - Owner's signature (base58)
   */
  async denyRequest(
    votingRequestUUID: string,
    signature: string
  ): Promise<void> {
    const response = await fetch(
      `${this.baseUrl}/${votingRequestUUID}/denyRequest`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signature }),
      }
    );

    const data = await response.json() as ApiResponse<any>;
    if (data.status === "error") {
      throw new Error(data.message);
    }
  }

  /**
   * Get list of approved voters for an election
   * @param electionUUID - Election identifier
   * @returns Array of voter addresses
   */
  async getVoters(electionUUID: string): Promise<string[]> {
    const response = await fetch(`${this.baseUrl}/${electionUUID}/voters`);

    const data = await response.json() as ApiResponse<VotersResponse>;
    if (data.status === "error") {
      throw new Error(data.message);
    }

    return (data.data as VotersResponse).voters;
  }

  // ============================================================================
  // Voting
  // ============================================================================

  /**
   * Submit an encrypted vote
   * @param electionUUID - Election identifier
   * @param publicKey - Voter's public key (base58)
   * @param encryptedVote - Encrypted vote with ORZK proofs
   * @param signature - Signature of canonicalized vote
   */
  async submitVote(
    electionUUID: string,
    publicKey: string,
    encryptedVote: EncryptedVote,
    signature: string
  ): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${electionUUID}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        signature,
        public_key: publicKey,
        vote: encryptedVote,
      }),
    });

    const data = await response.json() as ApiResponse<any>;
    if (data.status === "error") {
      throw new Error(data.message);
    }
  }

  /**
   * Stop an election and get decrypted results
   * @param electionUUID - Election identifier
   * @param signature - Owner's signature (base58)
   * @returns Decrypted election results
   */
  async stopElection(
    electionUUID: string,
    signature: string
  ): Promise<ElectionResult> {
    const response = await fetch(
      `${this.baseUrl}/${electionUUID}/stopElection`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signature }),
      }
    );

    const data = await response.json() as ApiResponse<any>;
    if (data.status === "error") {
      throw new Error(data.message);
    }

    return (data as SuccessResponse<ElectionResult>).data;
  }

  // ============================================================================
  // Public Audit Endpoints
  // ============================================================================

  /**
   * Get all encrypted votes for an election (public)
   * @param electionUUID - Election identifier
   * @returns All votes with metadata
   */
  async getVotes(electionUUID: string): Promise<{
    election_uuid: string;
    vote_count: number;
    votes: Array<{
      vote_id: string;
      voter_public_key: string;
      encrypted_vote: EncryptedVote;
      vote_signature: string;
      timestamp: Date;
    }>;
  }> {
    const response = await fetch(`${this.baseUrl}/${electionUUID}/votes`);

    const data = await response.json() as ApiResponse<any>;
    if (data.status === "error") {
      throw new Error(data.message);
    }

    return (data as SuccessResponse).data;
  }

  /**
   * Get current encrypted tally for an election (public)
   * @param electionUUID - Election identifier
   * @returns Encrypted tally with metadata
   */
  async getTally(electionUUID: string): Promise<{
    election_uuid: string;
    encrypted_tally: any;
    vote_count: number;
    running: boolean;
  }> {
    const response = await fetch(`${this.baseUrl}/${electionUUID}/tally`);

    const data = await response.json() as ApiResponse<any>;
    if (data.status === "error") {
      throw new Error(data.message);
    }

    return (data as SuccessResponse).data;
  }

  /**
   * Get final decrypted results for an election (public)
   * Only available after election has stopped
   * @param electionUUID - Election identifier
   * @returns Decrypted results with ZK proof
   */
  async getResults(electionUUID: string): Promise<{
    election_uuid: string;
    decrypted_results: ElectionResult;
    timestamp: Date;
  }> {
    const response = await fetch(`${this.baseUrl}/${electionUUID}/results`);

    const data = await response.json() as ApiResponse<any>;
    if (data.status === "error") {
      throw new Error(data.message);
    }

    return (data as SuccessResponse).data;
  }

  // ============================================================================
  // Cryptographic Helper Methods (TO BE IMPLEMENTED)
  // ============================================================================

  /**
   * Sign a message with a private key
   * @param message - Message to sign (string or Uint8Array)
   * @param keypair - Signer's keypair
   * @returns Base58-encoded signature
   * 
   */
  static signMessage(message: string | Uint8Array, keypair: Keypair): string {
    const messageBytes = typeof message === 'string' ? Buffer.from(message, 'utf8') : message;
    const signature = nacl.sign.detached(messageBytes, Uint8Array.from(keypair.secretKey));
    return bs58.encode(signature);
  }

  /**
   * Verify a signature
   * @param message - Original message
   * @param signature - Base58-encoded signature
   * @param publicKey - Signer's public key (base58)
   * @returns True if signature is valid
   */
  static verifySignature(
    message: string | Uint8Array,
    signature: string,
    publicKey: string
  ): boolean {
    const messageBytes = typeof message === 'string' ? Buffer.from(message, 'utf8') : message;
    const signatureBytes = bs58.decode(signature);
    const publicKeyBytes = bs58.decode(publicKey);
    return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
  }

  /**
   * Encrypt a single vote choice using ElGamal encryption
   * @param choice - 0 or 1 (which option was chosen)
   * @param encryptionParams - Public encryption parameters
   * @returns Encrypted choice (alfa, beta)
   */
  static encryptChoice(
    choice: number,
    encryptionParams: EncryptionParameters
  ): { alfa: string; beta: string } {

    if (!(choice === 0 || choice === 1)) {
      throw Error("`choice` can be either 0 or 1")
    }

    return cryptoUtils.encryptValue(encryptionParams, cryptoUtils.toExponentialElGamal(encryptionParams, BigInt(choice)));
  }

  /**
   * Generate an ORZK proof for an encrypted vote choice
   * Proves that the encrypted value is either 0 or 1 without revealing which
   * @param choice - The actual choice (0 or 1)
   * @param encryptionParams - Public encryption parameters
   * @returns ORZK proof
   * 
   */
  static async generateORZKProof(
    choice: number,
    encryptionParams: EncryptionParameters
  ): Promise<ORZKProof> {
    if (!(choice === 0 || choice === 1))
      throw Error("Choice must be 0 or 1");
    return await cryptoUtils.createORZKProof(encryptionParams, choice);
  }

  /**
   * Create an encrypted vote for an election
   * For each question, encrypts the voter's choices and generates proofs
   * @param votes - Array of arrays: votes[question][option] = 1 if chosen, 0 otherwise
   * @param encryptionParams - Public encryption parameters
   * @returns Encrypted vote with ORZK proofs
   * 
   */
  static async encryptVote(
    votes: number[][],
    encryptionParams: EncryptionParameters
  ): Promise<EncryptedVote> {
    return {
      entries: await Promise.all(
        votes.map((question) =>
          Promise.all(
            question.map((choice) =>
              this.generateORZKProof(choice, encryptionParams)
            )
          )
        )
      )
    };
  }

  /**
   * Canonicalize a vote object for signing
   * Uses json-canonicalize to create deterministic representation
   * @param vote - The encrypted vote
   * @returns Canonical string representation
   */
  static canonicalizeVote(vote: EncryptedVote): string {
    return canonicalize(vote);
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Generate a random UUID v4
   * @returns UUID string
   */
  static generateUUID(): string {
    // Simple UUID v4 generation
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Validate a base58 string
   * @param str - String to validate
   * @returns True if valid base58
   */
  static isValidBase58(str: string): boolean {
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
    return base58Regex.test(str) && str.length >= 32 && str.length <= 44;
  }

  /**
   * Validate a UUID string
   * @param str - String to validate
   * @returns True if valid UUID
   */
  static isValidUUID(str: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }

  /**
   * Get the base URL of the API
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }
}

// Export default instance helper
export function createClient(baseUrl: string): APIClient {
  return new APIClient(baseUrl);
}
