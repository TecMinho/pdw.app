import { Text, View } from "react-native-ui-lib";
import React, { useEffect, useState } from "react";
import { FlatList, StyleSheet, Pressable, ImageBackground } from "react-native";
import _ from "lodash";
import { useLocalSearchParams } from "expo-router";
import StorageHelper from "@/helpers/storage";
import { EBSIVerifiableCredential } from "@/helpers/ebsi";
import { useLocale } from "@/context/TranslationContext";

/**
 * Props interface for the CredentialExpandedInfo component
 * Supports both direct data passing and dynamic loading scenarios
 */
interface CredentialExpandedInfoProps {
  data: EBSIVerifiableCredential | undefined;
  status: string;
}

/**
 * Main CredentialExpandedInfo component implementation
 * Handles credential display with fallback loading and comprehensive data presentation
 */
export default function CredentialExpandedInfo({
  status,
  data,
}: CredentialExpandedInfoProps) {
  const { id } = useLocalSearchParams();
  const { t } = useLocale();
  const [credentialData, setData] = useState<EBSIVerifiableCredential | null>(
    null,
  );

  /**
   * Recursively flattens nested objects into a flat key-value structure
   *
   * This function transforms complex nested credential objects into a flat
   * structure that can be easily processed and displayed. It maintains the
   * hierarchical relationship through dot-notation keys (e.g., "credentialSubject.name").
   *
   * @param obj - The object to flatten (can be nested)
   * @param prefix - Current key prefix for maintaining hierarchy
   * @returns Array of key-value pairs representing the flattened structure
   *
   * Example:
   * Input: { user: { name: "John", age: 30 } }
   * Output: [{ key: "user.name", value: "John" }, { key: "user.age", value: 30 }]
   */
  function flattenObject(obj: any, prefix = ""): { key: string; value: any }[] {
    let result: { key: string; value: any }[] = [];

    Object.entries(obj).forEach(([key, value]) => {
      const newKey = prefix ? `${prefix}.${key}` : key;

      if (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value)
      ) {
        result = result.concat(flattenObject(value, newKey));
      } else {
        result.push({ key: newKey, value });
      }
    });

    return result;
  }

  /**
   * Effect for loading credential data when not provided as props
   *
   * This effect handles the scenario where the component is accessed directly
   * via URL (e.g., through navigation) and needs to load the credential data
   * from storage using the ID parameter. It provides a fallback mechanism
   * for cases where data isn't passed through component props.
   */
  useEffect(() => {
    const fetchCredential = async () => {
      const credentials = await StorageHelper.loadCredentials();
      const foundCredential = credentials.find((cred) => cred.id === id);
      setData(foundCredential || null);
    };

    fetchCredential();
  }, [id]);

  const credential = data || credentialData;
  if (!credential) {
    return (
      <Text style={{ textAlign: "center", marginTop: 20 }}>
        {t("credentials.not_found")}
      </Text>
    );
  }

  const isRevoked = status === "revoked";
  const isExpired = status === "expired";

  /**
   * Process credential data for display
   *
   * 1. Flatten the nested credential object structure
   * 2. Filter out technical/metadata fields that aren't user-relevant
   * 3. Format values for consistent display
   * 4. Handle edge cases (null, undefined, objects)
   */
  const flattenedFields = flattenObject(credential);
  const filteredData = flattenedFields
    .filter(
      ({ key }) =>
        !["@context", "type", "id", "proof"].some((k) => key.startsWith(k)),
    )
    .map(({ key, value }) => {
      let displayValue: string;

      if (value === null || value === undefined) {
        displayValue = "N/A";
      } else if (typeof value === "object") {
        displayValue = JSON.stringify(value, null, 2);
      } else {
        displayValue = String(value);
      }

      return { key, displayValue };
    });

  return (
    <>
      <ImageBackground
        source={require("@/assets/images/carteira.png")}
        style={styles.imageBackground}
        resizeMode="contain"
      >
        <View style={styles.titleContainer}>
          <Text style={styles.titleText}>
            {Array.isArray(credential.type)
              ? credential.type[credential.type.length - 1]
              : _.startCase(
                  credential.type || t("credentials.verifiable_credential"),
                )}
          </Text>
          <Text
            style={[
              styles.statusText,
              {
                color: isRevoked ? "black" : isExpired ? "#DAA520" : "#388E3C",
              },
            ]}
          >
            {isRevoked
              ? `❌ ${t("credentials.revoked")}`
              : isExpired
                ? `⏳ ${t("credentials.expired")}`
                : `✔ ${t("credentials.valid")}`}
          </Text>
        </View>
      </ImageBackground>

      <View style={styles.detailsContainer}>
        <FlatList
          data={Object.entries(
            _.groupBy(filteredData, (item) => item.key.split(".")[0]),
          )}
          keyExtractor={([section]) => section}
          renderItem={({ item: [section, items] }) => {
            /**
             * Subsection Grouping Logic
             *
             * Further groups items within each section by their subsection path.
             * This creates a hierarchical structure where:
             * - Section: Top-level object (e.g., "credentialSubject")
             * - Subsection: Intermediate path (e.g., "address", "education")
             * - Fields: Individual properties within subsections
             */
            const groupedBySubsection = _.groupBy(items, (item) => {
              const parts = item.key.split(".");
              return parts.length > 2 ? parts.slice(1, -1).join(".") : "";
            });

            return (
              <View style={{ alignSelf: "stretch" }}>
                {items.length > 1 && (
                  <Text style={styles.sectionHeader}>
                    {_.startCase(section)}
                  </Text>
                )}
                {Object.entries(groupedBySubsection).map(
                  ([subsection, group]) => (
                    <View key={subsection}>
                      {subsection !== "" && (
                        <Text style={styles.subsectionLabel}>
                          {_.startCase(subsection.replace(/\./g, " > "))}
                        </Text>
                      )}
                      {group.map((item, index) => {
                        const keyParts = item.key.split(".");
                        const fieldName = _.startCase(
                          keyParts.slice(-1).join(""),
                        );

                        return (
                          <Pressable
                            key={item.key + index}
                            style={[styles.detailCard]}
                          >
                            <Text style={[styles.labelBold]}>{fieldName}</Text>
                            <Text style={[styles.value]}>
                              {item.displayValue}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  ),
                )}
              </View>
            );
          }}
        />
      </View>
    </>
  );
}

/**
 * StyleSheet for CredentialExpandedInfo component
 *
 * Implements a comprehensive styling system for credential display:
 * - Wallet-style card presentation with background image overlay
 * - Hierarchical typography for sections, subsections, and fields
 * - Card-based layout for individual credential fields
 * - Responsive design with consistent spacing and alignment
 * - Status-aware color coding and visual indicators
 *
 * Design Principles:
 * - Visual hierarchy through typography and spacing
 * - Accessibility through sufficient contrast and touch targets
 * - Consistency across different credential types and content
 * - Professional appearance suitable for official documents
 */
const styles = StyleSheet.create({
  titleText: {
    fontSize: 15.5,
    fontWeight: "bold",
  },
  imageBackground: {
    width: 364,
    height: 210,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
    alignSelf: "center",
  },
  titleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    position: "absolute",
    top: 50,
    left: 50,
    right: 50,
  },
  statusText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  detailsContainer: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  sectionHeader: {
    fontSize: 22,
    fontWeight: "bold",
    marginTop: 5,
    marginBottom: 10,
    color: "#333",
    alignSelf: "center",
    textAlign: "center",
  },
  subsectionLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#555",
    marginBottom: 5,
    textAlign: "center",
  },
  detailCard: {
    backgroundColor: "#EDEDED",
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderRadius: 10,
    width: 250,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 60,
    marginBottom: 15,
  },
  labelBold: {
    fontSize: 16,
    fontWeight: "900",
    color: "#000",
  },
  value: {
    fontSize: 13,
    color: "#000",
    marginTop: 5,
    textAlign: "center",
  },
});
