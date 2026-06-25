import { Text, View } from "react-native-ui-lib";
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Image } from "react-native";
import _ from "lodash";
import { useLocalSearchParams } from "expo-router";
import StorageHelper from "@/helpers/storage";
import { EBSIVerifiableCredential } from "@/helpers/ebsi";
import { useLocale } from "@/context/TranslationContext";
import Ionicons from "@expo/vector-icons/Ionicons";
import { getStatusColor, StatusColors } from "@/utils/statusColors";

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
    })
    .filter((item) => !["logo", "name", "backgroundImage"].includes(item.key));

  const grouped = _.groupBy(filteredData, (item) => item.key.split(".")[0]);
  const issuerItems = grouped.issuer || grouped.credentialIssuer || [];

  const issuedValue = credential.issuanceDate || credential.validFrom || "N/A";
  const expiresValue =
    credential.validUntil || credential.expirationDate || "N/A";

  const formatMaybeDate = (value: string) => {
    if (!value || value === "N/A") return "N/A";
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString();
  };

  const toDisplay = (value: unknown) => {
    if (value === null || value === undefined || value === "") return "N/A";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  };

const cs: any = credential?.credentialSubject ?? {};
const achieved = Array.isArray(cs?.achieved) ? cs.achieved[0] : cs?.achieved;
const derivedFrom = Array.isArray(achieved?.wasDerivedFrom)
  ? achieved.wasDerivedFrom[0]
  : achieved?.wasDerivedFrom;

const subjectItems = [
  {
    key: "credentialSubject.identifier.schemeID",
    displayValue: toDisplay(cs?.identifier?.schemeID),
  },
  {
    key: "credentialSubject.identifier.value",
    displayValue: toDisplay(cs?.identifier?.value),
  },
  {
    key: "credentialSubject.achieved.title",
    displayValue: achieved?.title
      ? `${achieved.title}${
          derivedFrom?.title ? ` (${derivedFrom.title})` : ""
        }`
      : "N/A",
  },
  {
    key: "credentialSubject.achieved.wasDerivedFrom.grade",
    displayValue: toDisplay(derivedFrom?.grade),
  },
];

  const titleText = Array.isArray(credential.type)
    ? credential.type[credential.type.length - 1]
    : _.startCase(credential.type || t("credentials.verifiable_credential"));

  const subtitleText =
    credential.name || t("credentials.verifiable_credential");

  const statusText = isRevoked
    ? t("credentials.revoked")
    : isExpired
      ? t("credentials.expired")
      : t("credentials.valid");

  const statusColor = getStatusColor(isRevoked ? "revoked" : isExpired ? "expired" : "valid" as StatusColors);

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.heroCard}>
        <View style={styles.heroGlow} />
        <View style={styles.heroHeader}>
          <View style={[styles.heroIconBox, { backgroundColor: "#FFFFFF" }]}>
            {credential.logo ? (
              <Image
                source={{ uri: credential.logo }}
                style={styles.heroLogo}
                resizeMode="contain"
              />
            ) : (
              <Ionicons name="school-outline" size={26} color="#3B82F6" />
            )}
          </View>
          <View
            style={[styles.statusPill, { borderColor: `${statusColor.text}`, backgroundColor: `${statusColor.background}` }]}
          >
            <View
              style={[styles.statusDot, { backgroundColor: statusColor.text }]}
            />
            <Text style={[styles.statusText, { color: statusColor.text }]}>
              {statusText.toUpperCase()}
            </Text>
          </View>
        </View>

        <Text style={styles.heroTitle} numberOfLines={2}>
          {titleText}
        </Text>
        <Text style={styles.heroSubtitle}>{subtitleText}</Text>

        <View style={styles.heroMeta}>
          <View>
            <Text style={styles.metaLabel}>
              {t("credentials.issue").toUpperCase()}
            </Text>
            <Text style={styles.metaValue}>{formatMaybeDate(issuedValue)}</Text>
          </View>
          <View style={styles.metaDivider} />
          <View>
            <Text style={styles.metaLabel}>
              {t("credentials.exp").toUpperCase()}
            </Text>
            <Text style={styles.metaValue}>
              {formatMaybeDate(expiresValue)}
            </Text>
          </View>
        </View>
      </View>

      {issuerItems.length > 0 && (
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>ISSUER</Text>
          <View style={styles.sectionPanel}>
            {issuerItems.map((item, idx) => (
              <View
                key={item.key}
                style={[
                  styles.fieldRow,
                  idx < issuerItems.length - 1 && styles.fieldBorder,
                ]}
              >
                <Text style={styles.fieldLabel}>
                  {_.startCase(item.key.split(".").slice(-1).join(""))}
                </Text>
                <Text
                  style={[
                    styles.fieldValue,
                    item.displayValue.length > 42 && styles.fieldValueCompact,
                  ]}
                  numberOfLines={2}
                >
                  {item.displayValue}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.sectionWrap}>
        <Text style={styles.sectionTitle}>CREDENTIAL SUBJECT</Text>
        <View style={styles.sectionPanel}>
          {subjectItems.map((item, idx) => (
            <View
              key={item.key}
              style={[
                styles.fieldRow,
                idx < subjectItems.length - 1 && styles.fieldBorder,
              ]}
            >
              <Text style={styles.fieldLabel}>
                {_.startCase(item.key.split(".").slice(-1).join(""))}
              </Text>
              <Text
                style={[
                  styles.fieldValue,
                  item.displayValue.length > 42 && styles.fieldValueCompact,
                ]}
                numberOfLines={2}
              >
                {item.displayValue}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingBottom: 42,
    gap: 18,
  },
  heroCard: {
    marginTop: 8,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.35)",
    backgroundColor: "#0B0D10",
    overflow: "hidden",
    padding: 18,
  },
  heroGlow: {
    position: "absolute",
    top: -84,
    right: -58,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(59,130,246,0.14)",
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  heroIconBox: {
    width: 86,
    height: 86,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.55)",
    backgroundColor: "rgba(59,130,246,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroLogo: {
    width: 54,
    height: 54,
  },
  statusPill: {
    minHeight: 30,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: "rgba(0,230,118,0.12)",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.8,
  },
  heroTitle: {
    fontSize: 42,
    lineHeight: 46,
    fontWeight: "700",
    color: "#F8FAFC",
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 13,
    color: "#A1A1AA",
    marginBottom: 16,
  },
  heroMeta: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.10)",
    paddingTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  metaLabel: {
    fontSize: 10,
    color: "#71717A",
    fontWeight: "700",
    letterSpacing: 2.2,
  },
  metaValue: {
    marginTop: 2,
    fontSize: 15,
    color: "#F8FAFC",
    fontWeight: "700",
  },
  metaDivider: {
    width: 1,
    height: 30,
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  sectionWrap: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 13,
    color: "#71717A",
    fontWeight: "700",
    letterSpacing: 3,
    marginLeft: 4,
  },
  sectionPanel: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "#101418",
    overflow: "hidden",
  },
  fieldRow: {
    minHeight: 80,
    justifyContent: "center",
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  fieldBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  fieldLabel: {
    fontSize: 11,
    color: "#71717A",
    fontWeight: "700",
    letterSpacing: 2.6,
    marginBottom: 6,
  },
  fieldValue: {
    fontSize: 17,
    color: "#F8FAFC",
    fontWeight: "700",
  },
  fieldValueCompact: {
    fontSize: 15,
    lineHeight: 20,
  },
});
