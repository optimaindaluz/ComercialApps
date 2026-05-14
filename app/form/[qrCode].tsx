import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { useColors } from "@/hooks/use-colors";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";

interface UploadedFile {
  name: string;
  uri: string;
  mimeType: string;
  size: number;
}

export default function PublicFormScreen() {
  const colors = useColors();
  const { qrCode } = useLocalSearchParams<{ qrCode: string }>();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [marketingAccepted, setMarketingAccepted] = useState(false);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Obtener datos del comercial por su QR
  const { data: commercial, isLoading: loadingCommercial } = trpc.publicForm.getCommercialByQr.useQuery(
    { qrCode: qrCode ?? "" },
    { enabled: !!qrCode }
  );

  const submitMutation = trpc.publicForm.submit.useMutation();
  const uploadFileMutation = trpc.publicForm.uploadFile.useMutation();

  const handlePickFiles = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: true,
        type: ["application/pdf", "image/*"],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const newFiles: UploadedFile[] = result.assets.map((a: any) => ({
        name: a.name,
        uri: a.uri,
        mimeType: a.mimeType ?? "application/octet-stream",
        size: a.size ?? 0,
      }));
      setFiles(prev => [...prev, ...newFiles]);
    } catch {
      Alert.alert("Error", "No se pudo seleccionar el archivo");
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!fullName.trim() || !phone.trim() || !email.trim()) {
      Alert.alert("Error", "Por favor rellena todos los campos obligatorios");
      return;
    }
    if (!privacyAccepted) {
      Alert.alert("Error", "Debes aceptar la política de privacidad para continuar");
      return;
    }

    try {
      setUploading(true);

      // 1. Enviar el formulario
      const result = await submitMutation.mutateAsync({
        qrCode: qrCode ?? "",
        type: "personal",
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
        privacyAccepted,
        marketingAccepted,
      });

      // 2. Subir archivos adjuntos
      for (const file of files) {
        try {
          let base64: string;
          if (Platform.OS === "web") {
            // En web, leer como base64 desde el blob URL
            const response = await fetch(file.uri);
            const blob = await response.blob();
            base64 = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => {
                const dataUrl = reader.result as string;
                resolve(dataUrl.split(",")[1]);
              };
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
          } else {
            base64 = await FileSystem.readAsStringAsync(file.uri, {
              encoding: FileSystem.EncodingType.Base64,
            });
          }

          await uploadFileMutation.mutateAsync({
            leadId: result.leadId,
            commercialId: result.commercialId,
            fileName: file.name,
            mimeType: file.mimeType,
            fileBase64: base64,
          });
        } catch {
          // Si falla un archivo, continuamos con los demás
          console.warn("Error subiendo archivo:", file.name);
        }
      }

      setSubmitted(true);
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "No se pudo enviar el formulario");
    } finally {
      setUploading(false);
    }
  };

  const styles = StyleSheet.create({
    header: {
      backgroundColor: colors.primary,
      paddingHorizontal: 24,
      paddingTop: 40,
      paddingBottom: 32,
      alignItems: "center",
    },
    headerIcon: { fontSize: 40, marginBottom: 12 },
    headerTitle: { fontSize: 22, fontWeight: "800", color: "#fff", textAlign: "center" },
    headerSubtitle: { fontSize: 14, color: "rgba(255,255,255,0.85)", marginTop: 6, textAlign: "center" },
    form: { padding: 24 },
    sectionTitle: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.muted,
      letterSpacing: 0.5,
      marginBottom: 16,
      marginTop: 8,
    },
    label: { fontSize: 13, fontWeight: "600", color: colors.foreground, marginBottom: 6, marginTop: 16 },
    required: { color: colors.error },
    input: {
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      color: colors.foreground,
    },
    fileSection: {
      marginTop: 24,
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    fileSectionTitle: { fontSize: 15, fontWeight: "700", color: colors.foreground, marginBottom: 4 },
    fileSectionSubtitle: { fontSize: 13, color: colors.muted, marginBottom: 16 },
    pickFileBtn: {
      borderWidth: 2,
      borderColor: colors.primary,
      borderStyle: "dashed",
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: "center",
    },
    pickFileBtnText: { color: colors.primary, fontWeight: "600", fontSize: 15 },
    fileItem: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.background,
      borderRadius: 10,
      padding: 12,
      marginTop: 10,
    },
    fileIcon: { fontSize: 22, marginRight: 10 },
    fileName: { flex: 1, fontSize: 13, color: colors.foreground },
    fileRemove: { color: colors.error, fontWeight: "700", fontSize: 16, paddingLeft: 8 },
    checkboxSection: { marginTop: 24 },
    checkboxRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: 16,
      gap: 12,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 1,
    },
    checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
    checkboxMark: { color: "#fff", fontSize: 14, fontWeight: "700" },
    checkboxText: { flex: 1, fontSize: 13, color: colors.muted, lineHeight: 20 },
    checkboxLink: { color: colors.primary, fontWeight: "600" },
    submitBtn: {
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingVertical: 18,
      alignItems: "center",
      marginTop: 28,
      marginBottom: 48,
    },
    submitBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
    // Pantalla de éxito
    successContainer: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
    successIcon: { fontSize: 72, marginBottom: 24 },
    successTitle: { fontSize: 26, fontWeight: "800", color: colors.foreground, textAlign: "center", marginBottom: 12 },
    successText: { fontSize: 15, color: colors.muted, textAlign: "center", lineHeight: 24 },
  });

  if (loadingCommercial) {
    return (
      <ScreenContainer>
        <ActivityIndicator color={colors.primary} style={{ marginTop: 80 }} />
      </ScreenContainer>
    );
  }

  if (!commercial) {
    return (
      <ScreenContainer>
        <View style={styles.successContainer}>
          <Text style={{ fontSize: 48 }}>❌</Text>
          <Text style={[styles.successTitle, { marginTop: 16 }]}>Enlace inválido</Text>
          <Text style={styles.successText}>Este código QR no es válido o ha expirado.</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (submitted) {
    return (
      <ScreenContainer>
        <View style={styles.successContainer}>
          <Text style={styles.successIcon}>✅</Text>
          <Text style={styles.successTitle}>¡Solicitud enviada!</Text>
          <Text style={styles.successText}>
            Hemos recibido tus datos correctamente. En breve nos pondremos en contacto contigo
            para ofrecerte la mejor tarifa de luz adaptada a tu consumo.
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      <ScrollView keyboardShouldPersistTaps="handled">
        {/* Cabecera */}
        <View style={styles.header}>
          <Text style={styles.headerIcon}>⚡</Text>
          <Text style={styles.headerTitle}>Comparativa de Luz</Text>
          <Text style={styles.headerSubtitle}>
            Comercial: {commercial.fullName}{"\n"}
            Rellena el formulario y te encontraremos la mejor tarifa
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.sectionTitle}>DATOS DE CONTACTO</Text>

          <Text style={styles.label}>Nombre completo <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="Tu nombre y apellidos"
            placeholderTextColor={colors.muted}
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
          />

          <Text style={styles.label}>Teléfono <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="6XX XXX XXX"
            placeholderTextColor={colors.muted}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Email <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="tu@email.com"
            placeholderTextColor={colors.muted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          {/* Adjuntar facturas */}
          <View style={styles.fileSection}>
            <Text style={styles.fileSectionTitle}>📄 Factura de la luz</Text>
            <Text style={styles.fileSectionSubtitle}>
              Adjunta tu factura (PDF o foto) para que podamos hacer la comparativa exacta
            </Text>
            <TouchableOpacity style={styles.pickFileBtn} onPress={handlePickFiles}>
              <Text style={styles.pickFileBtnText}>+ Adjuntar archivo(s)</Text>
            </TouchableOpacity>
            {files.map((file, index) => (
              <View key={index} style={styles.fileItem}>
                <Text style={styles.fileIcon}>
                  {file.mimeType.includes("pdf") ? "📄" : "🖼️"}
                </Text>
                <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
                <TouchableOpacity onPress={() => handleRemoveFile(index)}>
                  <Text style={styles.fileRemove}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* Checkboxes legales */}
          <View style={styles.checkboxSection}>
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setPrivacyAccepted(!privacyAccepted)}
            >
              <View style={[styles.checkbox, privacyAccepted && styles.checkboxChecked]}>
                {privacyAccepted && <Text style={styles.checkboxMark}>✓</Text>}
              </View>
              <Text style={styles.checkboxText}>
                He leído y acepto la{" "}
                <Text style={styles.checkboxLink}>Política de Privacidad</Text>
                {" "}y el tratamiento de mis datos personales para la gestión de mi solicitud.{" "}
                <Text style={styles.required}>*</Text>
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setMarketingAccepted(!marketingAccepted)}
            >
              <View style={[styles.checkbox, marketingAccepted && styles.checkboxChecked]}>
                {marketingAccepted && <Text style={styles.checkboxMark}>✓</Text>}
              </View>
              <Text style={styles.checkboxText}>
                Acepto recibir comunicaciones comerciales sobre ofertas de energía y otros
                servicios relacionados. Puedo revocar este consentimiento en cualquier momento.
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, (uploading || submitMutation.isPending) && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={uploading || submitMutation.isPending}
          >
            {(uploading || submitMutation.isPending) ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>Enviar solicitud</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
