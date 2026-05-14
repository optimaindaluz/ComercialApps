import { useRef, useState } from "react";
import {
  Alert,
  Platform,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as ImagePicker from "expo-image-picker";
import { useColors } from "@/hooks/use-colors";

interface QRDisplayProps {
  url: string;          // URL que codifica el QR
  title: string;        // Título mostrado encima del QR
  subtitle?: string;    // Subtítulo opcional
  size?: number;        // Tamaño del QR (default 260)
  logoUri?: string | null;          // URI del logo personalizado (null = usar logo por defecto)
  onLogoChange?: (uri: string | null) => void; // Callback cuando cambia el logo
}

export function QRDisplay({ url, title, subtitle, size = 260, logoUri, onLogoChange }: QRDisplayProps) {
  const colors = useColors();
  const qrRef = useRef<any>(null);
  const [showLogoOptions, setShowLogoOptions] = useState(false);

  // Determinar el logo a mostrar: personalizado o el de Optima por defecto
  const logoSource = logoUri
    ? { uri: logoUri }
    : require("../assets/images/optima-logo.png");

  // Seleccionar imagen de la galería
  const handlePickLogo = async () => {
    setShowLogoOptions(false);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permiso necesario", "Necesitas permitir el acceso a la galería para cambiar el logo.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        onLogoChange?.(result.assets[0].uri);
      }
    } catch {
      Alert.alert("Error", "No se pudo abrir la galería.");
    }
  };

  // Tomar foto con la cámara
  const handleTakePhoto = async () => {
    setShowLogoOptions(false);
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permiso necesario", "Necesitas permitir el acceso a la cámara para tomar una foto.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        onLogoChange?.(result.assets[0].uri);
      }
    } catch {
      Alert.alert("Error", "No se pudo abrir la cámara.");
    }
  };

  // Restaurar logo por defecto
  const handleResetLogo = () => {
    setShowLogoOptions(false);
    onLogoChange?.(null);
  };

  // Compartir el enlace del formulario
  const handleShare = async () => {
    try {
      if (Platform.OS === "web" && typeof window !== "undefined" && typeof navigator !== "undefined") {
        if (navigator.share) {
          await navigator.share({ title, text: subtitle ?? "", url });
        } else if (navigator.clipboard) {
          await navigator.clipboard.writeText(url);
          Alert.alert("Enlace copiado", "El enlace ha sido copiado al portapapeles");
        } else {
          Alert.alert("Enlace", url);
        }
        return;
      }
      await Share.share({
        message: `${title}\n\nRellena el formulario aquí: ${url}`,
        url,
        title,
      });
    } catch (err: any) {
      if (err.message !== "The user did not share") {
        Alert.alert("Error", "No se pudo compartir");
      }
    }
  };

  // Compartir el QR como imagen PNG
  const handleShareQR = async () => {
    if (Platform.OS === "web") {
      await handleShare();
      return;
    }
    if (!qrRef.current) {
      Alert.alert("Error", "El QR no está listo, inténtalo de nuevo");
      return;
    }
    try {
      const dataURL: string = await new Promise((resolve, reject) => {
        try {
          qrRef.current.toDataURL((data: string) => resolve(data));
        } catch (e) {
          reject(e);
        }
      });
      const fileUri = (FileSystem.cacheDirectory ?? "") + "qr_code.png";
      await FileSystem.writeAsStringAsync(fileUri, dataURL, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        await handleShare();
        return;
      }
      await Sharing.shareAsync(fileUri, {
        mimeType: "image/png",
        dialogTitle: `Compartir QR - ${title}`,
        UTI: "public.png",
      });
    } catch {
      await handleShare();
    }
  };

  const styles = StyleSheet.create({
    container: { alignItems: "center" },
    qrWrapper: {
      backgroundColor: "#fff",
      padding: 20,
      borderRadius: 20,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 6,
    },
    title: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.foreground,
      textAlign: "center",
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 13,
      color: colors.muted,
      textAlign: "center",
      marginBottom: 20,
    },
    changeLogoBtn: {
      marginTop: 14,
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 10,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignSelf: "center",
    },
    changeLogoBtnText: {
      fontSize: 13,
      color: colors.muted,
      fontWeight: "600",
    },
    logoOptionsOverlay: {
      marginTop: 8,
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
      alignSelf: "stretch",
    },
    logoOption: {
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    logoOptionLast: {
      paddingVertical: 14,
      paddingHorizontal: 20,
    },
    logoOptionText: {
      fontSize: 15,
      color: colors.foreground,
      fontWeight: "500",
    },
    logoOptionDestructive: {
      fontSize: 15,
      color: colors.error,
      fontWeight: "500",
    },
    buttonsRow: {
      flexDirection: "row",
      gap: 12,
      marginTop: 24,
    },
    shareBtn: {
      flex: 1,
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
    },
    shareBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
    shareQrBtn: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    shareQrBtnText: { color: colors.foreground, fontWeight: "600", fontSize: 15 },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

      <View style={styles.qrWrapper}>
        <QRCode
          value={url || "https://example.com"}
          size={size}
          color="#0F172A"
          backgroundColor="#FFFFFF"
          getRef={(ref) => { qrRef.current = ref; }}
          logo={logoSource}
          logoSize={Math.round(size * 0.22)}
          logoBackgroundColor="#FFFFFF"
          logoMargin={4}
          logoBorderRadius={6}
          quietZone={6}
          ecl="H"
        />
      </View>

      {/* Botón cambiar logo */}
      {onLogoChange && (
        <>
          <TouchableOpacity
            style={styles.changeLogoBtn}
            onPress={() => setShowLogoOptions(!showLogoOptions)}
          >
            <Text style={styles.changeLogoBtnText}>
              {showLogoOptions ? "Cancelar" : "Cambiar logo central"}
            </Text>
          </TouchableOpacity>

          {showLogoOptions && (
            <View style={styles.logoOptionsOverlay}>
              <TouchableOpacity style={styles.logoOption} onPress={handlePickLogo}>
                <Text style={styles.logoOptionText}>Elegir de la galería</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.logoOption} onPress={handleTakePhoto}>
                <Text style={styles.logoOptionText}>Tomar foto</Text>
              </TouchableOpacity>
              {logoUri && (
                <TouchableOpacity style={styles.logoOptionLast} onPress={handleResetLogo}>
                  <Text style={styles.logoOptionDestructive}>Restaurar logo por defecto</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </>
      )}

      <View style={styles.buttonsRow}>
        <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
          <Text style={styles.shareBtnText}>Compartir enlace</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.shareQrBtn} onPress={handleShareQR}>
          <Text style={styles.shareQrBtnText}>Compartir QR</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
