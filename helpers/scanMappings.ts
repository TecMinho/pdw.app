import {
  EBSIConformance,
  EBSIDID,
  EBSIServices,
  EBSIVerifiableCredential,
} from "@/helpers/ebsi";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { parseCredentialToken } from "@/helpers/sdJwt";

/**
 * Interface defining the structure for scan mapping handlers
 * Each handler must implement an execute method that processes the scanned URL
 */
interface ScanMapping {
  /**
   * Executes the scan mapping logic for a specific QR code type
   * @param url - The scanned URL containing the credential or presentation offer
   * @param did - The user's EBSI DID for authentication and signing
   * @param api - Optional flag indicating if this is an API-based operation
   * @returns Promise resolving to the result of the operation (credential, presentation, etc.)
   */
  execute: (url: string, did: EBSIDID, api?: boolean) => Promise<any>;
}

/**
 * Type definition for the complete scan mappings object
 * Maps QR code type identifiers to their corresponding handler functions
 */
type ScanMappings = {
  [key: string]: ScanMapping;
};

/**
 * Utility function to decode JWT payload from a JWT token
 * Extracts and parses the payload section of a JWT without verification
 *
 * @param jwt - The JWT token string to decode
 * @returns The decoded JWT payload as a JavaScript object
 * @throws Error if JWT format is invalid
 */
function decodeJwtPayload(jwt: string): any {
  const parts = jwt.split(".");
  if (parts.length !== 3) {
    throw new Error("JWT malformado");
  }

  const base64Url = parts[1];
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    "=",
  );
  const jsonPayload = atob(padded);

  return JSON.parse(jsonPayload);
}

/**
 * Scan Mappings Object
 *
 * Contains handlers for different types of QR codes that can be scanned in the app.
 * Each key represents a specific protocol or operation type, mapped to its handler.
 */
export const scanMappings: ScanMappings = {
  /**
   * OpenID Credential Offer Handler
   *
   * Handles OpenID4VCI (OpenID for Verifiable Credential Issuance) flows.
   * Supports multiple grant types: authorization code, pre-authorized code, and presentation-based.
   * This is the most complex handler, supporting conformance testing and various credential types.
   */
  open_id_credential_offer: {
    async execute(url: string, did: EBSIDID) {
      const credentialIssuer = await EBSIConformance.getCredentialIssuer(url);
      const state =
        credentialIssuer?.grants?.authorization_code?.issuer_state ?? undefined;

      if (!credentialIssuer) {
        throw new Error("Failed to fetch issuer metadata");
      }

      const metadata = await EBSIConformance.getCredentialIssuerMetadata(
        credentialIssuer.credential_issuer,
      );

      if (!metadata) {
        throw new Error(
          "Failed to fetch issuer metadata: metadata is undefined or null",
        );
      }

      const requiredMetadataFields = [
        "authorization_server",
        "credential_issuer",
        "credential_endpoint",
        "deferred_credential_endpoint",
      ];

      const missingFields = requiredMetadataFields.filter(
        (field) => !metadata?.[field],
      );

      if (missingFields.length > 0) {
        throw new Error(
          `Issuer metadata is missing the following field(s): ${missingFields.join(", ")}`,
        );
      }

      const types: string[] = credentialIssuer.credentials[0].types;
      const isDeferred = !!types.find((type) => type.endsWith("Deferred"));
      const isPreAuthorized =
        !!credentialIssuer.grants[
          "urn:ietf:params:oauth:grant-type:pre-authorized_code"
        ];

      const credentialConfigurationId =
        credentialIssuer.credential_configuration_ids?.[0];

      const credentialFormat =
        (credentialConfigurationId &&
          metadata.credential_configurations_supported?.[
            credentialConfigurationId
          ]?.format) ??
        credentialIssuer.credentials?.[0]?.format ??
        "jwt_vc_json";

      if (types.find((type) => type === "CTWalletQualificationCredential")) {
        const credentials = await EBSIConformance.getConformanceCredentials();

        if (!credentials) {
          throw new Error("Failed to fetch conformance credentials");
        }

        const { authUrl, authorizationEndpoint, codeVerifier } =
          await EBSIConformance.getAuthorizationParameters(
            metadata,
            did.did,
            credentialIssuer,
          );

        const code = await EBSIConformance.authorizePresentation(
          authUrl,
          credentials,
          did,
        );

        if (!code) {
          throw new Error("Failed to fetch code");
        }

        const accessToken = await EBSIConformance.fetchAccessToken(
          code,
          did.did,
          codeVerifier,
          authorizationEndpoint,
        );

        if (!accessToken) {
          throw new Error("Failed to fetch access token");
        }

        const credential = await EBSIConformance.issueCredential(
          accessToken.access_token,
          types,
          accessToken.id_token,
          metadata.credential_issuer,
          metadata.credential_endpoint,
          metadata.deferred_credential_endpoint,
          did,
          state,
          false,
          credentialFormat,
          credentialConfigurationId,
        );

        if (!credential) {
          throw new Error("Failed to issue credential");
        }

        const rawCredential = credential.credential;
        const decodedPayload = await parseCredentialToken(rawCredential);

        return EBSIServices.getVerifiableCredential(
          decodedPayload,
          rawCredential,
        );
      } else if (!isPreAuthorized) {
        const { authUrl, authorizationEndpoint, codeVerifier } =
          await EBSIConformance.getAuthorizationParameters(
            metadata,
            did.did,
            credentialIssuer,
          );

        const authorization = await EBSIConformance.authorizeRequest(authUrl);
        let code = null;

        if ("idToken" in authorization && "authRedirectUri" in authorization) {
          code = await EBSIConformance.authorizationCodeRequest(
            authorization.authRedirectUri,
            authorization.idToken,
            authorizationEndpoint,
            did,
          );

          if (!code) {
            throw new Error("Failed to fetch code");
          }
        } else if ("code" in authorization) {
          code = authorization.code;

          if (!code) {
            throw new Error("Failed to fetch code");
          }
        } else {
          throw new Error("Failed to fetch code");
        }

        const accessToken = await EBSIConformance.fetchAccessToken(
          code,
          did.did,
          codeVerifier,
          authorizationEndpoint,
        );

        if (!accessToken) {
          throw new Error("Failed to fetch access token");
        }

        const credential = await EBSIConformance.issueCredential(
          accessToken.access_token,
          types,
          accessToken.id_token,
          metadata.credential_issuer,
          metadata.credential_endpoint,
          metadata.deferred_credential_endpoint,
          did,
          state,
          isDeferred,
          credentialFormat,
          credentialConfigurationId,
        );

        if (!credential) {
          throw new Error("Failed to issue credential");
        }

        const rawCredential = credential.credential;
        const decodedPayload = await parseCredentialToken(rawCredential);
        const finalFilterTypes = (decodedPayload?.vc?.type ?? []).filter(
          (type: any) =>
            !["VerifiableCredential", "VerifiableAttestation"].includes(type),
        );

        const displayCredential =
          (credentialConfigurationId &&
            metadata.credential_configurations_supported?.[
              credentialConfigurationId
            ]) ||
          metadata.credentials_supported?.find((item: any) =>
            item.types?.some((type: string) => finalFilterTypes.includes(type)),
          );

        let credentialName = "";
        let credentialLogo = "";
        let credentialBackgroundImage = "";

        if (displayCredential) {
          const { name, logo, background_image } =
            displayCredential?.display[0];
          credentialName = name;
          credentialLogo = logo?.uri;
          credentialBackgroundImage = background_image?.uri;
        }

        return EBSIServices.getVerifiableCredential(
          decodedPayload,
          rawCredential,
          credentialName,
          credentialLogo,
          credentialBackgroundImage,
        );
      } else {
        const preAuthorizedCode =
          credentialIssuer.grants[
            "urn:ietf:params:oauth:grant-type:pre-authorized_code"
          ]["pre-authorized_code"];

        const isPinRequired =
          credentialIssuer.grants[
            "urn:ietf:params:oauth:grant-type:pre-authorized_code"
          ]["user_pin_required"];

        const preAuthorizedCodeValue = await AsyncStorage.getItem("code");

        if (!preAuthorizedCodeValue && isPinRequired) {
          throw new Error(
            "Failed to fetch input pre-authorized code from storage!",
          );
        }

        let tokenEndpoint: string;

        try {
          const openIdConfiguration =
            await EBSIConformance.getOpenIdConfiguration(
              credentialIssuer.authorization_server,
            );

          if (openIdConfiguration?.token_endpoint) {
            tokenEndpoint = openIdConfiguration.token_endpoint;
          } else {
            throw new Error(
              "OpenID Configuration does not contain a token endpoint.",
            );
          }
        } catch (err) {
          console.error("Error obtaining token endpoint:", err);
          tokenEndpoint = metadata.authorization_server + "/token";
        }

        const preAuthorizedAccessToken =
          await EBSIConformance.fetchPreAuthorizedAccessToken(
            Number(preAuthorizedCodeValue),
            preAuthorizedCode,
            tokenEndpoint,
          );

        if (!preAuthorizedAccessToken) {
          throw new Error("Failed to fetch pre-authorized access token");
        }

        const credential = await EBSIConformance.issueCredential(
          preAuthorizedAccessToken.access_token,
          types,
          preAuthorizedAccessToken.id_token,
          metadata.credential_issuer,
          metadata.credential_endpoint,
          metadata.deferred_credential_endpoint,
          did,
          state,
          isDeferred,
          credentialFormat,
          credentialConfigurationId,
        );

        if (!credential) {
          throw new Error("Failed to issue credential");
        }

        const rawCredential = credential.credential;
        const decodedPayload = await parseCredentialToken(rawCredential);

        await AsyncStorage.removeItem("code");

        const finalFilterTypes = (decodedPayload?.vc?.type ?? []).filter(
          (type: any) =>
            !["VerifiableCredential", "VerifiableAttestation"].includes(type),
        );

        const displayCredential =
          (credentialConfigurationId &&
            metadata.credential_configurations_supported?.[
              credentialConfigurationId
            ]) ||
          metadata.credentials_supported?.find((item: any) =>
            item.types?.some((type: string) => finalFilterTypes.includes(type)),
          );

        let credentialName = "";
        let credentialLogo = "";
        let credentialBackgroundImage = "";

        if (displayCredential) {
          const { name, logo, background_image } =
            displayCredential?.display[0];
          credentialBackgroundImage = background_image?.uri;
          credentialName = name;
          credentialLogo = logo?.uri;
        }

        return EBSIServices.getVerifiableCredential(
          decodedPayload,
          rawCredential,
          credentialName,
          credentialLogo,
          credentialBackgroundImage,
        );
      }
    },
  },

  /**
   * OpenID Presentation Offer Handler
   *
   * Handles OpenID4VP (OpenID for Verifiable Presentations) flows.
   * Creates and submits verifiable presentations based on presentation definitions.
   * Validates field selections and ensures compliance with verifier requirements.
   */
  open_id_presentation_offer: {
    async execute(url: string, did: EBSIDID) {
      const requestedFieldsRaw = await AsyncStorage.getItem("requestedFields");
      const selectedFieldsRaw = await AsyncStorage.getItem("selectedFields");

      const requestedFields = requestedFieldsRaw?.split(",") || [];
      const selectedFields = selectedFieldsRaw?.split(",") || [];

      const verifyFields = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL || ""}/verifier/validate_fields`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json; charset=UTF-8",
            Accept: "*/*",
          },
          body: JSON.stringify({
            requestedFields,
            selectedFields,
          }),
        },
      );

      if (!verifyFields.ok) {
        throw new Error("Failed to verify fields");
      }

      const verifyFieldsResponse = await verifyFields.text();

      if (verifyFieldsResponse !== "true") {
        throw new Error(
          "Missing requested fields! Please select the required fields.",
        );
      }

      const presentationOfferUri = new URL(url).searchParams.get("request_uri");

      if (!presentationOfferUri) {
        throw new Error("Presentation offer URI not found in the URL");
      }

      const presentationDefinitionRes = await fetch(presentationOfferUri, {
        method: "GET",
        headers: {
          Accept: "*/*",
        },
      });

      if (!presentationDefinitionRes.ok) {
        throw new Error("Failed to fetch presentation definition");
      }

      const presentationDefinition = await presentationDefinitionRes.text();

      const presentationDefinitionDecoded = decodeJwtPayload(
        presentationDefinition,
      );

      const presentationSubmissionRes = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL || ""}/verifier/define_presentation`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json; charset=UTF-8",
            Accept: "*/*",
          },
          body: JSON.stringify({
            presentationDefinition: JSON.stringify(
              presentationDefinitionDecoded.presentation_definition,
            ),
            consented: selectedFields,
          }),
        },
      );

      if (!presentationSubmissionRes.ok) {
        throw new Error(
          "Error while defining presentation. This happens when a mandatory constraint wasn't consented to " +
            "by the holder, or a network error occurred.",
        );
      }

      const presentationSubmission = await presentationSubmissionRes.json();

      const storedCredential = await AsyncStorage.getItem("selectedCredential");

      if (!storedCredential) {
        throw new Error("No credential selected for presentation");
      }

      const parsedCredential = JSON.parse(
        storedCredential,
      ) as EBSIVerifiableCredential;

      const credentials: EBSIVerifiableCredential[] = [parsedCredential];

      await AsyncStorage.removeItem("code");

      return await EBSIConformance.createPresentation(
        presentationDefinitionDecoded,
        did,
        presentationSubmission,
        credentials,
        selectedFields
      );
    },
  },
};
