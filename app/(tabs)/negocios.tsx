import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { useColors } from "@/hooks/use-colors";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

export default function NegociosScreen() {
  const colors = useColors();
  const [showModal, setShowModal] = useState(false);
  const [businessName, setBusinessName] = useState("");

  const { data: businesses, isLoading, refetch } = trpc.businesses.list.useQuery();

  const createMutation = trpc.businesses.create.useMutation({
    onSuccess: () => {
      setShowModal(false);
      setBusinessName("");
      refetch();
    },
    onError: (err) => Alert.alert("Error", err.message),
  });

  const deleteMutation = trpc.businesses.delete.useMutation({
    onSuccess: () => refetch(),
    onError: (err) => Alert.alert("Error", err.message),
  });

  const [exportingId, setExportingId] = useState<number | null>(null);

  const exportQuery = trpc.commercial.exportLeads.useQuery(
    { businessId: exportingId ?? undefined },
    {
      enabled: exportingId !== null,
      staleTime: 0,
      gcTime: 0,
    }
  );

  // Cuando llegan los datos de exportación, generar Excel (CSV)
  useEffect(() => {
    if (exportingId === null || !exportQuery.data) return;
    const biz = (businesses ?? []).find(b => b.id === exportingId);
    const bizName = biz?.name ?? "negocio";
    const data = exportQuery.data;
    setExportingId(null);
    if (data.length === 0) {
      Alert.alert("Sin datos", `"${bizName}" no tiene leads para exportar`);
      return;
    }
    const headers = ["ID", "Nombre", "Teléfono", "Email", "Estado", "Notas", "Privacidad", "Marketing", "Fecha"];
    const rows = data.map(l => [
      l.id, `"${l.nombre}"`, `"${l.telefono}"`, `"${l.email}"`,
      `"${l.estado}"`, `"${(l.notas ?? "").replace(/"/g, "'")}"`,
      `"${l.privacidad}"`, `"${l.marketing}"`, `"${l.fecha}"`
    ]);
    const csv = "\uFEFF" + [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
    const fileName = `leads_${bizName.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.csv`;
    if (Platform.OS === "web") {
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      (async () => {
        try {
          const fileUri = FileSystem.documentDirectory + fileName;
          await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });
          const canShare = await Sharing.isAvailableAsync();
          if (canShare) {
            await Sharing.shareAsync(fileUri, {
              mimeType: "text/csv",
              dialogTitle: `Exportar leads de ${bizName}`,
              UTI: "public.comma-separated-values-text",
            });
          }
        } catch (e) {
          Alert.alert("Error", "No se pudo exportar el archivo.");
        }
      })();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exportQuery.data, exportingId]);

  const handleCreate = () => {
    if (!businessName.trim()) {
      Alert.alert("Error", "Escribe el nombre del negocio");
      return;
    }
    createMutation.mutate({ name: businessName.trim() });
  };

  const handleDelete = (id: number, name: string) => {
    Alert.alert(
      "Eliminar negocio",
      `¿Seguro que quieres eliminar "${name}"? Se perderá el QR asociado.`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Eliminar", style: "destructive", onPress: () => deleteMutation.mutate({ id }) },
      ]
    );
  };

  const styles = StyleSheet.create({
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 16,
    },
    headerLeft: { flex: 1 },
    headerTitle: { fontSize: 26, fontWeight: "800", color: colors.foreground },
    headerSubtitle: { fontSize: 13, color: colors.muted, marginTop: 2 },
    addBtn: {
      backgroundColor: colors.primary,
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
    },
    addBtnText: { color: "#fff", fontSize: 26, lineHeight: 28, fontWeight: "300" },
    card: {
      backgroundColor: colors.surface,
      marginHorizontal: 20,
      marginBottom: 12,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardTop: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 12,
    },
    cardIcon: {
      width: 48,
      height: 48,
      borderRadius: 12,
      backgroundColor: colors.primary + "15",
      alignItems: "center",
      justifyContent: "center",
      marginRight: 14,
      flexShrink: 0,
    },
    cardIconText: { fontSize: 22 },
    cardContent: { flex: 1 },
    cardName: { fontSize: 16, fontWeight: "700", color: colors.foreground, flexWrap: "wrap" },
    cardMeta: { fontSize: 12, color: colors.muted, marginTop: 2 },
    cardActions: { flexDirection: "row", gap: 8 },
    viewBtn: {
      flex: 1,
      backgroundColor: colors.primary,
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: "center",
    },
    viewBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
    deleteBtn: {
      flex: 1,
      backgroundColor: colors.error + "15",
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.error + "30",
    },
    deleteBtnText: { color: colors.error, fontSize: 13, fontWeight: "600" },
    emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80 },
    emptyIcon: { fontSize: 56, marginBottom: 16 },
    emptyTitle: { fontSize: 18, fontWeight: "700", color: colors.foreground, marginBottom: 8 },
    emptyText: { fontSize: 14, color: colors.muted, textAlign: "center", paddingHorizontal: 40 },
    // Modal
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "flex-end",
    },
    modalCard: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      padding: 28,
      paddingBottom: 48,
    },
    modalTitle: { fontSize: 20, fontWeight: "700", color: colors.foreground, marginBottom: 6 },
    modalSubtitle: { fontSize: 14, color: colors.muted, marginBottom: 24 },
    modalLabel: { fontSize: 13, fontWeight: "600", color: colors.muted, marginBottom: 6 },
    modalInput: {
      backgroundColor: colors.background,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      color: colors.foreground,
      marginBottom: 24,
    },
    modalButtons: { flexDirection: "row", gap: 12 },
    cancelBtn: {
      flex: 1,
      backgroundColor: colors.background,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    cancelBtnText: { color: colors.foreground, fontWeight: "600" },
    createBtn: {
      flex: 1,
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
    },
    createBtnText: { color: "#fff", fontWeight: "700" },
  });

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      {/* Fila superior: icono + nombre + meta */}
      <View style={styles.cardTop}>
        <View style={styles.cardIcon}>
          <Text style={styles.cardIconText}>🏢</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.cardName}>{item.name}</Text>
          <Text style={styles.cardMeta}>
            {item.leadCount ?? 0} lead{item.leadCount !== 1 ? "s" : ""} · {new Date(item.createdAt).toLocaleDateString("es-ES")}
          </Text>
        </View>
      </View>
      {/* Fila inferior: botones de acción */}
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.viewBtn}
          onPress={() => router.push(`/negocios/${item.id}` as any)}
        >
          <Text style={styles.viewBtnText}>📱 Ver QR</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewBtn, { backgroundColor: colors.success }]}
          onPress={() => setExportingId(item.id)}
          disabled={exportingId === item.id && exportQuery.isLoading}
        >
          {exportingId === item.id && exportQuery.isLoading
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.viewBtnText}>⬇ Excel</Text>
          }
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => handleDelete(item.id, item.name)}
        >
          <Text style={styles.deleteBtnText}>🗑️ Borrar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Negocios</Text>
          <Text style={styles.headerSubtitle}>
            {businesses?.length ?? 0} negocio{businesses?.length !== 1 ? "s" : ""} registrado{businesses?.length !== 1 ? "s" : ""}
          </Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={businesses ?? []}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 32 }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🏢</Text>
              <Text style={styles.emptyTitle}>Sin negocios aún</Text>
              <Text style={styles.emptyText}>
                Toca el botón "+" para crear el QR de un negocio y empezar a captar clientes
              </Text>
            </View>
          }
        />
      )}

      {/* Modal para crear negocio */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Nuevo negocio</Text>
            <Text style={styles.modalSubtitle}>
              Se generará un QR único con un formulario personalizado para este negocio
            </Text>
            <Text style={styles.modalLabel}>NOMBRE DEL NEGOCIO</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ej: Bar El Rincón, Peluquería Ana..."
              placeholderTextColor={colors.muted}
              value={businessName}
              onChangeText={setBusinessName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleCreate}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => { setShowModal(false); setBusinessName(""); }}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.createBtn, createMutation.isPending && { opacity: 0.7 }]}
                onPress={handleCreate}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.createBtnText}>Crear QR</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}
