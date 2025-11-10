import React, {
  createContext,
  useRef,
  useEffect,
  useContext,
  useCallback,
  useState,
} from "react";
import { EBSIVerifiableCredential } from "@/helpers/ebsi";
import { setGlobalCredentialSelector } from "@/utils/credentialSelectorBridge";
import ConformanceCredentialSelector from "@/components/ConformanceCredentialSelector";

/**
 * Promise resolver function type for credential selection
 * Used to resolve pending credential selection promises with user choices
 */
type SelectorResolve = (credentials: EBSIVerifiableCredential[]) => void;

/**
 * Context interface defining the credential selector API
 * Provides methods for initiating selection and managing pending operations
 */
interface CredentialSelectorContextType {
  selectCredential: (
    credentials: EBSIVerifiableCredential[],
  ) => Promise<EBSIVerifiableCredential[]>;
  setPendingSelection: (
    resolver: SelectorResolve,
    options: EBSIVerifiableCredential[],
  ) => void;
  currentOptions: EBSIVerifiableCredential[];
}

/**
 * React Context for credential selection state management
 * Uses undefined as default to enforce proper provider usage
 */
const CredentialSelectorContext = createContext<
  CredentialSelectorContextType | undefined
>(undefined);

/**
 * CredentialSelectorProvider Component
 * 
 * The main provider component that wraps the application and provides
 * credential selection functionality to all child components. This provider
 * manages the complete lifecycle of credential selection operations.
 */
export const CredentialSelectorProvider: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  
  /**
   * Promise resolver reference for pending selections
   * 
   * Stores the resolve function for the current Promise-based selection.
   * Using useRef ensures the resolver persists across re-renders without
   * causing unnecessary component updates. Set to null when no selection
   * is pending.
   */
  const resolverRef = useRef<SelectorResolve | null>(null);
  
  /**
   * Current credential options reference
   * 
   * Stores the array of credentials available for selection. Using useRef
   * prevents re-renders when options change while maintaining persistence
   * across component lifecycles. Empty array indicates no active selection.
   */
  const optionsRef = useRef<EBSIVerifiableCredential[]>([]);
  
  /**
   * Force update state for UI synchronization
   * 
   * Simple counter state used to trigger component re-renders when
   * ref values change. Since refs don't trigger re-renders automatically,
   * this provides a mechanism to update the UI when selection state changes.
   */
  const [, setVersion] = useState(0);
  
  /**
   * Force component re-render utility
   * 
   * Increments the version counter to trigger a re-render when ref-based
   * state changes. This ensures the UI stays synchronized with selection
   * state without causing unnecessary renders during normal operation.
   */
  const forceUpdate = useCallback(() => setVersion((v) => v + 1), []);

  /**
   * Main credential selection function
   * 
   * Creates a Promise-based interface for credential selection. When called,
   * it sets up the selection state and returns a Promise that resolves when
   * the user makes their selection. This enables clean async/await usage
   * throughout the application.
   * 
   * @param credentials - Array of credentials to choose from
   * @returns Promise that resolves with selected credentials
   */
  const selectCredential = (
    credentials: EBSIVerifiableCredential[],
  ): Promise<EBSIVerifiableCredential[]> => {
    return new Promise((resolve) => {
      optionsRef.current = credentials;
      resolverRef.current = resolve;
      forceUpdate();
    });
  };

  /**
   * Internal function for setting up pending selections
   * 
   * Used internally to configure the selection state with a specific
   * resolver function and credential options. This provides flexibility
   * for different selection scenarios while maintaining the same core logic.
   * 
   * @param resolver - Function to call with selected credentials
   * @param options - Array of credentials to choose from
   */
  const setPendingSelection = (
    resolver: SelectorResolve,
    options: EBSIVerifiableCredential[],
  ) => {
    resolverRef.current = resolver;
    optionsRef.current = options;
    forceUpdate();
  };

  /**
   * Handles user cancellation of credential selection
   * 
   * Provides clean cancellation logic that rejects the pending Promise
   * with an appropriate error and cleans up the selection state. This
   * ensures that calling code can properly handle cancellation scenarios
   * using try/catch blocks with async/await.
   */
  const handleCancel = () => {
    if (resolverRef.current) {
      resolverRef.current(
        Promise.reject(new Error("Selection cancelled")) as any,
      );
      resolverRef.current = null;
      optionsRef.current = [];
      forceUpdate();
    }
  };

  /**
   * Set up global credential selector bridge on mount
   * 
   * Registers the selectCredential function with the global bridge utility,
   * enabling external libraries or WebViews to trigger credential selection.
   * This runs once on component mount to establish the global connection.
   */
  useEffect(() => {
    setGlobalCredentialSelector(selectCredential);
  }, []);

  /**
   * Context value object with all exposed functionality
   * 
   * Constructs the context value that will be provided to child components.
   * Uses a getter for currentOptions to ensure consumers always receive
   * the most current value from the ref.
   */
  const contextValue: CredentialSelectorContextType = {
    selectCredential,
    setPendingSelection,
    get currentOptions() {
      return optionsRef.current;
    },
  };

  return (
    <CredentialSelectorContext.Provider value={contextValue}>
      {children}
      {optionsRef.current.length > 0 && (
        <ConformanceCredentialSelector
          onSelect={(credentials) => {
            if (resolverRef.current) {
              resolverRef.current(credentials);
              resolverRef.current = null;
              optionsRef.current = [];
              forceUpdate();
            }
          }}
          onCancel={handleCancel}
        />
      )}
    </CredentialSelectorContext.Provider>
  );
};

/**
 * useCredentialSelector Hook
 * 
 * Custom React hook that provides access to the credential selector context.
 * Includes proper error handling to ensure the hook is only used within
 * components that are wrapped by the CredentialSelectorProvider.
 * 
 * @returns CredentialSelectorContextType with all selection functionality
 * @throws Error if used outside of CredentialSelectorProvider
 */
export const useCredentialSelector = (): CredentialSelectorContextType => {
  const context = useContext(CredentialSelectorContext);
  if (!context) {
    throw new Error(
      "useCredentialSelector must be used within a CredentialSelectorProvider",
    );
  }
  
  return context;
};
