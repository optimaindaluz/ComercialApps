import { useState } from "react";
import {
  ActivityIndicator,
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

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  new: { label: "Nuevo", color: "#16A34A", bg: "#DCFCE7" },
  contacted: { label: "Contactado", color: "#D97706", bg: "#FEF3C7" },
  in_progress: { label: "En proceso", color: "#1A56DB", bg: "#DBEAFE" },
  closed: { label: "Cerrado", color: "#64748B", bg: "#F1F5F9" },
};

export default function LeadsScreen() {
  const colors = useColors();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterBusinessId, setFilterBusinessId] = useState<number | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Polling automático cada 30 segundos
  const { data: leads, isLoading, refetch, isFetching } = trpc.leads.list.useQuery(undefined, {
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  // Negocios para el filtro
  const { data: businesses } = trpc.businesses.list.useQuery(undefined, {
    refetchInterval: 60000,
  });

  // Filtrar leads según búsqueda, estado y negocio
  const filtered = (leads ?? []).filter(lead => {
    const matchSearch = !search.trim() ||
      lead.fullName.toLowerCase().includes(search.toLowerCase()) ||
      lead.email.toLowerCase().includes(search.toLowerCase()) ||
      lead.phone.includes(search);
    const matchStatus = filterStatus === "all" || lead.status === filterStatus;
    const matchBusiness = filterBusinessId === null
      ? true
      : filterBusinessId === 0
        ? !lead.businessId
        : lead.businessId === filterBusinessId;
    return matchSearch && matchStatus && matchBusiness;
  });

  // Contar filtros activos
  const activeFilters = (filterStatus !== "all" ? 1 : 0) + (filterBusinessId !== null ? 1 : 0);

  // Exportar leads a CSV/Excel
  const handleExportCSV = async () => {
    if (!leads || leads.length === 0) {
      return;
    }

    const headers = ["Nombre", "Teléfono", "Email", "Estado", "Origen", "Negocio", "Fecha", "Archivos"];
    const rows = leads.map(l => [
      `"${l.fullName}"`,
      `"${l.phone}"`,
      `"${l.email}"`,
      `"${STATUS_LABELS[l.status]?.label ?? l.status}"`,
      `"${l.businessId ? "Negocio" : "Personal"}"`,
      `"${l.businessId ? (businesses?.find(b => b.id === l.businessId)?.name ?? "Negocio") : "QR Personal"}"`,
      `"${new Date(l.createdAt).toLocaleDateString("es-ES")}"`,
      `"${(l.files?.length ?? 0)} archivo(s)"`,
    ]);

    const csv = "\uFEFF" + [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");

    if (Platform.OS === "web") {
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `leads_${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      try {
        const fileName = `leads_${new Date().toISOString().split("T")[0]}.csv`;
        const fileUri = FileSystem.documentDirectory + fileName;
        await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(fileUri, {
            mimeType: "text/csv",
            dialogTitle: "Exportar leads",
            UTI: "public.comma-separated-values-text",
          });
        }
      } catch (e) {
        console.warn("Error exportando CSV:", e);
      }
    }
  };

  const styles = StyleSheet.create({
    header: {
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 12,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 4,
    },
    headerTitle: { fontSize: 26, fontWeight: "800", color: colors.foreground },
    exportBtn: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.success + "15",
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
      gap: 4,
    },
    exportBtnText: { color: colors.success, fontWeight: "700", fontSize: 13 },
    headerSubtitle: { fontSize: 13, color: colors.muted },
    searchBar: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      marginHorizontal: 20,
      marginBottom: 10,
    },
    searchIcon: { fontSize: 16, marginRight: 8, color: colors.muted },
    searchInput: { flex: 1, paddingVertical: 12, fontSize: 15, color: colors.foreground },
    filterRow: {
      flexDirection: "row",
      paddingHorizontal: 20,
      marginBottom: 16,
      alignItems: "center",
      gap: 8,
    },
    filterBtn: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 6,
    },
    filterBtnActive: {
      backgroundColor: colors.primary + "20",
      borderColor: colors.primary,
    },
    filterBtnText: { fontSize: 14, color: colors.muted, fontWeight: "600" },
    filterBtnTextActive: { color: colors.primary },
    filterBadge: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      minWidth: 18,
      height: 18,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 4,
    },
    filterBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
    activeFilterTag: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.primary + "15",
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 5,
      gap: 4,
    },
    activeFilterTagText: { fontSize: 12, color: colors.primary, fontWeight: "600" },
    card: {
      backgroundColor: colors.surface,
      marginHorizontal: 20,
      marginBottom: 10,
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
    cardName: { fontSize: 16, fontWeight: "700", color: colors.foreground, flex: 1, marginRight: 8 },
    statusBadge: {
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    statusText: { fontSize: 12, fontWeight: "700" },
    cardEmail: { fontSize: 13, color: colors.muted, marginTop: 4 },
    cardPhone: { fontSize: 13, color: colors.muted },
    cardFooter: { flexDirection: "row", alignItems: "center", marginTop: 10, gap: 8 },
    cardTag: {
      backgroundColor: colors.background,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    cardTagText: { fontSize: 11, color: colors.muted, fontWeight: "500" },
    cardDate: { fontSize: 11, color: colors.muted, marginLeft: "auto" },
    emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80 },
    emptyIcon: { fontSize: 56, marginBottom: 16 },
    emptyTitle: { fontSize: 18, fontWeight: "700", color: colors.foreground, marginBottom: 8 },
    emptyText: { fontSize: 14, color: colors.muted, textAlign: "center", paddingHorizontal: 40 },
    // Modal de filtros
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
    modalCard: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 24,
      paddingBottom: 40,
    },
    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 20,
    },
    modalTitle: { fontSize: 18, fontWeight: "800", color: colors.foreground },
    modalClose: { fontSize: 16, color: colors.muted },
    filterSection: { marginBottom: 20 },
    filterSectionTitle: { fontSize: 12, fontWeight: "700", color: colors.muted, letterSpacing: 0.5, marginBottom: 10 },
    filterOptions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    filterOption: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    filterOptionActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    filterOptionText: { fontSize: 13, color: colors.muted, fontWeight: "500" },
    filterOptionTextActive: { color: "#fff", fontWeight: "700" },
    clearBtn: {
      backgroundColor: colors.error + "15",
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: "center",
      marginTop: 8,
      borderWidth: 1,
      borderColor: colors.error + "30",
    },
    clearBtnText: { color: colors.error, fontWeight: "700", fontSize: 14 },
    applyBtn: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
      marginTop: 8,
    },
    applyBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  });

  const renderItem = ({ item }: { item: any }) => {
    const status = STATUS_LABELS[item.status] ?? STATUS_LABELS.new;
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/leads/${item.id}` as any)}
      >
        <View style={styles.cardRow}>
          <Text style={styles.cardName} numberOfLines={1}>{item.fullName}</Text>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>
        <Text style={styles.cardEmail}>{item.email}</Text>
        <Text style={styles.cardPhone}>{item.phone}</Text>
        <View style={styles.cardFooter}>
          <View style={styles.cardTag}>
            <Text style={styles.cardTagText}>
              {item.businessId
                ? `🏢 ${businesses?.find(b => b.id === item.businessId)?.name ?? "Negocio"}`
                : "👤 Personal"}
            </Text>
          </View>
          {item.files?.length > 0 && (
            <View style={styles.cardTag}>
              <Text style={styles.cardTagText}>📎 {item.files.length} archivo{item.files.length !== 1 ? "s" : ""}</Text>
            </View>
          )}
          <Text style={styles.cardDate}>
            {new Date(item.createdAt).toLocaleDateString("es-ES")}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Etiqueta del filtro de negocio activo
  const activeBusinessName = filterBusinessId === 0
    ? "Personal"
    : businesses?.find(b => b.id === filterBusinessId)?.name ?? null;

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Leads</Text>
          <TouchableOpacity style={styles.exportBtn} onPress={handleExportCSV}>
            <Text style={styles.exportBtnText}>⬇ Excel</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.headerSubtitle}>
          {filtered.length} de {leads?.length ?? 0} clientes
          {isFetching && !isLoading ? " · actualizando..." : ""}
        </Text>
      </View>

      {/* Buscador */}
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nombre, email o teléfono..."
          placeholderTextColor={colors.muted}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
      </View>

      {/* Fila de filtros */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterBtn, activeFilters > 0 && styles.filterBtnActive]}
          onPress={() => setShowFilterModal(true)}
        >
          <Text style={[styles.filterBtnText, activeFilters > 0 && styles.filterBtnTextActive]}>
            ⚙ Filtros
          </Text>
          {activeFilters > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilters}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Tags de filtros activos */}
        {filterStatus !== "all" && (
          <TouchableOpacity
            style={styles.activeFilterTag}
            onPress={() => setFilterStatus("all")}
          >
            <Text style={styles.activeFilterTagText}>
              {STATUS_LABELS[filterStatus]?.label} ✕
            </Text>
          </TouchableOpacity>
        )}
        {filterBusinessId !== null && (
          <TouchableOpacity
            style={styles.activeFilterTag}
            onPress={() => setFilterBusinessId(null)}
          >
            <Text style={styles.activeFilterTagText}>
              {activeBusinessName} ✕
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 32 }}
          onRefresh={refetch}
          refreshing={isFetching && !isLoading}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyTitle}>
                {search || filterStatus !== "all" || filterBusinessId !== null ? "Sin resultados" : "Sin leads aún"}
              </Text>
              <Text style={styles.emptyText}>
                {search || filterStatus !== "all" || filterBusinessId !== null
                  ? "Prueba con otros filtros de búsqueda"
                  : "Comparte tu QR para empezar a captar clientes"
                }
              </Text>
            </View>
          }
        />
      )}

      {/* Modal de filtros */}
      <Modal
        visible={showFilterModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowFilterModal(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Filtros</Text>
                <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                  <Text style={styles.modalClose}>✕ Cerrar</Text>
                </TouchableOpacity>
              </View>

              {/* Filtro por estado */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>ESTADO</Text>
                <View style={styles.filterOptions}>
                  {[
                    { key: "all", label: "Todos" },
                    { key: "new", label: "Nuevo" },
                    { key: "contacted", label: "Contactado" },
                    { key: "in_progress", label: "En proceso" },
                    { key: "closed", label: "Cerrado" },
                  ].map(f => (
                    <TouchableOpacity
                      key={f.key}
                      style={[styles.filterOption, filterStatus === f.key && styles.filterOptionActive]}
                      onPress={() => setFilterStatus(f.key)}
                    >
                      <Text style={[styles.filterOptionText, filterStatus === f.key && styles.filterOptionTextActive]}>
                        {f.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Filtro por negocio */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>NEGOCIO / ORIGEN</Text>
                <View style={styles.filterOptions}>
                  <TouchableOpacity
                    style={[styles.filterOption, filterBusinessId === null && styles.filterOptionActive]}
                    onPress={() => setFilterBusinessId(null)}
                  >
                    <Text style={[styles.filterOptionText, filterBusinessId === null && styles.filterOptionTextActive]}>
                      Todos
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.filterOption, filterBusinessId === 0 && styles.filterOptionActive]}
                    onPress={() => setFilterBusinessId(0)}
                  >
                    <Text style={[styles.filterOptionText, filterBusinessId === 0 && styles.filterOptionTextActive]}>
                      👤 Personal
                    </Text>
                  </TouchableOpacity>
                  {(businesses ?? []).map(b => (
                    <TouchableOpacity
                      key={b.id}
                      style={[styles.filterOption, filterBusinessId === b.id && styles.filterOptionActive]}
                      onPress={() => setFilterBusinessId(b.id)}
                    >
                      <Text style={[styles.filterOptionText, filterBusinessId === b.id && styles.filterOptionTextActive]}>
                        🏢 {b.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Botón limpiar */}
              {activeFilters > 0 && (
                <TouchableOpacity
                  style={styles.clearBtn}
                  onPress={() => { setFilterStatus("all"); setFilterBusinessId(null); }}
                >
                  <Text style={styles.clearBtnText}>Limpiar filtros</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.applyBtn}
                onPress={() => setShowFilterModal(false)}
              >
                <Text style={styles.applyBtnText}>Aplicar</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </ScreenContainer>
  );
}
