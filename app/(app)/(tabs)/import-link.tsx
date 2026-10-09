import { useState } from "react";
import { Modal, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Button, Text, TextField, View } from "react-native-ui-lib";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { mutate } from "swr";
import StorageHelper from "@/helpers/storage";
import { scanMappings } from "@/helpers/scanMappings";
import { EBSIVerifiableCredential } from "@/helpers/ebsi";
import CredentialExpandedInfo from "@/components/CredentialExpandedInfo";
import { useTextDialog } from "@/providers/textDialogProvider";
import { useLocale } from "@/context/TranslationContext";
import PreAuthorizedCodeInput from "@/components/PreAuthorizedCode";
import { credentialApprovalLayout } from "@/utils/credentialApprovalLayout";

export default function ImportLinkScreen() {
  const router = useRouter();
  const { t } = useLocale();
  const { enqueueDialog } = useTextDialog();
  const [offerUrl, setOfferUrl] = useState("");
  const [code, setCode] = useState("");
  const [fetching, setFetching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<EBSIVerifiableCredential>();

  const onApprove = async () => {
    if (!data || loading) return;
    setLoading(true);
    const credentials = (await StorageHelper.loadCredentials()) || [];
    credentials.push(data);
    await StorageHelper.saveCredentials(credentials);
    await mutate("credentials");
    router.replace("/(app)/(tabs)");
    setData(undefined);
    setLoading(false);
  };

  const onReject = async () => {
    setData(undefined);
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Modal
        visible={!!data}
        animationType="slide"
        onRequestClose={onReject}
      >
        <SafeAreaView style={credentialApprovalLayout.screen}>
          <View style={credentialApprovalLayout.content}>
            <CredentialExpandedInfo data={data} status="" style={{ flex: 1 }} />
          </View>
          <View style={credentialApprovalLayout.actions}>
            <Button
              label={t("settings.reject")}
              disabled={loading}
              onPress={onReject}
              backgroundColor="#101418"
              labelStyle={{ color: "#E5E7EB", fontWeight: "700" }}
              style={[credentialApprovalLayout.actionButton, credentialApprovalLayout.rejectButton]}
            />
            <Button
              label={t("settings.accept")}
              disabled={loading}
              onPress={onApprove}
              backgroundColor="#10C790"
              labelStyle={{ color: "#0B0D10", fontWeight: "700" }}
              style={credentialApprovalLayout.actionButton}
            />
          </View>
        </SafeAreaView>
      </Modal>

      <View style={styles.headerRow}>
        <Button
          onPress={() => router.replace("/(app)/(tabs)/scanner")}
          style={styles.backBtn}
          backgroundColor="transparent"
          iconSource={() => <Ionicons name="chevron-back" size={22} color="#F8FAFC" />}
        />
        <Text style={styles.title}>Import via Link</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.label}>{t("settings.paste_offer_url")}</Text>
        <TextField
          placeholder="openid-credential-offer://..."
          value={offerUrl}
          onChangeText={setOfferUrl}
          autoCapitalize="none"
          autoCorrect={false}
          placeholderTextColor="#6B7280"
          style={styles.input}
        />

        <Text style={[styles.label, { marginTop: 12 }]}>{t("settings.enter_pre_approved_code")}</Text>
        <PreAuthorizedCodeInput
          value={code}
          onChangeText={setCode}
          maxLength={8}
          placeholder="1234"
        />

        <View style={{ gap: 10, marginTop: 16 }}>
          <Button
            label={fetching ? t("settings.issuing") : t("settings.issue_credential")}
            onPress={async () => {
              setFetching(true);
              try {
                if (!offerUrl) {
                  throw new Error(t("settings.no_offer_url"));
                }

                if (code) {
                  await AsyncStorage.setItem("code", code);
                }

                const did = await StorageHelper.loadDID();

                if (!did) {
                  throw new Error(t("settings.no_did_found"));
                }

                let credential = null;

                try {
                  const response = await fetch(offerUrl);
                  if (response.status === 302) {
                    const credentialOffer = response.headers.get("location");
                    if (!credentialOffer) {
                      throw new Error(t("settings.no_offer_url"));
                    }
                    credential = await scanMappings.open_id_credential_offer.execute(
                      credentialOffer,
                      did,
                    );
                  }
                } catch (_error) {
                  credential = await scanMappings.open_id_credential_offer.execute(
                    offerUrl,
                    did,
                  );
                }

                if (!credential) {
                  throw new Error(t("settings.no_credential_found"));
                }

                setData(credential);
              } catch (error: any) {
                enqueueDialog(
                  error?.message ?? t("settings.failed_to_fetch_or_parse_offer"),
                  { title: t("settings.error_title") },
                );
              } finally {
                setFetching(false);
              }
            }}
            disabled={fetching || !offerUrl}
          />

          <Button
            label={t("settings.cancel")}
            outline
            onPress={() => router.replace("/(app)/(tabs)/scanner")}
            disabled={fetching}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#06080C",
  },
  headerRow: {
    marginTop: 8,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "#101418",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#F8FAFC",
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 18,
    gap: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: "#9CA3AF",
  },
  input: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "#101418",
    color: "#F8FAFC",
    paddingHorizontal: 14,
  },
});