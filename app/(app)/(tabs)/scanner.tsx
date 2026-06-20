import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import Fontisto from "react-native-vector-icons/Fontisto";
import Feather from "react-native-vector-icons/Feather";
import { useLocale } from "@/context/TranslationContext";

export default function AddCredentialScreen() {
  const router = useRouter();
  const { t } = useLocale();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.replace("/(app)/(tabs)")}
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          >
            <Ionicons name="chevron-back" size={22} color="#F8FAFC" />
          </Pressable>
          <View style={styles.headerTextWrap}>
            <Text style={styles.title}>Add credential</Text>
          </View>
        </View>

        <Pressable
          onPress={() => router.push("/(app)/(tabs)/scan-qr")}
          style={({ pressed }) => [styles.card, styles.cardPrimary, pressed && styles.pressed]}
        >
          <View style={styles.cardGlow} />
          <View style={styles.iconBoxPrimary}>
            <Fontisto name="qrcode" size={30} color="#00E676" />
          </View>
          <Text style={styles.cardTitle}>Scan QR Code</Text>
          <Text style={styles.cardDesc}>Instant verification via secure camera scan</Text>
          <View style={styles.cardActionRow}>
            <Text style={styles.cardActionPrimary}>Open scanner</Text>
            <Ionicons name="arrow-forward" size={18} color="#00E676" />
          </View>
        </Pressable>

        <Pressable
          onPress={() => router.push("/(app)/(tabs)/import-link")}
          style={({ pressed }) => [styles.card, styles.cardSecondary, pressed && styles.pressed]}
        >
          <View style={styles.iconBoxSecondary}>
            <Feather name="link" size={30} color="#E5E7EB" />
          </View>
          <Text style={styles.cardTitle}>Import via Link</Text>
          <Text style={styles.cardDesc}>Connect using a secure verification URL</Text>
          <View style={styles.cardActionRow}>
            <Text style={styles.cardAction}>Enter details</Text>
            <Ionicons name="arrow-forward" size={18} color="#E5E7EB" />
          </View>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#06080C" },
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 10, gap: 14 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    gap: 10,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "#101418",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  headerTextWrap: { flex: 1, paddingRight: 10 },
  title: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: "700",
    color: "#F8FAFC",
    letterSpacing: -0.2,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 18,
    minHeight: 230,
    overflow: "hidden",
  },
  cardPrimary: {
    borderColor: "rgba(0,230,118,0.32)",
    backgroundColor: "#0B0D10",
  },
  cardSecondary: {
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "#0B0D10",
  },
  cardGlow: {
    position: "absolute",
    top: -80,
    right: -80,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(0,230,118,0.14)",
  },
  iconBoxPrimary: {
    width: 82,
    height: 82,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(0,230,118,0.34)",
    backgroundColor: "rgba(0,230,118,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconBoxSecondary: {
    width: 82,
    height: 82,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    marginTop: 16,
    fontSize: 28,
    lineHeight: 33,
    color: "#F8FAFC",
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  cardDesc: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 22,
    color: "#9CA3AF",
    maxWidth: "90%",
  },
  cardActionRow: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardActionPrimary: {
    fontSize: 17,
    color: "#00E676",
    fontWeight: "700",
  },
  cardAction: {
    fontSize: 17,
    color: "#E5E7EB",
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.85,
  },
});
