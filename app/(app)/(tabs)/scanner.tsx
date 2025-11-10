import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import { Modal, SafeAreaView, StyleSheet } from "react-native";
import { Camera, CameraView } from "expo-camera";
import {
  Colors,
  FloatingButton,
  LoaderScreen,
  Text,
  View,
} from "react-native-ui-lib";
import QrScannerLayout from "@/components/QrScannerLayout";
import CredentialExpandedInfo from "@/components/CredentialExpandedInfo";
import CredentialSelectorTrigger from "@/components/CredentialSelectorTrigger";
import PreApprovedCodeTrigger from "@/components/PreApprovedCodeTrigger";
import { BarcodeScanningResult } from "expo-camera";
import { scanMappings } from "@/helpers/scanMappings";
import StorageHelper from "@/helpers/storage";
import { EBSIConformance, EBSIVerifiableCredential } from "@/helpers/ebsi";
import { useTextDialog } from "@/providers/textDialogProvider";
import { mutate } from "swr";
import { router } from "expo-router";
import { useNavigation } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BackHandler } from "react-native";
import { useLocale } from "@/context/TranslationContext";

export default function Scanner() {
  const { t } = useLocale();
  const { enqueueDialog } = useTextDialog();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [data, setData] = useState<EBSIVerifiableCredential>();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();
  const [showCredentialSelector, setShowCredentialSelector] = useState(false);
  const [showPreApprovedCodeModal, setShowPreApprovedCodeModal] =
    useState(false);
  const [scanMapping, setScanMapping] = useState<string | null>(null);
  const isFocused = useIsFocused();
  const lastScannedData = useRef<string | null>(null);

  /**
   * Configure the navigation header with title and back button
   * Prevents navigation when loading to avoid interrupting operations
   */
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: t("scanner.credential_reader"),
      headerLeft: () => (
        <Ionicons
          name="chevron-back-outline"
          size={24}
          color="black"
          style={{ marginLeft: 15 }}
          onPress={() => {
            if (loading) {
              return;
            }

            navigation.goBack();
          }}
        />
      ),
      headerTitleStyle: {
        fontWeight: "bold",
        fontSize: 24,
      },
    });
  }, [navigation, loading]);

  /**
   * Request camera permissions when the screen comes into focus
   * This ensures the camera permission is always up-to-date
   */
  useFocusEffect(
    React.useCallback(() => {
      const getCameraPermissions = async () => {
        const { status } = await Camera.requestCameraPermissionsAsync();
        setHasPermission(status === "granted");
      };

      getCameraPermissions();
    }, []),
  );

  /**
   * Handle Android hardware back button
   * Prevents back navigation during loading operations
   */
  useEffect(() => {
    const onBackPress = () => {
      return loading;
    };

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      onBackPress,
    );

    return () => subscription.remove();
  }, [loading]);

  /**
   * Handle credential approval action
   * Saves the credential to storage and navigates back to main tab
   */
  const onApprove = async () => {
    if (!data || loading) return;
    setLoading(true);
    const credentials = (await StorageHelper.loadCredentials()) || [];
    credentials.push(data);
    await StorageHelper.saveCredentials(credentials);
    await mutate("credentials");
    router.push("/(app)/(tabs)");
    setData(undefined);
    setLoading(false);
    setScanned(false);
  };

  /**
   * Handle credential rejection action
   * Clears the current credential data and resets scanner state
   */
  const onReject = async () => {
    setData(undefined);
    setScanned(false);
  };

  const pendingValidatorRef = useRef<
    ((credential: EBSIVerifiableCredential) => Promise<void>) | null
  >(null);

  /**
   * Handle credential submission after PIN entry
   * Processes OpenID credential offers with or without PIN protection
   *
   * @param code - Optional PIN code for protected credential offers
   */
  const handleCredentialSubmission = async (code: number | null) => {
    if (code !== null) {
      await AsyncStorage.setItem("code", code.toString());
    }

    const url = await AsyncStorage.getItem("url");

    if (!url) {
      console.error("No url found");
      return;
    }

    const did = await StorageHelper.loadDID();

    if (did) {
      try {
        const openIdCredentialOfferResult =
          await scanMappings.open_id_credential_offer.execute(url, did);

        setLoading(false);

        if (
          openIdCredentialOfferResult &&
          openIdCredentialOfferResult instanceof EBSIVerifiableCredential
        ) {
          setShowPreApprovedCodeModal(false);
          setData(openIdCredentialOfferResult);
          enqueueDialog(t("scanner.credential_successfully_issued"), {
            onDismiss: () => {},
          });
        } else {
          enqueueDialog(t("scanner.error_while_issuing_credential"), {
            onDismiss: () => {
              setShowPreApprovedCodeModal(false);
            },
          });
        }

        setScanned(false);
      } catch (error) {
        console.error("Error during issuance: ", error);
        enqueueDialog(t("scanner.error_while_issuing_credential"), {
          onDismiss: () => {
            setLoading(false);
            setShowPreApprovedCodeModal(false);
            setScanned(false);
          },
        });
      }
    }
  };

  /**
   * Main QR code scanning handler
   * Processes different types of QR codes and routes to appropriate handlers:
   * - OpenID credential offers (with/without PIN)
   * - Presentation offers (credential verification requests)
   * - Validator requests (selective disclosure)
   * - Other EBSI-compatible QR codes
   *
   * @param data - Scanned QR code data
   */
  const handleBarCodeScanned = async ({ data }: BarcodeScanningResult) => {
    if (data === lastScannedData.current) {
      return;
    }

    lastScannedData.current = data;
    if (scanned) return;
    setScanned(true);
    setLoading(true);

    setTimeout(() => {
      lastScannedData.current = null;
    }, 10000);

    try {
      let url = new URL(data);
      let mapping;

      if (data.startsWith("openid-credential-offer")) {
        mapping = scanMappings.open_id_credential_offer;
      } else if (data.includes("presentation-offer")) {
        mapping = scanMappings.open_id_presentation_offer;
      } else {
        mapping = Object.entries(scanMappings).find(([key]) =>
          url.pathname.includes(key),
        )?.[1];
      }

      await AsyncStorage.setItem("url", data);

      if (!mapping) throw new Error(t("scanner.invalid_qr_code"));

      const did = await StorageHelper.loadDID();

      if (!did) throw new Error(t("scanner.no_did_found"));

      if (
        mapping.execute === scanMappings.open_id_credential_offer.execute &&
        !pendingValidatorRef.current
      ) {
        const credentialIssuer =
          await EBSIConformance.getCredentialIssuer(data);
        const isPinRequired =
          credentialIssuer.grants?.[
            "urn:ietf:params:oauth:grant-type:pre-authorized_code"
          ]?.user_pin_required ?? false;
        if (isPinRequired == true) {
          setShowPreApprovedCodeModal(true);
          return;
        }
        handleCredentialSubmission(null);
        return;
      } else if (
        mapping.execute === scanMappings.open_id_presentation_offer.execute
      ) {
        const requestUri = new URL(url).searchParams.get("request_uri");

        if (!requestUri) {
          throw new Error(t("scanner.no_request_uri"));
        }

        const innerUrl = new URL(decodeURIComponent(requestUri));

        const fields = new URL(innerUrl).searchParams.get("fields") || "";
        await AsyncStorage.setItem("selectedFields", fields);
        setLoading(false);
        setShowCredentialSelector(true);
        setScanned(false);
        setScanMapping("open_id_presentation_offer");
        return;
      }

      const result = await mapping.execute(data, did);

      setLoading(false);
      if (result instanceof EBSIVerifiableCredential) {
        setData(result);
      } else if (typeof result === "boolean") {
        await new Promise((resolve) => {
          enqueueDialog(
            result
              ? t("scanner.presentation_success")
              : t("scanner.presentation_error"),
            {
              onDismiss: resolve,
            },
          );
        });
      } else if (typeof result === "string") {
        setShowCredentialSelector(true);
      }

      setScanned(false);
    } catch (e) {
      setLoading(false);
      console.log(e);
      let message = t("scanner.scan_qr_code_error");

      if (
        e instanceof Error &&
        typeof e.message === "string" &&
        e.message.includes("401")
      ) {
        message = t("scanner.invalid_token_error");
      } else if (e instanceof Error) {
        message = e.message;
      }

      enqueueDialog(message, {
        onDismiss: () => setScanned(false),
      });
    }
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text>{t("scanner.requesting_camera_permission")}</Text>
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <Text>{t("scanner.camera_no_access")}</Text>
      </View>
    );
  }

  /**
   * Main render method
   *
   * Renders the complete scanner interface including:
   * - Credential approval modal
   * - Loading overlay
   * - QR scanner layout and camera view
   * - Credential selector modal
   * - PIN entry modal
   */
  // TODO: Status variable is currently being sent as an empty string. Update it when the revoke functionality is implemented.
  return (
    <View style={styles.container}>
      <Modal visible={!!data}>
        <SafeAreaView style={{ flex: 1 }}>
          <CredentialExpandedInfo data={data} status={""} />
          <FloatingButton
            visible
            buttonLayout={"Horizontal"}
            button={{
              label: t("scanner.accept"),
              disabled: loading,
              onPress: onApprove,
              backgroundColor: "#10C790",
            }}
            secondaryButton={{
              outline: false,
              disabled: loading,
              onPress: onReject,
              color: "#7C7C7C",
              backgroundColor: "#E6E6E6",
              label: t("scanner.reject"),
            }}
          />
        </SafeAreaView>
      </Modal>
      {loading && (
        <LoaderScreen
          overlay
          message={t("scanner.loading")}
          messageStyle={{ color: "white", fontWeight: "bold" }}
          color={Colors.white}
          backgroundColor={"rgba(126,124,124,0.75)"}
        />
      )}
      <QrScannerLayout />
      {isFocused && (
        <CameraView
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ["qr"],
          }}
          style={{ flex: 1 }}
        />
      )}
      {showCredentialSelector && (
        <CredentialSelectorTrigger
          onSelect={async (_) => {
            setShowCredentialSelector(false);
            setLoading(true);

            const stored = await AsyncStorage.getItem("selectedCredential");

            const selectedCredential = JSON.parse(
              stored || "{}",
            ) as EBSIVerifiableCredential;

            if (!selectedCredential) {
              console.error("No credential selected");
              return;
            }

            const url = await AsyncStorage.getItem("url");

            if (!url) {
              console.error("No url found");
              return;
            }

            const state = new URL(url).searchParams.get("state");

            if (state) {
              await AsyncStorage.setItem("state", state);
            }

            const did = await StorageHelper.loadDID();

            if (selectedCredential && did) {
              try {
                if (!scanMapping) throw new Error("Invalid scan mapping");

                const validationResult = await scanMappings[
                  scanMapping
                ].execute(url, did, true);

                navigation.goBack();

                if (validationResult) {
                  setLoading(false);
                  enqueueDialog(t("scanner.verification_success"), {
                    onDismiss: () => {},
                  });
                } else {
                  setLoading(false);
                  enqueueDialog(t("scanner.verification_disclosure_error"), {
                    onDismiss: () => {
                      setShowCredentialSelector(false);
                    },
                  });
                }
              } catch (error: any) {
                setLoading(false);
                console.error("Error during validation: ", error.message);
                enqueueDialog(
                  error?.message ?? t("scanner.verification_credential_error"),
                  {
                    onDismiss: () => {
                      setShowCredentialSelector(false);
                    },
                  },
                );
              }
            }
          }}
          onCancel={() => setShowCredentialSelector(false)}
        />
      )}
      {setShowPreApprovedCodeModal && (
        <PreApprovedCodeTrigger
          showModal={showPreApprovedCodeModal}
          setShowModal={setShowPreApprovedCodeModal}
          onClose={() => {
            setShowPreApprovedCodeModal(false);
            setLoading(false);
            setScanned(false);
          }}
          onSubmit={async (code) => {
            if (code) {
              await AsyncStorage.setItem("code", code.toString());
            }

            const url = await AsyncStorage.getItem("url");

            if (!url) {
              console.error("No url found");
              return;
            }

            const did = await StorageHelper.loadDID();

            if (did) {
              try {
                const openIdCredentialOfferResult =
                  await scanMappings.open_id_credential_offer.execute(url, did);

                setLoading(false);

                if (
                  openIdCredentialOfferResult &&
                  openIdCredentialOfferResult instanceof
                    EBSIVerifiableCredential
                ) {
                  setShowPreApprovedCodeModal(false);
                  setData(openIdCredentialOfferResult);
                  enqueueDialog(t("scanner.credential_successfully_issued"), {
                    onDismiss: () => {},
                  });
                } else {
                  enqueueDialog(t("scanner.error_while_issuing_credential"), {
                    onDismiss: () => {
                      setShowPreApprovedCodeModal(false);
                    },
                  });
                }

                setScanned(false);
              } catch (error: any) {
                console.error("Error during issuance: ", error.message);
                enqueueDialog(
                  error?.message ?? t("scanner.error_while_issuing_credential"),
                  {
                    onDismiss: () => {
                      setLoading(false);
                      setShowPreApprovedCodeModal(false);
                      setScanned(false);
                    },
                  },
                );
              }
            }
          }}
        />
      )}
    </View>
  );
}

/**
 * Stylesheet for the Scanner component
 * Defines the basic container layout for the scanner interface
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "column",
  },
});
