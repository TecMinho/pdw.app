import { Link, Stack } from "expo-router";
import { StyleSheet } from "react-native";
import { Colors, Text, View } from "react-native-ui-lib";
import { useLocale } from "@/context/TranslationContext";

/**
 * Not Found Screen Component
 *
 * Renders a user-friendly 404 error page when users attempt to access
 * a route that doesn't exist in the application. Provides clear messaging
 * and an easy way to return to the main application.
 */
export default function NotFoundScreen() {
  const { t } = useLocale();

  return (
    <>
      <Stack.Screen options={{ title: "Oops!" }} />
      <View style={styles.container}>
        <Text style={styles.title}>{t("misc.screen_doesnt_exist")}</Text>

        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>{t("misc.home_screen")}</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: Colors.current.background,
    color: Colors.current.text,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
  linkText: {
    fontSize: 14,
    color: Colors.current.tint,
  },
});
