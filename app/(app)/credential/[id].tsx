import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import useSWR from "swr";
import StorageHelper from "@/helpers/storage";
import CredentialExpandedInfo from "@/components/CredentialExpandedInfo";
import { View, Text, Pressable } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import SimpleLineIcon from "react-native-vector-icons/SimpleLineIcons";
import React, { useState, useEffect } from "react";
import { ActionSheet } from "react-native-ui-lib";
import { useTextDialog } from "@/providers/textDialogProvider";
import { generateAndSharePDF } from "@/utils/pdfGenerator";
import { useLocale } from "@/context/TranslationContext";

/**
 * Credential Detail Page Component
 *
 * Displays comprehensive information for a single credential identified by route parameter.
 * Handles real-time status monitoring and provides credential management actions.
 */
export default function CredentialPage() {
  const router = useRouter();
  const { t } = useLocale();
  const { id } = useLocalSearchParams();
  const { data: credentials, isLoading } = useSWR(`credentials`, () =>
    StorageHelper.loadCredentials(),
  );
  const credential = credentials?.find((cred) => cred.id === id);
  const credentialId = credential?.id;
  const [isRevoked, setIsRevoked] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const { enqueueDialog } = useTextDialog();

  /**
   * Real-time credential revocation status monitoring
   *
   * Continuously checks with the issuer's API to determine if the credential
   * has been revoked. This provides up-to-date status information that's
   * critical for credential validity verification.
   *
   * - Polls the issuer's revocation endpoint every 5 seconds
   * - Updates the revocation status state based on API response
   * - Handles network errors gracefully to avoid disrupting user experience
   * - Only runs when a valid credential ID is available
   */
  useEffect(() => {
    const fetchStatus = () => {
      if (credentialId) {
        fetch(
          `${process.env.EXPO_PUBLIC_API_URL || ""}/issuer/is_revoked/${credentialId}`,
          {
            credentials: "include",
          },
        )
          .then((response) => response.json())
          .then((data) => {
            setIsRevoked(data.isRevoked);
          })
          .catch((error) => {
            console.error("Error fetching revocation status:", error);
          });
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [credentialId]);

  /**
   * Real-time credential expiration status monitoring
   *
   * Continuously checks if the credential has passed its expiration date
   * by comparing the validUntil field with the current date/time.
   *
   * - Accounts for timezone differences to ensure accurate comparison
   * - Updates every 5 seconds to provide real-time expiration detection
   * - Handles cases where validUntil might not be present
   * - Critical for maintaining accurate credential validity status
   */
  useEffect(() => {
    const checkExpiration = () => {
      if (!credentials) return;
      const date = new Date();
      const today = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
      setIsExpired(
        credential?.validUntil
          ? today > new Date(credential.validUntil)
          : false,
      );
    };

    checkExpiration();
    const interval = setInterval(checkExpiration, 5000);
    return () => clearInterval(interval);
  }, [credentials, credential]);

  if (!isLoading && !credential) {
    return <Redirect href={`/(app)/(tabs)`} />;
  }

  /**
   * Main Render Method - Credential Detail Interface
   *
   * Renders the complete credential detail view including:
   * - Navigation header with back button and options menu
   * - Comprehensive credential information display
   * - Action sheet with management options (PDF export, deletion)
   * - Real-time status indicators
   */
  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          padding: 15,
          paddingTop: 55,
          marginBottom: -20,
          justifyContent: "space-between",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Pressable onPress={() => router.replace("/(app)/(tabs)")}>
            <Ionicons name="chevron-back-outline" size={24} />
          </Pressable>
          <Text style={{ fontSize: 24, fontWeight: "bold", marginLeft: 2 }}>
            {t("credentials.credential_details")}
          </Text>
        </View>
        <Pressable onPress={() => setIsSheetOpen(true)}>
          <SimpleLineIcon name="options-vertical" size={20} color="gray" />
        </Pressable>
      </View>

      <CredentialExpandedInfo
        status={isRevoked ? "revoked" : isExpired ? "expired" : "valid"}
        data={credential}
      />

      <ActionSheet
        title={t("credentials.actions")}
        visible={isSheetOpen}
        onDismiss={() => setIsSheetOpen(false)}
        destructiveButtonIndex={0}
        useNativeIOS={true}
        options={[
          {
            label: t("credentials.generate_pdf"),
            onPress: () => generateAndSharePDF(credential),
          },
          {
            label: t("credentials.delete_this_credential"),
            onPress: async () => {
              enqueueDialog(t("credentials.confirm_delete_credential"), {
                title: t("credentials.delete_credential"),
                mainAction: {
                  label: t("credentials.delete"),
                  backgroundColor: "red",
                  onPress: async () => {
                    const allCredentials =
                      (await StorageHelper.loadCredentials()) || [];
                    const filtered = allCredentials.filter(
                      (c) => c.id !== credentialId,
                    );
                    await StorageHelper.saveCredentials(filtered);
                    setIsSheetOpen(false);
                    router.replace("/(app)/(tabs)");
                  },
                },
              });
            },
            labelStyle: { color: "red" },
          },
        ]}
      />
    </View>
  );
}
