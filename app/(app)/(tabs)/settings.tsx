import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  TextInput,
  Image,
  Linking,
  Alert,
  ScrollView,
  SafeAreaView,
  StyleSheet,
} from "react-native";
import StorageHelper from "@/helpers/storage";
import { useRouter } from "expo-router";
import { useTextDialog } from "@/providers/textDialogProvider";
import useAuth from "@/providers/authProvider";
import { mutate } from "swr";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { scanMappings } from "@/helpers/scanMappings";
import { EBSIVerifiableCredential } from "@/helpers/ebsi";
import { Button, FloatingButton } from "react-native-ui-lib";
import CredentialExpandedInfo from "@/components/CredentialExpandedInfo";
import { useLocale } from "@/context/TranslationContext";
import * as Clipboard from "expo-clipboard";
import DIDQRCode from "@/components/DIDQRCode";
import { default as ThemeColors } from "@/constants/Colors";
import PreAuthorizedCodeInput from "@/components/PreAuthorizedCode";

/**
 * Settings Screen Component - Wallet Management Interface
 *
 * Provides access to wallet configuration, DID management, and credential operations
 * that are not part of the main credential viewing workflow.
 */
export default function Home() {
  const [data, setData] = useState<EBSIVerifiableCredential>();
  const { enqueueDialog } = useTextDialog();
  const { setIsAuthenticated } = useAuth();
  const { t, changeLanguage, currentLanguage } = useLocale();
  const router = useRouter();
  const [isOfferModalOpen, setOfferModalOpen] = useState(false);
  const [offerUrl, setOfferUrl] = useState("");
  const [code, setCode] = useState("");
  const [fetching, setFetching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isViewDIDModalOpen, setViewDIDModalOpen] = useState(false);
  const [walletDID, setWalletDID] = useState(""); //useState(t("settings.no_did_found"));

  /**
   * Copy the user's DID (Decentralized Identifier)
   * Copy the DID string to the Clipboard to be used in other applications
   */
  const handleCopyDID = async () => {
    await Clipboard.setStringAsync(walletDID);
  };

  /**
   * Display the user's DID (Decentralized Identifier)
   * Shows the DID string in a dialog for user reference or sharing
   */
  const handleViewDID = async () => {
    setViewDIDModalOpen(true);
  };

  /**
   * Handle credential approval from manual offer processing
   * Saves the newly issued credential and updates the UI state
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
   * Clears the current credential data without saving
   */
  const onReject = async () => {
    setData(undefined);
    setLoading(false);
  };

  /**
   * Delete all stored credentials with user confirmation
   * Displays a confirmation dialog before permanently removing all credentials
   * This operation cannot be undone
   */
  const handleDeleteAllCredentials = async () => {
    Alert.alert(
      t("settings.delete_credentials"),
      t("settings.confirm_delete_credentials"),
      [
        {
          text: t("settings.cancel"),
          style: "cancel",
        },
        {
          text: t("settings.delete"),
          style: "destructive",
          onPress: async () => {
            await StorageHelper.saveCredentials([]);
            await mutate("credentials");
          },
        },
      ],
      { cancelable: true },
    );
  };

  /**
   * Delete the entire wallet with user confirmation
   * This is the most destructive operation - removes all credentials, DID, and wallet data
   * Logs the user out and requires re-authentication
   */
  const handleDeleteWallet = async () => {
    Alert.alert(
      t("settings.delete_wallet"),
      t("settings.confirm_delete_wallet"),
      [
        {
          text: t("settings.cancel"),
          style: "cancel",
        },
        {
          text: t("settings.delete"),
          style: "destructive",
          onPress: async () => {
            await StorageHelper.deleteWallet();
            setIsAuthenticated(false);
          },
        },
      ],
      { cancelable: true },
    );
  };

  // Type definition for Ionicon names used in settings items
  // Ensures type safety for icon selection
  type IoniconName =
    | "eye-outline"
    | "link-outline"
    | "trash-outline"
    | "wallet-outline"
    | "information-circle-outline";

  /**
   * Settings menu configuration
   * Defines all available settings options with their handlers, icons, and styling
   *
   * Items are categorized by risk level:
   * - Safe operations (view DID, add credentials) - blue styling
   * - Destructive operations (delete actions) - red styling for visual warning
   */
 const settingsItems: {
   label: string;
   onPress: () => void;
   icon: IoniconName;
   danger: boolean;
 }[] = [
   {
     label: t("settings.view_did"),
     onPress: handleViewDID,
     icon: "eye-outline",
     danger: false,
   },
   {
     label: t("settings.delete_credentials"),
     onPress: handleDeleteAllCredentials,
     icon: "trash-outline",
     danger: true,
   },
   {
     label: t("settings.delete_wallet"),
     onPress: handleDeleteWallet,
     icon: "wallet-outline",
     danger: true,
   },
 ];

const identityRows: typeof settingsItems = [settingsItems[0]];
const dangerRows: typeof settingsItems = [settingsItems[1], settingsItems[2]];


  /**
   * Main Render Method - Settings Interface
   *
   * Renders the complete settings screen including:
   * - Credential approval modal for manual offers
   * - Settings header with back navigation
   * - Settings menu items with appropriate styling
   * - App logo for branding
   * - Manual credential offer processing modal
   */
  return (
    <>
      <Modal visible={!!data}>
        <CredentialExpandedInfo data={data} status={""} />
        <FloatingButton
          visible
          buttonLayout={"Horizontal"}
          button={{
            label: t("settings.accept"),
            disabled: loading,
            onPress: onApprove,
            color: ThemeColors.current.primary.text,
            backgroundColor: ThemeColors.current.primary.background,
          }}
          secondaryButton={{
            outline: false,
            disabled: loading,
            onPress: onReject,
            color: "#7C7C7C",
            backgroundColor: "#E6E6E6",
            label: t("settings.reject"),
          }}
        />
      </Modal>
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerRow}>
            <Pressable
              onPress={() => router.replace("/(app)/(tabs)")}
              style={({ pressed }) => [
                styles.backBtn,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name="chevron-back-outline" size={22} color="#F8FAFC" />
            </Pressable>
            <View style={styles.headerTextWrap}>
              <Text style={styles.headerTitle}>{t("settings.settings")}</Text>
            </View>
          </View>

          <View style={styles.section}>
            {identityRows.map(({ label, onPress, icon }) => (
              <Pressable
                key={label}
                onPress={onPress}
                style={({ pressed }) => [
                  styles.row,
                  pressed && styles.rowPressed,
                ]}
              >
                <View style={styles.rowIconBox}>
                  <Ionicons name={icon} size={18} color="#00E676" />
                </View>
                <Text style={styles.rowLabel}>{label}</Text>
                <Ionicons name="chevron-forward" size={16} color="#6B7280" />
              </Pressable>
            ))}

            <Pressable
              onPress={() =>
                changeLanguage(currentLanguage === "pt" ? "en" : "pt")
              }
              style={({ pressed }) => [
                styles.row,
                pressed && styles.rowPressed,
              ]}
            >
              <View style={styles.rowIconBox}>
                <Ionicons name="globe-outline" size={18} color="#00E676" />
              </View>
              <Text style={styles.rowLabel}>{t("settings.language")}</Text>
              <Text style={styles.rowMeta}>
                {currentLanguage === "pt"
                  ? t("settings.language_pt")
                  : t("settings.language_en")}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => router.navigate("/about")}
              style={({ pressed }) => [
                styles.row,
                pressed && styles.rowPressed,
              ]}
            >
              <View style={styles.rowIconBox}>
                <Ionicons
                  name="information-circle-outline"
                  size={18}
                  color="#00E676"
                />
              </View>
              <Text style={styles.rowLabel}>{t("settings.about")}</Text>
              <Ionicons name="chevron-forward" size={16} color="#6B7280" />
            </Pressable>
          </View>

          <View style={styles.section}>
            {dangerRows.map(({ label, onPress, icon }) => (
              <Pressable
                key={label}
                onPress={onPress}
                style={({ pressed }) => [
                  styles.dangerRow,
                  pressed && styles.dangerRowPressed,
                ]}
              >
                <View style={styles.dangerIconBox}>
                  <Ionicons name={icon} size={18} color="#EF4444" />
                </View>
                <Text style={styles.dangerLabel}>{label}</Text>
                <Ionicons name="chevron-forward" size={16} color="#7F1D1D" />
              </Pressable>
            ))}
          </View>

          <View style={styles.footerLogos}>
            <Pressable
              onPress={() =>
                Linking.openURL(
                  "https://ec.europa.eu/digital-building-blocks/sites/display/EBSI",
                )
              }
              style={({ pressed }) => [
                styles.logoBtn,
                pressed && styles.pressed,
              ]}
            >
              <Image
                source={require("@/assets/images/logos/ebsi.png")}
                tintColor="#FFFFFF"
                style={styles.logo}
                alt="Logo EBSI"
              />
            </Pressable>
            <Pressable
              onPress={() => Linking.openURL("https://www.tecminho.uminho.pt")}
              style={({ pressed }) => [
                styles.logoBtn,
                pressed && styles.pressed,
              ]}
            >
              <Image
                source={require("@/assets/images/logos/tecminho.png")}
                tintColor="#FFFFFF"
                style={styles.logo}
                alt="Logo TecMinho"
              />
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>

      <Modal
        visible={isOfferModalOpen}
        animationType="fade"
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
            style={{
              backgroundColor: "#121212",
              padding: 20,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.08)",
            }}
          >
            <Text
              style={{ marginBottom: 10, fontWeight: "bold", fontSize: 16 }}
            >
              {t("settings.paste_offer_url")}
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
                borderColor: "rgba(255,255,255,0.08)",
                backgroundColor: "#101418",
                color: "#FFFFFF",
                paddingHorizontal: 10,
                borderRadius: 5,
                marginBottom: 20,
              }}
            />
            <Text
              style={{ marginBottom: 10, fontWeight: "bold", fontSize: 16 }}
            >
              {t("settings.enter_pre_approved_code")}
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
                  fetching
                    ? t("settings.issuing")
                    : t("settings.issue_credential")
                }
                onPress={async () => {
                  console.log("Fetching offer from URL:", offerUrl);
                  setFetching(true);
                  try {
                    if (!offerUrl) {
                      throw new Error(t("settings.no_offer_url"));
                    }

                    if (code) {
                      await AsyncStorage.setItem("code", code);
                    }

                    const did = await StorageHelper.loadDID();

                    if (!did) {
                      throw new Error(t("settings.no_did_found"));
                    }

                    let credential = null;

                    try {
                      const response = await fetch(offerUrl);
                      if (response.status === 302) {
                        const credentialOffer =
                          response.headers.get("location");

                        if (!credentialOffer) {
                          throw new Error(t("settings.no_offer_url"));
                        }

                        credential =
                          await scanMappings.open_id_credential_offer.execute(
                            credentialOffer,
                            did,
                          );
                      }
                    } catch (error) {
                      console.log(error);
                      credential =
                        await scanMappings.open_id_credential_offer.execute(
                          offerUrl,
                          did,
                        );
                    }

                    if (!credential) {
                      throw new Error(t("settings.no_credential_found"));
                    }

                    console.log("Fetched credential:", credential);

                    setData(credential);
                    setOfferModalOpen(false);
                    setOfferUrl("");
                  } catch (error: any) {
                    console.error(error.message);
                    setFetching(false);
                    enqueueDialog(
                      error?.message ??
                        t("settings.failed_to_fetch_or_parse_offer"),
                      {
                        title: t("settings.error_title"),
                      },
                    );
                  } finally {
                    setFetching(false);
                  }
                }}
                disabled={fetching || !offerUrl}
              />

              <Button
                label={t("settings.cancel")}
                outline={true}
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
        visible={isViewDIDModalOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setViewDIDModalOpen(false)}
        onShow={() => {
          StorageHelper.loadDID().then((did) => {
            setWalletDID(did?.did || "");
          });
        }}
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
            style={{
              backgroundColor: "#121212",
              padding: 20,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.08)",
            }}
          >
            <Text
              style={{ marginBottom: 10, fontWeight: "bold", fontSize: 16, color: ThemeColors.current.text }}
            >
              {t("settings.your_did")}
            </Text>
            <Text
              style={{
                marginBottom: 10,
                fontSize: 12,
                color: ThemeColors.current.text,
              }}
            >
              {walletDID}
            </Text>
            <View style={{ alignItems: "center", marginBottom: 20 }}>
              <DIDQRCode value={walletDID} size={250} />
            </View>
            <View style={{ gap: 10 }}>
              <Button
                label={t("settings.copy_did")}
                onPress={() => {
                  handleCopyDID();
                  setViewDIDModalOpen(false);
                }}
                disabled={
                  walletDID === "" || walletDID === t("settings.no_did_found")
                }
              />

              <Button
                label={t("misc.close")}
                outline={true}
                onPress={() => {
                  setViewDIDModalOpen(false);
                }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#06080C",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 48,
    gap: 22,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "#101418",
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.75,
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: "700",
    color: "#F8FAFC",
    letterSpacing: -0.2,
  },
  section: {
    gap: 10,
  },
  row: {
    minHeight: 62,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "#101418",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 12,
  },
  rowPressed: {
    backgroundColor: "#151A20",
  },
  rowIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(0,230,118,0.12)",
    borderWidth: 1,
    borderColor: "rgba(0,230,118,0.24)",
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    color: "#F3F4F6",
    fontWeight: "600",
  },
  rowMeta: {
    fontSize: 13,
    color: "#9CA3AF",
    fontWeight: "600",
  },
  dangerRow: {
    minHeight: 62,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.35)",
    backgroundColor: "rgba(127,29,29,0.22)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 12,
  },
  dangerRowPressed: {
    backgroundColor: "rgba(127,29,29,0.32)",
  },
  dangerIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(239,68,68,0.18)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  dangerLabel: {
    flex: 1,
    fontSize: 15,
    color: "#FCA5A5",
    fontWeight: "600",
  },
  footerLogos: {
    marginTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 10,
  },
  logoBtn: {
    paddingHorizontal: 10,
  },
  logo: {
    width: 98,
    height: 56,
    resizeMode: "contain",
    opacity: 0.92,
  },
});
