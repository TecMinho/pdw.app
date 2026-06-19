import useAuth from "@/providers/authProvider";
import {
  View,
  StyleSheet,
  Text,
  Image,
  TouchableOpacity,
  Pressable,
  Linking,
  ImageBackground,
  useWindowDimensions,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocale } from "@/context/TranslationContext";
import Colors from "@/constants/Colors";

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
  const { width } = useWindowDimensions();

  const cardMaxWidth = Math.min(width - 32, 460);

  return (
    <View style={styles.root}>
      <ImageBackground
        source={require("@/assets/images/splash.png")}
        style={StyleSheet.absoluteFill}
        imageStyle={styles.bgImage}
        resizeMode="cover"
      />
      <View style={styles.overlay} />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerWrap}>
          <View style={[styles.heroCard, { width: cardMaxWidth }]}>
            <Text style={styles.title}>{t("misc.digital_wallet")}</Text>
            <Text style={styles.subtitle}>{t("misc.verify_identity")}</Text>

            <View style={styles.logoBadge}>
              <Image
                source={require("@/assets/images/logo.png")}
                style={styles.ringLogo}
                resizeMode="contain"
              />
            </View>

            <Text style={styles.welcome}>{t("misc.welcome")}</Text>

            <TouchableOpacity
              style={[styles.button, isAuthenticated && styles.buttonDisabled]}
              onPress={authenticate}
              disabled={isAuthenticated}
            >
              {isAuthenticated ? (
                <Ionicons
                  name="checkmark-circle-outline"
                  size={20}
                  color="#0b0b0b"
                />
              ) : (
                <Ionicons name="scan-outline" size={20} color="#0b0b0b" />
              )}
              <Text style={styles.buttonText}>
                {isAuthenticated
                  ? t("misc.authenticated")
                  : t("misc.authenticate")}
              </Text>
              {!isAuthenticated && (
                <ActivityIndicator size="small" color="transparent" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footerRow}>
          <Pressable
            onPress={() => Linking.openURL("https://www.tecminho.uminho.pt")}
            style={({ pressed }) => [
              styles.logoWrap,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Image
              source={require("@/assets/images/logos/tecminho.png")}
              tintColor="#FFFFFF"
              style={styles.footerLogo}
              alt="Logo TecMinho"
            />
          </Pressable>

          <View style={styles.footerDivider} />

          <Pressable
            onPress={() =>
              Linking.openURL(
                "https://ec.europa.eu/digital-building-blocks/sites/display/EBSI",
              )
            }
            style={({ pressed }) => [
              styles.logoWrap,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Image
              source={require("@/assets/images/logos/ebsi.png")}
              tintColor="#FFFFFF"
              style={styles.footerLogo}
              alt="Logo EBSI"
            />
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#050505",
  },
  bgImage: {
    opacity: 0.2,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(5, 5, 5, 0.78)",
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 16,
  },
  centerWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  heroCard: {
    borderRadius: 24,
    backgroundColor: "rgba(20,20,22,0.82)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    paddingVertical: 28,
    paddingHorizontal: 22,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.35,
    shadowRadius: 28,
    elevation: 14,
  },
  title: {
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: 0.2,
    textAlign: "center",
    fontFamily: "Lilita-One",
    color: "#FFFFFF",
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    color: "#9EA0A8",
    marginTop: 10,
    maxWidth: 290,
  },
  logoBadge: {
    marginTop: 28,
    marginBottom: 24,
    width: 132,
    height: 132,
    borderRadius: 66,
    borderWidth: 1,
    backgroundColor: "rgba(57,173,112,0.18)",
    borderColor: "rgba(57,173,112,0.55)",
    shadowColor: "#39AD70",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  ringLogo: {
    width: 86,
    height: 86,
  },

  welcome: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 16,
  },
  button: {
    width: "100%",
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: Colors.current.primary.background,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
    shadowColor: Colors.current.primary.background,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  buttonDisabled: {
    backgroundColor: "#8E8E93",
  },
  buttonText: {
    color: "#0b0b0b",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.3,
    textAlign: "center",
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 8,
    gap: 10,
  },
  logoWrap: {
    paddingHorizontal: 8,
  },
  footerLogo: {
    width: 84,
    height: 48,
    opacity: 0.9,
    resizeMode: "contain",
  },
  footerDivider: {
    width: 1,
    height: 24,
    backgroundColor: "rgba(255,255,255,0.10)",
  },
});
