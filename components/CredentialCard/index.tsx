import { Card, Chip, Text, View } from "react-native-ui-lib";
import { StyleSheet } from "react-native";
import { ReactElement } from "react";
import { getStatusColor, StatusColors } from "@/utils/statusColors";

/**
 * Type definition for detail line items
 * Represents a key-value pair for displaying credential metadata
 */
export type DetailLine = {
  label: string;
  value: string;
};

/**
 * Props interface for the CredentialCard component
 * Defines all required and optional properties for credential display
 */
interface CredentialCardProps {
  status: StatusColors;
  title: string;
  details: readonly [DetailLine, DetailLine];
  icon: ReactElement;
  onPress?: () => void;
}

/**
 * Main CredentialCard component implementation
 *
 * Renders a Material Design-inspired card with credential information.
 * The layout is optimized for readability and consistent presentation
 * across different credential types and statuses.
 *
 * @param status - The current status of the credential (affects color coding)
 * @param title - The primary title/name of the credential
 * @param details - Array of exactly two detail lines for metadata display
 * @param icon - React element representing the credential visually
 * @param onPress - Optional callback function for user interactions
 */
export default function CredentialCard({
  status,
  title,
  details,
  icon,
  onPress,
}: CredentialCardProps) {
  const st = getStatusColor(status);

  return (
    <Card style={styles.card} elevation={4} onPress={onPress}>
      <View style={styles.iconContainer}> 
        {icon}
      </View>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text text60>{title}</Text>
          <Chip
            label={st.label}
            backgroundColor={st.background}
            labelStyle={{ color: st.text }}
            containerStyle={{
              borderWidth: 0,
              width: 65,
              marginLeft: "auto",
            }}
          />
        </View>
        <View style={styles.body}>
          {details.slice(0, 2).map((detail, i) => (
            <Text key={i} text70 style={{ fontWeight: "bold" }} color="#646464">
              {detail.label}:{" "}
              <Text text70 color="#646464">
                {detail.value}
              </Text>
            </Text>
          ))}
        </View>
      </View>
    </Card>
  );
}

/**
 * StyleSheet for CredentialCard component
 *
 * Implements a Material Design-inspired layout with:
 * - Horizontal card layout (icon + content)
 * - Consistent spacing and elevation
 * - Responsive flexbox design
 * - Accessible touch targets
 * - Visual hierarchy through typography and spacing
 */
const styles = StyleSheet.create({
  iconContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 64,
    height: 64,

    color: "#000000",
    backgroundColor: "#FFFFFF",
  },
  card: {
    display: "flex",
    backgroundColor: "#121212",
    height: 120,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    gap: 20,
  },
  container: {
    display: "flex",
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    width: "100%",
    paddingVertical: 20,
    paddingHorizontal: 0,
  },
  header: {
    display: "flex",
    flexDirection: "row",
    width: "100%",
    alignItems: "center",
  },
  body: {
    display: "flex",
    flexDirection: "column",
    width: "100%",
    alignItems: "flex-start",
    marginTop: 0,
  },
});
