import {
  Text,
  TextInput,
  FlatList,
  Pressable,
  ActivityIndicator,
  Modal,
  Image,
  ImageBackground,
  StyleSheet,
} from "react-native";
import SimpleLineIcon from "react-native-vector-icons/SimpleLineIcons";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import React, { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import useSWR, { mutate } from "swr";
import StorageHelper from "@/helpers/storage";
import { useTextDialog } from "@/providers/textDialogProvider";
import { Button, FloatingButton, View } from "react-native-ui-lib";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { scanMappings } from "@/helpers/scanMappings";
import CredentialExpandedInfo from "@/components/CredentialExpandedInfo";
import { EBSIVerifiableCredential } from "@/helpers/ebsi";
import { useLocale } from "@/context/TranslationContext";
import NoCredentialsView from "@/components/NoCredentialsView";
import Colors from "@/constants/Colors";
import PreAuthorizedCodeInput from "@/components/PreAuthorizedCode";

/**
 * Interface defining the props for the CredentialCard component
 * Used to display individual credential information in a card format
 */
interface CredentialCardProps {
  title: string;
  name: string;
  validUntil: string;
  expirationDate: string;
  issueDate: string;
  validFrom: string;
  status: string;
  onPress: () => void;
  style?: any;
  t: Function;
  logo?: string;
  backgroundImage?: string;
}

/**
 * CredentialCard Component
 *
 * Renders an individual credential in a card format with:
 * - Visual status indicators (valid/expired/revoked)
 * - Color-coded styling based on credential status
 * - Formatted date information
 * - Touch interaction for detailed view
 */
export const CredentialCard: React.FC<CredentialCardProps> = ({
  title,
  name,
  validUntil,
  expirationDate,
  issueDate,
  validFrom,
  status,
  onPress,
  style,
  t,
  logo,
  backgroundImage,
}) => {
  const isRevoked = status === "revoked";
  const isExpired = status === "expired";
  const statusColor = isRevoked ? "#EC003F" : isExpired ? "#FF6900" : "#00BC7D";
  const statusLabel = isRevoked
    ? t("main.revoked")
    : isExpired
      ? t("main.expired")
      : t("main.valid");
  const primaryTitle = name?.trim() ? name : title;
  const secondaryTitle = name?.trim()
    ? title
    : "Decentralized Identity Framework";

  return (
    <Pressable onPress={onPress} style={styles.credentialPressable}>
      <ImageBackground
        source={backgroundImage ? { uri: backgroundImage } : undefined}
        imageStyle={backgroundImage ? styles.credentialBgImage : undefined}
        style={[
          styles.credentialCard,
          backgroundImage
            ? styles.credentialCardWithBg
            : styles.credentialCardPlain,
          style,
        ]}
      >
        <View style={styles.cardTopRow}>
          <View style={styles.cardIconBox}>
            {logo ? (
              <Image
                source={{ uri: logo }}
                style={styles.cardIconLogo}
                resizeMode="contain"
              />
            ) : (
              <MaterialCommunityIcons
                name="shield-check"
                size={22}
                color="#00E676"
              />
            )}
          </View>
          <View style={styles.cardStatusPill}>
            <View
              style={[styles.cardStatusDot, { backgroundColor: statusColor }]}
            />
            <Text style={[styles.cardStatusText, { color: statusColor }]}>
              {statusLabel.toUpperCase()}
            </Text>
          </View>
        </View>

        <Text style={styles.credentialTitle}>{primaryTitle}</Text>
        <Text style={styles.credentialSubtitle}>{secondaryTitle}</Text>

        {!backgroundImage ? <View style={styles.credentialSpacer} /> : null}

        <View style={styles.credentialMetaRow}>
          <View>
            <Text style={styles.metaLabel}>
              {t("credentials.issue").toUpperCase()}
            </Text>
            <Text style={styles.metaValue}>
              {validFrom !== "Invalid Date"
                ? validFrom
                : issueDate !== "Invalid Date"
                  ? issueDate
                  : "N/A"}
            </Text>
          </View>
          <View style={styles.metaDivider} />
          <View>
            <Text style={styles.metaLabel}>
              {t("credentials.exp").toUpperCase()}
            </Text>
            <Text style={styles.metaValue}>
              {validUntil !== "Invalid Date"
                ? validUntil
                : expirationDate !== "Invalid Date"
                  ? expirationDate
                  : "N/A"}
            </Text>
          </View>
          <View style={styles.metaChevronWrap}>
            <SimpleLineIcon name="arrow-right" size={14} color="#6B7280" />
          </View>
        </View>
      </ImageBackground>
    </Pressable>
  );
};

/**
 * Home Screen Component - Main Credentials Dashboard
 *
 * This is the primary interface for credential management, providing:
 * - Credential collection display with real-time status updates
 * - Search and filtering capabilities
 * - Manual credential offer processing
 * - Navigation to detailed credential views
 */
export default function Home() {
  const { enqueueDialog } = useTextDialog();
  const { t } = useLocale();
  const router = useRouter();
  const { data: credentials } = useSWR("credentials", () =>
    StorageHelper.loadCredentials(),
  );
  const [search, setSearch] = useState("");
  const [sortByExpiration] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [revokedStatus, setRevokedStatus] = useState<Record<string, boolean>>(
    {},
  );
  const [expiredStatus, setExpiredStatus] = useState<Record<string, boolean>>(
    {},
  );
  const [showExpired, setShowExpired] = useState(false);
  const [isLoadingType, setIsLoadingType] = useState(true);
  const [isOfferModalOpen, setOfferModalOpen] = useState(false);
  const [offerUrl, setOfferUrl] = useState("");
  const [fetching, setFetching] = useState(false);
  const [code, setCode] = useState<string>("");
  const [data, setData] = useState<EBSIVerifiableCredential>();
  const [loading, setLoading] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  /**
   * Handle expired credential visibility toggle
   * Persists the preference to AsyncStorage for consistency across app sessions
   */
  const handleSelectExpired = async (newValue: boolean) => {
    setShowExpired(newValue);
    await AsyncStorage.setItem("showExpired", JSON.stringify(newValue));
  };

  /**
   * Clear all type filters and show all credentials
   * Resets the filter selection and persists the change
   */
  const handleToggleAll = async () => {
    setSelectedTypes([]);
    await AsyncStorage.setItem("selectedTypes", JSON.stringify([]));
  };

  /**
   * Toggle a specific credential type filter
   * Adds or removes the type from the selected filters list
   */
  const handleToggleType = async (type: string) => {
    let newSelectedTypes;
    if (selectedTypes.includes(type)) {
      newSelectedTypes = selectedTypes.filter((t) => t !== type);
    } else {
      newSelectedTypes = [...selectedTypes, type];
    }

    setSelectedTypes(newSelectedTypes);
    await AsyncStorage.setItem(
      "selectedTypes",
      JSON.stringify(newSelectedTypes),
    );
  };

  /**
   * Filter and sort credentials based on current filters and search term
   *
   * Applies multiple filtering criteria:
   * - Type-based filtering (if types are selected)
   * - Expiration status filtering (based on showExpired preference)
   * - Search term matching across all credential fields
   * - Optional sorting by expiration date
   */
  const filteredCredentials = credentials
    ?.filter((cred) => {
      const date = new Date();
      const isExpired =
        new Date(cred.validUntil) <
        new Date(date.getTime() - date.getTimezoneOffset() * 60000);

      if (selectedTypes.length === 0) {
        if (!showExpired && isExpired) return false;
      } else {
        const matchesType = selectedTypes.some((type) =>
          cred.type?.includes(type),
        );
        if (!matchesType || (!showExpired && isExpired)) return false;
      }

      return containsSearchTerm(cred, search);
    })
    .sort((a, b) =>
      sortByExpiration
        ? new Date(a.validUntil).getTime() - new Date(b.validUntil).getTime()
        : 0,
    );

  /**
   * Deep search function to find search terms across all credential fields
   *
   * Recursively searches through:
   * - String values (case-insensitive)
   * - Number and boolean values (converted to string)
   * - Array elements (recursive search)
   * - Object properties (recursive search)
   *
   * @param obj - The credential object to search
   * @param searchTerm - The term to search for
   * @returns true if the search term is found anywhere in the object
   */
  function containsSearchTerm(obj: any, searchTerm: string): boolean {
    if (!searchTerm) return true;

    const lowerSearchTerm = searchTerm.toLowerCase();

    function searchInValue(value: any): boolean {
      if (value == null) return false;

      if (typeof value === "string") {
        return value.toLowerCase().includes(lowerSearchTerm);
      }

      if (typeof value === "number" || typeof value === "boolean") {
        return value.toString().toLowerCase().includes(lowerSearchTerm);
      }

      if (Array.isArray(value)) {
        return value.some((item) => searchInValue(item));
      }

      if (typeof value === "object") {
        return Object.values(value).some((val) => searchInValue(val));
      }

      return false;
    }

    return searchInValue(obj);
  }

  /**
   * Real-time credential revocation status monitoring
   *
   * Periodically checks the revocation status of all credentials by:
   * - Making API calls to the issuer's revocation endpoint
   * - Updating the revocation status state
   * - Running every 5 seconds for real-time updates
   * - Handling network errors gracefully
   */
  useEffect(() => {
    const fetchStatuses = async () => {
      if (!credentials) return;

      const statusUpdates: Record<string, boolean> = {};

      await Promise.all(
        credentials.map(async (cred) => {
          try {
            const response = await fetch(
              `${process.env.EXPO_PUBLIC_API_URL || ""}/issuer/is_revoked/${cred.id}`,
              { credentials: "include" },
            );
            const data = await response.json();
            statusUpdates[cred.id] = data.isRevoked;
          } catch (error) {
            console.error(t("main.error_fetching_revocation_status"), error);
          }
        }),
      );

      setRevokedStatus(statusUpdates);
    };

    fetchStatuses();
    const interval = setInterval(fetchStatuses, 5000);

    return () => clearInterval(interval);
  }, [credentials, t]);

  /**
   * Real-time credential expiration status monitoring
   *
   * Continuously checks if credentials have expired by:
   * - Comparing validUntil dates with current date
   * - Accounting for timezone differences
   * - Updating expiration status every 5 seconds
   * - Enabling real-time UI updates for expired credentials
   */
  useEffect(() => {
    const checkExpiration = () => {
      if (!credentials) return;

      const expirationUpdates: Record<string, boolean> = {};
      const date = new Date();
      const today = new Date(date.getTime() - date.getTimezoneOffset() * 60000);

      credentials.forEach((cred) => {
        const validUntil = new Date(cred.validUntil);
        expirationUpdates[cred.id] = validUntil.getTime() < today.getTime();
      });

      setExpiredStatus(expirationUpdates);
    };

    checkExpiration();

    const interval = setInterval(checkExpiration, 5000);

    return () => clearInterval(interval);
  }, [credentials]);

  /**
   * Load persistent user preferences from AsyncStorage
   *
   * Restores user settings on app startup:
   * - showExpired preference (whether to display expired credentials)
   * - selectedTypes filter (which credential types to show)
   * - Ensures UI state consistency across app sessions
   */
  useEffect(() => {
    const loadSelectedTypes = async () => {
      const storedShowExpired = await AsyncStorage.getItem("showExpired");
      const storedSelectedTypes = await AsyncStorage.getItem("selectedTypes");

      if (storedShowExpired !== null) {
        setShowExpired(JSON.parse(storedShowExpired));
      }

      if (storedSelectedTypes !== null) {
        setSelectedTypes(JSON.parse(storedSelectedTypes));
      }

      setIsLoadingType(false);
    };

    loadSelectedTypes();
  }, []);

  /**
   * Handle credential approval from manual offer processing
   *
   * Saves the newly issued credential to storage and:
   * - Adds credential to the local collection
   * - Triggers SWR cache revalidation
   * - Navigates back to the main tab
   * - Resets the approval workflow state
   */
  const onApprove = async () => {
    if (!data || loading) return;
    setLoading(true);
    const credentials = (await StorageHelper.loadCredentials()) || [];
    credentials.push(data);
    await StorageHelper.saveCredentials(credentials);
    await mutate("credentials");
    router.push("/(app)/(tabs)");
    setData(undefined);
    setLoading(false);
  };

  /**
   * Handle credential rejection from manual offer processing
   * Clears the current credential data and resets the workflow
   */
  const onReject = async () => {
    setData(undefined);
    setLoading(false);
  };

  if (isLoadingType) {
    return (
      <ActivityIndicator
        size="large"
        color={Colors.current.tint} // "#0000ff"
        style={{ marginTop: 20 }}
      />
    );
  }

  const temp = credentials?.map((cred) => cred.type).flat();

  const uniqueTypes = new Set(temp);

  const finalFilterTypes = Array.from(uniqueTypes.values()).filter(
    (type) => !["VerifiableCredential", "VerifiableAttestation"].includes(type),
  );

  /**
   * Main Render Method
   *
   * Renders the complete credentials dashboard including:
   * - Credential approval modal for manual offers
   * - Header with title and expired credential toggle
   * - Search bar with filter options
   * - Credential list with real-time status updates
   * - Manual credential offer modal
   * - Type filtering action sheet
   */
  return (
    <>
      <View style={styles.screen}>
        <Modal visible={!!data}>
          <CredentialExpandedInfo data={data} status={""} />
          <FloatingButton
            visible
            buttonLayout={"Horizontal"}
            button={{
              label: t("main.accept"),
              disabled: loading,
              onPress: onApprove,
              backgroundColor: "#10C790",
            }}
            secondaryButton={{
              outline: false,
              disabled: loading,
              onPress: onReject,
              color: "#7C7C7C",
              backgroundColor: "#E6E6E6",
              label: t("main.reject"),
            }}
          />
        </Modal>
        <View style={styles.headerRow}>
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerTitle}>{t("main.credentials")}</Text>
          </View>
          <Pressable
            onPress={() => handleSelectExpired(!showExpired)}
            style={[
              styles.eyeToggle,
              showExpired ? styles.eyeToggleActive : styles.eyeToggleInactive,
            ]}
          >
            <MaterialCommunityIcons
              name={showExpired ? "eye" : "eye-off"}
              size={14}
              color={showExpired ? "#0B0D10" : "#D1D5DB"}
            />
            <Text
              style={[
                styles.eyeToggleText,
                showExpired
                  ? styles.eyeToggleTextActive
                  : styles.eyeToggleTextInactive,
              ]}
            >
              {showExpired ? t("main.view_all") : t("main.active_only")}
            </Text>
          </Pressable>
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchInputWrap}>
            <SimpleLineIcon name="magnifier" size={16} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholderTextColor="#6B7280"
              placeholder={t("main.search")}
              onChangeText={setSearch}
              value={search}
            />
          </View>
          <Pressable
            onPress={() => setIsSheetOpen(true)}
            style={styles.filterButton}
          >
            <SimpleLineIcon name="options-vertical" size={16} color="#D1D5DB" />
          </Pressable>
        </View>

        {credentials ? (
          (filteredCredentials ?? []).length > 0 ? (
            <FlatList
              data={filteredCredentials}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <CredentialCard
                  title={item.type?.[2] || t("main.unknown_credential")}
                  validUntil={new Date(item.validUntil).toLocaleDateString()}
                  expirationDate={new Date(
                    item.expirationDate,
                  ).toLocaleDateString()}
                  issueDate={new Date(item.issuanceDate).toLocaleDateString()}
                  validFrom={new Date(item.validFrom).toLocaleDateString()}
                  status={
                    revokedStatus[item.id]
                      ? "revoked"
                      : expiredStatus[item.id]
                        ? "expired"
                        : "valid"
                  }
                  onPress={async () => {
                    try {
                      router.push(
                        `/(app)/credential/${encodeURIComponent(item.id)}`,
                      );
                    } catch (error) {
                      console.error(t("main.error_loading_credentials"), error);
                    }
                  }}
                  name={item.name || ""}
                  logo={item.logo}
                  t={t}
                  backgroundImage={item.backgroundImage}
                />
              )}
            />
          ) : (
            <NoCredentialsView t={t} />
          )
        ) : (
          <ActivityIndicator
            size="large"
            color={Colors.current.tint}
            style={styles.loader}
          />
        )}
      </View>
      <Modal
        visible={isOfferModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setOfferModalOpen(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            padding: 20,
            backgroundColor: "rgba(0,0,0,0.5)",
          }}
        >
          <View
            style={{ backgroundColor: "white", padding: 20, borderRadius: 10 }}
          >
            <Text
              style={{ marginBottom: 10, fontWeight: "bold", fontSize: 16 }}
            >
              {t("main.paste_offer_url")}
            </Text>
            <TextInput
              placeholder="https://..."
              value={offerUrl}
              onChangeText={setOfferUrl}
              autoCapitalize="none"
              autoCorrect={false}
              style={{
                height: 40,
                borderWidth: 1,
                borderColor: "#ccc",
                paddingHorizontal: 10,
                borderRadius: 5,
                marginBottom: 20,
              }}
            />
            <Text
              style={{ marginBottom: 10, fontWeight: "bold", fontSize: 16 }}
            >
              {t("main.enter_pre_approved_code")}
            </Text>
            <PreAuthorizedCodeInput
              value={code}
              onChangeText={setCode}
              maxLength={8}
              placeholder="1234"
            />
            <View style={{ gap: 10 }}>
              <Button
                label={
                  fetching ? t("main.issuing") : t("main.issue_credential")
                }
                onPress={async () => {
                  setFetching(true);
                  try {
                    if (!offerUrl) {
                      throw new Error(t("main.no_offer_url"));
                    }

                    if (code) {
                      await AsyncStorage.setItem("code", code);
                    }

                    const did = await StorageHelper.loadDID();

                    if (!did) {
                      throw new Error(t("main.no_did_found"));
                    }

                    const credential =
                      await scanMappings.open_id_credential_offer.execute(
                        offerUrl,
                        did,
                      );

                    if (!credential) {
                      throw new Error(t("main.no_credential_found"));
                    }

                    setData(credential);
                    setOfferModalOpen(false);
                    setOfferUrl("");
                  } catch (error) {
                    console.error(error);
                    setFetching(false);
                    enqueueDialog(t("main.failed_to_fetch_or_parse_offer"), {
                      title: "Error",
                    });
                  } finally {
                    setFetching(false);
                  }
                }}
                disabled={fetching || !offerUrl}
              />
              <Button
                label="Cancel"
                onPress={() => {
                  setOfferModalOpen(false);
                  setOfferUrl("");
                }}
                disabled={fetching}
              />
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        visible={isSheetOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsSheetOpen(false)}
      >
        <Pressable
          style={styles.sheetBackdrop}
          onPress={() => setIsSheetOpen(false)}
        />
        <View style={styles.sheetWrap}>
          <View style={styles.sheetCard}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{t("main.filter_by_type")}</Text>

            <Pressable
              style={styles.sheetItem}
              onPress={() => {
                handleToggleAll();
                setIsSheetOpen(false);
              }}
            >
              <Text
                style={[
                  styles.sheetItemText,
                  selectedTypes.length === 0 && styles.sheetItemTextActive,
                ]}
              >
                {t("main.all")}
              </Text>
              <MaterialCommunityIcons
                name={
                  selectedTypes.length === 0 ? "check-circle" : "circle-outline"
                }
                size={20}
                color={selectedTypes.length === 0 ? "#00E676" : "#6B7280"}
              />
            </Pressable>

            {finalFilterTypes.map((type) => {
              const selected = selectedTypes.includes(type);
              return (
                <Pressable
                  key={type}
                  style={styles.sheetItem}
                  onPress={() => handleToggleType(type)}
                >
                  <Text
                    style={[
                      styles.sheetItemText,
                      selected && styles.sheetItemTextActive,
                    ]}
                  >
                    {type}
                  </Text>
                  <MaterialCommunityIcons
                    name={selected ? "check-circle" : "circle-outline"}
                    size={20}
                    color={selected ? "#00E676" : "#6B7280"}
                  />
                </Pressable>
              );
            })}

            <Pressable
              style={styles.sheetCancel}
              onPress={() => setIsSheetOpen(false)}
            >
              <Text style={styles.sheetCancelText}>{t("main.cancel")}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 20,
    paddingTop: 20,
    backgroundColor: Colors.current.background,
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 30,
    marginBottom: 16,
    gap: 12,
  },
  headerTextWrap: {
    flex: 1,
    paddingTop: 14,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "700",
    color: "#F8FAFC",
    letterSpacing: -0.3,
  },
  eyeToggle: {
    flexDirection: "row",
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    alignItems: "center",
  },
  eyeToggleActive: {
    borderColor: "rgba(0,230,118,0.45)",
    backgroundColor: "#00E676",
  },
  eyeToggleInactive: {
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "#111418",
  },
  eyeToggleText: {
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 8,
    letterSpacing: 0.2,
  },
  eyeToggleTextActive: {
    color: "#0B0D10",
  },
  eyeToggleTextInactive: {
    color: "#E5E7EB",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  searchInputWrap: {
    flex: 1,
    backgroundColor: "#111418",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 46,
    flexDirection: "row",
    alignItems: "center",
  },
  searchInput: {
    flex: 1,
    height: 40,
    marginLeft: 8,
    color: "#F3F4F6",
  },
  filterButton: {
    width: 46,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "#111418",
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingBottom: 140,
  },
  loader: {
    marginTop: 22,
  },
  credentialPressable: {
    marginTop: 8,
  },
  credentialCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(0, 230, 118, 0.35)",
    borderLeftWidth: 4,
    borderLeftColor: "#00E676",
    overflow: "hidden",
    backgroundColor: "#0B0D10",
  },
  credentialCardPlain: {
    backgroundColor: "#0B0D10",
  },
  credentialCardWithBg: {
    minHeight: 176,
    justifyContent: "space-between",
  },
  credentialBgImage: {
    opacity: 0.95,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  cardIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(0,230,118,0.14)",
    borderWidth: 1,
    borderColor: "rgba(0,230,118,0.28)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardIconLogo: {
    width: 24,
    height: 24,
  },
  cardStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(0,230,118,0.12)",
    borderWidth: 1,
    borderColor: "rgba(0,230,118,0.22)",
  },
  cardStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
  },
  cardStatusText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.1,
  },
  credentialTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#F8FAFC",
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  credentialSubtitle: {
    fontSize: 13,
    color: "#A1A1AA",
    marginBottom: 8,
  },
  credentialSpacer: {
    height: 8,
  },
  credentialMetaRow: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.10)",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  metaLabel: {
    fontSize: 10,
    color: "#71717A",
    fontWeight: "700",
    letterSpacing: 2,
  },
  metaValue: {
    marginTop: 2,
    fontSize: 13,
    color: "#F8FAFC",
    fontWeight: "600",
  },
  metaDivider: {
    width: 1,
    height: 28,
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  metaChevronWrap: {
    flex: 1,
    alignItems: "flex-end",
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  sheetWrap: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 12,
  },
  sheetCard: {
    backgroundColor: "#111418",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 14,
  },
  sheetHandle: {
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignSelf: "center",
    marginBottom: 10,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#F8FAFC",
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  sheetItem: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#0B0D10",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    marginBottom: 8,
  },
  sheetItemText: {
    color: "#D1D5DB",
    fontSize: 15,
    fontWeight: "500",
  },
  sheetItemTextActive: {
    color: "#F8FAFC",
    fontWeight: "700",
  },
  sheetCancel: {
    marginTop: 4,
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  sheetCancelText: {
    color: "#9CA3AF",
    fontSize: 15,
    fontWeight: "600",
  },
});
