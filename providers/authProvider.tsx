import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useState,
} from "react";
import * as LocalAuthentication from "expo-local-authentication";
import { useRouter } from "expo-router";
import StorageHelper from "@/helpers/storage";
import { useTextDialog } from "@/providers/textDialogProvider";
import { EBSIDID } from "@/helpers/ebsi";
import { useLocale } from "@/context/TranslationContext";

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
  const router = useRouter();
  const { enqueueDialog } = useTextDialog();
  const { t } = useLocale();

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
    setLoading(true);
    if (
      !(await StorageHelper.hasDIDInfo()) ||
      !(await StorageHelper.loadDID())
    ) {
      try {
        await new Promise((resolve, reject) => {
          enqueueDialog(t("misc.no_wallet"), {
            title: t("misc.create_wallet"),
            onDismiss: () => {
              reject("Dialog dismissed");
            },
            mainAction: {
              label: t("misc.create"),
              onPress: async () => {
                try {
                  const newDid = await EBSIDID.generateDid();
                  await StorageHelper.saveDID(newDid).then(resolve);
                } catch (e) {
                  reject(e);
                }
              },
            },
          });
        });
      } catch (e) {
        console.log(e);
        setLoading(false);
        return;
      }
    }

    setIsAuthenticated(success);
    if (success) {
      router.replace("/(app)/(tabs)");
    }

    setLoading(false);
  }, [enqueueDialog, loading, router]);

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
    </AuthContext.Provider>
  );
}

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
