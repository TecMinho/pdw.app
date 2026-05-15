import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import useSWR from "swr";
import StorageHelper from "@/helpers/storage";
import CredentialExpandedInfo from "@/components/CredentialExpandedInfo";
import { View, Text, Pressable, StyleSheet, Modal } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import SimpleLineIcon from "react-native-vector-icons/SimpleLineIcons";
import { useState, useEffect } from "react";
import { useTextDialog } from "@/providers/textDialogProvider";
import { generateAndSharePDF } from "@/utils/pdfGenerator";
import { useLocale } from "@/context/TranslationContext";
import { SafeAreaView } from "react-native-safe-area-context";

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
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Pressable
              onPress={() => router.replace("/(app)/(tabs)")}
              style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
            >
              <Ionicons name="chevron-back-outline" size={22} color="#F8FAFC" />
            </Pressable>
            <Text style={styles.headerTitle}>
              {t("credentials.credential_details")}
            </Text>
          </View>
          <Pressable
            onPress={() => setIsSheetOpen(true)}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
          >
            <SimpleLineIcon name="options-vertical" size={16} color="#E5E7EB" />
          </Pressable>
        </View>

        <View style={styles.detailWrap}>
          <CredentialExpandedInfo
            status={isRevoked ? "revoked" : isExpired ? "expired" : "valid"}
            data={credential}
          />
        </View>
      </View>

      <Modal
        visible={isSheetOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsSheetOpen(false)}
      >
        <Pressable style={styles.sheetBackdrop} onPress={() => setIsSheetOpen(false)} />
        <View style={styles.sheetWrap}>
          <View style={styles.sheetCard}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{t("credentials.actions")}</Text>

            <Pressable
              style={({ pressed }) => [styles.sheetItem, pressed && styles.sheetItemPressed]}
              onPress={async () => {
                setIsSheetOpen(false);
                await generateAndSharePDF(credential);
              }}
            >
              <View style={styles.sheetItemLeft}>
                <Ionicons name="document-text-outline" size={18} color="#00E676" />
                <Text style={styles.sheetItemText}>{t("credentials.generate_pdf")}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#6B7280" />
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.sheetItem,
                styles.sheetItemDanger,
                pressed && styles.sheetItemDangerPressed,
              ]}
              onPress={async () => {
                setIsSheetOpen(false);
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
                      router.replace("/(app)/(tabs)");
                    },
                  },
                });
              }}
            >
              <View style={styles.sheetItemLeft}>
                <Ionicons name="trash-outline" size={18} color="#F87171" />
                <Text style={styles.sheetItemDangerText}>
                  {t("credentials.delete_this_credential")}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#B91C1C" />
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.sheetCancel, pressed && styles.sheetItemPressed]}
              onPress={() => setIsSheetOpen(false)}
            >
              <Text style={styles.sheetCancelText}>{t("main.cancel")}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#06080C",
  },
  container: {
    flex: 1,
    backgroundColor: "#06080C",
  },
  headerRow: {
    marginTop: 10,
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#F8FAFC",
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "#101418",
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.78,
  },
  detailWrap: {
    flex: 1,
    marginTop: 4,
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.52)",
  },
  sheetWrap: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 12,
  },
  sheetCard: {
    borderRadius: 22,
    backgroundColor: "#111418",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 14,
  },
  sheetHandle: {
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.24)",
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
    minHeight: 50,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "#0B0D10",
  },
  sheetItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  sheetItemPressed: {
    backgroundColor: "#151A20",
  },
  sheetItemText: {
    fontSize: 15,
    color: "#E5E7EB",
    fontWeight: "600",
  },
  sheetItemDanger: {
    borderColor: "rgba(239,68,68,0.30)",
    backgroundColor: "rgba(127,29,29,0.20)",
  },
  sheetItemDangerPressed: {
    backgroundColor: "rgba(127,29,29,0.32)",
  },
  sheetItemDangerText: {
    fontSize: 15,
    color: "#FCA5A5",
    fontWeight: "600",
  },
  sheetCancel: {
    marginTop: 4,
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  sheetCancelText: {
    fontSize: 15,
    color: "#9CA3AF",
    fontWeight: "600",
  },
});
