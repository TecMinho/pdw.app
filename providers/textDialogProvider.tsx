import React, {
  createContext,
  PropsWithChildren,
  ReactNode,
  useCallback,
  useState,
} from "react";
import {
  Button,
  ButtonProps,
  Constants,
  Dialog,
  DialogProps,
  TouchableOpacity,
  Text,
  View,
} from "react-native-ui-lib";
import { StyleSheet } from "react-native";
import { useLocale } from "@/context/TranslationContext";

/**
 * Text Dialog Properties Interface
 *
 * Extends the base DialogProps but omits 'visible' since visibility
 * is controlled internally by the provider. Adds specific properties
 * for text-based dialogs including titles and action buttons.
 */
interface TextDialogProperties extends Omit<DialogProps, "visible"> {
  title?: string;
  dismissAction?: ButtonProps;
  secondaryAction?: ButtonProps;
  mainAction?: ButtonProps;
  hideDefaultDismissAction?: boolean;
  showTopClose?: boolean;
}

/**
 * Text Dialog Provider Context Interface
 *
 * Defines the contract for the dialog context that will be provided
 * to child components. Ensures type safety and clear API for dialog usage.
 */
interface TextDialogProviderProps {
  /**
   * Function to display a dialog with text and optional properties
   * @param text - The main text content to display in the dialog
   * @param properties - Optional dialog configuration (title, actions, etc.)
   */
  enqueueDialog: (text: ReactNode, properties?: TextDialogProperties) => void;
  dismissDialog: () => void;
}

/**
 * Text Dialog Context
 *
 * React Context that provides dialog functionality throughout the application.
 * Initialized as undefined to ensure proper error handling when used outside
 * of the provider.
 */
const TextDialogContext = createContext<TextDialogProviderProps | undefined>(
  undefined,
);

/**
 * Text Dialog Provider Component
 *
 * The main provider component that manages dialog state and renders dialogs
 * throughout the application. Provides a centralized dialog system that can
 * be accessed from any child component.
 *
 * @param children - Child components that will have access to dialog context
 */
export function TextDialogProvider({ children }: PropsWithChildren) {
  const [text, setText] = useState<ReactNode>(null);
  const [dialogProperties, setDialogProperties] =
    useState<TextDialogProperties>({});
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useLocale();

  /**
   * Enqueue Dialog Function
   *
   * Primary function for displaying dialogs. Sets the dialog text and merges
   * any provided properties with existing ones. This function is exposed
   * through the context for use by child components.
   *
   * Features:
   * - Immediate dialog display by setting text
   * - Property merging for flexible configuration
   * - Memoized with useCallback for performance
   *
   * @param text - The main content text to display
   * @param properties - Optional dialog configuration
   */
  const enqueueDialogCallback: TextDialogProviderProps["enqueueDialog"] =
    useCallback((text, properties = {}) => {
      setText(text);
      setDialogProperties((prev) => ({ ...prev, ...properties }));
    }, []);

  /**
   * Dialog Dismissal Handler
   *
   * Handles the dismissal of dialogs, including cleanup of state and
   * calling any custom onDismiss handlers. Prevents dismissal during
   * loading states to avoid interrupting async operations.
   *
   * Security Features:
   * - Prevents dismissal during loading to avoid data corruption
   * - Calls custom onDismiss handlers for cleanup
   * - Resets all dialog state to initial values
   *
   * State Cleanup:
   * - Clears dialog text (hides dialog)
   * - Resets dialog properties
   * - Calls any provided onDismiss callback
   */
  const onDismiss = useCallback(() => {
    if (isLoading) return;
    
    setTimeout(() => {
      dialogProperties.onDismiss?.();
    }, 0);

    setText(null);
    setDialogProperties({});
  }, [dialogProperties, isLoading]);

  /**
   * Context Provider and Dialog Render
   *
   * Provides the dialog context to child components and renders the actual
   * dialog UI. The dialog is conditionally rendered based on whether text
   * content exists.
   *
   * Dialog Structure:
   * - Context provider wraps children for global access
   * - Dialog component with custom styling and properties
   * - Conditional title section
   * - Main text content area
   * - Action buttons section (Close + optional main action)
   */
  return (
    <TextDialogContext.Provider
      value={{ enqueueDialog: enqueueDialogCallback, dismissDialog: onDismiss }}
    >
      <Dialog
        containerStyle={styles.roundedDialog}
        {...dialogProperties}
        visible={!!text}
        onDismiss={() => {
          setText(null);
          dialogProperties.onDismiss?.();
        }}
      >
        <View style={styles.dialogBody}>
          {dialogProperties.title && (
            <View style={styles.titleRow}>
              <Text style={styles.titleText}>{dialogProperties.title}</Text>
              {dialogProperties.showTopClose && (
                <TouchableOpacity
                  style={styles.topCloseBtn}
                  onPress={onDismiss}
                  disabled={isLoading}
                >
                  <Text style={styles.topCloseText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          {!dialogProperties.title && dialogProperties.showTopClose && (
            <View style={styles.titleRow}>
              <View />
              <TouchableOpacity
                style={styles.topCloseBtn}
                onPress={onDismiss}
                disabled={isLoading}
              >
                <Text style={styles.topCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.bodyWrap}>
            {typeof text === "string" ? (
              <Text style={styles.bodyText} center selectable>
                {text}
              </Text>
            ) : (
              text
            )}
          </View>
          <View style={styles.actionsWrap}>
            {!dialogProperties.hideDefaultDismissAction && (
              <Button
                text70
                label={t("misc.close")}
                {...dialogProperties.dismissAction}
                link
                labelStyle={styles.dismissLabel}
                disabled={isLoading}
                onPress={onDismiss}
              />
            )}
            {!!dialogProperties.secondaryAction && (
              <Button
                text70
                disabled={isLoading}
                style={styles.secondaryBtn}
                labelStyle={styles.secondaryBtnLabel}
                {...dialogProperties.secondaryAction}
                onPress={async () => {
                  const func: any =
                    dialogProperties.secondaryAction?.onPress?.();
                  if (func instanceof Promise) {
                    setIsLoading(true);
                    await func;
                    setIsLoading(false);
                  }
                  onDismiss();
                }}
              />
            )}
            {!!dialogProperties.mainAction && (
              <Button
                text70
                disabled={isLoading}
                style={styles.mainBtn}
                labelStyle={styles.mainBtnLabel}
                {...dialogProperties.mainAction}
                onPress={async () => {
                  const func: any = dialogProperties.mainAction?.onPress?.();
                  if (func instanceof Promise) {
                    setIsLoading(true);
                    await func;
                    setIsLoading(false);
                  }
                  onDismiss();
                }}
              />
            )}
          </View>
        </View>
      </Dialog>
      {children}
    </TextDialogContext.Provider>
  );
}

const styles = StyleSheet.create({
  roundedDialog: {
    backgroundColor: "#050505",
    marginBottom: Constants.isIphoneX ? 0 : 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 8,
  },
  dialogBody: {
    paddingTop: 2,
  },
  titleWrap: {
    marginTop: 16,
    marginHorizontal: 18,
    alignItems: "center",
  },
  titleRow: {
    marginTop: 14,
    marginHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  titleText: {
    fontSize: 21,
    lineHeight: 27,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.1,
    flex: 1,
    textAlign: "center",
    marginLeft: 28,
  },
  topCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#121212",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  topCloseText: {
    color: "#E5E7EB",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 16,
  },
  bodyWrap: {
    marginTop: 10,
    marginHorizontal: 18,
    alignItems: "center",
  },
  bodyText: {
    fontSize: 15,
    lineHeight: 22,
    color: "#A1A1AA",
  },
  actionsWrap: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  dismissLabel: {
    color: "#71717A",
    fontWeight: "600",
  },
  secondaryBtn: {
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    backgroundColor: "#121212",
    paddingHorizontal: 14,
  },
  secondaryBtnLabel: {
    color: "#E5E7EB",
    fontWeight: "700",
  },
  mainBtn: {
    minHeight: 42,
    borderRadius: 12,
    backgroundColor: "#00FF66",
    paddingHorizontal: 14,
  },
  mainBtnLabel: {
    color: "#000000",
    fontWeight: "800",
  },
});

export function useTextDialog() {
  const context = React.useContext(TextDialogContext);
  if (context === undefined) {
    throw new Error("useTextDialog must be used within a TextDialogProvider");
  }
  return context;
}
