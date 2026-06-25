import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Checkbox, Text, View } from "react-native-ui-lib";
import StorageHelper from "@/helpers/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { EBSIVerifiableCredential } from "@/helpers/ebsi";
import { CredentialCard } from "@/app/(app)/(tabs)";
import { router } from "expo-router";
import { useLocale } from "@/context/TranslationContext";

/**
 * Props interface for the CredentialSelectorTrigger component
 * Defines callbacks for credential selection and user cancellation
 */
interface CredentialSelectorTriggerProps {
  onSelect: (credential: EBSIVerifiableCredential) => void;
  onCancel?: () => void;
}

/**
 * Type definition for hierarchical field tree structure
 * Used to organize nested credential fields in a tree format for UI display
 * The _fullPath property stores the complete dot-notation path for leaf nodes
 */
type FieldTree = {
  [key: string]: FieldTree & { _fullPath?: string };
};

/**
 * Main CredentialSelectorTrigger component implementation
 * Orchestrates the complete credential selection and field disclosure workflow
 */
const CredentialSelectorTrigger: React.FC<CredentialSelectorTriggerProps> = ({
  onSelect,
  onCancel,
}) => {
  const { t } = useLocale();
  const [showModal, setShowModal] = useState(false);
  const [credentials, setCredentials] = useState<EBSIVerifiableCredential[]>(
    [],
  );
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [selectedCredential, setSelectedCredential] =
    useState<EBSIVerifiableCredential | null>(null);
  const [fieldSelection, setFieldSelection] = useState<Record<string, boolean>>(
    {},
  );
  const [expiredStatus, setExpiredStatus] = useState<Record<string, boolean>>(
    {},
  );
  const [showFieldsModal, setShowFieldsModal] = useState(false);

  /**
   * Decodes JWT payload without signature verification
   *
   * This function extracts and parses the payload section of a JWT token.
   * Used for parsing presentation definitions and issuer metadata that come
   * as JWT tokens in OpenID4VP flows.
   *
   * Note: This is for parsing trusted JWTs where signature verification
   * is handled elsewhere in the flow.
   *
   * @param jwt - The JWT token to decode
   * @returns Parsed payload object
   * @throws Error if JWT format is invalid
   */
  function decodeJwtPayload(jwt: string): any {
    const parts = jwt.split(".");
    if (parts.length !== 3) {
      throw new Error("Malformed JWT");
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
   * Initial user prompt effect
   *
   * Immediately presents a confirmation dialog asking if the user wants to
   * use stored credentials. This provides a clear entry point and allows
   * users to opt out if they prefer alternative credential provision methods.
   */
  useEffect(() => {
    Alert.alert(
      t("credentials.use_stored_credential"),
      t("credentials.saved_credential"),
      [
        {
          text: t("credentials.no"),
          style: "cancel",
          onPress: onCancel,
        },
        {
          text: t("credentials.yes"),
          onPress: () => {
            loadCredentials();
            setShowModal(true);
          },
        },
      ],
    );
  }, []);

  /**
   * Credential expiration monitoring effect
   *
   * Continuously monitors credential expiration status every 5 seconds.
   * Uses timezone-adjusted date calculations to ensure accurate expiration
   * detection regardless of user's timezone. This prevents users from
   * selecting credentials that have expired during the selection process.
   */
  useEffect(() => {
    const checkExpiration = () => {
      if (!credentials) return;

      const expirationUpdates: Record<string, boolean> = {};
      const date = new Date();
      const today = new Date(date.getTime() - date.getTimezoneOffset() * 60000);

      credentials.forEach((cred) => {
        if (!cred.validUntil) {
          return;
        }

        const validUntil = new Date(cred.validUntil);

        if (!isNaN(validUntil.getTime())) {
          expirationUpdates[cred.id] = validUntil.getTime() < today.getTime();
        } else {
          console.warn(`Credential ${cred.id} has invalid validUntil date`);
        }
      });

      setExpiredStatus(expirationUpdates);
    };

    checkExpiration();
    const interval = setInterval(checkExpiration, 5000);
    return () => clearInterval(interval);
  }, [credentials]);

  /**
   * Advanced credential loading and filtering function
   *
   * This function implements sophisticated credential filtering logic that handles
   * two main scenarios:
   * 1. Simple credential type filtering (when credentialType is in URL)
   * 2. Complex OpenID4VP presentation definition parsing (when request_uri is provided)
   *
   * For complex scenarios, it:
   * - Fetches and decodes JWT presentation definitions
   * - Retrieves issuer metadata from well-known endpoints
   * - Matches stored credentials against supported types
   * - Handles both JWT and JSON response formats
   *
   * The filtering ensures only relevant credentials are presented to the user,
   * improving UX and preventing selection of incompatible credentials.
   */
  const loadCredentials = async () => {
    const stored = await StorageHelper.loadCredentials();
    const url = (await AsyncStorage.getItem("url")) ?? "";

    const verifierCredentialType = new URL(url).searchParams.get(
      "credentialType",
    );

    let filteredCredentials: EBSIVerifiableCredential[] = [];

    if (!verifierCredentialType) {
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

      const presentationDefinitionDecoded: any = decodeJwtPayload(
        presentationDefinition,
      );

      const constraints =
        presentationDefinitionDecoded.presentation_definition
          .input_descriptors[0].constraints.fields;

      const credentialTypeConstraint = constraints.find(
        (constraint: any) => constraint.id === "credentialType",
      );

      if (!credentialTypeConstraint) {
        throw new Error("Failed to fetch credential type");
      }

      const credentialType: string | null =
        credentialTypeConstraint?.filter?.contains?.const ?? null;

      if (!credentialType) {
        throw new Error("Failed to parse credential type");
      }

      filteredCredentials = stored.filter((cred) => {
        return cred.type?.includes(credentialType);
      });
    } else {
      filteredCredentials = stored.filter((cred) => {
        return cred.type?.includes(verifierCredentialType);
      });
    }

    if (filteredCredentials.length === 0) {
      Alert.alert(
        t("credentials.no_credentials_found"),
        t("credentials.no_usable_credentials_found"),
      );
      setShowModal(false);
      router.push("/(app)/(tabs)");
      return;
    }

    setCredentials(filteredCredentials);
  };

  /**
   * Flattens nested objects into dot-notation key-value pairs
   *
   * This utility function recursively traverses nested credential objects
   * and creates a flat structure with dot-notation keys. This is essential
   * for processing credentialSubject data which often contains nested
   * personal information, addresses, educational details, etc.
   *
   * @param obj - The object to flatten
   * @param prefix - Current key prefix for maintaining hierarchy
   * @returns Flattened object with dot-notation keys
   */
  const flattenObject = (obj: any, prefix = ""): Record<string, any> => {
    return Object.entries(obj).reduce(
      (acc, [key, value]) => {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (
          typeof value === "object" &&
          value !== null &&
          !Array.isArray(value)
        ) {
          Object.assign(acc, flattenObject(value, fullKey));
        } else {
          acc[fullKey] = value;
        }
        return acc;
      },
      {} as Record<string, any>,
    );
  };

  /**
   * Handles credential selection and initiates field selection process
   *
   * This function bridges the credential selection and field disclosure phases.
   * It processes the selected credential to extract available fields and
   * pre-selects fields based on previously stored user preferences.
   *
   * The function also maintains state consistency by storing requested fields
   * and transitioning between modals smoothly.
   *
   * @param credential - The credential selected by the user
   */
  const handleSelect = async (credential: EBSIVerifiableCredential) => {
    const storedFieldsRaw = await AsyncStorage.getItem("selectedFields");
    const requestedFields = storedFieldsRaw?.split(",") || [];

    await AsyncStorage.setItem("requestedFields", storedFieldsRaw || "");

    const credentialSubject = credential.credentialSubject;
    const availableFields = Object.keys(flattenObject(credentialSubject));

    const selection: Record<string, boolean> = {};
    for (const field of availableFields) {
      selection[field] = requestedFields.includes(field);
    }

    setFieldSelection(selection);
    setSelectedFields(availableFields);
    setSelectedCredential(credential);
    setShowModal(false);
    setShowFieldsModal(true);
  };

  /**
   * Renders credential fields in a hierarchical tree structure with checkboxes
   *
   * This complex function creates an interactive tree view of credential fields,
   * organizing them hierarchically based on their dot-notation paths. It provides
   * an intuitive interface for users to understand the structure of their credential
   * data and make informed decisions about field disclosure.
   *
   * The function performs two main operations:
   * 1. Tree Construction: Builds a nested tree structure from flat field paths
   * 2. Tree Rendering: Recursively renders the tree with proper indentation and controls
   *
   * @param fields - Array of flattened field paths to organize and render
   * @returns JSX elements representing the hierarchical field structure
   */
  const renderFieldCheckboxes = (fields: string[]) => {
    /**
     * Tree Construction Phase
     *
     * Converts flat field paths into a nested tree structure.
     * Each path like "credentialSubject.person.name" becomes a nested object
     * where leaf nodes contain a _fullPath property for identification.
     */
    const tree: FieldTree = {};

    for (const field of fields) {
      const parts = field.split(".");
      let node = tree;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (!node[part]) {
          node[part] = {};
        }
        if (i === parts.length - 1) {
          node[part]._fullPath = field;
        }
        node = node[part];
      }
    }

    /**
     * Tree Rendering Phase
     *
     * Recursively renders the tree structure with proper visual hierarchy.
     * Uses indentation levels to show nesting and provides checkboxes for
     * selectable fields and labels for non-selectable groupings.
     *
     * @param node - Current tree node to render
     * @param level - Current indentation level for visual hierarchy
     * @returns Array of JSX elements representing the tree structure
     */
    const renderNode = (node: any, level = 0) => {
      return Object.entries(node).map(([key, value]: [any, any]) => {
        if (key === "_fullPath") return null;

        const isLeaf = !!value._fullPath;
        const label = key
          .replace(/([a-z])([A-Z])/g, "$1 $2")
          .replace(/^./, (c: any) => c.toUpperCase());

        return (
          <View
            key={value._fullPath || key}
            style={{ marginLeft: level * 14, marginBottom: 10 }}
          >
            {isLeaf ? (
              <Checkbox
                value={fieldSelection[value._fullPath]}
                onValueChange={(newValue) => {
                  setFieldSelection((prev) => ({
                    ...prev,
                    [value._fullPath!]: newValue,
                  }));
                }}
                label={label}
                color="#00E676"
                labelStyle={{
                  color: "#E5E7EB",
                  fontSize: 15,
                  fontWeight: "500",
                }}
                containerStyle={{
                  marginBottom: 4,
                }}
              />
            ) : (
              <>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "700",
                    color: "#71717A",
                    letterSpacing: 2,
                    marginBottom: 8,
                    textTransform: "uppercase",
                  }}
                >
                  {label}
                </Text>
                {renderNode(value, level + 1)}
              </>
            )}
          </View>
        );
      });
    };

    return renderNode(tree);
  };

  return (
    <>
      <Modal visible={showModal} animationType="slide" transparent={false}>
        <SafeAreaView style={{ flex: 1, backgroundColor: "#050505" }}>
          <View flex padding-20 style={{ backgroundColor: "#050505" }}>
            <Text
              style={{
                fontSize: 30,
                fontWeight: "700",
                color: "#F8FAFC",
                letterSpacing: -0.2,
                marginBottom: 20,
              }}
            >
              {t("credentials.select_a_credential")}
            </Text>
            {credentials.length === 0 ? (
              <View
                style={{
                  flex: 1,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <ActivityIndicator size="large" color="#00E676" />
              </View>
            ) : (
              <ScrollView>
                {credentials.map((cred) => (
                  <CredentialCard
                    key={cred.id}
                    title={cred.type[2]}
                    status={expiredStatus[cred.id] ? "expired" : "valid"}
                    name={cred.name || ""}
                    expirationDate={new Date(
                      cred.expirationDate,
                    ).toLocaleDateString()}
                    validUntil={new Date(cred.validUntil).toLocaleDateString()}
                    issueDate={new Date(cred.issuanceDate).toLocaleDateString()}
                    onPress={() => handleSelect(cred)}
                    validFrom={new Date(cred.validFrom).toLocaleDateString()}
                    t={t}
                    logo={cred.logo}
                    backgroundImage={cred.backgroundImage}
                  />
                ))}
              </ScrollView>
            )}
            <Button
              marginT-10
              label={t("credentials.cancel")}
              backgroundColor="#111418"
              labelStyle={{ color: "#E5E7EB", fontWeight: "600" }}
              style={{
                borderRadius: 16,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.08)",
              }}
              onPress={() => {
                setShowModal(false);
                onCancel?.();
              }}
            />
          </View>
        </SafeAreaView>
      </Modal>
      <Modal
        visible={showFieldsModal}
        animationType="slide"
        transparent={false}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: "#050505" }}>
          <View
            flex
            padding-20
            style={{ backgroundColor: "#050505", paddingTop: 60 }}
          >
            <Text
              style={{
                fontSize: 30,
                fontWeight: "700",
                color: "#F8FAFC",
                letterSpacing: -0.2,
                marginBottom: 8,
              }}
            >
              {t("credentials.confirm_fields_to_share")}
            </Text>
            <Text
              style={{
                fontSize: 15,
                lineHeight: 22,
                color: "#9CA3AF",
                marginBottom: 20,
              }}
            >
              {t("credentials.choose_disclosure")}
            </Text>
            <ScrollView
              style={{
                padding: 14,
                borderRadius: 22,
                backgroundColor: "#111418",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.10)",
              }}
              contentContainerStyle={{ paddingBottom: 8 }}
            >
              {renderFieldCheckboxes(selectedFields)}
            </ScrollView>

            <View marginT-30 row spread>
              <Button
                label={t("credentials.back")}
                backgroundColor="#111418"
                labelStyle={{ color: "#E5E7EB", fontWeight: "600" }}
                style={{
                  flex: 1,
                  marginRight: 10,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.08)",
                }}
                onPress={() => {
                  setShowFieldsModal(false);
                  setShowModal(true);
                }}
              />
              <Button
                label={t("credentials.confirm")}
                backgroundColor="#10C790"
                labelStyle={{ color: "#0B0D10", fontWeight: "700" }}
                style={{
                  flex: 1,
                  marginLeft: 10,
                  borderRadius: 16,
                }}
                onPress={async () => {
                  const filteredFields = Object.entries(fieldSelection)
                    .filter(([_, isSelected]) => isSelected)
                    .map(([field]) => field);

                  await AsyncStorage.setItem(
                    "selectedFields",
                    filteredFields.join(","),
                  );

                  setShowFieldsModal(false);

                  if (selectedCredential) {
                    await AsyncStorage.setItem(
                      "selectedCredential",
                      JSON.stringify(selectedCredential),
                    );
                    onSelect(selectedCredential);
                  }
                }}
                disabled={!Object.values(fieldSelection).some((v) => v)}
              />
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
};

export default CredentialSelectorTrigger;
