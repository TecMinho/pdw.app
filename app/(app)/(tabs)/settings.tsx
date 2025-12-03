import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  TextInput,
  Image,
  Linking,
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

  /**
   * Display the user's DID (Decentralized Identifier)
   * Shows the DID string in a dialog for user reference or sharing
   */
  const handleViewDID = async () => {
    const did = await StorageHelper.loadDID();
    enqueueDialog(did?.did || t("settings.no_did_found"), {
      title: t("settings.your_did"),
    });
  };

  /**
   * Open the manual credential offer URL input modal
   * Allows users to manually process credential offers via URL input
   */
  const handleEnterOfferUrl = () => {
    setOfferModalOpen(true);
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
    enqueueDialog(t("settings.confirm_delete_credentials"), {
      title: t("settings.delete_credentials"),
      mainAction: {
        label: t("settings.delete"),
        backgroundColor: "red",
        onPress: async () => {
          await StorageHelper.saveCredentials([]);
          mutate("credentials");
        },
      },
    });
  };

  /**
   * Delete the entire wallet with user confirmation
   * This is the most destructive operation - removes all credentials, DID, and wallet data
   * Logs the user out and requires re-authentication
   */
  const handleDeleteWallet = async () => {
    enqueueDialog(t("settings.confirm_delete_wallet"), {
      title: t("settings.delete_wallet"),
      mainAction: {
        label: t("settings.delete"),
        backgroundColor: "red",
        onPress: async () => {
          await StorageHelper.deleteWallet();
          setIsAuthenticated(false);
        },
      },
    });
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
      label: t("settings.enter_offer_url"),
      onPress: handleEnterOfferUrl,
      icon: "link-outline",
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
    <View style={{ padding: 20, backgroundColor: "white", flex: 1 }}>
      <Modal visible={!!data}>
        <CredentialExpandedInfo data={data} status={""} />
        <FloatingButton
          visible
          buttonLayout={"Horizontal"}
          button={{
            label: t("settings.accept"),
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
            label: t("settings.reject"),
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
        <Pressable onPress={() => router.replace("/(app)/(tabs)")}>
          <Ionicons name="chevron-back-outline" size={28} />
        </Pressable>
        <Text
          style={{ fontSize: 28, fontWeight: "bold", flex: 1, marginLeft: 3 }}
        >
          {t("settings.settings")}
        </Text>
      </View>

      {settingsItems.map(({ label, onPress, icon, danger }, idx) => (
        <Pressable
          key={label}
          onPress={onPress}
          style={({ pressed }) => [
            {
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 15,
              paddingHorizontal: 10,
              borderRadius: 8,
              backgroundColor: pressed ? "#e0e0e0" : "transparent",
            },
          ]}
        >
          <Ionicons
            name={icon}
            size={22}
            color={danger ? "#d9534f" : "#007AFF"}
            style={{ marginRight: 12 }}
          />
          <Text style={{ fontSize: 16, color: danger ? "#d9534f" : "#222" }}>
            {label}
          </Text>
        </Pressable>
      ))}

      <Pressable
        onPress={() => changeLanguage(currentLanguage === "pt" ? "en" : "pt")}
        style={({ pressed }) => [
          {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingVertical: 15,
            paddingHorizontal: 10,
            borderRadius: 8,
            backgroundColor: pressed ? "#e0e0e0" : "transparent",
          },
        ]}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Ionicons
            name="globe-outline"
            size={22}
            color="#007AFF"
            style={{ marginRight: 12 }}
          />
          <Text style={{ fontSize: 16, color: "#222" }}>
            {t("settings.language")}
          </Text>
        </View>
        <Text style={{ fontSize: 16 }}>
          {currentLanguage === "pt" ? "🇵🇹 Português" : "🇬🇧 English"}
        </Text>
      </Pressable>

      <Pressable
        key={t("settings.about")}
        onPress={() => router.navigate("/about")}
        style={({ pressed }) => [
          {
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 15,
            paddingHorizontal: 10,
            borderRadius: 8,
            backgroundColor: pressed ? "#e0e0e0" : "transparent",
          },
        ]}
      >
        <Ionicons
          name={"information-circle-outline"}
          size={22}
          color={"#007AFF"}
          style={{ marginRight: 12 }}
        />
        <Text style={{ fontSize: 16, color: "#222" }}>
          {t("settings.about")}
        </Text>
      </Pressable>

      <View
        style={{
          position: "absolute",
          bottom: 40,
          left: 40,
          right: 40,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Pressable
          onPress={() =>
            Linking.openURL(
              "https://ec.europa.eu/digital-building-blocks/sites/display/EBSI",
            )
          }
          style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
        >
          <Image
            source={require("@/assets/images/logos/ebsi.png")}
            style={{ width: 120, height: 120, resizeMode: "contain" }}
            alt="Logo EBSI"
          />
        </Pressable>
        <Pressable
          onPress={() => Linking.openURL("https://www.tecminho.uminho.pt")}
          style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
        >
          <Image
            source={require("@/assets/images/logos/tecminho.png")}
            style={{ width: 120, height: 120, resizeMode: "contain" }}
            alt="Logo TecMinho"
          />
        </Pressable>
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
                borderColor: "#ccc",
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
                        title: "Error",
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
    </View>
  );
}
