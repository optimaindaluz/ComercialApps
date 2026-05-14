import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ScreenContainer } from "@/components/screen-container";
import { QRDisplay } from "@/components/qr-display";
import { useCommercialAuth } from "@/lib/commercial-auth";
import { useColors } from "@/hooks/use-colors";
import { getFormBaseUrl } from "@/constants/oauth";

const PERSONAL_QR_LOGO_KEY = "qr_logo_personal";

export default function MiQrScreen() {
  const colors = useColors();
  const { user } = useCommercialAuth();
  const [logoUri, setLogoUri] = useState<string | null>(null);

  // URL del formulario en Netlify — formato: ?qr=CODIGO&type=personal
  const formUrl = user
    ? `${getFormBaseUrl()}?qr=${user.personalQrCode}&type=personal`
    : "";

  // Cargar logo guardado al montar
  useEffect(() => {
    AsyncStorage.getItem(PERSONAL_QR_LOGO_KEY).then((val) => {
      if (val) setLogoUri(val);
    });
  }, []);

  // Guardar logo cuando cambia
  const handleLogoChange = async (uri: string | null) => {
    setLogoUri(uri);
    if (uri) {
      await AsyncStorage.setItem(PERSONAL_QR_LOGO_KEY, uri);
    } else {
      await AsyncStorage.removeItem(PERSONAL_QR_LOGO_KEY);
    }
  };

  const styles = StyleSheet.create({
    header: {
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 16,
    },
    headerTitle: {
      fontSize: 26,
      fontWeight: "800",
      color: colors.foreground,
    },
    headerSubtitle: {
      fontSize: 14,
      color: colors.muted,
      marginTop: 4,
    },
    infoCard: {
      marginHorizontal: 20,
      marginBottom: 24,
      backgroundColor: colors.primary + "15",
      borderRadius: 14,
      padding: 16,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
    },
    infoText: {
      fontSize: 13,
      color: colors.foreground,
      lineHeight: 20,
    },
    qrSection: {
      paddingHorizontal: 20,
      paddingBottom: 32,
    },
  });

  if (!user) return null;

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Mi QR Personal</Text>
          <Text style={styles.headerSubtitle}>Tu código QR único como comercial</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            Este es tu QR personal fijo. Compártelo con tus clientes para que puedan rellenar
            el formulario de captación y sus datos llegarán directamente a tu zona de comercial.
          </Text>
        </View>

        <View style={styles.qrSection}>
          <QRDisplay
            url={formUrl}
            title={user.fullName}
            subtitle="Escanea para solicitar comparativa de luz"
            size={260}
            logoUri={logoUri}
            onLogoChange={handleLogoChange}
          />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
