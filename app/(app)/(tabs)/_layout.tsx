import { Tabs } from "expo-router";
import SimpleLineIcon from "react-native-vector-icons/SimpleLineIcons";
import Fontisto from "react-native-vector-icons/Fontisto";
import Feather from "react-native-vector-icons/Feather";
import React from "react";
import Colors from "@/constants/Colors";
import { useLocale } from "@/context/TranslationContext";
import { View, StyleSheet } from "react-native";

/**
 * Main Tab Layout Component
 *
 * Configures the bottom tab navigation with three main screens:
 * Each tab has custom styling, icons, and behavior based on the screen's purpose.
 */
export default function TabsLayout() {
  const { t } = useLocale();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#57F7C7",
        tabBarInactiveTintColor: "#8B93A6",
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
          letterSpacing: 1.2,
          marginBottom: 1,
        },
        tabBarLabelPosition: "below-icon",
        tabBarItemStyle: {
          borderRadius: 10,
          marginVertical: 5,
          marginHorizontal: 2,
        },
        tabBarStyle: {
          position: "absolute",
          left: 16,
          right: 16,
          bottom: 12,
          height: 76,
          paddingTop: 6,
          paddingBottom: 6,
          borderRadius: 18,
          borderTopWidth: 0,
          backgroundColor: "rgba(12,15,19,0.98)",
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.08)",
          shadowColor: "#000",
          shadowOpacity: 0.16,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
          elevation: 8,
        },
        sceneStyle: {
          backgroundColor: Colors.current.background,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          headerShown: false,
          title: t("misc.credentials"),
          tabBarLabel: t("misc.credentials").toUpperCase(),
          tabBarIcon: ({ color }) => (
            <View style={styles.tabIconWrap}>
              <SimpleLineIcon size={19} name="credit-card" color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="scanner"
        options={{
          headerShown: false,
          title: t("misc.scan"),
          tabBarLabel: t("misc.scan").toUpperCase(),
          tabBarIcon: ({ color }) => (
            <View style={styles.tabIconWrap}>
              <Fontisto size={21} name="qrcode" color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="scan-qr"
        options={{
          href: null,
          headerShown: true,
          tabBarStyle: { display: "none" },
        }}
      />
      <Tabs.Screen
        name="import-link"
        options={{
          href: null,
          headerShown: false,
          tabBarStyle: { display: "none" },
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          headerShown: false,
          title: t("misc.settings"),
          tabBarLabel: t("misc.settings").toUpperCase(),
          tabBarIcon: ({ color }) => (
            <View style={styles.tabIconWrap}>
              <Feather name="settings" size={20} color={color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
});
