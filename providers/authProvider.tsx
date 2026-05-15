import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { Modal, StyleSheet, TextInput, Alert } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import StorageHelper from "@/helpers/storage";
import { useTextDialog } from "@/providers/textDialogProvider";
import { EBSIDID, EBSIVerifiableCredential } from "@/helpers/ebsi";
import { useLocale } from "@/context/TranslationContext";
import { mutate } from "swr";
import { Button, Text, View } from "react-native-ui-lib";
import Colors from "@/constants/Colors";

/**
 * Authentication Context Interface
 *
 * Defines the shape of the authentication context that will be provided
 * to all child components. This interface ensures type safety and clear
 * contracts for authentication-related functionality.
 */
interface AuthProviderProps {
  isAuthenticated: boolean;
  setIsAuthenticated: (value: boolean) => void;
  authenticate: () => void;
  loading: boolean;
}

/**
 * Authentication Context
 *
 * React Context that provides authentication state and methods throughout
 * the application. Initialized as undefined to ensure proper error handling
 * when used outside the provider.
 */
const AuthContext = createContext<AuthProviderProps | undefined>(undefined);

/**
 * Authentication Provider Component
 *
 * The main provider that wraps the application and provides
 * authentication functionality to all child components. Manages authentication
 * state, app lifecycle events, and wallet operations.
 *
 * @param children - Child components that will have access to auth context
 */
export function AuthProvider({ children }: PropsWithChildren) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [importErrorMessage, setImportErrorMessage] = useState("");
  const [showImportSeedModal, setShowImportSeedModal] = useState(false);
  const [showCreatedSeedModal, setShowCreatedSeedModal] = useState(false);
  const [createdSeedPhrase, setCreatedSeedPhrase] = useState("");
  const [seedPhraseWords, setSeedPhraseWords] = useState<string[]>(
    Array.from({ length: 12 }, () => ""),
  );
  const createdSeedResolverRef = useRef<(() => void) | null>(null);
  const router = useRouter();
  const { enqueueDialog, dismissDialog } = useTextDialog();
  const { t } = useLocale();

  const handleUpdateSeedWord = useCallback((index: number, value: string) => {
    const normalizedWords = value
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);

    setSeedPhraseWords((previousWords) => {
      const nextWords = [...previousWords];

      if (normalizedWords.length <= 1) {
        nextWords[index] = normalizedWords[0] ?? "";
        return nextWords;
      }

      normalizedWords.forEach((word, wordOffset) => {
        const targetIndex = index + wordOffset;
        if (targetIndex < nextWords.length) {
          nextWords[targetIndex] = word;
        }
      });

      return nextWords;
    });
  }, []);

  const closeImportSeedModal = useCallback(() => {
    setShowImportSeedModal(false);
    setSeedPhraseWords(Array.from({ length: 12 }, () => ""));
  }, []);

  const closeCreatedSeedModal = useCallback(() => {
    setShowCreatedSeedModal(false);
    setCreatedSeedPhrase("");
    setIsAuthenticated(true);
    router.replace("/(app)/(tabs)");
    const resolve = createdSeedResolverRef.current;
    createdSeedResolverRef.current = null;
    resolve?.();
  }, []);

  const waitForCreatedSeedModalClose = useCallback(() => {
    return new Promise<void>((resolve) => {
      createdSeedResolverRef.current = resolve;
      setShowCreatedSeedModal(true);
    });
  }, []);

  const copyCreatedSeedPhrase = useCallback(async () => {
    if (!createdSeedPhrase.trim()) return;

    Clipboard.setStringAsync(createdSeedPhrase).then(() => {
      Alert.alert(t("misc.seed_phrase_copied"));
    });

  }, [createdSeedPhrase, enqueueDialog, t]);

  const createNewWallet = useCallback(async (): Promise<EBSIDID> => {
    const newDid = await EBSIDID.generateDid();
    const { seed, ...did } = newDid;
    await StorageHelper.saveDID(did);

    const credential = await EBSIDID.generateDidAttestation(newDid);
    if (!credential) {
      throw new Error("Failed to generate DID attestation");
    }

    const credentials = await StorageHelper.loadCredentials();
    const updatedCredentials: EBSIVerifiableCredential[] = [
      ...credentials,
      credential,
    ];

    await StorageHelper.saveCredentials(updatedCredentials);
    await StorageHelper.loadCredentials();
    await mutate("credentials");
    return newDid;
  }, []);

  const handleSeedPhraseImport = useCallback(async () => {
    const hasAllWords = seedPhraseWords.every((word) => !!word.trim());
    if (!hasAllWords) {
      setImportErrorMessage(t("misc.seed_phrase_incomplete"));
      return;
    }
    try {
      setLoading(true);
      const did = await EBSIDID.recoverDid(seedPhraseWords.join(" "));
      await StorageHelper.saveDID(did);
      const credential = await EBSIDID.generateDidAttestation(did);
      if (!credential) {
        throw new Error("Failed to generate DID attestation");
      }

      const credentials = await StorageHelper.loadCredentials();
      const updatedCredentials: EBSIVerifiableCredential[] = [
        ...credentials,
        credential,
      ];

      await StorageHelper.saveCredentials(updatedCredentials);
      await StorageHelper.loadCredentials();
      await mutate("credentials");

      closeImportSeedModal();
      setIsAuthenticated(true);
      router.replace("/(app)/(tabs)");
    } catch (error) {
      setImportErrorMessage(t("misc.seed_phrase_import_failed"));
    } finally {
      setLoading(false);
    }
  }, [closeImportSeedModal, enqueueDialog, router, seedPhraseWords, t]);

  /**
   * Main Authentication Function
   *
   * Handles the complete authentication flow including biometric authentication,
   * wallet existence checking, and wallet creation for new users. This is the
   * primary entry point for user authentication in the app.
   *
   * Authentication Flow:
   * 1. Check if authentication is already in progress (prevent double-execution)
   * 2. Trigger biometric authentication (Face ID, Touch ID, or PIN)
   * 3. Check if user has an existing wallet (DID)
   * 4. If no wallet exists, prompt user to create one
   * 5. Generate new DID and save to storage
   * 6. Navigate to main app on successful authentication
   *
   * Error Handling:
   * - Prevents concurrent authentication attempts
   * - Handles wallet creation dialog dismissal
   * - Manages DID generation failures
   * - Provides user feedback through loading states
   */
  const authenticate = useCallback(async () => {
    if (loading) return;

    const { success } = await LocalAuthentication.authenticateAsync({
      promptMessage: t("misc.authenticate_to_continue"),
      fallbackLabel: t("misc.use_password"),
    });

    if (!success) return;

    setLoading(true);
    if (
      !(await StorageHelper.hasDIDInfo()) ||
      !(await StorageHelper.loadDID())
    ) {
      try {
        const walletAction = await new Promise<"create" | "import">(
          (resolve, reject) => {
            enqueueDialog(
              <View style={styles.walletPromptWrap}>
                <View style={styles.walletPromptIcon}>
                  <Ionicons name="wallet-outline" size={24} color="#00FF66" />
                </View>
                <Text style={styles.walletPromptText} center selectable>
                  {t("misc.no_wallet")}
                </Text>
              </View>,
              {
                title: t("misc.create_wallet"),
                showTopClose: true,
                hideDefaultDismissAction: true,
                onDismiss: () => {
                  reject("cancel");
                  dismissDialog();
                },
                mainAction: {
                  label: t("misc.create"),
                  style: styles.walletMainAction,
                  labelStyle: styles.walletMainActionLabel,
                  onPress: async () => {
                    try {
                      resolve("create");
                      dismissDialog();
                    } catch (e) {
                      reject(e);
                    }
                  },
                },
                secondaryAction: {
                  label: t("misc.import_wallet"),
                  outline: true,
                  style: styles.walletSecondaryAction,
                  labelStyle: styles.walletSecondaryActionLabel,
                  onPress: () => {
                    resolve("import");
                    dismissDialog();
                  },
                },
              },
            );
          },
        );

        // dismissDialog();

        if (walletAction === "import") {
          // Allow the UI to full dismiss the dialog
          setTimeout(() => {
            setImportErrorMessage("");
            setShowImportSeedModal(true);
          }, 10);
        }

        if (walletAction === "create") {
          // Allow the UI to full dismiss the dialog
          setTimeout(async () => {
            const newDid = await createNewWallet();
            setCreatedSeedPhrase((newDid.seed || "").trim());
            
            await waitForCreatedSeedModalClose();
          }, 10);
        }
      } catch (e) {
        setLoading(false);
        return;
      }

      const did = await StorageHelper.loadDID();
      if (!did) {
        setLoading(false);
        return;
      }
    }

    setIsAuthenticated(success);
    if (success) {
      router.replace("/(app)/(tabs)");
    }

    setLoading(false);
  }, [
    createNewWallet,
    dismissDialog,
    enqueueDialog,
    loading,
    router,
    t,
    waitForCreatedSeedModalClose,
  ]);

  /**
   * Context Provider Render
   *
   * Provides the authentication context to all child components,
   * making authentication state and methods available throughout
   * the component tree.
   *
   * Provided Values:
   * - isAuthenticated: Current authentication status
   * - setIsAuthenticated: Manual authentication state control
   * - authenticate: Main authentication function
   * - loading: Loading state during auth operations
   */
  return (
    <AuthContext.Provider
      value={{ isAuthenticated, setIsAuthenticated, authenticate, loading }}
    >
      {children}
      <Modal visible={showImportSeedModal} animationType="fade" transparent>
        <View style={styles.overlay}>
          <View style={styles.modalContainer}>
            <Text text60 center marginB-6>
              {t("misc.import_wallet")}
            </Text>
            <Text text80 center marginB-14>
              {t("misc.enter_seed_phrase")}
            </Text>
            <View style={styles.seedGrid}>
              {seedPhraseWords.map((word, index) => (
                <TextInput
                  key={`seed-word-${index}`}
                  placeholderTextColor={Colors.current.textMuted}
                  value={word}
                  autoCapitalize="none"
                  autoCorrect={false}
                  onChangeText={(value) => handleUpdateSeedWord(index, value)}
                  placeholder={`${index + 1}.`}
                  style={styles.seedInput}
                />
              ))}
            </View>
            if (!!importErrorMessage){" "}
            {
              <View row right gap-10 marginT-6>
                <Text text80 color={Colors.current.danger?.background} center>
                  {importErrorMessage}
                </Text>
              </View>
            }
            <View row right gap-10 marginT-16>
              <Button
                label={t("misc.cancel")}
                outline
                onPress={closeImportSeedModal}
              />
              <Button
                label={t("misc.import")}
                onPress={handleSeedPhraseImport}
              />
            </View>
          </View>
        </View>
      </Modal>
      <Modal visible={showCreatedSeedModal} animationType="fade" transparent>
        <View style={styles.overlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle} center marginB-6>
              {t("misc.your_seed_phrase")}
            </Text>
            <Text style={styles.modalSubtitle} center marginB-14>
              {t("misc.save_seed_phrase_warning")}
            </Text>
            <View style={styles.seedPhraseBox}>
              <Text style={styles.seedPhraseText} center selectable>
                {createdSeedPhrase || t("misc.seed_phrase_unavailable")}
              </Text>
            </View>
            <View row right gap-10 marginT-16>
              <Button
                label={t("misc.copy_seed_phrase")}
                outline
                disabled={!createdSeedPhrase}
                onPress={copyCreatedSeedPhrase}
              />
              <Button
                label={t("misc.continue")}
                onPress={closeCreatedSeedModal}
              />
            </View>
          </View>
        </View>
      </Modal>
    </AuthContext.Provider>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    paddingHorizontal: 16,
  },
  modalContainer: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#050505",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 10,
  },
  modalTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  modalSubtitle: {
    color: "#A1A1AA",
    fontSize: 14,
    lineHeight: 21,
  },
  seedGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  seedInput: {
    width: "31%",
    minWidth: 92,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#F9FAFB",
    fontSize: 14,
  },
  seedPhraseBox: {
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 12,
    backgroundColor: "#121212",
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  seedPhraseText: {
    color: "#FFFFFF",
    fontSize: 15,
    lineHeight: 22,
  },
  walletPromptWrap: {
    alignItems: "center",
    gap: 10,
  },
  walletPromptIcon: {
    width: 58,
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0, 255, 102, 0.28)",
    backgroundColor: "rgba(0, 255, 102, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  walletPromptText: {
    color: "#A1A1AA",
    fontSize: 15,
    lineHeight: 22,
  },
  walletMainAction: {
    minHeight: 42,
    borderRadius: 12,
    backgroundColor: "#00FF66",
    paddingHorizontal: 14,
  },
  walletMainActionLabel: {
    color: "#000000",
    fontWeight: "800",
  },
  walletSecondaryAction: {
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    backgroundColor: "#121212",
    paddingHorizontal: 14,
  },
  walletSecondaryActionLabel: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});

/**
 * Authentication Hook
 *
 * Custom React hook that provides access to the authentication context.
 * This hook should be used by components that need to interact with
 * the authentication system.
 *
 * Usage Example:
 * ```tsx
 * const { isAuthenticated, authenticate, loading } = useAuth();
 * ```
 *
 * Error Handling:
 * - Throws an error if used outside of AuthProvider
 * - Ensures components can only access auth context when properly wrapped
 * - Provides clear error message for debugging
 *
 * @returns Authentication context with state and methods
 * @throws Error if used outside of AuthProvider
 */
export default function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
