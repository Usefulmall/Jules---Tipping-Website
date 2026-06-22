import { z } from "zod";

/**
 * Unified bank validation module - SINGLE SOURCE OF TRUTH
 * All bank names, codes, and validation happens here only
 */

// List of supported South African banks
export const BANKS = [
  "FNB",
  "ABSA",
  "Standard Bank",
  "Nedbank",
  "Capitec",
  "Investec",
  "TymeBank",
  "African Bank",
  "Bidvest Bank",
  "Discovery Bank",
] as const;

export type BankName = (typeof BANKS)[number];

// Paystack settlement bank codes for South African banks
// These are Paystack's internal bank codes, NOT universal branch codes
export const BANK_CODES: Record<BankName, string> = {
  "FNB": "50", // FNB
  "ABSA": "14", // ABSA
  "Standard Bank": "8", // Standard Bank
  "Nedbank": "9", // Nedbank
  "Capitec": "31", // Capitec
  "Investec": "32", // Investec
  "TymeBank": "37", // TymeBank
  "African Bank": "40", // African Bank
  "Bidvest Bank": "41", // Bidvest Bank
  "Discovery Bank": "54", // Discovery Bank
};

// Universal branch codes for South African banks
// Used for bank transfers and account verification
export const BRANCH_CODES: Record<BankName, string> = {
  "FNB": "250655",
  "ABSA": "632005",
  "Standard Bank": "051001",
  "Nedbank": "198765",
  "Capitec": "470010",
  "Investec": "580105",
  "TymeBank": "989765",
  "African Bank": "430000",
  "Bidvest Bank": "462005",
  "Discovery Bank": "679000",
};

// Zod schema for bank name validation
export const BankNameSchema = z.enum(BANKS);

/**
 * Validate that a bank name is supported
 * @param bankName - The bank name to validate
 * @returns true if valid, false otherwise
 */
export function validateBankName(bankName: string): bankName is BankName {
  return BANKS.includes(bankName as BankName);
}

/**
 * Get the Paystack settlement bank code for a given bank name
 * @param bankName - The bank name
 * @returns The Paystack bank code
 * @throws Error if bank name is not supported
 */
export function getBankCode(bankName: BankName): string {
  const code = BANK_CODES[bankName];
  if (!code) {
    throw new Error(`Unsupported bank: ${bankName}`);
  }
  return code;
}

/**
 * Get the universal branch code for a given bank name
 * @param bankName - The bank name
 * @returns The universal branch code
 * @throws Error if bank name is not supported
 */
export function getBranchCode(bankName: BankName): string {
  const code = BRANCH_CODES[bankName];
  if (!code) {
    throw new Error(`Unsupported bank: ${bankName}`);
  }
  return code;
}

/**
 * Get all supported banks
 * @returns Array of supported bank names
 */
export function getSupportedBanks(): readonly BankName[] {
  return BANKS;
}
