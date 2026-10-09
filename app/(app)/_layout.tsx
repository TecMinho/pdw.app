import "../../i18n.config";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { DefaultTheme, ThemeProvider } from "expo-router";
import { useFonts } from "expo-font";
import { Slot } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { AuthProvider } from "@/providers/authProvider";
import { TextDialogProvider } from "@/providers/textDialogProvider";
import { CredentialSelectorProvider } from "@/context/CredentialSelectorContext";
import { StatusBar } from "expo-status-bar";
import { LogBox } from "react-native";
import { I18nextProvider } from "react-i18next";
import { TranslationProvider } from "@/context/TranslationContext";
import i18next from "i18next";

/**
 * Export Error Boundary for Global Error Handling
 *
 * Expo Router's built-in error boundary provides automatic error catching
 * and recovery for the entire application. This ensures that unhandled
 * errors don't crash the app and users get appropriate error screens.
 */
export {
  ErrorBoundary,
} from "expo-router";

SplashScreen.preventAutoHideAsync();

let in_production:boolean = ['prod', 'production'].includes(process.env.NODE_ENV);

// Enable logging for all warnings
LogBox.ignoreAllLogs(in_production);

if (! in_production) {
    // Capture global JS errors
    ErrorUtils.setGlobalHandler((error, isFatal) => {
        console.error("Caught global error:", error, isFatal);
    });
}


/**
 * Root Layout Component - App Initialization and Font Loading
 *
 * Handles the critical app startup sequence including font loading,
 * splash screen management, and error handling before rendering
 * the main application interface.
 */
export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require("../../assets/fonts/SpaceMono-Regular.ttf"),
    ...FontAwesome.font,
  });

  /**
   * Font Loading Error Handler
   *
   * If font loading fails, throw the error to be caught by the
   * Error Boundary, ensuring users see an appropriate error screen
   * rather than a broken interface.
   */
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  /**
   * Splash Screen Management
   *
   * Once fonts are successfully loaded, hide the splash screen
   * to reveal the main application interface. This ensures users
   * don't see unstyled content during the font loading process.
   */
  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }
  return <Slot />;
}


/**
 * Root Layout Component - App Initialization and Font Loading
 *
 * Handles the critical app startup sequence including font loading,
 * splash screen management, and error handling before rendering
 * the main application interface.
 */
export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    ...FontAwesome.font,
  });

  /**
   * Font Loading Error Handler
   *
   * If font loading fails, throw the error to be caught by the
   * Error Boundary, ensuring users see an appropriate error screen
   * rather than a broken interface.
   */
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  /**
   * Splash Screen Management
   *
   * Once fonts are successfully loaded, hide the splash screen
   * to reveal the main application interface. This ensures users
   * don't see unstyled content during the font loading process.
   */
  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

/**
 * Root Navigation Layout - Provider Hierarchy and App Structure
 *
 * Establishes the complete provider hierarchy and global app configuration.
 * The order of providers is critical - each provider depends on the ones
 * wrapping it, creating a dependency injection pattern.
 *
 * Provider Stack (from outer to inner):
 * 1. ThemeProvider - Provides navigation themes and styling context
 * 2. CredentialSelectorProvider - Manages credential selection state across the app
 * 3. TextDialogProvider - Handles global notifications and dialog management
 * 4. AuthProvider - Manages user authentication state and security context
 */
function RootLayoutNav() {
  return (
    <I18nextProvider i18n={i18next}>
      <TranslationProvider>
        <ThemeProvider value={DefaultTheme}>
          <CredentialSelectorProvider>
            <TextDialogProvider>
              <AuthProvider>
                <StatusBar animated style="light" />
                <Slot />
              </AuthProvider>
            </TextDialogProvider>
          </CredentialSelectorProvider>
        </ThemeProvider>
      </TranslationProvider>
    </I18nextProvider>
  );
}