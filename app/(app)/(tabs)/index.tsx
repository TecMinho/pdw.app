import {
  Text,
  TextInput,
  FlatList,
  Pressable,
  ActivityIndicator,
  Modal,
  Image,
  ImageBackground,
} from "react-native";
import SimpleLineIcon from "react-native-vector-icons/SimpleLineIcons";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import React, { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import useSWR, { mutate } from "swr";
import StorageHelper from "@/helpers/storage";
import { useTextDialog } from "@/providers/textDialogProvider";
import { ActionSheet, Button, FloatingButton, View } from "react-native-ui-lib";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { scanMappings } from "@/helpers/scanMappings";
import CredentialExpandedInfo from "@/components/CredentialExpandedInfo";
import { EBSIVerifiableCredential } from "@/helpers/ebsi";
import { useLocale } from "@/context/TranslationContext";
import NoCredentialsView from "@/components/NoCredentialsView";
import Colors from "@/constants/Colors";

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
  const cardColor = isRevoked ? "#D0E7FF" : "#c8edff";
  return (
    <Pressable onPress={onPress} style={{ padding: 5 }}>
      <ImageBackground
        source={backgroundImage ? { uri: backgroundImage } : undefined}
        style={{
          backgroundColor: backgroundImage ? undefined : cardColor,
          padding: 20,
          borderRadius: 25,
          marginVertical: 10,
          overflow: "hidden",
          shadowColor: "#000",
          shadowOpacity: 0.5,
          shadowRadius: 6,
          borderColor: "#000",
          shadowOffset: { width: 0, height: 3 },
          elevation: 4, // for Android
          ...(backgroundImage && { minHeight: 200 }),
          ...style,
        }}
      >
        {backgroundImage && logo ? (
          <View style={{ alignItems: "flex-start", flexDirection: "row" }}>
            <Image
              source={{ uri: logo }}
              style={{ width: 80, height: 80 }}
              resizeMode="none"
            />
            <Text style={{ fontSize: 12, color: "black", fontWeight: "bold" }}>
              {name || title}
            </Text>
          </View>
        ) : !backgroundImage && logo ? (
          <View>
            <Image
              source={{ uri: logo }}
              style={{ width: 300, height: 100 }}
              resizeMode="contain"
            />
            <Text style={{ fontSize: 12, color: "black", fontWeight: "bold" }}>
              {name || title}
            </Text>
          </View>
        ) : (
          <Text style={{ fontSize: 14, color: "black", fontWeight: "bold" }}>
            {name || title}
          </Text>
        )}

        <View style={{ height: 20 }} />

        {!backgroundImage && (
          <>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginTop: 15,
                alignItems: "flex-end",
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "bold",
                    color: isRevoked
                      ? "black"
                      : isExpired
                        ? "#DAA520"
                        : "green",
                  }}
                >
                  {isRevoked
                    ? `❌ ${t("main.revoked")}`
                    : isExpired
                      ? `⏳ ${t("main.expired")}`
                      : `✔ ${t("main.valid")}`}
                </Text>
              </View>
              <View>
                <Text
                  style={{ fontSize: 14, color: "black", textAlign: "right" }}
                >
                  {t("credentials.exp")}:{" "}
                  {validUntil !== "Invalid Date"
                    ? validUntil
                    : expirationDate !== "Invalid Date"
                      ? expirationDate
                      : "N/A"}
                </Text>
                <Text
                  style={{ fontSize: 14, color: "black", textAlign: "right" }}
                >
                  {t("credentials.issue")}:{" "}
                  {validFrom !== "Invalid Date"
                    ? validFrom
                    : issueDate !== "Invalid Date"
                      ? issueDate
                      : "N/A"}
                </Text>
              </View>
            </View>
          </>
        )}
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
      <View style={{ padding: 20, backgroundColor: Colors.current.background, flex: 1 }}>
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
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 30,
            marginBottom: 25,
          }}
        >
          <Text style={{ fontSize: 28, fontWeight: "bold", flex: 1, color: Colors.current.text }}>
            {t("main.credentials")}
          </Text>

          <Pressable
            onPress={() => handleSelectExpired(!showExpired)}
            style={{
              flexDirection: "row",
              backgroundColor: Colors.current.background,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 15,
              alignItems: "center",
            }}
          >
            <MaterialCommunityIcons
              name={showExpired ? "eye" : "eye-off"}
              size={13}
              color={Colors.current.text}
            />
            <Text
              style={{
                color: Colors.current.text,
                fontSize: 12,
                fontWeight: "bold",
                marginLeft: 8,
              }}
            >
              {showExpired ? t("main.view_all") : t("main.active_only")}
            </Text>
          </Pressable>
        </View>

        <>
          <View
            style={{
              backgroundColor: "#f0f0f0",
              borderRadius: 17,
              paddingHorizontal: 12,
              marginBottom: 20,
              height: 45,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <SimpleLineIcon name="magnifier" size={16} color={Colors.current.textMuted} />
            <TextInput
              style={{ flex: 1, height: 40, marginLeft: 8, color: Colors.light.text }}              
              placeholderTextColor={Colors.current.textMuted} 
              placeholder={t("main.search")}
              onChangeText={setSearch}
              value={search}
            />
            <Pressable
              onPress={() => setIsSheetOpen(true)}
              style={{ marginLeft: 10 }}
            >
              <SimpleLineIcon name="options-vertical" size={20} color={Colors.current.textMuted} />
            </Pressable>
          </View>
        </>

        {credentials ? (
          (filteredCredentials ?? []).length > 0 ? (
            <FlatList
              data={filteredCredentials}
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
            color="#0000ff"
            style={{ marginTop: 20 }}
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
            <TextInput
              placeholder="1234"
              value={code}
              onChangeText={setCode}
              keyboardType="numeric"
              style={{
                height: 40,
                borderWidth: 1,
                borderColor: "#ccc",
                paddingHorizontal: 10,
                borderRadius: 5,
                marginBottom: 20,
              }}
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
      <ActionSheet
        title={t("main.filter_by_type")}
        visible={isSheetOpen}
        onDismiss={() => setIsSheetOpen(false)}
        useNativeIOS={true}
        options={[
          {
            label:
              selectedTypes.length === 0
                ? `☑️ ${t("main.all")}`
                : t("main.all"),
            onPress: () => handleToggleAll(),
          },
          ...finalFilterTypes.map((type) => ({
            label: selectedTypes.includes(type) ? `☑️ ${type}` : `⬜ ${type}`,
            onPress: () => handleToggleType(type),
          })),
          {
            label: t("main.cancel"),
            onPress: () => setIsSheetOpen(false),
          },
        ]}
      />
    </>
  );
}
