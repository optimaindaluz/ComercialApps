import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { useCommercialAuth } from "@/lib/commercial-auth";
import { useColors } from "@/hooks/use-colors";

export default function HomeScreen() {
  const colors = useColors();
  const { user } = useCommercialAuth();
  const { data: stats, isLoading } = trpc.leads.stats.useQuery(undefined, {
    enabled: !!user,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });
  const { data: recentLeads } = trpc.leads.list.useQuery(undefined, {
    enabled: !!user,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  const recent = (recentLeads ?? []).slice(0, 3);

  const STATUS_COLORS: Record<string, string> = {
    new: "#16A34A",
    contacted: "#D97706",
    in_progress: "#1A56DB",
    closed: "#64748B",
  };
  const STATUS_LABELS: Record<string, string> = {
    new: "Nuevo",
    contacted: "Contactado",
    in_progress: "En proceso",
    closed: "Cerrado",
  };

  const styles = StyleSheet.create({
    header: {
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 24,
    },
    greeting: { fontSize: 14, color: colors.muted },
    name: { fontSize: 28, fontWeight: "800", color: colors.foreground, marginTop: 2 },
    statsRow: {
      flexDirection: "row",
      paddingHorizontal: 20,
      gap: 12,
      marginBottom: 24,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
    },
    statIcon: { fontSize: 26, marginBottom: 8 },
    statValue: { fontSize: 30, fontWeight: "800", color: colors.primary },
    statLabel: { fontSize: 12, color: colors.muted, marginTop: 2, textAlign: "center" },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      marginBottom: 12,
    },
    sectionTitle: { fontSize: 17, fontWeight: "700", color: colors.foreground },
    seeAll: { fontSize: 14, color: colors.primary, fontWeight: "600" },
    leadCard: {
      backgroundColor: colors.surface,
      marginHorizontal: 20,
      marginBottom: 10,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: "row",
      alignItems: "center",
    },
    leadAvatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primary + "20",
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
    leadAvatarText: { fontSize: 18, fontWeight: "700", color: colors.primary },
    leadContent: { flex: 1 },
    leadName: { fontSize: 15, fontWeight: "700", color: colors.foreground },
    leadEmail: { fontSize: 12, color: colors.muted, marginTop: 2 },
    leadStatus: {
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    leadStatusText: { fontSize: 12, fontWeight: "700" },
    // Acciones rápidas
    quickActionsRow: {
      flexDirection: "row",
      paddingHorizontal: 20,
      gap: 12,
      marginBottom: 24,
    },
    quickAction: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    quickActionIcon: { fontSize: 28, marginBottom: 8 },
    quickActionText: { fontSize: 13, fontWeight: "600", color: colors.foreground, textAlign: "center" },
    emptyLeads: {
      paddingHorizontal: 20,
      paddingVertical: 20,
      alignItems: "center",
    },
    emptyLeadsText: { fontSize: 14, color: colors.muted, textAlign: "center" },
  });

  if (!user) {
    return (
      <ScreenContainer>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Saludo */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Bienvenido de vuelta 👋</Text>
          <Text style={styles.name}>{user.fullName.split(" ")[0]}</Text>
        </View>

        {/* Estadísticas */}
        <View style={styles.statsRow}>
          {isLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <>
              <View style={styles.statCard}>
                <Text style={styles.statIcon}>👥</Text>
                <Text style={styles.statValue}>{stats?.totalLeads ?? 0}</Text>
                <Text style={styles.statLabel}>Total leads</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statIcon}>🆕</Text>
                <Text style={styles.statValue}>{stats?.newLeads ?? 0}</Text>
                <Text style={styles.statLabel}>Nuevos</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statIcon}>🏢</Text>
                <Text style={styles.statValue}>{stats?.totalBusinesses ?? 0}</Text>
                <Text style={styles.statLabel}>Negocios</Text>
              </View>
            </>
          )}
        </View>

        {/* Acciones rápidas */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Acciones rápidas</Text>
        </View>
        <View style={styles.quickActionsRow}>
          <TouchableOpacity style={styles.quickAction} onPress={() => router.push("/(tabs)/mi-qr" as any)}>
            <Text style={styles.quickActionIcon}>📱</Text>
            <Text style={styles.quickActionText}>Mi QR</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction} onPress={() => router.push("/(tabs)/negocios" as any)}>
            <Text style={styles.quickActionIcon}>🏢</Text>
            <Text style={styles.quickActionText}>Nuevo negocio</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction} onPress={() => router.push("/(tabs)/leads" as any)}>
            <Text style={styles.quickActionIcon}>📋</Text>
            <Text style={styles.quickActionText}>Ver leads</Text>
          </TouchableOpacity>
        </View>

        {/* Leads recientes */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Leads recientes</Text>
          <TouchableOpacity onPress={() => router.push("/(tabs)/leads" as any)}>
            <Text style={styles.seeAll}>Ver todos →</Text>
          </TouchableOpacity>
        </View>

        {recent.length === 0 ? (
          <View style={styles.emptyLeads}>
            <Text style={styles.emptyLeadsText}>
              Aún no tienes leads. Comparte tu QR para empezar a captar clientes.
            </Text>
          </View>
        ) : (
          recent.map((lead: any) => {
            const statusColor = STATUS_COLORS[lead.status] ?? "#64748B";
            const statusBg = lead.status === "new" ? "#DCFCE7"
              : lead.status === "contacted" ? "#FEF3C7"
              : lead.status === "in_progress" ? "#DBEAFE" : "#F1F5F9";
            return (
              <TouchableOpacity
                key={lead.id}
                style={styles.leadCard}
                onPress={() => router.push(`/leads/${lead.id}` as any)}
              >
                <View style={styles.leadAvatar}>
                  <Text style={styles.leadAvatarText}>
                    {lead.fullName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.leadContent}>
                  <Text style={styles.leadName} numberOfLines={1}>{lead.fullName}</Text>
                  <Text style={styles.leadEmail} numberOfLines={1}>{lead.email}</Text>
                </View>
                <View style={[styles.leadStatus, { backgroundColor: statusBg }]}>
                  <Text style={[styles.leadStatusText, { color: statusColor }]}>
                    {STATUS_LABELS[lead.status] ?? lead.status}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </ScreenContainer>
  );
}
