import { EBSIVerifiableCredential } from "@/helpers/ebsi";

/**
 * Global Credential Selector Function Storage
 *
 * Stores the credential selection function that will be used globally
 * throughout the application. Initialized as null and must be set
 * during app initialization.
 *
 * Function Signature:
 * - Input: Array of available credentials to choose from
 * - Output: Promise resolving to array of selected credentials
 * - Async: Supports user interaction and UI rendering
 */
let globalSelectCredential:
  | ((
      credentials: EBSIVerifiableCredential[],
    ) => Promise<EBSIVerifiableCredential[]>)
  | null = null;

/**
 * Set Global Credential Selector Function
 *
 * Registers a credential selection function for global use throughout
 * the application. This function should be called during app initialization
 * to set up the credential selection mechanism.
 *
 * Function Requirements:
 * - Must handle UI rendering for credential selection
 * - Should support multi-selection scenarios
 * - Must return a Promise for async operations
 * - Should handle user cancellation gracefully
 *
 * @param fn - The credential selection function to register globally
 *             Takes array of credentials, returns Promise of selected ones
 */
export const setGlobalCredentialSelector = (
  fn: (
    credentials: EBSIVerifiableCredential[],
  ) => Promise<EBSIVerifiableCredential[]>,
) => {
  globalSelectCredential = fn;
};

/**
 * Get Global Credential Selector Function
 *
 * Retrieves the globally registered credential selection function.
 * This function should be called whenever credential selection is needed
 * from any part of the application.
 *
 * Error Handling:
 * - Throws error if selector hasn't been initialized
 * - Ensures app has proper setup before use
 * - Provides clear error message for debugging
 *
 * @returns The registered credential selection function
 * @throws Error if credential selector has not been initialized
 */
export const getGlobalCredentialSelector = () => {
  if (!globalSelectCredential) {
    throw new Error("Credential selector has not been initialized.");
  }
  return globalSelectCredential;
};
