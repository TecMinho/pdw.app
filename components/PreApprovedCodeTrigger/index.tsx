import React, { useState } from "react";
import { Modal, StyleSheet } from "react-native";
import { Button, Text, View } from "react-native-ui-lib";
import { useLocale } from "@/context/TranslationContext";
import PreAuthorizedCodeInput from "../PreAuthorizedCode";

/**
 * Props interface for the PreApprovedCodeTrigger component
 * Defines the external control interface and callback functions
 */
interface PreApprovedCodeTriggerProps {
  showModal: boolean;
  setShowModal: (show: boolean) => void;
  onClose: () => void;
  onSubmit: (code: number | null) => void;
}

/**
 * Main PreApprovedCodeTrigger component implementation
 * Manages user input for pre-approved authorization codes
 */
const PreApprovedCodeTrigger: React.FC<PreApprovedCodeTriggerProps> = ({
  showModal,
  setShowModal,
  onClose,
  onSubmit,
}) => {
  const [code, setCode] = useState<string>("");
  const { t } = useLocale();

  /**
   * Handles form submission and code processing
   *
   * This function processes the user input, converting it to the appropriate
   * format for the parent component. It handles both empty submissions
   * (null) and numeric code submissions, making the component flexible
   * for both required and optional code scenarios.
   *
   * Processing Logic:
   * - Trims whitespace from input
   * - Converts empty strings to null (indicates no code provided)
   * - Converts valid input to numeric format
   * - Closes modal and triggers parent callback
   */
  const handleSubmission = () => {
    const numericCode = code.trim() === "" ? null : Number(code);
    onSubmit(numericCode);
    setShowModal(false);
  };

  return (
    <Modal visible={showModal} animationType="fade" transparent>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <Text text70 marginB-10 center>
            {t("credentials.enter_pre_approved_code")}
          </Text>
          <PreAuthorizedCodeInput
            value={code}
            onChangeText={setCode}
            maxLength={8}
            placeholder="1234"
          />
          <View row center marginT-10>
            <Button
              label={t("credentials.submit")}
              onPress={handleSubmission}
              marginR-60
              style={styles.button}
            />
            <Button
              label={t("credentials.cancel")}
              onPress={() => onClose()}
              outline
              style={styles.button}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

/**
 * StyleSheet for PreApprovedCodeTrigger component
 *
 * Implements a Material Design-inspired modal dialog with:
 * - Semi-transparent overlay for focus and context
 * - Elevated modal container with shadow effects
 * - Consistent input field styling with accessibility
 * - Balanced button layout for clear action hierarchy
 * - Responsive design that works across different screen sizes
 *
 * Design Principles:
 * - High contrast for accessibility and readability
 * - Sufficient touch targets for mobile interaction
 * - Visual hierarchy through elevation and spacing
 * - Professional appearance suitable for authentication flows
 * - Smooth visual transitions with shadow effects
 */
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: 300,
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
    alignItems: "stretch",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#888",
    backgroundColor: "#F7F7FA",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  button: {
    minWidth: 100,
  },
});

export default PreApprovedCodeTrigger;
