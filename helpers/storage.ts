import AsyncStorage from "@react-native-async-storage/async-storage";
import { EBSIDID, EBSILogin, EBSIVerifiableCredential } from "@/helpers/ebsi";
import { parseCredentialToken } from "@/helpers/sdJwt";

/**
 * StorageHelper Class
 * 
 * A static utility class that provides methods for storing and retrieving
 * EBSI-related data in the device's local storage. All methods are static
 * to allow direct usage without instantiation.
 */
export default class StorageHelper {
  static didKey = "ebsididkey";
  static credentialsKey = "ebsicredentialskey";
  static loginKey = "ebsiloginkey";

  /**
   * Check if DID Information Exists
   *
   * Verifies whether a DID (Decentralized Identifier) has been previously
   * stored in the device storage. Used to determine if the user has already
   * set up their identity in the wallet.
   *
   * @returns Promise resolving to true if DID exists, false otherwise
   */
  static async hasDIDInfo(): Promise<boolean> {
    const value = await AsyncStorage.getItem(this.didKey);
    return value !== null;
  }

  /**
   * Check if Credentials Information Exists
   *
   * Verifies whether any verifiable credentials have been previously
   * stored in the device storage. Used to determine if the user has
   * any credentials in their wallet.
   *
   * @returns Promise resolving to true if credentials exist, false otherwise
   */
  static async hasCredentialsInfo(): Promise<boolean> {
    const value = await AsyncStorage.getItem(this.credentialsKey);
    return value !== null;
  }

  /**
   * Delete Entire Wallet Data
   *
   * Completely clears all data from AsyncStorage, effectively resetting
   * the wallet to its initial state. This is a destructive operation that
   * removes all DIDs, credentials, login sessions, and any other stored data.
   *
   * Use Cases:
   * - Wallet reset functionality
   * - User logout with data cleanup
   * - Error recovery scenarios
   *
   * @returns Promise that resolves when all data is cleared
   */
  static async deleteWallet(): Promise<void> {
    await AsyncStorage.clear();
  }

  /**
   * Save DID to Storage
   *
   * Persists a DID (Decentralized Identifier) object to device storage.
   * The DID contains the user's identity information including the DID string,
   * private key, and public key coordinates for cryptographic operations.
   *
   * @param did - The EBSIDID object to store
   * @returns Promise that resolves when the DID is successfully saved
   */
  static async saveDID(did: EBSIDID): Promise<void> {
    await AsyncStorage.setItem(this.didKey, JSON.stringify(did));
  }

  /**
   * Load DID from Storage
   *
   * Retrieves and reconstructs a DID object from device storage.
   * Returns null if no DID has been previously stored.
   *
   * @returns Promise resolving to EBSIDID object or null if not found
   */
  static async loadDID(): Promise<EBSIDID | null> {
    const value = await AsyncStorage.getItem(this.didKey);
    return value ? EBSIDID.fromJson(JSON.parse(value)) : null;
  }

  /**
   * Save Login Session to Storage
   *
   * Persists login session data including access tokens and authentication
   * information. This allows the app to maintain user sessions across
   * app restarts and provides seamless authentication experience.
   *
   * @param login - The EBSILogin object containing session data
   * @returns Promise that resolves when login data is successfully saved
   */
  static async saveLogin(login: EBSILogin): Promise<void> {
    await AsyncStorage.setItem(this.loginKey, JSON.stringify(login));
  }

  /**
   * Load Login Session from Storage
   *
   * Retrieves and reconstructs login session data from device storage.
   * Returns null if no active session exists or session has been cleared.
   *
   * @returns Promise resolving to EBSILogin object or null if not found
   */
  static async loadLogin(): Promise<EBSILogin | null> {
    const value = await AsyncStorage.getItem(this.loginKey);
    return value ? EBSILogin.fromJson(JSON.parse(value)) : null;
  }

  /**
   * Save Credentials Collection to Storage
   *
   * Persists an array of verifiable credentials to device storage.
   * This method replaces the entire credentials collection, so it should
   * be called with the complete updated list when adding or removing credentials.
   *
   * Process:
   * 1. Converts each credential object to JSON format
   * 2. Serializes the entire collection as a JSON string
   * 3. Stores the serialized data in AsyncStorage
   *
   * @param credentials - Array of EBSIVerifiableCredential objects to store
   * @returns Promise that resolves when credentials are successfully saved
   */
  static async saveCredentials(
    credentials: EBSIVerifiableCredential[],
  ): Promise<void> {
    const encodedCredentials = await Promise.all(
      credentials.map(async (credential) => {
        const rawJwt = credential?.jwt;

        if (!rawJwt || !rawJwt.includes("~")) {
          return credential.toJson();
        }

        try {
          const parsed = await parseCredentialToken(rawJwt);

          return EBSIVerifiableCredential.fromJson({
            ...credential.toJson(),
            ...parsed.vc,
            jwt: rawJwt,
            name: credential.name,
            logo: credential.logo,
            backgroundImage: credential.backgroundImage,
          }).toJson();
        } catch (error) {
          console.error("Error normalizing SD-JWT before saving:", error);
          return credential.toJson();
        }
      }),
    );
    await AsyncStorage.setItem(
      this.credentialsKey,
      JSON.stringify(encodedCredentials),
    );
  }

  /**
   * Load Credentials Collection from Storage
   *
   * Retrieves and reconstructs the complete collection of verifiable credentials
   * from device storage. Returns an empty array if no credentials exist.
   *
   * Process:
   * 1. Retrieves serialized credentials data from AsyncStorage
   * 2. Parses the JSON string to get credential objects
   * 3. Reconstructs standard JWT VC credentials directly with fromJson
   * 4. Rebuilds SD-JWT credentials from the stored token disclosures
   * 5. Returns the complete collection as typed objects
   *
   * @returns Promise resolving to array of EBSIVerifiableCredential objects
   */
  static async loadCredentials(): Promise<EBSIVerifiableCredential[]> {
    const value = await AsyncStorage.getItem(this.credentialsKey);

    if (!value) {
      return [];
    }

    const json = JSON.parse(value);

    return Promise.all(
      json.map(async (certificate: any) => {
        const rawJwt = certificate?.jwt;

        if (!rawJwt || !rawJwt.includes("~")) {
          return EBSIVerifiableCredential.fromJson(certificate);
        }

        try {
          const parsed = await parseCredentialToken(rawJwt);

          return EBSIVerifiableCredential.fromJson({
            ...certificate,
            ...parsed.vc,
            jwt: rawJwt,
            name: certificate.name,
            logo: certificate.logo,
            backgroundImage: certificate.backgroundImage,
          });
        } catch (error) {
          console.error("Error re-parsing stored SD-JWT credential:", error);
          return EBSIVerifiableCredential.fromJson(certificate);
        }
      }),
    );
  }

  /**
   * Get Specific Credential by ID
   *
   * Searches through the stored credentials collection to find a specific
   * credential by its unique identifier. This is useful for retrieving
   * a particular credential for display, verification, or presentation.
   *
   * Note: Includes debug logging to help with troubleshooting credential
   * retrieval issues during development.
   *
   * @param id - The unique identifier of the credential to retrieve
   * @returns Promise resolving to the credential if found, undefined otherwise
   */
  static async getCredentialById(
    id: string,
  ): Promise<EBSIVerifiableCredential | undefined> {
    const credentials = await this.loadCredentials();
    console.log("credentials", JSON.stringify(credentials, null, 2));
    return credentials.find((c) => c.id === id);
  }

  /**
   * Save Generic Data to Storage
   *
   * A utility method for storing arbitrary data with a custom key.
   * Provides a convenient way to store any serializable data beyond
   * the specific EBSI types (DID, credentials, login).
   *
   * Features:
   * - Automatic JSON serialization
   * - Error handling with console logging
   * - Generic data type support
   *
   * Use Cases:
   * - Storing user preferences
   * - Caching temporary data
   * - Storing application state
   * - Custom configuration settings
   *
   * @param key - The storage key to use for the data
   * @param value - The data to store (will be JSON serialized)
   * @returns Promise that resolves when data is saved or rejects on error
   */
  static async saveData(key: string, value: any) {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error("Error saving data:", error);
    }
  }

  /**
   * Load Generic Data from Storage
   *
   * A utility method for retrieving arbitrary data by key.
   * Complements the saveData method by providing generic data retrieval
   * with automatic JSON parsing and error handling.
   *
   * Features:
   * - Automatic JSON parsing
   * - Error handling with console logging
   * - Returns null for missing data or errors
   * - Type-agnostic data retrieval
   *
   * @param key - The storage key to retrieve data for
   * @returns Promise resolving to the parsed data or null if not found/error
   */
  static async loadData(key: string) {
    try {
      const value = await AsyncStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error("Error loading data:", error);
      return null;
    }
  }
}
