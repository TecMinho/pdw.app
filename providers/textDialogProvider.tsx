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
  Colors,
  Constants,
  Dialog,
  DialogProps,
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
    setText(null);
    setDialogProperties({});
    dialogProperties.onDismiss?.();
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
        <View>
          {dialogProperties.title && (
            <View margin-20 center>
              <Text text50 center>
                {dialogProperties.title}
              </Text>
            </View>
          )}
          <View margin-20 center>
            {typeof text === "string" ? (
              <Text text70 center selectable>
                {text}
              </Text>
            ) : (
              text
            )}
          </View>
          <View margin-20 row gap-20 right>
            <Button
              text70
              label={t("misc.close")}
              {...dialogProperties.dismissAction}
              link
              disabled={isLoading}
              onPress={onDismiss}
            />
            {!!dialogProperties.secondaryAction && (
              <Button
                text70
                disabled={isLoading}
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
    backgroundColor: Colors.$backgroundDefault,
    marginBottom: Constants.isIphoneX ? 0 : 20,
    borderRadius: 12,
  },
});

export function useTextDialog() {
  const context = React.useContext(TextDialogContext);
  if (context === undefined) {
    throw new Error("useTextDialog must be used within a TextDialogProvider");
  }
  return context;
}
