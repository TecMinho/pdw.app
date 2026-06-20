import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useLocale } from "@/context/TranslationContext";
import Colors from "@/constants/Colors";
import Constants from "expo-constants";
import { SafeAreaView } from "react-native-safe-area-context";

/**
 * Settings Screen Component - Wallet Management Interface
 *
 * Provides access to wallet configuration, DID management, and credential operations
 * that are not part of the main credential viewing workflow.
 */
export default function About() {
  const { t, changeLanguage, currentLanguage } = useLocale();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  /**
   * Main Render Method - About Page
   */
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.screen}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.replace("/settings")}
            style={({ pressed }) => [
              styles.backBtn,
              pressed && styles.linkPressed,
            ]}
          >
            <Ionicons name="chevron-back-outline" size={22} color="#F8FAFC" />
          </Pressable>

          <Text style={styles.headerTitle}>{t("settings.about")}</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.title, { paddingTop: 0 }]}>
            {t("about.capabilities")}
          </Text>
          <View style={styles.logoCardRow}>
            <Pressable
              onPress={async () =>
                await Linking.openURL(
                  "https://ec.europa.eu/digital-building-blocks/sites/display/EBSI/Conformant+wallets",
                )
              }
              style={({ pressed }) => [
                styles.link,
                pressed && styles.linkPressed,
              ]}
            >
              <Image
                source={require("@/assets/images/pdw_capabilities.png")}
                // tintColor={Colors.current.image.tint}
                style={{ width: 150, height: 150, resizeMode: "contain" }}
                alt="PDW Capabilities"
              />
            </Pressable>
            <Pressable
              onPress={async () =>
                await Linking.openURL(
                  "https://ec.europa.eu/digital-building-blocks/sites/display/EBSI",
                )
              }
              style={({ pressed }) => [
                styles.link,
                pressed && styles.linkPressed,
              ]}
            >
              <Image
                source={require("@/assets/images/logos/ebsi.png")}
                tintColor={Colors.current.image.getTintColor()}
                style={{ width: 120, height: 120, resizeMode: "contain" }}
                alt="Logo EBSI"
              />
            </Pressable>
          </View>

          <Text style={styles.title}>{t("about.scope")}</Text>
          <View style={styles.logoCardRow}>
            <Pressable
              onPress={async () =>
                await Linking.openURL("https://www.blockchain.pt")
              }
              style={({ pressed }) => [
                styles.link,
                pressed && styles.linkPressed,
              ]}
            >
              <Image
                source={require("@/assets/images/logos/agenda.png")}
                tintColor={Colors.current.image.getTintColor()}
                style={{ width: 200, height: 60, resizeMode: "contain" }}
                alt="Logo Agenda Blockchain.PT"
              />
            </Pressable>
            <Pressable
              onPress={async () =>
                await Linking.openURL(
                  "https://www.tecminho.uminho.pt/tecminho/projetos/agendas/blockchainpt",
                )
              }
              style={({ pressed }) => [
                styles.link,
                pressed && styles.linkPressed,
              ]}
            >
              <Image
                source={require("@/assets/images/logos/tecminho.png")}
                tintColor={Colors.current.image.getTintColor()}
                style={{ width: 120, height: 70, resizeMode: "contain" }}
                alt="Logo TecMinho"
              />
            </Pressable>
          </View>

          <Text style={styles.text}>{t("about.scope_text")}</Text>

          <Text style={styles.title}>{t("about.objective")}</Text>
          <Text style={styles.text}>{t("about.objective_text")}</Text>

          <Text
            style={[
              styles.title,
              { paddingBottom: 0, marginBottom: 0, paddingVertical: 0 },
            ]}
          >
            {t("about.funding")}
          </Text>
          <Pressable
            onPress={async () =>
              await Linking.openURL("https://www.recuperarportugal.gov.pt")
            }
            style={({ pressed }) => [
              styles.link,
              pressed && styles.linkPressed,
            ]}
          >
            <Image
              source={require("@/assets/images/logos/cofinanciamento.png")}
              // tintColor={Colors.current.image.getTintColor()}
              style={{ width: "100%", height: 80, resizeMode: "contain" }}
              alt="Barra de assinaturas PRR"
            />
          </Pressable>

          <Text
            style={[
              styles.text,
              {
                fontSize: 10,
                flex: 1,
                alignItems: "center",
                textAlign: "center",
                marginTop: 5,
                marginBottom: 10,
              },
            ]}
          >
            {Constants.expoConfig?.version
              ? t("about.version_info", {
                  version: Constants.expoConfig.version,
                })
              : t("about.version_info_unknown")}
          </Text>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 3,
    marginLeft: 4,
    marginTop: 18,
    marginBottom: 8,
    color: "#71717A",
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
    color: "#E5E7EB",
  },
  link: {
    cursor: "pointer",
    color: Colors.current.tint,
  },
  linkPressed: {
    opacity: 0.7,
  },
  safe: {
    flex: 1,
    backgroundColor: "#050505",
  },
  screen: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    backgroundColor: "#050505",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 18,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "#101418",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: "700",
    color: "#F8FAFC",
    letterSpacing: -0.2,
  },
  content: {
    paddingBottom: 40,
  },
  logoCardRow: {
    marginTop: 10,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#101418",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
});
