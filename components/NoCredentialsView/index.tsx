import React from "react";
import { View, Text, StyleSheet } from "react-native";
import SimpleLineIcon from "react-native-vector-icons/SimpleLineIcons";
import ThemeColors from "@/constants/Colors";

const NoCredentialsView = ({ t }: { t: Function }) => {
  return (
    <View style={styles.container}>
      <SimpleLineIcon name="credit-card" size={48} color={ThemeColors.current.text} />
      <Text style={styles.message}>{t("main.you_have_no_credentials")}</Text>
      <Text style={styles.subMessage}>{t("main.scan_a_credential")}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
    backgroundColor: ThemeColors.current.background,
  },
  message: {
    marginTop: 8,
    fontSize: 16,
    color: ThemeColors.current.text,
    textAlign: "center",
    fontWeight: "600",
  },
  subMessage: {
    marginTop: 8,
    fontSize: 14,
    color: ThemeColors.current.textMuted,
    textAlign: "center",
  },
});

export default NoCredentialsView;
