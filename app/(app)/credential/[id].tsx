import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import useSWR from "swr";
import StorageHelper from "@/helpers/storage";
import CredentialExpandedInfo from "@/components/CredentialExpandedInfo";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  ScrollView,
  InteractionManager,
  ActivityIndicator,
  Platform,
} from "react-native";
import { WebView } from "react-native-webview";
import Ionicons from "@expo/vector-icons/Ionicons";
import SimpleLineIcon from "react-native-vector-icons/SimpleLineIcons";
import { useState, useEffect } from "react";
import { useTextDialog } from "@/providers/textDialogProvider";
import {
  buildCredentialPdfPreviewHtml,
  generateAndSharePDF,
  type PdfLabels,
} from "@/utils/pdfGenerator";
import { useLocale } from "@/context/TranslationContext";
import { SafeAreaView } from "react-native-safe-area-context";
import { shouldExportAfterPreviewClose } from "@/utils/pdfExportFlow";

/**
 * Credential Detail Page Component
 *
 * Displays comprehensive information for a single credential identified by route parameter.
 * Handles real-time status monitoring and provides credential management actions.
 */
export default function CredentialPage() {
  const router = useRouter();
  const { t, currentLanguage } = useLocale();
  const { id } = useLocalSearchParams();
  const { data: credentials, isLoading } = useSWR(`credentials`, () =>
    StorageHelper.loadCredentials(),
  );
  const credential = credentials?.find((cred) => cred.id === id);
  const credentialId = credential?.id;
  const [isRevoked, setIsRevoked] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isFullInfoOpen, setIsFullInfoOpen] = useState(false);
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);
  const [pdfPreviewHtml, setPdfPreviewHtml] = useState("");
  const [pdfPreviewCredential, setPdfPreviewCredential] = useState<any>();
  const [pdfPreviewLabels, setPdfPreviewLabels] = useState<PdfLabels>();
  const [isPdfExporting, setIsPdfExporting] = useState(false);
  const [isPdfExportPending, setIsPdfExportPending] = useState(false);
  const { enqueueDialog } = useTextDialog();

  const getPdfLabels = (): PdfLabels => ({
    eyebrow: t("credentials.pdf_eyebrow"),
    issuedTo: t("credentials.pdf_issued_to"),
    intro: t("credentials.pdf_intro"),
    holder: t("credentials.pdf_holder"),
    course: t("credentials.course"),
    classification: t("credentials.classification"),
    issued: t("credentials.pdf_issued"),
    validUntil: t("credentials.pdf_valid_until"),
    footer: t("credentials.pdf_footer"),
    fallbackTitle: t("credentials.verifiable_credential"),
    shareTitle: t("credentials.pdf_share_title"),
    missingCredentialTitle: t("credentials.pdf_missing_title"),
    missingCredentialMessage: t("credentials.pdf_missing_message"),
    cacheUnavailableMessage: t("credentials.pdf_cache_unavailable"),
    sharingUnavailableMessage: t("credentials.pdf_sharing_unavailable"),
    errorTitle: t("credentials.pdf_error_title"),
    unknownErrorMessage: t("credentials.pdf_unknown_error"),
    createdAtLabel: t("credentials.pdf_created_at"),
    createdAt: new Date(),
    dateLocale: currentLanguage === "pt" ? "pt-PT" : "en-GB",
    fieldLabels: {
      courselocation: t("credentials.pdf_course_location"),
      name: t("credentials.pdf_holder"),
      fullname: t("credentials.pdf_holder"),
    },
  });

  const exportPreviewPdf = () => {
    if (!pdfPreviewCredential) return;
    setIsPdfExportPending(false);
    setIsPdfExporting(true);
    void generateAndSharePDF(
      pdfPreviewCredential,
      pdfPreviewLabels ?? getPdfLabels(),
    ).finally(() => {
      setIsPdfExporting(false);
    });
  };

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
              style={({ pressed }) => [
                styles.iconBtn,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name="chevron-back-outline" size={22} color="#F8FAFC" />
            </Pressable>
            <Text
              style={styles.headerTitle}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
            >
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
        <Pressable
          style={styles.sheetBackdrop}
          onPress={() => setIsSheetOpen(false)}
        />
        <View style={styles.sheetWrap}>
          <View style={styles.sheetCard}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{t("credentials.actions")}</Text>

            <Pressable
              style={({ pressed }) => [
                styles.sheetItem,
                pressed && styles.sheetItemPressed,
              ]}
              onPress={() => {
                setIsSheetOpen(false);
                // Wait for the action sheet to finish closing before opening
                // the in-app PDF preview.
                InteractionManager.runAfterInteractions(async () => {
                  if (!credential) return;
                  const labels = getPdfLabels();
                  setPdfPreviewCredential(credential);
                  setPdfPreviewLabels(labels);
                  setPdfPreviewHtml(
                    await buildCredentialPdfPreviewHtml(credential, labels),
                  );
                  setIsPdfPreviewOpen(true);
                });
              }}
            >
              <View style={styles.sheetItemLeft}>
                <Ionicons
                  name="document-text-outline"
                  size={18}
                  color="#00E676"
                />
                <Text style={styles.sheetItemText}>
                  {t("credentials.generate_pdf")}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#6B7280" />
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.sheetItem,
                pressed && styles.sheetItemPressed,
              ]}
              onPress={() => {
                setIsSheetOpen(false);
                setIsFullInfoOpen(true);
              }}
            >
              <View style={styles.sheetItemLeft}>
                <Ionicons name="document-outline" size={18} color="#60A5FA" />
                <Text style={styles.sheetItemText}>
                  {t("credentials.view_all_information")}
                </Text>{" "}
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
              style={({ pressed }) => [
                styles.sheetCancel,
                pressed && styles.sheetItemPressed,
              ]}
              onPress={() => setIsSheetOpen(false)}
            >
              <Text style={styles.sheetCancelText}>{t("main.cancel")}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <Modal
        visible={isPdfPreviewOpen}
        animationType="slide"
        onDismiss={() => {
          if (shouldExportAfterPreviewClose(Platform.OS)) return;
          if (!isPdfExportPending || !pdfPreviewCredential) return;
          exportPreviewPdf();
        }}
        onRequestClose={() => setIsPdfPreviewOpen(false)}
      >
        <SafeAreaView style={styles.pdfPreviewSafe}>
          <View style={styles.pdfPreviewHeader}>
            <Text style={styles.pdfPreviewTitle}>
              {t("credentials.pdf_preview")}
            </Text>
            <Pressable
              onPress={() => setIsPdfPreviewOpen(false)}
              style={styles.pdfPreviewClose}
            >
              <Ionicons name="close" size={22} color="#F8FAFC" />
            </Pressable>
          </View>

          <View style={styles.pdfPreviewBody}>
            <WebView
              originWhitelist={["*"]}
              source={{ html: pdfPreviewHtml }}
              style={styles.pdfPreviewWebView}
              javaScriptEnabled={false}
              automaticallyAdjustContentInsets={false}
            />
          </View>

          <View style={styles.pdfPreviewActions}>
            <Pressable
              style={styles.pdfPreviewCancel}
              onPress={() => setIsPdfPreviewOpen(false)}
              disabled={isPdfExporting}
            >
              <Text style={styles.pdfPreviewCancelText}>
                {t("main.cancel")}
              </Text>
            </Pressable>
            <Pressable
              style={styles.pdfPreviewExport}
              disabled={isPdfExporting || !pdfPreviewCredential}
              onPress={() => {
                setIsPdfExportPending(true);
                setIsPdfPreviewOpen(false);
                if (shouldExportAfterPreviewClose(Platform.OS)) {
                  InteractionManager.runAfterInteractions(exportPreviewPdf);
                }
              }}
            >
              {isPdfExporting ? (
                <ActivityIndicator color="#061018" />
              ) : (
                <>
                  <Ionicons name="share-outline" size={18} color="#061018" />
                  <Text style={styles.pdfPreviewExportText}>
                    {t("credentials.export_pdf")}
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>
      <Modal
        visible={isFullInfoOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsFullInfoOpen(false)}
      >
        <View style={styles.fullInfoBackdrop}>
          <View style={styles.fullInfoCard}>
            <View style={styles.fullInfoHeader}>
              <Text style={styles.fullInfoTitle}>
                {t("credentials.all_information")}
              </Text>{" "}
              <Pressable onPress={() => setIsFullInfoOpen(false)}>
                <Ionicons name="close" size={20} color="#F8FAFC" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.fullInfoText}>
                {JSON.stringify(credential, null, 2)}
              </Text>
            </ScrollView>
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
    flex: 1,
    fontSize: 24,
    fontWeight: "700",
    color: "#F8FAFC",
    letterSpacing: -0.2,
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
    ...StyleSheet.absoluteFill,
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
  fullInfoBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: 16,
  },
  fullInfoCard: {
    maxHeight: "80%",
    borderRadius: 20,
    backgroundColor: "#111418",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    padding: 16,
  },
  fullInfoHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  fullInfoTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#F8FAFC",
  },
  fullInfoText: {
    fontSize: 13,
    lineHeight: 20,
    color: "#E5E7EB",
  },
  pdfPreviewSafe: {
    flex: 1,
    backgroundColor: "#06080C",
  },
  pdfPreviewHeader: {
    height: 58,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.10)",
  },
  pdfPreviewTitle: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "700",
  },
  pdfPreviewClose: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#101418",
  },
  pdfPreviewBody: {
    flex: 1,
    margin: 12,
    overflow: "hidden",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
  },
  pdfPreviewWebView: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  pdfPreviewActions: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  pdfPreviewCancel: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  pdfPreviewCancelText: {
    color: "#CBD5E1",
    fontSize: 15,
    fontWeight: "600",
  },
  pdfPreviewExport: {
    flex: 1.4,
    height: 48,
    borderRadius: 12,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#00E676",
  },
  pdfPreviewExportText: {
    color: "#061018",
    fontSize: 15,
    fontWeight: "700",
  },
});