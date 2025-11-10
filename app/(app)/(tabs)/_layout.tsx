import { Tabs } from "expo-router";
import SimpleLineIcon from "react-native-vector-icons/SimpleLineIcons";
import Fontisto from "react-native-vector-icons/Fontisto";
import Feather from "react-native-vector-icons/Feather";
import React from "react";
import { useLocale } from "@/context/TranslationContext";

/**
 * Main Tab Layout Component
 *
 * Configures the bottom tab navigation with three main screens:
 * Each tab has custom styling, icons, and behavior based on the screen's purpose.
 */
export default function TabsLayout() {
  const { t } = useLocale();
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: "blue" }}>
      <Tabs.Screen
        name="index"
        options={{
          headerShown: false,
          title: t("misc.credentials"),
          tabBarIcon: ({ color }) => (
            <SimpleLineIcon size={24} name="credit-card" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="scanner"
        options={{
          headerShown: true,
          title: t("misc.scan"),
          tabBarStyle: { display: "none" },
          tabBarIcon: ({ color }) => (
            <Fontisto size={20} name="qrcode" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          headerShown: false,
          title: t("misc.settings"),
          tabBarIcon: ({ color }) => (
            <Feather name="settings" size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
