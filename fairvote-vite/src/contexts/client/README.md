# FairVote API Client

A TypeScript client for interacting with the FairVote API, with built-in support for cryptographic operations.

## Installation

```typescript
import { APIClient, createClient } from './client';
```

## Basic Usage

### Initialize Client

```typescript
const client = new APIClient("http://localhost:3000");
// Or use the helper
const client = createClient("http://localhost:3000");
```

## API Methods

### Election Management

#### Create Election
```typescript
const electionUUID = APIClient.generateUUID();
await client.createElection(
  "your_wallet_address",
  electionUUID,
  {
    entries: [
      {
        question: "Who should be class president?",
        options: ["Alice", "Bob", "Charlie"]
      }
    ]
  }
);
```

#### Get Encryption Key
```typescript
const encryptionParams = await client.getEncryptionKey(electionUUID);
// Returns: { p, q, g, y }
```

#### Get Your Elections
```typescript
const elections = await client.getElections("your_wallet_address");
// Returns array of elections with their data and pending requests
```

### Voting Rights

#### Request Voting Rights
```typescript
await client.requestVotingRight(electionUUID, "user_public_key");
```

#### Approve Request (Owner Only)
```typescript
const signature = APIClient.signMessage(
  votingRequestUUID,
  ownerPrivateKey
);
await client.approveRequest(votingRequestUUID, signature);
```

#### Get Voters
```typescript
const voters = await client.getVoters(electionUUID);
// Returns array of base58 voter addresses
```

### Voting

#### Submit Vote
```typescript
// 1. Get encryption parameters
const encryptionParams = await client.getEncryptionKey(electionUUID);

// 2. Create your vote (for each question, mark 1 for chosen, 0 for others)
const votes = [
  [1, 0, 0],  // Voted for Alice
];

// 3. Encrypt and sign the vote
const { encryptedVote, signature } = await APIClient.createVotePackage(
  votes,
  encryptionParams,
  voterPrivateKey
);

// 4. Submit the vote
await client.submitVote(
  electionUUID,
  voterPublicKey,
  encryptedVote,
  signature
);
```

#### Stop Election (Owner Only)
```typescript
const signature = APIClient.signMessage(electionUUID, ownerPrivateKey);
const results = await client.stopElection(electionUUID, signature);
// Returns: { entries: [[vote_counts...]] }
```

### Public Audit

#### View All Votes
```typescript
const { votes, vote_count } = await client.getVotes(electionUUID);
// Anyone can call this - completely public
```

#### View Encrypted Tally
```typescript
const { encrypted_tally, vote_count, running } = await client.getTally(electionUUID);
// See the current encrypted tally in real-time
```

#### View Final Results
```typescript
const { decrypted_results, zk_proof } = await client.getResults(electionUUID);
// Only available after election has stopped
```

## Cryptographic Methods (To Be Implemented)

These methods need to be implemented with proper cryptographic libraries:

### Key Generation

```typescript
// Generate new keypair
const { publicKey, privateKey } = APIClient.generateKeypair();

// Derive from seed
const keypair = APIClient.deriveKeypairFromSeed("my-secret-seed");
```

### Signing

```typescript
// Sign a message
const signature = APIClient.signMessage("message", privateKey);

// Verify signature
const isValid = APIClient.verifySignature("message", signature, publicKey);
```

### Vote Encryption

```typescript
// Encrypt a single choice
const encrypted = APIClient.encryptChoice(1, encryptionParams);

// Generate ORZK proof
const proof = APIClient.generateORZKProof(
  choice,
  encryptedChoice,
  randomness,
  encryptionParams
);

// Verify ORZK proof
const isValid = APIClient.verifyORZKProof(proof, encryptionParams);

// Encrypt entire vote with proofs
const encryptedVote = APIClient.encryptVote(votes, encryptionParams);

// Verify a vote
const isValid = APIClient.verifyVote(encryptedVote, encryptionParams);
```

### Vote Creation

```typescript
// Create complete vote package (encrypt + sign)
const { encryptedVote, signature } = await APIClient.createVotePackage(
  votes,
  encryptionParams,
  voterPrivateKey
);
```

## Required Dependencies

To implement the cryptographic methods, install:

```bash
pnpm add tweetnacl tweetnacl-util bs58 json-canonicalize
pnpm add @types/bs58 --save-dev
```

## Example: Complete Voting Flow

```typescript
import { APIClient } from './client';

async function voteExample() {
  const client = new APIClient("http://localhost:3000");
  const electionUUID = "your-election-uuid";
  
  // 1. Generate or load voter keypair
  const { publicKey, privateKey } = APIClient.generateKeypair();
  
  // 2. Request voting rights
  await client.requestVotingRight(electionUUID, publicKey);
  
  // (Wait for approval from election owner)
  
  // 3. Get encryption parameters
  const encryptionParams = await client.getEncryptionKey(electionUUID);
  
  // 4. Create your vote
  const votes = [
    [1, 0, 0],  // Question 1: Option 1
    [0, 1]      // Question 2: Option 2
  ];
  
  // 5. Encrypt and sign
  const { encryptedVote, signature } = await APIClient.createVotePackage(
    votes,
    encryptionParams,
    privateKey
  );
  
  // 6. Submit vote
  await client.submitVote(electionUUID, publicKey, encryptedVote, signature);
  
  console.log("Vote submitted successfully!");
}
```

## Example: Audit Flow

```typescript
async function auditExample() {
  const client = new APIClient("http://localhost:3000");
  const electionUUID = "election-to-audit";
  
  // 1. View all votes
  const { votes, vote_count } = await client.getVotes(electionUUID);
  console.log(`Total votes: ${vote_count}`);
  
  // 2. View encrypted tally
  const { encrypted_tally } = await client.getTally(electionUUID);
  console.log("Encrypted tally:", encrypted_tally);
  
  // 3. If election stopped, view results
  try {
    const { decrypted_results, zk_proof } = await client.getResults(electionUUID);
    console.log("Final results:", decrypted_results);
    console.log("Zero-knowledge proof:", zk_proof);
  } catch (error) {
    console.log("Election still running");
  }
}
```

## Error Handling

```typescript
try {
  await client.submitVote(electionUUID, publicKey, encryptedVote, signature);
} catch (error) {
  if (error instanceof Error) {
    console.error("Vote submission failed:", error.message);
    // Handle specific errors:
    // - "Invalid signature"
    // - "Voter already casted its vote"
    // - "Cannot vote as the election stopped running"
    // etc.
  }
}
```

## Utility Methods

```typescript
// Generate UUID
const uuid = APIClient.generateUUID();

// Validate base58
const isValid = APIClient.isValidBase58("SomeAddress...");

// Validate UUID
const isValid = APIClient.isValidUUID("123e4567-e89b-12d3-a456-426614174000");
```

## Notes

- All API methods throw errors on failure
- Signatures and keys are base58-encoded strings
- All cryptographic operations preserve privacy through encryption
- ORZK proofs ensure vote validity without revealing choices
- The client handles JSON serialization/deserialization automatically

## Next Steps

1. Implement the cryptographic methods in `client/crypto.ts`
2. Add unit tests for each method
3. Create example applications
4. Add browser compatibility layer
5. Build frontend UI components

---

**Ready to implement the cryptographic functions!** 🔐
