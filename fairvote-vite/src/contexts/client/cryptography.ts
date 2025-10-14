import {
  EncryptedVote,
  EncryptedTally,
  ElectionResult,
  EncryptionParametersWithPrivateKey,
  ElGamalCiphertext,
  ENCRYPTION_CONSTANTS,
  EncryptionParameters,
  ORZKProof,
  VOTER_LIMIT,
  KPTZKProof,
  ElGamalCiphertextWithRandomness,
} from "./types";
import * as bigintCryptoUtils from 'bigint-crypto-utils';

/**
 * Validate an encrypted vote by verifying all ORZK proofs
 * @returns true if the vote is valid, false otherwise
 */
export async function validateVote(
  vote: EncryptedVote,
  encryptionKey: EncryptionParameters
): Promise<boolean> {
  try {
    for (const entry of vote.entries) {
      for (const proof of entry) {
        // Check that all required fields exist and are strings
        if (
          typeof proof.c0 !== "string" ||
          typeof proof.s0 !== "string" ||
          typeof proof.c1 !== "string" ||
          typeof proof.s1 !== "string" ||
          typeof proof.encrypted_choice.alfa !== "string" ||
          typeof proof.encrypted_choice.beta !== "string"
        ) {
          return false;
        }
      }
    }
  } catch (error) {
    return false;
  }

  const result = await Promise.all(
    vote.entries.flatMap((entry) =>
      entry.map((choice) => {
        return validateORZKProof(choice, encryptionKey);
      })
    )
  );
  return result.includes(false);
}

/**
 * Update the encrypted tally by homomorphically adding a new vote
 * @returns New encrypted tally with the vote added
 */
export function updateTally(
  currentTally: EncryptedTally,
  vote: EncryptedVote,
  encryptionKey: EncryptionParameters
): EncryptedTally {
  // Homomorphic addition
  const newTally: EncryptedTally = {
    entries: currentTally.entries.map((tallyEntry, entryIndex) =>
      tallyEntry.map((ciphertext, optionIndex) => {
        const voteCiphertext = vote.entries[entryIndex][optionIndex].encrypted_choice;
        
        // First update on the tally
        if (!ciphertext.alfa && ciphertext.alfa === ciphertext.beta) {
          return {
            alfa: voteCiphertext.alfa,
            beta: voteCiphertext.beta
          }
        }

        return {
          alfa: (BigInt(ciphertext.alfa) * BigInt(voteCiphertext.alfa) % BigInt(encryptionKey.p)).toString(),
          beta: (BigInt(ciphertext.beta) * BigInt(voteCiphertext.beta) % BigInt(encryptionKey.p)).toString()
        }
      })
    ),
  };

  return newTally;
}

/**
 * Decrypt the final tally and generate a zero-knowledge proof of correct decryption
 * @returns The decrypted election results and a ZK proof
 */
export async function decryptTally(
  tally: EncryptedTally,
  decryptionKey: EncryptionParametersWithPrivateKey
): Promise<ElectionResult> {
  const result: ElectionResult = {
    entries: await Promise.all(
      tally.entries.map(async (entry) =>
        Promise.all(
          entry.map(async (encryptedResult) => {
            const proof = await createKPTZKProof(decryptionKey, encryptedResult);
            const decryptedValue = proof.plaintext;
            const numVotes = discreteLog(decryptedValue, decryptionKey, VOTER_LIMIT);
            return {
              original_value: numVotes.toString(),
              decrypted_value: decryptedValue.toString(),
              encrypted_value: encryptedResult,
              proof: proof
            };
          })
        )
      )
    ),
  };

  return result;
}

/**
 * Generate a random private key x in the range [1, q-1]
 */
export function generatePrivateKey(): bigint {
  const q = BigInt(ENCRYPTION_CONSTANTS.q);
  const ans = bigintCryptoUtils.randBetween(q - BigInt(1), BigInt(1));
  return ans;
}

/**
 * Compute the public key y = g^x mod p
 */
export function computePublicKey(x: bigint): bigint {
  const p = BigInt(ENCRYPTION_CONSTANTS.p);
  const g = BigInt(ENCRYPTION_CONSTANTS.g);

  // Modular exponentiation: g^x mod p
  return modPow(g, x, p);
}

/**
 * Modular exponentiation helper function
 */
function modPow(base: bigint, exponent: bigint, modulus: bigint): bigint {
  return bigintCryptoUtils.modPow(base, exponent, modulus);
}




// ============================================================================
// Utility Functions
// ============================================================================
async function hashToBigIntMod(mod: bigint, ...elements: bigint[]): Promise<bigint> {
  const encoder = new TextEncoder();

  // Convert all bigints to hex strings and concatenate
  const dataString = elements.map(e => e.toString(16).padStart(2, '0')).join('');
  const data = encoder.encode(dataString);

  // Hash with SHA-256
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  // Convert to BigInt and reduce mod p
  const hashBigInt = BigInt('0x' + hashHex);
  return hashBigInt % mod;
}

function discreteLog(exponentialElGamalEncryptedValue: bigint, params: EncryptionParameters, upperBound: number): bigint {
  const { p, q, g, y } = {
    p: BigInt(params.p),
    q: BigInt(params.q),
    g: BigInt(params.g),
    y: BigInt(params.y)
  }

  const N = BigInt(Math.ceil(Math.sqrt(upperBound)));

  // Baby step: g^i for i = 0..N-1
  const babySteps = new Map<bigint, bigint>();
  let current = BigInt(1);
  for (let i = BigInt(0); i < N; i++) {
    babySteps.set(current, i);
    current = (current * g) % p;
  }

  // Compute g^-N mod p
  const gInvN = bigintCryptoUtils.modPow(g, p - BigInt(2), p); // g^-1 mod p
  const gInvNPow = bigintCryptoUtils.modPow(gInvN, N, p); // g^-N mod p

  // Giant step
  let gamma = exponentialElGamalEncryptedValue;
  for (let j = BigInt(0); j < N; j++) {
    if (babySteps.has(gamma)) {
      return j * N + babySteps.get(gamma)!;
    }
    gamma = (gamma * gInvNPow) % p;
  }

  throw new Error("Log not found within bounds");
}

function decryptCiphertext(message: ElGamalCiphertext, privateKey: EncryptionParametersWithPrivateKey): bigint {
  const { alfa, beta } = {
    alfa: BigInt(message.alfa),
    beta: BigInt(message.beta)
  };
  const params = {
    p: BigInt(privateKey.p),
    x: BigInt(privateKey.x),
  }
  let d = bigintCryptoUtils.modPow(alfa, params.x, params.p);
  return beta * bigintCryptoUtils.modInv(d, params.p) % params.p;
}

// canonical-slot OR-proof creator
export async function createORZKProof(
  parameters: EncryptionParameters,
  realIndex: 0 | 1
): Promise<ORZKProof> {
  const m0 = toExponentialElGamal(parameters, BigInt(0));
  const m1 = toExponentialElGamal(parameters, BigInt(1));
  let params = {
    p: BigInt(parameters.p),
    q: BigInt(parameters.q),
    g: BigInt(parameters.g),
    y: BigInt(parameters.y),
  };

  // --- sanity checks ---
  if (bigintCryptoUtils.modPow(params.g, params.q, params.p) !== BigInt(1))
    throw new Error('Parameter g is not of order q (g^q != 1 mod p).');
  if (bigintCryptoUtils.modPow(params.y, params.q, params.p) !== BigInt(1))
    throw new Error('Public key not in subgroup of order q (pk^q != 1 mod p).');

  // messages must be group elements (non-zero) so inverses exist
  if (m0 <= BigInt(0) || m0 >= params.p || m1 <= BigInt(0) || m1 >= params.p)
    throw new Error('m0 and m1 must be group elements in (0, p).');

  // pick real / fake according to realIndex
  const real_message = realIndex === 0 ? m0 : m1;
  const fake_message = realIndex === 0 ? m1 : m0;

  // encrypt the real_message (we return this ciphertext so verifier can check)
  const encrypted = encryptValueWithRandomness(parameters, real_message);
  const { alfa, beta, r } = {
    alfa: BigInt(encrypted.alfa),
    beta: BigInt(encrypted.beta),
    r: encrypted.r
  };

  // --- honest (real) branch commitment ---
  const t = getRandomValue(parameters); // nonce for real branch
  const A_real = bigintCryptoUtils.modPow(params.g, t, params.p);
  const B_real = bigintCryptoUtils.modPow(params.y, t, params.p);

  // --- simulated (fake) branch (choose challenge and response arbitrarily) ---
  const fake_c = getRandomValue(parameters); // allow 0..q-1
  const fake_s = getRandomValue(parameters);

  const A_fake = (bigintCryptoUtils.modPow(params.g, fake_s, params.p)
                 * bigintCryptoUtils.modInv(bigintCryptoUtils.modPow(alfa, fake_c, params.p), params.p)) % params.p;

  // divisor = beta / fake_message  (note: fake_message must be invertible)
  const divisor = (beta * bigintCryptoUtils.modInv(fake_message, params.p)) % params.p;

  const B_fake = (bigintCryptoUtils.modPow(params.y, fake_s, params.p)
                 * bigintCryptoUtils.modInv(bigintCryptoUtils.modPow(divisor, fake_c, params.p), params.p)) % params.p;

  // --- canonical slot ordering: slot0 then slot1 ---
  const A_slot0 = realIndex === 0 ? A_real : A_fake;
  const B_slot0 = realIndex === 0 ? B_real : B_fake;
  const A_slot1 = realIndex === 0 ? A_fake : A_real;
  const B_slot1 = realIndex === 0 ? B_fake : B_real;

  // compute global challenge (reduce mod q)
  const h = await hashToBigIntMod(params.q, A_slot0, B_slot0, A_slot1, B_slot1, m0, m1);

  // derive real challenge & response so that fake_c + real_c = h (mod q)
  const real_c = (h - fake_c + params.q) % params.q;
  const real_s = (t + real_c * r) % params.q;

  // assemble proof in canonical slot-order fields (slot0 then slot1)
  // If realIndex === 0 -> (c0 = real_c, s0 = real_s), (c1 = fake_c, s1 = fake_s)
  // If realIndex === 1 -> (c0 = fake_c, s0 = fake_s), (c1 = real_c, s1 = real_s)
  const c0 = realIndex === 0 ? real_c : fake_c;
  const s0 = realIndex === 0 ? real_s : fake_s;
  const c1 = realIndex === 0 ? fake_c : real_c;
  const s1 = realIndex === 0 ? fake_s : real_s;

  return {
    c0: BigInt(c0).toString(),
    s0: BigInt(s0).toString(),
    c1: BigInt(c1).toString(),
    s1: BigInt(s1).toString(),
    encrypted_choice: { alfa: encrypted.alfa, beta: encrypted.beta }
  };
}

export async function validateORZKProof(proof: ORZKProof, encryptionParams: EncryptionParameters): Promise<boolean> {
  const { alfa, beta } = {
    alfa: BigInt(proof.encrypted_choice.alfa),
    beta: BigInt(proof.encrypted_choice.beta),
  };
  const { c0, s0, c1, s1 } = {
    c0: BigInt(proof.c0),
    s0: BigInt(proof.s0),
    c1: BigInt(proof.c1),
    s1: BigInt(proof.s1)
  };
  let params = {
    p: BigInt(encryptionParams.p),
    q: BigInt(encryptionParams.q),
    g: BigInt(encryptionParams.g),
    y: BigInt(encryptionParams.y),
  }

  const m0 = bigintCryptoUtils.modPow(params.g, 0, params.p);
  const m1 = bigintCryptoUtils.modPow(params.g, 1, params.p);

  // sanity checks (same as in prover)
  if (bigintCryptoUtils.modPow(params.g, params.q, params.p) !== BigInt(1)) return false;
  if (bigintCryptoUtils.modPow(params.y, params.q, params.p) !== BigInt(1)) return false;
  if (m0 <= BigInt(0) || m0 >= params.p || m1 <= BigInt(0) || m1 >= params.p) return false;

  // reconstruct commitments for slot0
  const A0 = (bigintCryptoUtils.modPow(params.g, s0, params.p)
    * bigintCryptoUtils.modInv(bigintCryptoUtils.modPow(alfa, c0, params.p), params.p)) % params.p;
  const divisor0 = (beta * bigintCryptoUtils.modInv(m0, params.p)) % params.p;
  const B0 = (bigintCryptoUtils.modPow(params.y, s0, params.p)
    * bigintCryptoUtils.modInv(bigintCryptoUtils.modPow(divisor0, c0, params.p), params.p)) % params.p;

  // reconstruct commitments for slot1
  const A1 = (bigintCryptoUtils.modPow(params.g, s1, params.p)
    * bigintCryptoUtils.modInv(bigintCryptoUtils.modPow(alfa, c1, params.p), params.p)) % params.p;
  const divisor1 = (beta * bigintCryptoUtils.modInv(m1, params.p)) % params.p;
  const B1 = (bigintCryptoUtils.modPow(params.y, s1, params.p)
    * bigintCryptoUtils.modInv(bigintCryptoUtils.modPow(divisor1, c1, params.p), params.p)) % params.p;

  // recompute global challenge and check that c0 + c1 = h (mod q)
  const h = await hashToBigIntMod(params.q, A0, B0, A1, B1, m0, m1);
  return ((c0 + c1) % params.q) === (h % params.q);
}

function getRandomValue(params: EncryptionParameters): bigint {
  // I know it looks weird, but the library wants max to be the first parameter and min to be the second
  return bigintCryptoUtils.randBetween(BigInt(params.q) - BigInt(1), BigInt(1));
}

export function toExponentialElGamal(params: EncryptionParameters, value: bigint) {
  // console.log("toExponentialElGamal", JSON.stringify(params));
  return bigintCryptoUtils.modPow(BigInt(params.g), value, BigInt(params.p));
}

export function encryptValueWithRandomness(parameters: EncryptionParameters, value: bigint): ElGamalCiphertextWithRandomness {
  const params = {
    p: BigInt(parameters.p),
    q: BigInt(parameters.q),
    g: BigInt(parameters.g),
    y: BigInt(parameters.y),
  }

  // Ensure value is in the valid range [0, p-1]
  if (value <= BigInt(0) || value >= params.p) {
      throw new Error("Value must be in range [0, p-1]");
  }
  
  const random_value = getRandomValue(parameters);
  return {
      alfa: bigintCryptoUtils.modPow(params.g, random_value, params.p).toString(),
      beta: (value * bigintCryptoUtils.modPow(params.y, random_value, params.p) % params.p).toString(),
      r: random_value
  }
}

export function encryptValue(parameters: EncryptionParameters, value: bigint): ElGamalCiphertext {
  const { alfa, beta } = encryptValueWithRandomness(parameters, value);
  return { alfa, beta };
}


// Knowledge of Plain Text ZKProof - prove to anyone that
// you correctly deciphered a ciphertext
async function createKPTZKProof(
  privateKey: EncryptionParametersWithPrivateKey,
  ciphertext: ElGamalCiphertext,
): Promise<KPTZKProof & { plaintext: bigint }> {
  const { p, q, g, sk } = {
    p: BigInt(privateKey.p),
    q: BigInt(privateKey.q),
    g: BigInt(privateKey.g),
    sk: BigInt(privateKey.x),
  };
  const { alfa, beta } = {
    alfa: BigInt(ciphertext.alfa),
    beta: BigInt(ciphertext.beta),
  };
  const plaintext = decryptCiphertext(ciphertext, privateKey);

  // 1) pick random s in Z_q
  const s = getRandomValue(privateKey) % q; // fresh proof random

  // 2) compute commitments A = g^s, B = alfa^s
  const A = bigintCryptoUtils.modPow(g, s, p);
  const B = bigintCryptoUtils.modPow(alfa, s, p);

  // 3) compute public key (include it in hash)
  const pk = bigintCryptoUtils.modPow(g, sk, p);

  // 4) compute Fiat-Shamir challenge c = H(g, pk, alfa, beta, plaintext, A, B) mod q
  const c = await hashToBigIntMod(q, g, pk, alfa, beta, plaintext, A, B);

  // 5) compute response z = s + c*sk (mod q)
  const z = (s + (c * (sk % q))) % q;

  // Return compressed proof (we don't publish A and B)
  return {
    c: BigInt(c).toString(),
    z: BigInt(z).toString(),
    encrypted_message: ciphertext,
    plaintext: plaintext
  };
}
