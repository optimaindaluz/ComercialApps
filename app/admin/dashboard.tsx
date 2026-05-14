import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  FlatList,
  TextInput,
  Modal,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { useAdminAuth } from "@/lib/admin-auth";
import { useColors } from "@/hooks/use-colors";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

const STATUS_LABELS: Record<string, string> = {
  new: "Nuevo",
  contacted: "Contactado",
  in_progress: "En proceso",
  closed: "Cerrado",
};
const STATUS_COLORS: Record<string, string> = {
  new: "#3B82F6",
  contacted: "#F59E0B",
  in_progress: "#8B5CF6",
  closed: "#10B981",
};
const ACCOUNT_STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: "Activo", color: "#059669", bg: "#D1FAE5" },
  pending: { label: "Pendiente", color: "#D97706", bg: "#FEF3C7" },
  blocked: { label: "Bloqueado", color: "#DC2626", bg: "#FEE2E2" },
};

type ActiveTab = "overview" | "commercials" | "leads" | "users";

export default function AdminDashboardScreen() {
  const router = useRouter();
  const colors = useColors();
  const { admin, clearAdminSession } = useAdminAuth();

  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCommercial, setFilterCommercial] = useState("all");
  const [filterDate, setFilterDate] = useState<"all" | "today" | "week" | "month">("all");
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Modal: cambio de contraseña admin
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");

  // Modal: crear comercial
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // Exportación global CSV
  const [exportingAll, setExportingAll] = useState(false);

  // Modal: código de recuperación generado por el admin
  const [showPasswordResetCode, setShowPasswordResetCode] = useState(false);
  const [generatedResetCode, setGeneratedResetCode] = useState<string | null>(null);
  const [resetCodeForUser, setResetCodeForUser] = useState<string>(""); // nombre del usuario

  const dashboardQuery = trpc.admin.dashboard.useQuery(undefined, { refetchInterval: 30000 });
  const allLeadsQuery = trpc.admin.allLeads.useQuery(undefined, { enabled: activeTab === "leads" });
  const pendingUsersQuery = trpc.admin.getPendingUsers.useQuery(undefined, {
    enabled: activeTab === "users",
    refetchInterval: 15000,
  });
  const allUsersQuery = trpc.admin.getAllUsers.useQuery(undefined, { enabled: activeTab === "users" });
  // Solicitudes de reset de contraseña pendientes
  const pendingPasswordResetsQuery = trpc.admin.getPendingPasswordResets.useQuery(undefined, {
    enabled: activeTab === "users",
    refetchInterval: 20000,
  });

  const exportAllQuery = trpc.admin.exportAllLeads.useQuery(undefined, {
    enabled: exportingAll,
    staleTime: 0,
    gcTime: 0,
  });

  // Mutations
  const deleteLeadMutation = trpc.admin.deleteLead.useMutation({
    onSuccess: () => { allLeadsQuery.refetch(); dashboardQuery.refetch(); },
  });
  const deleteCommercialMutation = trpc.admin.deleteCommercial.useMutation({
    onSuccess: () => {
      dashboardQuery.refetch();
      allUsersQuery.refetch();
      pendingUsersQuery.refetch();
      Alert.alert("✅ Eliminado", "El comercial y todos sus datos han sido eliminados.");
    },
    onError: (err) => Alert.alert("Error al eliminar", err.message),
  });
  const approveUserMutation = trpc.admin.approveUser.useMutation({
    onSuccess: () => { pendingUsersQuery.refetch(); allUsersQuery.refetch(); dashboardQuery.refetch(); },
    onError: (err) => Alert.alert("Error", err.message),
  });
  const denyUserMutation = trpc.admin.denyUser.useMutation({
    onSuccess: () => { pendingUsersQuery.refetch(); allUsersQuery.refetch(); },
    onError: (err) => Alert.alert("Error", err.message),
  });
  const blockUserMutation = trpc.admin.blockUser.useMutation({
    onSuccess: () => { allUsersQuery.refetch(); dashboardQuery.refetch(); },
    onError: (err) => Alert.alert("Error", err.message),
  });
  const unblockUserMutation = trpc.admin.unblockUser.useMutation({
    onSuccess: () => { allUsersQuery.refetch(); dashboardQuery.refetch(); },
    onError: (err) => Alert.alert("Error", err.message),
  });
  const createUserMutation = trpc.admin.createCommercial.useMutation({
    onSuccess: () => {
      setShowCreateUser(false);
      setNewUsername(""); setNewFullName(""); setNewEmail(""); setNewPassword("");
      allUsersQuery.refetch(); dashboardQuery.refetch();
      Alert.alert("✅ Comercial creado", "El nuevo comercial ya puede iniciar sesión.");
    },
    onError: (err) => Alert.alert("Error", err.message),
  });
  // Mutation: el admin genera el código de reset para un comercial
  const generatePasswordResetCodeMutation = trpc.admin.generatePasswordResetCode.useMutation({
    onSuccess: (data, variables) => {
      setGeneratedResetCode(data.code);
      setShowPasswordResetCode(true);
      pendingPasswordResetsQuery.refetch();
    },
    onError: (err) => Alert.alert("Error", err.message),
  });

  const changeAdminPwdMutation = trpc.admin.changePassword.useMutation({
    onSuccess: () => {
      setShowChangePwd(false);
      setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
      Alert.alert("✅ Contraseña cambiada", "Tu contraseña de administrador ha sido actualizada.");
    },
    onError: (err) => Alert.alert("Error", err.message),
  });

  // Exportación global: cuando llegan los datos, generar Excel (CSV)
  useEffect(() => {
    if (!exportingAll || !exportAllQuery.data) return;
    setExportingAll(false);
    const data = exportAllQuery.data;
    if (data.length === 0) {
      Alert.alert("Sin datos", "No hay leads para exportar");
      return;
    }
    const headers = ["ID", "Nombre", "Teléfono", "Email", "Estado", "Comercial", "Negocio", "Notas", "Privacidad", "Marketing", "Fecha"];
    const rows = data.map((l: any) => [
      l.id, `"${l.nombre}"`, `"${l.telefono}"`, `"${l.email}"`,
      `"${l.estado}"`, `"${l.comercial}"`, `"${l.negocio ?? ""}"`,
      `"${(l.notas ?? "").replace(/"/g, "'")}"`,
      `"${l.privacidad}"`, `"${l.marketing}"`, `"${l.fecha}"`
    ]);
    const csv = "\uFEFF" + [headers.join(";"), ...rows.map((r: any[]) => r.join(";"))].join("\n");
    const fileName = `todos_los_leads_${new Date().toISOString().split("T")[0]}.csv`;
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
              dialogTitle: "Exportar todos los leads",
              UTI: "public.comma-separated-values-text",
            });
          }
        } catch (e) {
          Alert.alert("Error", "No se pudo exportar el archivo.");
        }
      })();
    }
  }, [exportAllQuery.data, exportingAll]);

  const handleLogout = async () => {
    await clearAdminSession();
    router.replace("/login" as never);
  };

  const handleDeleteLead = (id: number, name: string) => {
    Alert.alert("Eliminar lead", `¿Eliminar a "${name}"?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: () => deleteLeadMutation.mutate({ id }) },
    ]);
  };

  const handleDeleteCommercial = (id: number, name: string) => {
    if (Platform.OS === "web") {
      if (window.confirm(`¿Eliminar a "${name}" y todos sus datos? Esta acción no se puede deshacer.`)) {
        deleteCommercialMutation.mutate({ id });
      }
    } else {
      Alert.alert("Eliminar comercial", `¿Eliminar a "${name}" y todos sus datos?`, [
        { text: "Cancelar", style: "cancel" },
        { text: "Eliminar", style: "destructive", onPress: () => deleteCommercialMutation.mutate({ id }) },
      ]);
    }
  };

    const handleApprove = (id: number, name: string) => {
    if (Platform.OS === "web") {
      if (window.confirm(`¿Aprobar la cuenta de "${name}"?`)) approveUserMutation.mutate({ id });
    } else {
      Alert.alert("Aprobar usuario", `¿Aprobar la cuenta de "${name}"?`, [
        { text: "Cancelar", style: "cancel" },
        { text: "Aprobar", onPress: () => approveUserMutation.mutate({ id }) },
      ]);
    }
  };
  const handleDeny = (id: number, name: string) => {
    if (Platform.OS === "web") {
      if (window.confirm(`¿Denegar y eliminar la solicitud de "${name}"? Esta acción no se puede deshacer.`)) denyUserMutation.mutate({ id });
    } else {
      Alert.alert("Denegar usuario", `¿Denegar y eliminar la solicitud de "${name}"?`, [
        { text: "Cancelar", style: "cancel" },
        { text: "Denegar", style: "destructive", onPress: () => denyUserMutation.mutate({ id }) },
      ]);
    }
  };
  const handleBlockToggle = (id: number, name: string, isBlocked: boolean) => {
    if (Platform.OS === "web") {
      if (isBlocked) {
        if (window.confirm(`¿Desbloquear a "${name}"?`)) unblockUserMutation.mutate({ id });
      } else {
        if (window.confirm(`¿Bloquear a "${name}"? No podrá iniciar sesión.`)) blockUserMutation.mutate({ id });
      }
    } else {
      if (isBlocked) {
        Alert.alert("Desbloquear", `¿Desbloquear a "${name}"?`, [
          { text: "Cancelar", style: "cancel" },
          { text: "Desbloquear", onPress: () => unblockUserMutation.mutate({ id }) },
        ]);
      } else {
        Alert.alert("Bloquear temporalmente", `¿Bloquear a "${name}"? No podrá iniciar sesión.`, [
          { text: "Cancelar", style: "cancel" },
          { text: "Bloquear", style: "destructive", onPress: () => blockUserMutation.mutate({ id }) },
        ]);
      }
    }
  };

  const handleChangeAdminPwd = () => {
    if (!currentPwd || !newPwd || !confirmPwd) {
      Alert.alert("Error", "Rellena todos los campos");
      return;
    }
    if (newPwd !== confirmPwd) {
      Alert.alert("Error", "Las contraseñas no coinciden");
      return;
    }
    const pwdRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{9,}$/;
    if (!pwdRegex.test(newPwd)) {
      Alert.alert("Contraseña débil", "Mínimo 9 caracteres, una mayúscula y un carácter especial");
      return;
    }
    changeAdminPwdMutation.mutate({ currentPassword: currentPwd, newPassword: newPwd });
  };

  const handleCreateUser = () => {
    if (!newUsername.trim() || !newFullName.trim() || !newEmail.trim() || !newPassword.trim()) {
      Alert.alert("Error", "Rellena todos los campos");
      return;
    }
    const pwdRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{9,}$/;
    if (!pwdRegex.test(newPassword)) {
      Alert.alert("Contraseña débil", "Mínimo 9 caracteres, una mayúscula y un carácter especial");
      return;
    }
    createUserMutation.mutate({
      username: newUsername.trim(),
      fullName: newFullName.trim(),
      email: newEmail.trim(),
      password: newPassword,
    });
  };

  // Filtros avanzados para leads
  const filteredLeads = (allLeadsQuery.data ?? []).filter(l => {
    const matchSearch = !searchQuery.trim() ||
      l.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.commercialName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = filterStatus === "all" || l.status === filterStatus;
    const matchCommercial = filterCommercial === "all" || String(l.commercialId) === filterCommercial;
    const matchDate = (() => {
      if (filterDate === "all") return true;
      const d = new Date(l.createdAt);
      const now = new Date();
      if (filterDate === "today") return d.toDateString() === now.toDateString();
      if (filterDate === "week") {
        const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);
        return d >= weekAgo;
      }
      if (filterDate === "month") {
        const monthAgo = new Date(now); monthAgo.setMonth(now.getMonth() - 1);
        return d >= monthAgo;
      }
      return true;
    })();
    return matchSearch && matchStatus && matchCommercial && matchDate;
  });

  const filteredCommercials = (dashboardQuery.data?.commercials ?? []).filter(c =>
    c.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingCount = pendingUsersQuery.data?.length ?? 0;

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: "#7C3AED" }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Panel Admin</Text>
          <Text style={styles.headerSubtitle}>Bienvenido, {admin?.fullName}</Text>
        </View>
        <TouchableOpacity
          style={[styles.headerBtn, { marginRight: 8 }]}
          onPress={() => setShowChangePwd(true)}
        >
          <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>🔒 Pwd</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.headerBtn, { backgroundColor: "#10B981", marginRight: 8 }]}
          onPress={() => setExportingAll(true)}
          disabled={exportingAll && exportAllQuery.isLoading}
        >
          {exportingAll && exportAllQuery.isLoading
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>⬇ CSV</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerBtn} onPress={handleLogout}>
          <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>Salir</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={[styles.tabBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {(["overview", "commercials", "leads", "users"] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && { borderBottomColor: "#7C3AED", borderBottomWidth: 2 }]}
            onPress={() => { setActiveTab(tab); setSearchQuery(""); setFilterStatus("all"); setFilterCommercial("all"); setFilterDate("all"); setShowFilterModal(false); }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Text style={[styles.tabText, { color: activeTab === tab ? "#7C3AED" : colors.muted }]}>
                {tab === "overview" ? "Resumen" : tab === "commercials" ? "Comerciales" : tab === "leads" ? "Leads" : "Usuarios"}
              </Text>
              {tab === "users" && pendingCount > 0 && (
                <View style={{ backgroundColor: "#EF4444", borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 }}>
                  <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>{pendingCount}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── RESUMEN ── */}
      {activeTab === "overview" && (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {dashboardQuery.isLoading ? (
            <ActivityIndicator color="#7C3AED" style={{ marginTop: 40 }} />
          ) : (
            <>
              <View style={styles.statsGrid}>
                <View style={[styles.statCard, { backgroundColor: "#EDE9FE" }]}>
                  <Text style={[styles.statNumber, { color: "#7C3AED" }]}>{dashboardQuery.data?.totalCommercials ?? 0}</Text>
                  <Text style={[styles.statLabel, { color: "#7C3AED" }]}>Comerciales</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: "#DBEAFE" }]}>
                  <Text style={[styles.statNumber, { color: "#1D4ED8" }]}>{dashboardQuery.data?.totalLeads ?? 0}</Text>
                  <Text style={[styles.statLabel, { color: "#1D4ED8" }]}>Leads totales</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: "#FEF3C7" }]}>
                  <Text style={[styles.statNumber, { color: "#D97706" }]}>{dashboardQuery.data?.newLeads ?? 0}</Text>
                  <Text style={[styles.statLabel, { color: "#D97706" }]}>Nuevos</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: "#D1FAE5" }]}>
                  <Text style={[styles.statNumber, { color: "#059669" }]}>{dashboardQuery.data?.totalBusinesses ?? 0}</Text>
                  <Text style={[styles.statLabel, { color: "#059669" }]}>Negocios</Text>
                </View>
              </View>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Rendimiento por comercial</Text>
              {(dashboardQuery.data?.commercials ?? []).map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.commercialCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => router.push(`/admin/commercial/${c.id}` as never)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.commercialName, { color: colors.foreground }]}>{c.fullName}</Text>
                    <Text style={[styles.commercialUsername, { color: colors.muted }]}>@{c.username}</Text>
                    <View style={styles.statsRow}>
                      <Text style={{ color: "#3B82F6", fontSize: 12, marginRight: 12 }}>📋 {c.totalLeads} leads</Text>
                      <Text style={{ color: "#10B981", fontSize: 12, marginRight: 12 }}>✅ {c.closedLeads} cerrados</Text>
                      <Text style={{ color: "#8B5CF6", fontSize: 12 }}>🏢 {c.totalBusinesses} negocios</Text>
                    </View>
                  </View>
                  <Text style={{ color: colors.muted, fontSize: 20 }}>›</Text>
                </TouchableOpacity>
              ))}
            </>
          )}
        </ScrollView>
      )}

      {/* ── COMERCIALES ── */}
      {activeTab === "commercials" && (
        <>
          <View style={[styles.searchBar, { backgroundColor: colors.surface }]}>
            <TextInput
              style={[styles.searchInput, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]}
              placeholder="Buscar comercial..."
              placeholderTextColor={colors.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <FlatList
            data={filteredCommercials}
            keyExtractor={item => String(item.id)}
            contentContainerStyle={{ padding: 16 }}
            ListEmptyComponent={
              <Text style={{ color: colors.muted, textAlign: "center", marginTop: 40 }}>
                {dashboardQuery.isLoading ? "Cargando..." : "No hay comerciales"}
              </Text>
            }
            renderItem={({ item }) => (
              <View style={[styles.commercialCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.commercialName, { color: colors.foreground }]}>{item.fullName}</Text>
                  <Text style={[styles.commercialUsername, { color: colors.muted }]}>@{item.username} · {item.email}</Text>
                  <View style={styles.statsRow}>
                    <Text style={{ color: "#3B82F6", fontSize: 12, marginRight: 12 }}>📋 {item.totalLeads} leads</Text>
                    <Text style={{ color: "#8B5CF6", fontSize: 12 }}>🏢 {item.totalBusinesses} negocios</Text>
                  </View>
                </View>
                <View style={{ flexDirection: "column", gap: 8 }}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: "#7C3AED" }]}
                    onPress={() => router.push(`/admin/commercial/${item.id}` as never)}
                  >
                    <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>Ver</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: "#EF4444" }]}
                    onPress={() => handleDeleteCommercial(item.id, item.fullName)}
                  >
                    <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>Borrar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        </>
      )}

      {/* ── LEADS (filtros desplegables) ── */}
      {activeTab === "leads" && (() => {
        const hasFilters = filterStatus !== "all" || filterDate !== "all" || filterCommercial !== "all";
        const activeFilterCount = [filterStatus !== "all", filterDate !== "all", filterCommercial !== "all"].filter(Boolean).length;
        const displayedLeads = hasFilters ? filteredLeads : filteredLeads.slice(0, 10);
        const STATUS_FILTER_LABELS: Record<string, string> = {
          new: "Nuevo", contacted: "Contactado", in_progress: "En proceso", closed: "Cerrado",
        };
        const DATE_FILTER_LABELS: Record<string, string> = {
          today: "Hoy", week: "Esta semana", month: "Este mes",
        };
        return (
          <>
            {/* Barra de filtros */}
            <View style={{ paddingHorizontal: 16, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8 },
                  activeFilterCount > 0 && { backgroundColor: "#7C3AED", borderColor: "#7C3AED" },
                ]}
                onPress={() => setShowFilterModal(true)}
              >
                <Text style={{ fontSize: 14 }}>⚙️</Text>
                <Text style={{ fontSize: 13, fontWeight: "700", color: activeFilterCount > 0 ? "#fff" : colors.foreground }}>
                  Filtros{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
                </Text>
              </TouchableOpacity>
              {/* Tags de filtros activos */}
              {filterStatus !== "all" && (
                <TouchableOpacity
                  style={[styles.filterChip, { backgroundColor: "#7C3AED20", borderColor: "#7C3AED", flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6 }]}
                  onPress={() => setFilterStatus("all")}
                >
                  <Text style={{ fontSize: 12, color: "#7C3AED", fontWeight: "600" }}>{STATUS_FILTER_LABELS[filterStatus]}</Text>
                  <Text style={{ fontSize: 12, color: "#7C3AED", fontWeight: "700" }}>×</Text>
                </TouchableOpacity>
              )}
              {filterDate !== "all" && (
                <TouchableOpacity
                  style={[styles.filterChip, { backgroundColor: "#05966920", borderColor: "#059669", flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6 }]}
                  onPress={() => setFilterDate("all")}
                >
                  <Text style={{ fontSize: 12, color: "#059669", fontWeight: "600" }}>{DATE_FILTER_LABELS[filterDate]}</Text>
                  <Text style={{ fontSize: 12, color: "#059669", fontWeight: "700" }}>×</Text>
                </TouchableOpacity>
              )}
              {filterCommercial !== "all" && (
                <TouchableOpacity
                  style={[styles.filterChip, { backgroundColor: "#1D4ED820", borderColor: "#1D4ED8", flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6 }]}
                  onPress={() => setFilterCommercial("all")}
                >
                  <Text style={{ fontSize: 12, color: "#1D4ED8", fontWeight: "600" }} numberOfLines={1}>
                    {(dashboardQuery.data?.commercials ?? []).find(c => String(c.id) === filterCommercial)?.fullName ?? "Comercial"}
                  </Text>
                  <Text style={{ fontSize: 12, color: "#1D4ED8", fontWeight: "700" }}>×</Text>
                </TouchableOpacity>
              )}
            </View>

            <Text style={{ color: colors.muted, fontSize: 12, paddingHorizontal: 16, marginBottom: 6 }}>
              {hasFilters
                ? `${filteredLeads.length} resultado${filteredLeads.length !== 1 ? "s" : ""}`
                : `Últimos ${Math.min(filteredLeads.length, 10)} de ${filteredLeads.length} leads`
              }
            </Text>

            {allLeadsQuery.isLoading ? (
              <ActivityIndicator color="#7C3AED" style={{ marginTop: 40 }} />
            ) : (
              <FlatList
                data={displayedLeads}
                keyExtractor={item => String(item.id)}
                contentContainerStyle={{ padding: 16 }}
                ListEmptyComponent={
                  <Text style={{ color: colors.muted, textAlign: "center", marginTop: 40 }}>No hay leads con estos filtros</Text>
                }
                renderItem={({ item }) => (
                  <View style={[styles.leadCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <Text style={[styles.leadName, { color: colors.foreground }]}>{item.fullName}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] + "20" }]}>
                          <Text style={{ color: STATUS_COLORS[item.status], fontSize: 11, fontWeight: "600" }}>
                            {STATUS_LABELS[item.status]}
                          </Text>
                        </View>
                      </View>
                      <Text style={{ color: colors.muted, fontSize: 12 }}>{item.phone} · {item.email}</Text>
                      <Text style={{ color: "#7C3AED", fontSize: 12, marginTop: 2 }}>
                        {item.commercialName}{item.businessName ? ` · ${item.businessName}` : ""}
                      </Text>
                      <Text style={{ color: colors.muted, fontSize: 11, marginTop: 2 }}>
                        {new Date(item.createdAt).toLocaleDateString("es-ES")}
                      </Text>
                    </View>
                    <View style={{ flexDirection: "column", gap: 8 }}>
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: "#7C3AED" }]}
                        onPress={() => router.push(`/admin/lead/${item.id}` as never)}
                      >
                        <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>Editar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: "#EF4444" }]}
                        onPress={() => handleDeleteLead(item.id, item.fullName)}
                      >
                        <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>Borrar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              />
            )}

            {/* Modal de filtros */}
            <Modal visible={showFilterModal} transparent animationType="slide" onRequestClose={() => setShowFilterModal(false)}>
              <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowFilterModal(false)}>
                <TouchableOpacity activeOpacity={1} style={[styles.modalCard, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.modalTitle, { color: colors.foreground }]}>Filtrar leads</Text>

                  {/* Estado */}
                  <Text style={{ fontSize: 11, fontWeight: "700", color: colors.muted, letterSpacing: 0.5, marginBottom: 8 }}>ESTADO</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
                    {[
                      { key: "all", label: "Todos" },
                      { key: "new", label: "Nuevo" },
                      { key: "contacted", label: "Contactado" },
                      { key: "in_progress", label: "En proceso" },
                      { key: "closed", label: "Cerrado" },
                    ].map(f => (
                      <TouchableOpacity
                        key={f.key}
                        style={[styles.filterChip, filterStatus === f.key && { backgroundColor: "#7C3AED", borderColor: "#7C3AED" }]}
                        onPress={() => setFilterStatus(f.key)}
                      >
                        <Text style={{ fontSize: 13, color: filterStatus === f.key ? "#fff" : colors.foreground, fontWeight: "600" }}>
                          {f.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Fecha */}
                  <Text style={{ fontSize: 11, fontWeight: "700", color: colors.muted, letterSpacing: 0.5, marginBottom: 8 }}>FECHA</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
                    {[
                      { key: "all", label: "Cualquier fecha" },
                      { key: "today", label: "Hoy" },
                      { key: "week", label: "Esta semana" },
                      { key: "month", label: "Este mes" },
                    ].map(f => (
                      <TouchableOpacity
                        key={f.key}
                        style={[styles.filterChip, filterDate === f.key && { backgroundColor: "#059669", borderColor: "#059669" }]}
                        onPress={() => setFilterDate(f.key as any)}
                      >
                        <Text style={{ fontSize: 13, color: filterDate === f.key ? "#fff" : colors.foreground, fontWeight: "600" }}>
                          {f.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Comercial */}
                  <Text style={{ fontSize: 11, fontWeight: "700", color: colors.muted, letterSpacing: 0.5, marginBottom: 8 }}>COMERCIAL</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
                    <TouchableOpacity
                      style={[styles.filterChip, filterCommercial === "all" && { backgroundColor: "#1D4ED8", borderColor: "#1D4ED8" }]}
                      onPress={() => setFilterCommercial("all")}
                    >
                      <Text style={{ fontSize: 13, color: filterCommercial === "all" ? "#fff" : colors.foreground, fontWeight: "600" }}>Todos</Text>
                    </TouchableOpacity>
                    {(dashboardQuery.data?.commercials ?? []).map(c => (
                      <TouchableOpacity
                        key={c.id}
                        style={[styles.filterChip, filterCommercial === String(c.id) && { backgroundColor: "#1D4ED8", borderColor: "#1D4ED8" }]}
                        onPress={() => setFilterCommercial(String(c.id))}
                      >
                        <Text style={{ fontSize: 13, color: filterCommercial === String(c.id) ? "#fff" : colors.foreground, fontWeight: "600" }}>
                          {c.fullName}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Botones */}
                  <View style={{ flexDirection: "row", gap: 12 }}>
                    <TouchableOpacity
                      style={[styles.secondaryBtn, { flex: 1, borderColor: colors.border }]}
                      onPress={() => { setFilterStatus("all"); setFilterDate("all"); setFilterCommercial("all"); }}
                    >
                      <Text style={{ color: colors.muted, fontWeight: "600", fontSize: 15 }}>Limpiar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.primaryBtn, { flex: 1, backgroundColor: "#7C3AED" }]}
                      onPress={() => setShowFilterModal(false)}
                    >
                      <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>Aplicar</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              </TouchableOpacity>
            </Modal>
          </>
        );
      })()}

      {/* ── GESTIÓN DE USUARIOS ── */}
      {activeTab === "users" && (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {/* Botón crear usuario */}
          <TouchableOpacity
            style={[styles.createUserBtn, { backgroundColor: "#7C3AED" }]}
            onPress={() => setShowCreateUser(true)}
          >
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>+ Crear nuevo comercial</Text>
          </TouchableOpacity>

          {/* Solicitudes de reset de contraseña */}
          {(pendingPasswordResetsQuery.data ?? []).length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: "#7C3AED", marginTop: 16 }]}>
                🔐 Solicitudes de contraseña ({pendingPasswordResetsQuery.data!.length})
              </Text>
              {(pendingPasswordResetsQuery.data ?? []).map((req) => (
                <View key={req.tokenId} style={[styles.userCard, { backgroundColor: "#F5F3FF", borderColor: "#DDD6FE" }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.commercialName, { color: "#5B21B6" }]}>{req.fullName}</Text>
                    <Text style={{ color: "#7C3AED", fontSize: 12 }}>@{req.username} · {req.email}</Text>
                    <Text style={{ color: "#8B5CF6", fontSize: 11, marginTop: 2 }}>
                      Solicitado: {new Date(req.requestedAt).toLocaleDateString("es-ES")}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: "#7C3AED", paddingHorizontal: 10 }]}
                    onPress={() => {
                      setResetCodeForUser(req.fullName);
                      generatePasswordResetCodeMutation.mutate({ tokenId: req.tokenId });
                    }}
                    disabled={generatePasswordResetCodeMutation.isPending}
                  >
                    {generatePasswordResetCodeMutation.isPending ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={{ color: "#fff", fontSize: 11, fontWeight: "600" }}>🔑 Generar código</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ))}
            </>
          )}

          {/* Solicitudes pendientes */}
          {pendingUsersQuery.isLoading ? (
            <ActivityIndicator color="#7C3AED" style={{ marginTop: 20 }} />
          ) : (pendingUsersQuery.data ?? []).length > 0 ? (
            <>
              <Text style={[styles.sectionTitle, { color: "#D97706", marginTop: 16 }]}>
                ⏳ Solicitudes pendientes ({pendingUsersQuery.data!.length})
              </Text>
              {(pendingUsersQuery.data ?? []).map(u => (
                <View key={u.id} style={[styles.userCard, { backgroundColor: "#FEF3C7", borderColor: "#FCD34D" }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.commercialName, { color: "#92400E" }]}>{u.fullName}</Text>
                    <Text style={{ color: "#B45309", fontSize: 12 }}>@{u.username} · {u.email}</Text>
                    <Text style={{ color: "#B45309", fontSize: 11, marginTop: 2 }}>
                      Solicitado: {new Date(u.createdAt).toLocaleDateString("es-ES")}
                    </Text>
                  </View>
                  <View style={{ flexDirection: "column", gap: 8 }}>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: "#059669" }]}
                      onPress={() => handleApprove(u.id, u.fullName)}
                      disabled={approveUserMutation.isPending}
                    >
                      <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>✓ Aprobar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: "#EF4444" }]}
                      onPress={() => handleDeny(u.id, u.fullName)}
                      disabled={denyUserMutation.isPending}
                    >
                      <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>✗ Denegar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </>
          ) : (
            <View style={[styles.userCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={{ color: colors.muted, textAlign: "center", flex: 1 }}>No hay solicitudes pendientes</Text>
            </View>
          )}

          {/* Todos los usuarios */}
          <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 24 }]}>
            Todos los comerciales ({(allUsersQuery.data ?? []).length})
          </Text>
          {allUsersQuery.isLoading ? (
            <ActivityIndicator color="#7C3AED" />
          ) : (
            (allUsersQuery.data ?? []).map(u => {
              const st = ACCOUNT_STATUS_LABELS[u.accountStatus ?? "active"] ?? ACCOUNT_STATUS_LABELS.active;
              const isBlocked = u.accountStatus === "blocked";
              return (
                <View key={u.id} style={[styles.userCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <Text style={[styles.commercialName, { color: colors.foreground }]}>{u.fullName}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
                        <Text style={{ color: st.color, fontSize: 11, fontWeight: "700" }}>{st.label}</Text>
                      </View>
                    </View>
                    <Text style={{ color: colors.muted, fontSize: 12 }}>@{u.username} · {u.email}</Text>
                  </View>
                  <View style={{ flexDirection: "column", gap: 6 }}>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: "#7C3AED" }]}
                      onPress={() => router.push(`/admin/commercial/${u.id}` as never)}
                    >
                      <Text style={{ color: "#fff", fontSize: 11, fontWeight: "600" }}>Ver</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: isBlocked ? "#059669" : "#F59E0B" }]}
                      onPress={() => handleBlockToggle(u.id, u.fullName, isBlocked)}
                    >
                      <Text style={{ color: "#fff", fontSize: 11, fontWeight: "600" }}>
                        {isBlocked ? "Desbloquear" : "Bloquear"}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: "#EF4444" }]}
                      onPress={() => handleDeleteCommercial(u.id, u.fullName)}
                    >
                      <Text style={{ color: "#fff", fontSize: 11, fontWeight: "600" }}>Borrar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* ── MODAL: Código de recuperación generado por el admin ── */}
      <Modal visible={showPasswordResetCode} animationType="fade" transparent onRequestClose={() => setShowPasswordResetCode(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, alignItems: "center" }]}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>🔑</Text>
            <Text style={[styles.modalTitle, { color: colors.foreground, textAlign: "center" }]}>
              Código generado
            </Text>
            <Text style={{ fontSize: 14, color: colors.muted, textAlign: "center", marginBottom: 20 }}>
              Para: <Text style={{ fontWeight: "700", color: colors.foreground }}>{resetCodeForUser}</Text>
            </Text>
            {/* Código grande y visible para que el admin se lo comunique al usuario */}
            <View style={{
              backgroundColor: "#F5F3FF",
              borderRadius: 16,
              padding: 24,
              marginBottom: 16,
              borderWidth: 2,
              borderColor: "#7C3AED",
              width: "100%",
              alignItems: "center",
            }}>
              <Text style={{ fontSize: 13, fontWeight: "600", color: "#7C3AED", marginBottom: 8, letterSpacing: 1 }}>
                CÓDIGO DE RECUPERACIÓN
              </Text>
              <Text style={{ fontSize: 48, fontWeight: "900", color: "#5B21B6", letterSpacing: 12 }}>
                {generatedResetCode}
              </Text>
            </View>
            <Text style={{ fontSize: 13, color: colors.muted, textAlign: "center", marginBottom: 20, lineHeight: 18 }}>
              Comunica este código al comercial por teléfono o WhatsApp. Caduca en 30 minutos.
            </Text>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: "#7C3AED", width: "100%" }]}
              onPress={() => { setShowPasswordResetCode(false); setGeneratedResetCode(null); }}
            >
              <Text style={{ color: "#fff", fontWeight: "700" }}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── MODAL: Cambio de contraseña admin ── */}
      <Modal visible={showChangePwd} animationType="slide" transparent onRequestClose={() => setShowChangePwd(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Cambiar contraseña admin</Text>
            {[
              { label: "Contraseña actual", value: currentPwd, setter: setCurrentPwd },
              { label: "Nueva contraseña", value: newPwd, setter: setNewPwd },
              { label: "Confirmar nueva contraseña", value: confirmPwd, setter: setConfirmPwd },
            ].map(({ label, value, setter }) => (
              <View key={label} style={{ marginBottom: 14 }}>
                <Text style={{ fontSize: 12, fontWeight: "600", color: colors.muted, marginBottom: 6 }}>{label.toUpperCase()}</Text>
                <TextInput
                  style={[styles.modalInput, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]}
                  secureTextEntry
                  value={value}
                  onChangeText={setter}
                  placeholder="••••••••••"
                  placeholderTextColor={colors.muted}
                />
              </View>
            ))}
            <Text style={{ fontSize: 11, color: colors.muted, marginBottom: 16 }}>
              Mínimo 9 caracteres, una mayúscula y un carácter especial
            </Text>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: "#7C3AED" }]}
              onPress={handleChangeAdminPwd}
              disabled={changeAdminPwdMutation.isPending}
            >
              {changeAdminPwdMutation.isPending
                ? <ActivityIndicator color="#fff" />
                : <Text style={{ color: "#fff", fontWeight: "700" }}>Cambiar contraseña</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryBtn, { borderColor: colors.border }]}
              onPress={() => { setShowChangePwd(false); setCurrentPwd(""); setNewPwd(""); setConfirmPwd(""); }}
            >
              <Text style={{ color: colors.muted, fontWeight: "600" }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── MODAL: Crear comercial ── */}
      <Modal visible={showCreateUser} animationType="slide" transparent onRequestClose={() => setShowCreateUser(false)}>
        <View style={styles.modalOverlay}>
          <ScrollView>
            <View style={[styles.modalCard, { backgroundColor: colors.surface, marginTop: 60 }]}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Crear nuevo comercial</Text>
              {[
                { label: "Nombre completo", value: newFullName, setter: setNewFullName, secure: false, placeholder: "Ej: Juan García" },
                { label: "Usuario", value: newUsername, setter: setNewUsername, secure: false, placeholder: "Ej: jgarcia" },
                { label: "Email", value: newEmail, setter: setNewEmail, secure: false, placeholder: "juan@empresa.com" },
                { label: "Contraseña", value: newPassword, setter: setNewPassword, secure: true, placeholder: "Mín. 9 chars, 1 mayúscula, 1 especial" },
              ].map(({ label, value, setter, secure, placeholder }) => (
                <View key={label} style={{ marginBottom: 14 }}>
                  <Text style={{ fontSize: 12, fontWeight: "600", color: colors.muted, marginBottom: 6 }}>{label.toUpperCase()}</Text>
                  <TextInput
                    style={[styles.modalInput, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]}
                    secureTextEntry={secure}
                    value={value}
                    onChangeText={setter}
                    placeholder={placeholder}
                    placeholderTextColor={colors.muted}
                    autoCapitalize="none"
                  />
                </View>
              ))}
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: "#7C3AED" }]}
                onPress={handleCreateUser}
                disabled={createUserMutation.isPending}
              >
                {createUserMutation.isPending
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={{ color: "#fff", fontWeight: "700" }}>Crear comercial</Text>}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.secondaryBtn, { borderColor: colors.border }]}
                onPress={() => { setShowCreateUser(false); setNewUsername(""); setNewFullName(""); setNewEmail(""); setNewPassword(""); }}
              >
                <Text style={{ color: colors.muted, fontWeight: "600" }}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  headerSubtitle: { color: "rgba(255,255,255,0.8)", fontSize: 12, marginTop: 2 },
  headerBtn: { backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  tabBar: { flexDirection: "row", borderBottomWidth: 1 },
  tab: { flex: 1, paddingVertical: 11, alignItems: "center" },
  tabText: { fontSize: 12, fontWeight: "600" },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 24 },
  statCard: { flex: 1, minWidth: "45%", borderRadius: 12, padding: 16, alignItems: "center" },
  statNumber: { fontSize: 28, fontWeight: "800" },
  statLabel: { fontSize: 12, fontWeight: "600", marginTop: 4 },
  sectionTitle: { fontSize: 15, fontWeight: "700", marginBottom: 12 },
  commercialCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  commercialName: { fontSize: 15, fontWeight: "700" },
  commercialUsername: { fontSize: 12, marginTop: 2 },
  statsRow: { flexDirection: "row", marginTop: 6 },
  leadCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
  },
  leadName: { fontSize: 14, fontWeight: "700" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  actionBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, alignItems: "center" },
  searchBar: { paddingHorizontal: 14, paddingVertical: 8 },
  searchInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14 },
  filterChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    borderWidth: 1, borderColor: "#E5E7EB", marginRight: 8,
    backgroundColor: "transparent",
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  createUserBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 48,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 20 },
  modalInput: {
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  primaryBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 10,
  },
  secondaryBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
  },
});
