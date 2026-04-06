import { pool, BR, F } from "./db";
import { evenWords, oddWords } from "./pgp-words";

/**
 * Generate a 3-word passphrase using PGP word lists.
 * Pattern: even-word + odd-word + even-word (2-syl + 3-syl + 2-syl)
 * This alternating pattern matches PGP's design for error detection.
 */
function generateCandidate(): string {
  const w1 = evenWords[Math.floor(Math.random() * evenWords.length)];
  const w2 = oddWords[Math.floor(Math.random() * oddWords.length)];
  const w3 = evenWords[Math.floor(Math.random() * evenWords.length)];
  return `${w1} ${w2} ${w3}`;
}

/**
 * Generate a unique passphrase that doesn't exist in the registry yet.
 */
export async function generatePassphrase(): Promise<string> {
  for (let i = 0; i < 100; i++) {
    const candidate = generateCandidate();
    const existing = await pool.query(
      `SELECT 1 FROM ${BR.Passphrases} WHERE ${F.pass_passphrase} = $1 AND trashed = false LIMIT 1`,
      [candidate]
    );
    if (existing.rows.length === 0) {
      return candidate;
    }
  }
  throw new Error("Failed to generate unique passphrase after 100 attempts");
}

/**
 * Register a passphrase for a record. Call this when creating records in any table.
 */
export async function registerPassphrase(
  tableName: string,
  recordId: string
): Promise<string> {
  const passphrase = await generatePassphrase();
  await pool.query(
    `INSERT INTO ${BR.Passphrases} (${F.pass_passphrase}, ${F.pass_table_name}, ${F.pass_record_id}, "order", created_on, updated_on, trashed)
     VALUES ($1, $2, $3, 1, NOW(), NOW(), false)`,
    [passphrase, tableName, recordId]
  );
  return passphrase;
}

/**
 * Look up a record by its passphrase. Case-insensitive matching.
 */
export async function lookupPassphrase(
  passphrase: string
): Promise<{ tableName: string; recordId: string } | null> {
  const result = await pool.query(
    `SELECT ${F.pass_table_name} as "tableName", ${F.pass_record_id} as "recordId"
     FROM ${BR.Passphrases}
     WHERE LOWER(${F.pass_passphrase}) = LOWER($1) AND trashed = false
     LIMIT 1`,
    [passphrase]
  );
  if (result.rows.length === 0) return null;
  return result.rows[0];
}

/**
 * Remove a passphrase (e.g., when deleting a record).
 */
export async function removePassphrase(recordId: string): Promise<void> {
  await pool.query(
    `UPDATE ${BR.Passphrases} SET trashed = true WHERE ${F.pass_record_id} = $1`,
    [recordId]
  );
}
