import useAuth from "@/providers/authProvider";
import { View, StyleSheet, Text, Image, TouchableOpacity } from "react-native";
import { useLocale } from "@/context/TranslationContext";

/**
 * Authentication Screen Component
 *
 * Renders the main authentication interface that users see when they need
 * to verify their identity to access the wallet. Provides a secure and
 * user-friendly entry point to the application.
 */
export default function AuthScreen() {
  const { isAuthenticated, authenticate } = useAuth();
  const { t } = useLocale();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("misc.digital_wallet")}</Text>
      <Image source={require("@/assets/images/logo.png")} style={styles.logo} />
      <Text style={styles.subtitle}>{t("misc.welcome")}</Text>
      <Text style={styles.description}>{t("misc.verify_identity")}</Text>

      <TouchableOpacity
        style={[styles.button, isAuthenticated && styles.buttonDisabled]}
        onPress={authenticate}
        disabled={isAuthenticated}
      >
        <Text style={styles.buttonText}>
          {isAuthenticated ? t("misc.authenticated") : t("misc.authenticate")}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
    padding: 20,
  },
  logo: { width: 130, height: 100, resizeMode: "contain", marginBottom: 10 },
  title: { fontSize: 32, fontFamily: "Lilita-One", color: "#43537C" },
  subtitle: { fontSize: 18, fontWeight: "600", marginVertical: 5 },
  description: {
    fontSize: 14,
    color: "gray",
    textAlign: "center",
    marginBottom: 20,
  },
  button: {
    marginTop: 50,
    backgroundColor: "#485cc7",
    paddingVertical: 11,
    paddingHorizontal: 23,
    borderRadius: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  buttonDisabled: { backgroundColor: "#A0A0A0" },
  buttonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
});
