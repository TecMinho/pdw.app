import * as Crypto from "expo-crypto";
import StorageHelper from "@/helpers/storage";
import { getGlobalCredentialSelector } from "@/utils/credentialSelectorBridge";
import { decodeJwt } from "jose";
import {
  CredentialIssuer,
  CredentialTemplateId,
} from "@/utils/credentialTemplates";

/**
 * EBSI Login Class
 *
 * Represents an EBSI login session with an access token.
 * This class is used to manage authentication tokens for EBSI API operations.
 */
export class EBSILogin {
  /** The OAuth2/OIDC access token for authenticated API calls */
  accessToken: string;

  /**
   * Creates a new EBSILogin instance
   * @param accessToken - The access token string for authentication
   */
  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  /**
   * Creates an EBSILogin instance from a JSON object
   * @param json - JSON object containing access_token field
   * @returns New EBSILogin instance
   */
  static fromJson(json: any): EBSILogin {
    return new EBSILogin(json["access_token"]);
  }
}

/**
 * EBSI DID (Decentralized Identifier) Class
 *
 * Manages decentralized identifiers and associated cryptographic key pairs.
 * DIDs are used for identity management and cryptographic operations in EBSI.
 */
export class EBSIDID {
  /** Base URL for the API service */
  static apiBase: string = process.env.EXPO_PUBLIC_API_URL || "";

  did: string;
  privateKey: string;
  seed?: string;
  x: string;
  y: string;

  /**
   * Creates a new EBSIDID instance
   * @param did - The DID string
   * @param privateKey - The private key
   * @param x - X coordinate of a public key
   * @param y - Y coordinate of a public key
   */
  constructor(
    did: string,
    privateKey: string,
    x: string,
    y: string,
    seed?: string,
  ) {
    this.did = did;
    this.privateKey = privateKey;
    this.x = x;
    this.y = y;
    this.seed = seed;
  }

  /**
   * Creates an EBSIDID instance from a JSON object
   * @param json - JSON object containing DID and key information
   * @returns New EBSIDID instance
   */
  static fromJson(json: any): EBSIDID {
    return new EBSIDID(
      json["did"],
      json["privateKey"],
      json["x"],
      json["y"],
      json["seed"],
    );
  }

  /**
   * Generates a new DID with an associated key pair from the API
   * Makes a GET request to the holder service to generate new DID credentials
   * @returns Promise resolving to a new EBSIDID instance
   * @throws Error if API request fails or response is invalid
   */
  static async generateDid(): Promise<EBSIDID> {
    const didRes = await fetch(`${this.apiBase}/holder/get_new_did`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "*/*",
      },
    });

    if (didRes.ok) {
      const didBody = await didRes.json();

      if (
        !didBody["did"] ||
        !didBody["privateKey"] ||
        !didBody["x"] ||
        !didBody["y"]
      ) {
        throw new Error("Invalid DID response");
      }

      return new EBSIDID(
        didBody["did"],
        didBody["privateKey"],
        didBody["x"],
        didBody["y"],
        didBody["seed"],
      );
    } else {
      throw new Error("Error generating a new DID");
    }
  }

  /**
   * Generates a Verifiable Credential (VC) attesting ownership of a DID.
   * Makes a POST request to the holder service to retrieve a signed DID credential.
   * Decodes the returned JWT and constructs a verified credential instance.
   * @param did The decentralized identifier (EBSIDID) to generate an attestation for.
   * @returns Promise resolving to an EBSIVerifiableCredential instance or null.
   * @throws Error if the API request fails or the response is invalid.
   */
  static async generateDidAttestation(
    did: EBSIDID,
  ): Promise<EBSIVerifiableCredential | null> {
    const res = await fetch(`${this.apiBase}/holder/get_did_credential`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "*/*",
      },
      body: JSON.stringify({ did }),
    });

    if (res.ok) {
      const data = await res.json();
      const decodedPayload: any = decodeJwt(data.credential);
      return EBSIServices.getVerifiableCredential(
        decodedPayload,
        data.credential,
        "DID Attestation",
        "",
        "",
      );
    } else {
      console.error(res);
      throw new Error("Error generating DID attestation");
    }
  }

  static async recoverDid(seed: string): Promise<EBSIDID> {
    const didRes = await fetch(`${this.apiBase}/holder/recover_did_from_seed`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "*/*",
      },
      body: JSON.stringify({ mnemonic: seed }),
    });

    if (didRes.ok) {
      const didBody = await didRes.json();

      if (
        !didBody["did"] ||
        !didBody["privateKey"] ||
        !didBody["x"] ||
        !didBody["y"]
      ) {
        throw new Error("Invalid DID response");
      }

      return new EBSIDID(
        didBody["did"],
        didBody["privateKey"],
        didBody["x"],
        didBody["y"],
      );
    } else {
      console.error(didRes);
      throw new Error("Error recovering a DID");
    }
  }
}

/**
 * EBSI Verifiable Credential Class
 *
 * Represents a W3C Verifiable Credential compliant with EBSI standards.
 * Contains all standard credential fields including credential subject,
 * issuer information, validity periods, and optional JWT representation.
 */
export class EBSIVerifiableCredential {
  id: string;
  issuer: CredentialIssuer;
  credentialSubject: Record<string, any>;
  issuanceDate: string;
  expirationDate: string;
  validFrom: string;
  validUntil: string;
  issued: string;
  credentialSchema: Record<string, any>;
  context: string[];
  type: string[];
  jwt: string | undefined;
  name: string | undefined;
  logo: string | undefined;
  backgroundImage: string | undefined;
  templateId: CredentialTemplateId | undefined;

  /**
   * Creates a new EBSIVerifiableCredential instance
   * @param id - Credential identifier
   * @param issuer - Issuer DID or URI
   * @param credentialSubject - Main credential data
   * @param issuanceDate - When credential was issued
   * @param expirationDate - When credential expires
   * @param validFrom - When credential becomes valid
   * @param validUntil - When credential validity ends
   * @param issued - Alternative issuance date field
   * @param credentialSchema - Schema validation information
   * @param context - JSON-LD context array
   * @param type - Credential type array
   * @param jwt - Optional JWT representation
   */
  constructor(
    id: string,
    issuer: CredentialIssuer,
    credentialSubject: Record<string, any>,
    issuanceDate: string,
    expirationDate: string,
    validFrom: string,
    validUntil: string,
    issued: string,
    credentialSchema: Record<string, any>,
    context: string[],
    type: string[],
    jwt?: string,
    name?: string,
    logo?: string,
    backgroundImage?: string,
    templateId?: CredentialTemplateId,
  ) {
    this.id = id;
    this.issuer = issuer;
    this.credentialSubject = credentialSubject;
    this.issuanceDate = issuanceDate;
    this.expirationDate = expirationDate;
    this.validFrom = validFrom;
    this.validUntil = validUntil;
    this.issued = issued;
    this.credentialSchema = credentialSchema;
    this.context = context;
    this.type = type;
    this.jwt = jwt;
    this.name = name;
    this.logo = logo;
    this.backgroundImage = backgroundImage;
    this.templateId = templateId;
  }

  /**
   * Creates an EBSIVerifiableCredential instance from a JSON object
   * Maps JSON fields to class properties, including context mapping from @context
   * @param json - JSON object containing credential data
   * @returns New EBSIVerifiableCredential instance
   */
  static fromJson(json: any): EBSIVerifiableCredential {
    return new EBSIVerifiableCredential(
      json["id"],
      json["issuer"],
      json["credentialSubject"],
      json["issuanceDate"],
      json["expirationDate"],
      json["validFrom"],
      json["validUntil"],
      json["issued"],
      json["credentialSchema"],
      json["@context"],
      json["type"],
      json["jwt"],
      json["name"],
      json["logo"],
      json["backgroundImage"],
      json["templateId"],
    );
  }

  /**
   * Converts the credential instance to a JSON object
   * Maps class properties back to JSON format, including @context field mapping
   * @returns JSON representation of the credential
   */
  toJson(): Record<string, any> {
    return {
      id: this.id,
      issuer: this.issuer,
      credentialSubject: this.credentialSubject,
      issuanceDate: this.issuanceDate,
      expirationDate: this.expirationDate,
      validFrom: this.validFrom,
      validUntil: this.validUntil,
      issued: this.issued,
      credentialSchema: this.credentialSchema,
      "@context": this.context,
      type: this.type,
      jwt: this.jwt,
      logo: this.logo,
      name: this.name,
      backgroundImage: this.backgroundImage,
      templateId: this.templateId,
    };
  }
}

/**
 * EBSI Services Class
 *
 * Provides core EBSI service operations including selective disclosure,
 * credential issuance, validation, and presentation functionality.
 * Contains static methods for interacting with EBSI APIs.
 */
export class EBSIServices {
  /**
   * Creates a Verifiable Credential from a credential offer and JWT
   * Combines credential data from an offer with its JWT representation
   * @param credentialOffer - Object containing the VC data
   * @param credentialJwt - JWT representation of the credential
   * @returns Promise resolving to the verifiable credential or null
   */
  static async getVerifiableCredential(
    credentialOffer: { vc: any },
    credentialJwt: string,
    name?: string,
    logo?: string,
    backgroundImage?: string,
    claimsMetadata?: Record<string, unknown>,
  ): Promise<EBSIVerifiableCredential | null> {
    try {
      const vcPayload = credentialOffer.vc;

      const credential = EBSIVerifiableCredential.fromJson({
        ...vcPayload,
        jwt: credentialJwt,
        logo,
        name,
        backgroundImage,
        claimsMetadata,
      });
      if (!credential) {
        throw new Error("Error creating verifiable credential");
      }

      return credential;
    } catch (error) {
      console.log(error);
      return null;
    }
  }
}

/**
 * EBSI Conformance Class
 *
 * Provides EBSI conformance testing utilities including OAuth2/OIDC flows,
 * PKCE (Proof Key for Code Exchange), and credential conformance operations.
 * Handles authorization flows, presentation submissions, and conformance testing.
 */
export class EBSIConformance {
  /** Base URL for the EBSI API service */
  static apiBase: string = process.env.EXPO_PUBLIC_API_URL || "";
  /** Standard HTTP headers for API requests */
  static apiHeaders: Record<string, string> = {
    "Content-Type": "application/json; charset=UTF-8",
    Accept: "*/*",
  };

  /**
   * Converts a buffer to Base64URL encoding
   * Used for PKCE code challenge generation in OAuth2 flows
   * @param buffer - Uint8Array to convert
   * @returns Promise resolving to Base64URL encoded string
   */
  static async bufferToBase64Url(buffer: Uint8Array): Promise<string> {
    const binary = String.fromCharCode(...buffer);
    return btoa(binary)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }

  /**
   * Generates a cryptographically secure code verifier for PKCE
   * Creates a random string using URL-safe characters for OAuth2 PKCE flow
   * @returns Promise resolving to the code verifier string
   */
  static async generateCodeVerifier(): Promise<string> {
    const length = 128;
    const charset =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return result;
  }

  /**
   * Generates a code challenge from a code verifier for PKCE
   * Uses SHA256 hashing and Base64URL encoding as per OAuth2 PKCE specification
   * @param codeVerifier - The code verifier to generate a challenge from
   * @returns Promise resolving to the Base64URL encoded code challenge
   */
  static async generateCodeChallenge(codeVerifier: string): Promise<string> {
    const hashHex = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      codeVerifier,
      { encoding: Crypto.CryptoEncoding.HEX },
    );

    const hashBytes = Uint8Array.from(
      hashHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)),
    );

    return this.bufferToBase64Url(hashBytes);
  }

  /**
   * Retrieves conformance test credentials from storage
   * Filters stored credentials to find those matching required conformance types
   * Uses the global credential selector for user choice when multiple matches exist
   * @returns Promise resolving to an array of selected credential JWTs
   * @throws Error if no conformance credentials found or selection fails
   */
  static async getConformanceCredentials(): Promise<string[]> {
    const credentials = (await StorageHelper.loadCredentials()) || [];

    // Define required conformance test credential types
    const requiredTypes = [
      "CTWalletSameAuthorisedInTime",
      "CTWalletCrossAuthorisedInTime",
      "CTWalletSameAuthorisedDeferred",
      "CTWalletCrossAuthorisedDeferred",
      "CTWalletSamePreAuthorisedInTime",
      "CTWalletCrossPreAuthorisedInTime",
      "CTWalletSamePreAuthorisedDeferred",
      "CTWalletCrossPreAuthorisedDeferred",
    ];

    const selector = getGlobalCredentialSelector();

    const matches = credentials.filter(
      (credential) =>
        Array.isArray(credential.type) &&
        credential.type.some((type) => requiredTypes.includes(type)),
    );

    if (matches.length === 0) {
      throw new Error(`No credentials found for the required types`);
    }

    try {
      const selected = await selector(matches);

      if (!selected || selected.length === 0) {
        throw new Error(`No credentials were selected`);
      }

      const selectedJWTs = selected
        .map((cred) => cred.jwt)
        .filter((jwt): jwt is string => typeof jwt === "string");

      if (selectedJWTs.length === 0) {
        throw new Error(`Selected credentials are missing JWTs`);
      }

      return selectedJWTs;
    } catch (err) {
      console.error(`Error selecting credentials`, err);
      throw err;
    }
  }

  /**
   * Retrieves credential issuer information from a credential offer URL
   * Fetches and parses credential issuer metadata for conformance testing
   * @param url - The credential offer URL to process
   * @returns Promise resolving to credential issuer data or null
   * @throws Error if request fails
   */
  static async getCredentialIssuer(url: string): Promise<any | null> {
    const response = await fetch(
      `${this.apiBase}/credential-offer/credential-offer?offer=${url}`,
      {
        method: "GET",
        headers: this.apiHeaders,
      },
    );
    if (response.ok) {
      return await response.json();
    } else {
      throw new Error(
        "Error fetching credential offer information. Please check the URL or your network connection.",
      );
    }
  }

  /**
   * Fetches OpenID Connect configuration from a credential issuer
   * Retrieves the .well-known/openid-configuration for OAuth2/OIDC setup
   * @param credentialIssuer - The credential issuer URL
   * @returns Promise resolving to OpenID configuration or null
   * @throws Error if request fails
   */
  static async getOpenIdConfiguration(
    credentialIssuer: string,
  ): Promise<any | null> {
    console.log(credentialIssuer);
    const response = await fetch(
      `${credentialIssuer}/.well-known/openid-configuration`,
      {
        method: "GET",
        headers: this.apiHeaders,
      },
    );
    if (response.ok) {
      return await response.json();
    } else {
      throw new Error("Error fetching OpenID configuration.");
    }
  }

  /**
   * Retrieves credential issuer metadata for conformance testing
   * Fetches metadata information needed for credential issuance flows
   * @param url - The credential issuer metadata URL
   * @returns Promise resolving to metadata object or null
   * @throws Error if request fails
   */
  static async getCredentialIssuerMetadata(url: string): Promise<any | null> {
    const response = await fetch(
      `${this.apiBase}/.well-known/openid-credential-issuer?url=${url}`,
      {
        method: "GET",
        headers: this.apiHeaders,
      },
    );
    if (response.ok) {
      return await response.json();
    } else {
      throw new Error("Error fetching OpenID credential issuer.");
    }
  }

  /**
   * Generates OAuth2/OIDC authorization parameters for credential issuance
   * Creates authorization URL with PKCE parameters and credential details
   * @param metadata - The credential issuer metadata
   * @param conformanceDid - The DID to use as client_id
   * @param credentialIssuer - The credential issuer configuration
   * @returns Promise resolving to authorization parameters object
   */
  static async getAuthorizationParameters(
    metadata: any,
    conformanceDid: string,
    credentialIssuer: any,
  ): Promise<{
    authUrl: string;
    authorizationEndpoint: string;
    codeVerifier: string;
  }> {
    const authorizationEndpoint = metadata.authorization_server;

    const clientId = conformanceDid;
    const redirectUri = "openid:";
    const state =
      credentialIssuer?.grants?.authorization_code?.issuer_state ??
      Math.random().toString(36).substring(2, 10);
    credentialIssuer.credentials[0].type = "openid_credential";
    credentialIssuer.credentials[0].locations = [metadata.credential_issuer];
    const authorizationDetails = JSON.stringify(credentialIssuer.credentials);
    const codeVerifier = await this.generateCodeVerifier();
    const codeChallenge = await this.generateCodeChallenge(codeVerifier);

    const openIdConfiguration = await fetch(
      `${this.apiBase}/.well-known/openid-configuration?url=${metadata.authorization_server}`,
      {
        method: "GET",
        headers: this.apiHeaders,
      },
    );

    let url = `${authorizationEndpoint}/authorize`;

    if (openIdConfiguration.ok) {
      const openIdConfigurationRes = await openIdConfiguration.json();
      url = `${openIdConfigurationRes.authorization_endpoint}`;
    }

    const params = new URLSearchParams({
      response_type: "code",
      scope: "openid",
      client_id: clientId,
      redirect_uri: redirectUri,
      state,
      issuer_state: credentialIssuer.grants.authorization_code.issuer_state,
      authorization_details: authorizationDetails,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });

    const authUrl = `${url}?${params.toString()}`;

    return {
      authUrl,
      authorizationEndpoint,
      codeVerifier,
    };
  }

  /**
   * Handles the authorization request flow
   * Processes authorization URL and handles redirect responses for both
   * direct code grants and request_uri flows with ID tokens
   * @param url - The authorization URL to process
   * @returns Promise resolving to either code or ID token with redirect URI
   * @throws Error if authorization flow fails
   */
  static async authorizeRequest(
    url: string,
  ): Promise<{ idToken: string; authRedirectUri: string } | { code: string }> {
    const authorizeUrl = new URL(url);

    const authorizationRes = await fetch(authorizeUrl);

    if (authorizationRes.status !== 302) {
      throw new Error("Authorization request did not return a redirect!");
    }

    const authLocation = authorizationRes.headers.get("location");

    if (!authLocation) {
      throw new Error("Authorization redirect location not found!");
    }

    const authRedirectUri = new URL(authLocation).searchParams.get(
      "redirect_uri",
    );

    const authRequestUri = new URL(authLocation).searchParams.get(
      "request_uri",
    );

    const code = new URL(authLocation).searchParams.get("code");

    if ((!authRedirectUri || !authRequestUri) && !code) {
      throw new Error("Failed to fetch authorization endpoints or code!");
    }

    if (code) {
      return {
        code,
      };
    }

    if (!authRedirectUri || !authRequestUri) {
      throw new Error("Failed to fetch authorization endpoints or code!");
    }

    const idTokenRes = await fetch(authRequestUri);

    if (!idTokenRes.ok) {
      throw new Error("Failed to fetch id token");
    }

    const idToken = await idTokenRes.text();

    if (!idToken) {
      throw new Error("Failed to parse id token");
    }

    return {
      idToken,
      authRedirectUri,
    };
  }

  /**
   * Handles authorization with presentation submission
   * Processes presentation requests and creates verifiable presentations
   * @param url - The authorization URL with presentation definition
   * @param credentials - Array of credential JWTs to use in presentation
   * @param did - The DID to create presentation with
   * @returns Promise resolving to the VP token
   * @throws Error if presentation authorization fails
   */
  static async authorizePresentation(
    url: string,
    credentials: string[],
    did: EBSIDID,
  ): Promise<any> {
    const authorizeUrl = new URL(url);

    const authorizationRes = await fetch(authorizeUrl);

    if (authorizationRes.status !== 302) {
      throw new Error("Authorization request did not return a redirect!");
    }

    const authLocation = authorizationRes.headers.get("location");

    if (!authLocation) {
      throw new Error("Authorization redirect location not found!");
    }

    const searchParams = new URL(authLocation).searchParams;

    const authRedirectUri = searchParams.get("redirect_uri");
    const request = searchParams.get("request");
    const state = searchParams.get("state");
    const presentationDefinition = searchParams.get("presentation_definition");

    if (!authRedirectUri || !request || !state || !presentationDefinition) {
      throw new Error(
        "Failed to fetch authorization redirect uri, request or state",
      );
    }

    const presentationSubmissionRes = await fetch(
      `${this.apiBase}/verifier/define_presentation`,
      {
        method: "POST",
        headers: this.apiHeaders,
        body: JSON.stringify({
          presentationDefinition,
        }),
      },
    );

    if (!presentationSubmissionRes.ok) {
      throw new Error("Failed to fetch presentation submission");
    }

    const presentationSubmission = await presentationSubmissionRes.json();

    if (!presentationSubmission) {
      throw new Error("Failed to parse presentation submission");
    }

    const vpTokenRes = await fetch(
      `${this.apiBase}/verifier/create_presentation`,
      {
        method: "POST",
        headers: this.apiHeaders,
        body: JSON.stringify({
          presentationSubmission,
          credentials,
          request,
          redirectEndpoint: authRedirectUri,
          did,
        }),
      },
    );

    if (!vpTokenRes.ok) {
      throw new Error("Failed to fetch vp token");
    }

    const vpToken = await vpTokenRes.text();

    if (!vpToken) {
      throw new Error("Failed to parse vp token");
    }

    return vpToken;
  }

  /**
   * Creates a verifiable presentation for conformance testing
   * Generates a presentation based on presentation definition and credentials
   * @param presentationDefinitionDecoded - The decoded presentation definition
   * @param did - The DID to create presentation with
   * @param presentationSubmission - The presentation submission structure
   * @param credentials - Array of verifiable credentials to include
   * @param selectedFields - Array of fields to include in the presentation
   * @returns Promise resolving to the created presentation
   * @throws Error if presentation creation fails
   */
  static async createPresentation(
    presentationDefinitionDecoded: any,
    did: EBSIDID,
    presentationSubmission: any,
    credentials: EBSIVerifiableCredential[],
    selectedFields: string[] = [],
  ) {
    const response = await fetch(
      `${this.apiBase}/verifier/issue_presentation`,
      {
        method: "POST",
        headers: this.apiHeaders,
        body: JSON.stringify({
          presentationOffer: presentationDefinitionDecoded,
          presentationSubmission,
          did,
          credentials,
          selectedFields,
        }),
      },
    );

    if (!response.ok) {
      throw new Error("The presentation offer is not valid!");
    }

    const res = await response.text();

    if (response.status === 201 && res !== "false") {
      return JSON.parse(res);
    } else {
      throw new Error("Error validating created presentation");
    }
  }

  /**
   * Handles authorization code request processing
   * Processes ID token and authorization parameters to get authorization code
   * @param url - The original authorization URL
   * @param idToken - The ID token from authorization flow
   * @param authorizationUrl - The authorization endpoint URL
   * @param did - The DID used in authorization
   * @returns Promise resolving to authorization code
   * @throws Error if authorization code request fails
   */
  static async authorizationCodeRequest(
    url: string,
    idToken: string,
    authorizationUrl: string,
    did: EBSIDID,
  ) {
    const authorizationCodeRes = await fetch(`${this.apiBase}/auth/authorize`, {
      method: "POST",
      headers: this.apiHeaders,
      body: JSON.stringify({
        idToken,
        url,
        authorizationUrl,
        did,
      }),
    });

    if (!authorizationCodeRes.ok) {
      throw new Error("Failed to fetch authorization code");
    }

    return await authorizationCodeRes.text();
  }

  /**
   * Fetches OAuth2 access token using authorization code
   * Exchanges authorization code for access token using PKCE verification
   * @param code - The authorization code from OAuth2 flow
   * @param did - The DID used as client_id
   * @param codeVerifier - The PKCE code verifier
   * @param authorizationEndpoint - The authorization server endpoint
   * @returns Promise resolving to access token response
   * @throws Error if token exchange fails
   */
  static async fetchAccessToken(
    code: string,
    did: string,
    codeVerifier: string,
    authorizationEndpoint: string,
  ) {
    const data = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: did,
      code,
      code_verifier: codeVerifier,
      redirect_uri: "openid:",
    }).toString();

    const accessTokenRes = await fetch(`${authorizationEndpoint}/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "*/*",
      },
      body: data,
    });

    if (!accessTokenRes.ok) {
      throw new Error("Failed to fetch access token");
    }

    return await accessTokenRes.json();
  }

  /**
   * Fetches access token using pre-authorized code grant
   * Exchanges pre-authorized code and user PIN for access token
   * @param userPin - The user's PIN for pre-authorized flow
   * @param preAuthorizedCode - The pre-authorized code
   * @param tokenEndpoint - The token endpoint URL
   * @returns Promise resolving to access token response
   * @throws Error if token exchange fails
   */
  static async fetchPreAuthorizedAccessToken(
    userPin: number,
    preAuthorizedCode: string,
    tokenEndpoint: string,
  ) {
    const data = new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:pre-authorized_code",
      user_pin: userPin.toString().padStart(4, "0"),
      "pre-authorized_code": preAuthorizedCode,
    }).toString();

    const accessTokenRes = await fetch(tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "*/*",
      },
      body: data,
    });

    if (!accessTokenRes.ok) {
      throw new Error("Failed to fetch access token");
    }

    return await accessTokenRes.json();
  }

  /**
   * Issues a verifiable credential using access token
   * Requests credential issuance with optional deferred processing
   * @param accessToken - The OAuth2 access token
   * @param types - Array of credential types to request
   * @param jwt - JWT proof for credential request
   * @param issuerEndpoint - The credential issuer endpoint
   * @param credentialEndpoint - The credential endpoint URL
   * @param deferredEndpoint - The deferred credential endpoint URL
   * @param did - The DID to issue credential for
   * @param state - Offer state for data persistency with the issuer
   * @param deferred - Whether to use deferred issuance flow
   * @returns Promise resolving to credential issuance response
   * @throws Error if credential issuance fails
   */
  static async issueCredential(
    accessToken: string,
    types: string[],
    jwt: string,
    issuerEndpoint: string,
    credentialEndpoint: string,
    deferredEndpoint: string,
    did: EBSIDID,
    state: string | undefined,
    deferred = false,
    format?: string,
    credentialConfigurationId?: string,
  ) {
    const credentialRes = await fetch(`${this.apiBase}/credentials`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "*/*",
      },
      body: JSON.stringify({
        accessToken,
        types,
        jwt,
        issuerEndpoint,
        credentialEndpoint,
        deferredEndpoint,
        did,
        deferred,
        state,
        format,
        credential_configuration_id: credentialConfigurationId,
      }),
    });

    if (!credentialRes.ok) {
      throw new Error("Failed to issue credential");
    }

    return await credentialRes.json();
  }
}
