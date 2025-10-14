/**
 * FairVote API Types
 * All types used throughout the voting system
 */

// ============================================================================
// API Response Types
// ============================================================================

export interface SuccessResponse<T = any> {
  status: "ok";
  data: T;
}

export interface ErrorResponse {
  status: "error";
  message: string;
}

export type ApiResponse<T = any> = SuccessResponse<T> | ErrorResponse;

// ============================================================================
// Election Data Types
// ============================================================================

export interface ElectionQuestion {
  question: string;
  options: string[];
}

export interface ElectionData {
  entries: ElectionQuestion[];
}

// ============================================================================
// Cryptographic Types
// ============================================================================

export interface ElGamalCiphertext {
  alfa: string;
  beta: string;
}

export type ElGamalCiphertextWithRandomness = ElGamalCiphertext & {
  r: bigint
}

export interface EncryptedTally {
  entries: ElGamalCiphertext[][];
}

export interface EncryptionParameters {
  p: string;
  q: string;
  g: string;
  y: string;
}

export interface EncryptionParametersWithPrivateKey extends EncryptionParameters {
  x: string;
}

// ============================================================================
// Voting Types
// ============================================================================

export interface ORZKProof {
  c0: string;
  s0: string;
  c1: string;
  s1: string;
  encrypted_choice: ElGamalCiphertext;
}

export interface EncryptedVote {
  entries: ORZKProof[][];
}

export interface VoteSubmission {
  signature: string;
  public_key: string;
  vote: EncryptedVote;
}

// ============================================================================
// Request Body Types
// ============================================================================

export interface CreateElectionRequest {
  wallet: string;
  election_uuid: string;
}

export interface RequestVotingRightBody {
  user: string;
}

export interface SignatureBody {
  signature: string;
}

export interface StopElectionBody {
  signature: string;
}

export interface ApproveRequestBody {
  signature: string;
}

export interface DenyRequestBody {
  signature: string;
}

export interface VoteBody {
  signature: string;
  public_key: string;
  vote: EncryptedVote;
}

// ============================================================================
// Response Data Types
// ============================================================================

export interface VotingRequestData {
  uuid: string;
  user: string;
}

export interface ElectionResponse {
  uuid: string;
  address: string;
  data: ElectionData;
  requests: VotingRequestData[];
}

export interface VotersResponse {
  voters: string[];
}

export interface EncryptionKeyResponse {
  p: string;
  q: string;
  g: string;
  y: string;
}

export type VotingRequestResponse = {
  uuid: string,
  user_wallet: string,
}[]

// ============================================================================
// Election Result Types
// ============================================================================

export interface DecryptedOption {
  // this should be a small decimal value and represents the number of
  // votes casted for this option
  original_value: string, 

  // this is g^(original_value) or, in other words, `original_value` in
  // Exponential ElGamal
  decrypted_value: string,

  // the number of casted votes, but in Encrypted Exponential ElGamal form
  // (basically the raw values resulting from homomorphic addition)
  encrypted_value: ElGamalCiphertext,

  // a zkProof showing that `decrypted_value` is the decrypted form of `encrypted_value`
  // pretty important stuff (things like this make the system end-to-end )
  proof: KPTZKProof
}

export interface ElectionResult {
  entries: DecryptedOption[][];
}

// Knowledge of Plain Text Proof
export interface KPTZKProof {
  c: string,        // Fiat-Shamir challenge (mod q)
  z: string,        // response = s + c*x (mod q)
  encrypted_message: ElGamalCiphertext
}

// ============================================================================
// Blockchain Function Parameter Types
// ============================================================================

export interface InitElectionParams {
  electionId: string;
  electionData: ElectionData;
  encryptionKey: EncryptionParameters;
}

export interface InitVoterParams {
  electionId: string;
  user: string;
}

export interface PublishVoteParams {
  electionId: string;
  vote: EncryptedVote;
}

export interface PublishResultsParams {
  electionId: string;
  result: ElectionResult;
}

// ============================================================================
// Utility Types
// ============================================================================

export type Base58String = string;
export type UUIDString = string;
export type DecimalString = string;

// ============================================================================
// Constants
// ============================================================================

export const ENCRYPTION_CONSTANTS = {
  p: "16328632084933010002384055033805457329601614771185955389739167309086214800406465799038583634953752941675645562182498120750264980492381375579367675648771293800310370964745767014243638518442553823973482995267304044326777047662957480269391322789378384619428596446446984694306187644767462460965622580087564339212631775817895958409016676398975671266179637898557687317076177218843233150695157881061257053019133078545928983562221396313169622475509818442661047018436264806901023966236718367204710755935899013750306107738002364137917426595737403871114187750804346564731250609196846638183903982387884578266136503697493474682071",
  q: "61329566248342901292543872769978950870633559608669337131139375508370458778917",
  g: "14887492224963187634282421537186040801304008017743492304481737382571933937568724473847106029915040150784031882206090286938661464458896494215273989547889201144857352611058572236578734319505128042602372864570426550855201448111746579871811249114781674309062693442442368697449970648232621880001709535143047913661432883287150003429802392229361583608686643243349727791976247247948618930423866180410558458272606627111270040091203073580238905303994472202930783207472394578498507764703191288249547659899997131166130259700604433891232298182348403175947450284433411265966789131024573629546048637848902243503970966798589660808533",
} as const;

export const VOTER_LIMIT = 5_000_000;
