import { ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator, Platform } from "react-native";
import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ScreenContainer } from "@/components/screen-container";
import { QRDisplay } from "@/components/qr-display";
import { trpc } from "@/lib/trpc";
import { useColors } from "@/hooks/use-colors";
import { getFormBaseUrl } from "@/constants/oauth";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

const STATUS_LABELS: Record<string, string> = {
  new: "Nuevo",
  contacted: "Contactado",
  in_progress: "En proceso",
  closed: "Cerrado",
};

export default function BusinessDetailScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const businessId = parseInt(id ?? "0", 10);
  const [logoUri, setLogoUri] = useState<string | null>(null);

  // Cargar logo guardado para este negocio
  useEffect(() => {
    if (!businessId) return;
    AsyncStorage.getItem(`qr_logo_negocio_${businessId}`).then((val) => {
      if (val) setLogoUri(val);
    });
  }, [businessId]);

  const handleLogoChange = async (uri: string | null) => {
    setLogoUri(uri);
    if (uri) {
      await AsyncStorage.setItem(`qr_logo_negocio_${businessId}`, uri);
    } else {
      await AsyncStorage.removeItem(`qr_logo_negocio_${businessId}`);
    }
  };

  const { data: businesses, isLoading } = trpc.businesses.list.useQuery(undefined, {
    refetchInterval: 30000,
  });
  const { data: allLeads } = trpc.leads.list.useQuery(undefined, {
    refetchInterval: 30000,
  });
  const business = businesses?.find(b => b.id === businessId);
  const businessLeads = (allLeads ?? []).filter(l => l.businessId === businessId);

  const handleExportExcel = async () => {
    if (businessLeads.length === 0) return;
    const headers = ["Nombre", "Teléfono", "Email", "Estado", "Fecha", "Archivos"];
    const rows = businessLeads.map(l => [
      `"${l.fullName}"`,
      `"${l.phone}"`,
      `"${l.email}"`,
      `"${STATUS_LABELS[l.status] ?? l.status}"`,
      `"${new Date(l.createdAt).toLocaleDateString("es-ES")}"`,
      `"${(l.files?.length ?? 0)} archivo(s)"`,
    ]);
    const csv = "\uFEFF" + [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
    if (Platform.OS === "web") {
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `leads_${business?.name ?? "negocio"}_${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      try {
        const fileName = `leads_${business?.name ?? "negocio"}_${new Date().toISOString().split("T")[0]}.csv`;
        const fileUri = FileSystem.documentDirectory + fileName;
        await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(fileUri, {
            mimeType: "text/csv",
            dialogTitle: `Exportar leads de ${business?.name}`,
            UTI: "public.comma-separated-values-text",
          });
        }
      } catch (e) { console.warn("Error exportando CSV:", e); }
    }
  };

  // URL del formulario en Netlify — formato: ?qr=CODIGO&type=business
  const formUrl = business
    ? `${getFormBaseUrl()}?qr=${business.qrCode}&type=business`
    : "";

  const styles = StyleSheet.create({
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 16,
      gap: 12,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    backBtnText: { fontSize: 18, color: colors.foreground },
    headerTitle: { fontSize: 20, fontWeight: "700", color: colors.foreground, flex: 1 },
    statsRow: {
      flexDirection: "row",
      marginHorizontal: 20,
      marginBottom: 24,
      gap: 12,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 16,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    statValue: { fontSize: 28, fontWeight: "800", color: colors.primary },
    statLabel: { fontSize: 12, color: colors.muted, marginTop: 2, textAlign: "center" },
    exportBtn: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.success + "15",
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
      gap: 4,
      borderWidth: 1,
      borderColor: colors.success + "30",
    },
    exportBtnText: { color: colors.success, fontWeight: "700", fontSize: 13 },
    qrSection: { paddingHorizontal: 20, paddingBottom: 32 },
    urlBox: {
      marginTop: 20,
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    urlLabel: { fontSize: 11, fontWeight: "700", color: colors.muted, letterSpacing: 0.5, marginBottom: 4 },
    urlText: { fontSize: 12, color: colors.primary, fontFamily: "monospace" },
  });

  if (isLoading) {
    return (
      <ScreenContainer>
        <ActivityIndicator color={colors.primary} style={{ marginTop: 80 }} />
      </ScreenContainer>
    );
  }

  if (!business) {
    return (
      <ScreenContainer>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: colors.muted }}>Negocio no encontrado</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{business.name}</Text>

        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{businessLeads.length}</Text>
            <Text style={styles.statLabel}>Leads captados</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {new Date(business.createdAt).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}
            </Text>
            <Text style={styles.statLabel}>Fecha creación</Text>
          </View>
        </View>

        <View style={styles.qrSection}>
          <QRDisplay
            url={formUrl}
            title={business.name}
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
