import React, { useState } from "react";
import { View, Text, Pressable, Image, Linking, ScrollView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useLocale } from "@/context/TranslationContext";
import Colors from "@/constants/Colors";
import Constants from 'expo-constants';

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

    const styles = StyleSheet.create({
        title: {
            fontSize: 24,
            fontWeight: "bold",
            paddingTop: 30,
            paddingBottom: 15,
            color: "#007AFF",
        },
        text: {
            fontSize: 16,
        },
        link: {
            cursor: "pointer"
        },
        linkPressed: {
            opacity: 0.7
        }
    });

    /**
     * Main Render Method - About Page
     */
    return (
        <View style={{ padding: 20, backgroundColor: "white", flex: 1 }}>
            <View
                style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: 30,
                    marginBottom: 25,
                }}
            >
                <Pressable onPress={() => router.replace("/settings")}>
                    <Ionicons name="chevron-back-outline" size={28} />
                </Pressable>
                <Text
                    style={{ fontSize: 28, fontWeight: "bold", flex: 1, marginLeft: 3 }}
                >
                    {t("settings.about")}
                </Text>
            </View>



            <ScrollView
                style={{
                    paddingVertical: 0,
                    paddingHorizontal: 20,
                }}
            >
                <Text
                    style={[styles.title, { paddingTop: 0 }]}
                >
                    {t("about.capabilities")}
                </Text>
                <View
                    style={{
                        marginTop: 10,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                    }}
                >
                    <Pressable
                        onPress={async () => await Linking.openURL("https://ec.europa.eu/digital-building-blocks/sites/display/EBSI/Conformant+wallets")}
                        style={({ pressed }) => [styles.link, pressed && styles.linkPressed]}
                    >
                        <Image
                            source={require("@/assets/images/pdw_capabilities.png")}
                            style={{ width: 150, height: 150, resizeMode: "contain" }}
                            alt="PDW Capabilities"
                        />
                    </Pressable>
                    <Pressable
                        onPress={async () => await Linking.openURL("https://ec.europa.eu/digital-building-blocks/sites/display/EBSI")}
                        style={({ pressed }) => [styles.link, pressed && styles.linkPressed]}
                    >
                        <Image
                            source={require("@/assets/images/logos/ebsi.png")}
                            style={{ width: 120, height: 120, resizeMode: "contain" }}
                            alt="Logo EBSI"
                        />
                    </Pressable>
                </View>

                <Text
                    style={styles.title}
                >
                    {t("about.scope")}
                </Text>
                <View
                    style={{
                        marginTop: 10,
                        marginBottom: 10,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                    }}
                >
                    <Pressable
                        onPress={async () => await Linking.openURL("https://www.blockchain.pt")}
                        style={({ pressed }) => [styles.link, pressed && styles.linkPressed]}
                    >
                        <Image
                            source={require("@/assets/images/logos/agenda.png")}
                            style={{ width: 200, height: 60, resizeMode: "contain" }}
                            alt="Logo Agenda Blockchain.PT"
                        />
                    </Pressable>
                    <Pressable
                        onPress={async () => await Linking.openURL("https://www.tecminho.uminho.pt/tecminho/projetos/agendas/blockchainpt")}
                        style={({ pressed }) => [styles.link, pressed && styles.linkPressed]}
                    >
                        <Image
                            source={require("@/assets/images/logos/tecminho.png")}
                            style={{ width: 120, height: 70, resizeMode: "contain" }}
                            alt="Logo TecMinho"
                        />
                    </Pressable>
                </View>

                <Text
                    style={styles.text}
                >
                    {t("about.scope_text")}
                </Text>

                <Text
                    style={styles.title}
                >
                    {t("about.objective")}
                </Text>
                <Text
                    style={styles.text}
                >
                    {t("about.objective_text")}
                </Text>

                <Text
                    style={[styles.title, { paddingBottom: 0, marginBottom: 0, paddingVertical: 0 }]}
                >
                    {t("about.funding")}
                </Text>
                <Pressable
                    onPress={async () => await Linking.openURL("https://www.recuperarportugal.gov.pt")}
                    style={({ pressed }) => [styles.link, pressed && styles.linkPressed]}
                >
                    <Image
                        source={require("@/assets/images/logos/cofinanciamento.png")}
                        style={{ width: "100%", height: 80, resizeMode: "contain" }}
                        alt="Barra de assinaturas PRR"
                    />
                </Pressable>

                <Text
                    style={{ fontSize: 10, flex: 1, alignItems: "center", textAlign: "center", marginTop: 5, marginBottom: 10 }}
                >
                    {Constants.expoConfig?.version ? t("about.version_info", { version: Constants.expoConfig.version }) : t("about.version_info_unknown")   }
                </Text>

            </ScrollView>


        </View>
    );

}
