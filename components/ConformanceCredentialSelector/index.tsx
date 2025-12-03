import React, { useEffect, useState } from "react";
import { Alert, Modal, ScrollView } from "react-native";
import { Button, Text, View } from "react-native-ui-lib";
import StorageHelper from "@/helpers/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { EBSIVerifiableCredential } from "@/helpers/ebsi";
import { CredentialCard } from "@/app/(app)/(tabs)";
import { useLocale } from "@/context/TranslationContext";

/**
 * Props interface for the ConformanceCredentialSelector component
 * Defines callback functions for handling user selection and cancellation
 */
interface ConformanceCredentialSelectorProps {
  onSelect: (credentials: EBSIVerifiableCredential[]) => void;
  onCancel?: () => void;
}

/**
 * Main component implementation for credential selection
 * Manages modal state, credential loading, and user interactions
 */
const ConformanceCredentialSelector: React.FC<
  ConformanceCredentialSelectorProps
> = ({ onSelect, onCancel }) => {
  const [showModal, setShowModal] = useState(false);
  const [credentials, setCredentials] = useState<EBSIVerifiableCredential[]>(
    [],
  );
  const [selectedCredentials, setSelectedCredentials] = useState<Set<string>>(
    new Set(),
  );
  const [expiredStatus, setExpiredStatus] = useState<Record<string, boolean>>(
    {},
  );
  const { t } = useLocale();

  /**
   * Initial user prompt effect
   * Displays a confirmation dialog asking if the user wants to use stored credentials.
   * This provides a clear entry point and allows users to opt out if they prefer
   * to provide credentials through other means.
   */
  useEffect(() => {
    Alert.alert(
      t("credentials.use_stored_credential"),
      t("credentials.saved_credential"),
      [
        {
          text: t("credentials.no"),
          style: "cancel",
          onPress: onCancel,
        },
        {
          text: t("credentials.yes"),
          onPress: () => {
            loadCredentials();
            setShowModal(true);
          },
        },
      ],
    );
  }, []);

  /**
   * Credential expiration monitoring effect
   * Continuously monitors credential expiration status every 5 seconds.
   * This ensures users are always aware of which credentials are still valid
   * and prevents selection of expired credentials in real-time scenarios.
   */
  useEffect(() => {
    const checkExpiration = () => {
      const updates: Record<string, boolean> = {};
      const now = new Date();

      credentials.forEach((cred) => {
        const validUntil = new Date(cred.validUntil);
        updates[cred.id] = validUntil < now;
      });

      setExpiredStatus(updates);
    };

    checkExpiration();
    const interval = setInterval(checkExpiration, 5000);
    return () => clearInterval(interval);
  }, [credentials]);

  /**
   * Loads and filters credentials based on the current operation context
   *
   * This function implements intelligent credential filtering:
   * 1. For conformance testing URLs: Shows all EBSI conformance test credential types
   * 2. For other URLs: Extracts credentialType parameter or defaults to UniversityStudentCard
   *
   * The filtering ensures users only see relevant credentials for their current operation,
   * reducing cognitive load and preventing selection of inappropriate credentials.
   */
  const loadCredentials = async () => {
    try {
      const stored = await StorageHelper.loadCredentials();
      const url = (await AsyncStorage.getItem("url")) ?? "";

      const CONFORMANCE_TYPES = [
        "CTWalletSameAuthorisedInTime",
        "CTWalletCrossAuthorisedInTime",
        "CTWalletSameAuthorisedDeferred",
        "CTWalletCrossAuthorisedDeferred",
        "CTWalletSamePreAuthorisedInTime",
        "CTWalletCrossPreAuthorisedInTime",
        "CTWalletSamePreAuthorisedDeferred",
        "CTWalletCrossPreAuthorisedDeferred",
      ] as const;

      let credentialTypes: string[];

      if (url.includes("conformance")) {
        credentialTypes = [...CONFORMANCE_TYPES];
      } else {
        try {
          const param =
            new URL(url).searchParams.get("credentialType") ??
            "UniversityStudentCard";
          credentialTypes = [param];
        } catch {
          credentialTypes = ["UniversityStudentCard"];
        }
      }

      const filtered = (stored || []).filter((cred) =>
        credentialTypes.some((t) => cred.type?.includes(t)),
      );

      setCredentials(filtered);
    } catch (error) {
      console.error("Failed to load credentials", error);
    }
  };

  /**
   * Toggles the selection state of a credential
   * Uses Set data structure for efficient add/remove operations.
   *
   * @param id - The unique identifier of the credential to toggle
   */
  const toggleCredential = (id: string) => {
    setSelectedCredentials((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  /**
   * Handles user confirmation of credential selection
   * Filters the credentials based on user selection and calls the onSelect callback
   * with the final list of selected credentials.
   */
  const handleConfirm = () => {
    const selected = credentials.filter((cred) =>
      selectedCredentials.has(cred.id),
    );
    onSelect(selected);
    setShowModal(false);
  };

  /**
   * Main render function for the credential selection modal
   *
   * Renders a full-screen modal with:
   * - Header with clear title
   * - Scrollable list of filtered credentials
   * - Visual selection indicators (borders and background colors)
   * - Action buttons for cancel/confirm operations
   */
  return (
    <Modal visible={showModal} animationType="slide" transparent={false}>
      <View flex padding-20>
        <Text text50 marginB-20>
          {t("credentials.select_credentials")}
        </Text>
        <ScrollView>
          {credentials.map((cred) => {
            const isSelected = selectedCredentials.has(cred.id);

            const containerStyle = {
              borderWidth: isSelected ? 2 : 0,
              borderColor: isSelected ? "rgb(37, 150, 190)" : "transparent",
              borderRadius: 25,
              backgroundColor: isSelected
                ? "rgba(76, 175, 80, 0.1)"
                : "transparent",
              marginBottom: 15,
              padding: 0,
            };
            return (
              <View key={cred.id} style={containerStyle}>
                <CredentialCard
                  title={cred.type?.[2] ?? t("credentials.credential")}
                  status={expiredStatus[cred.id] ? "expired" : "valid"}
                  name={cred.name || ""}
                  expirationDate={new Date(
                    cred.expirationDate,
                  ).toLocaleDateString()}
                  validUntil={new Date(cred.validUntil).toLocaleDateString()}
                  issueDate={new Date(cred.issuanceDate).toLocaleDateString()}
                  validFrom={new Date(cred.validFrom).toLocaleDateString()}
                  onPress={() => toggleCredential(cred.id)}
                  style={{ marginVertical: 0 }}
                  t={t}
                  logo={cred.logo}
                  backgroundImage={cred.backgroundImage}
                />
              </View>
            );
          })}
        </ScrollView>

        <View marginT-20 row spread>
          <Button
            label={t("credentials.cancel")}
            backgroundColor="#ccc"
            onPress={() => {
              setShowModal(false);
              onCancel?.();
            }}
          />
          <Button
            label={t("credentials.confirm")}
            backgroundColor="#4CAF50"
            labelStyle={{ color: "#fff", fontWeight: "600" }}
            onPress={handleConfirm}
            disabled={selectedCredentials.size === 0}
          />
        </View>
      </View>
    </Modal>
  );
};

export default ConformanceCredentialSelector;
