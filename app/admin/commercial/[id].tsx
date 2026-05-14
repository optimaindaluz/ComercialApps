import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  TextInput,
  Modal,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { useColors } from "@/hooks/use-colors";

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

export default function AdminCommercialDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const commercialId = parseInt(id ?? "0");

  const [editModal, setEditModal] = useState(false);
  const [editFullName, setEditFullName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [addLeadModal, setAddLeadModal] = useState(false);
  const [newLeadName, setNewLeadName] = useState("");
  const [newLeadPhone, setNewLeadPhone] = useState("");
  const [newLeadEmail, setNewLeadEmail] = useState("");
  const [newLeadNotes, setNewLeadNotes] = useState("");
  const [editBusinessModal, setEditBusinessModal] = useState(false);
  const [editBusinessId, setEditBusinessId] = useState(0);
  const [editBusinessName, setEditBusinessName] = useState("");

  const detailQuery = trpc.admin.getCommercialDetail.useQuery({ id: commercialId }, { enabled: !!commercialId });

  const updateCommercialMutation = trpc.admin.updateCommercial.useMutation({
    onSuccess: () => { setEditModal(false); detailQuery.refetch(); },
    onError: (e) => Alert.alert("Error", e.message),
  });
  const createLeadMutation = trpc.admin.createLead.useMutation({
    onSuccess: () => { setAddLeadModal(false); setNewLeadName(""); setNewLeadPhone(""); setNewLeadEmail(""); setNewLeadNotes(""); detailQuery.refetch(); },
    onError: (e) => Alert.alert("Error", e.message),
  });
  const deleteLeadMutation = trpc.admin.deleteLead.useMutation({
    onSuccess: () => detailQuery.refetch(),
  });
  const updateBusinessMutation = trpc.admin.updateBusiness.useMutation({
    onSuccess: () => { setEditBusinessModal(false); detailQuery.refetch(); },
    onError: (e) => Alert.alert("Error", e.message),
  });
  const deleteBusinessMutation = trpc.admin.deleteBusiness.useMutation({
    onSuccess: () => detailQuery.refetch(),
  });

  const openEditCommercial = () => {
    const c = detailQuery.data?.commercial;
    if (!c) return;
    setEditFullName(c.fullName);
    setEditEmail(c.email);
    setEditUsername(c.username);
    setEditModal(true);
  };

  const openEditBusiness = (biz: { id: number; name: string }) => {
    setEditBusinessId(biz.id);
    setEditBusinessName(biz.name);
    setEditBusinessModal(true);
  };

  const handleDeleteLead = (leadId: number, name: string) => {
    Alert.alert("Eliminar lead", `¿Eliminar a ${name}?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: () => deleteLeadMutation.mutate({ id: leadId }) },
    ]);
  };

  const handleDeleteBusiness = (bizId: number, name: string) => {
    Alert.alert("Eliminar negocio", `¿Eliminar el negocio "${name}"?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: () => deleteBusinessMutation.mutate({ id: bizId }) },
    ]);
  };

  if (detailQuery.isLoading) {
    return (
      <ScreenContainer>
        <ActivityIndicator color="#7C3AED" style={{ marginTop: 60 }} />
      </ScreenContainer>
    );
  }

  const data = detailQuery.data;
  if (!data) {
    return (
      <ScreenContainer className="p-6">
        <Text style={{ color: colors.foreground }}>Comercial no encontrado</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: "#7C3AED" }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Text style={{ color: "#fff", fontSize: 20 }}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{data.commercial.fullName}</Text>
          <Text style={styles.headerSubtitle}>@{data.commercial.username}</Text>
        </View>
        <TouchableOpacity style={styles.editBtn} onPress={openEditCommercial}>
          <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>Editar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Info del comercial */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Información</Text>
          <Text style={[styles.infoRow, { color: colors.muted }]}>📧 {data.commercial.email}</Text>
          <Text style={[styles.infoRow, { color: colors.muted }]}>
            📅 Registrado: {new Date(data.commercial.createdAt).toLocaleDateString("es-ES")}
          </Text>
          <View style={styles.statsRow}>
            <View style={[styles.statBadge, { backgroundColor: "#EDE9FE" }]}>
              <Text style={{ color: "#7C3AED", fontWeight: "700" }}>{data.leads.length}</Text>
              <Text style={{ color: "#7C3AED", fontSize: 11 }}>Leads</Text>
            </View>
            <View style={[styles.statBadge, { backgroundColor: "#D1FAE5" }]}>
              <Text style={{ color: "#059669", fontWeight: "700" }}>{data.businesses.length}</Text>
              <Text style={{ color: "#059669", fontSize: 11 }}>Negocios</Text>
            </View>
          </View>
        </View>

        {/* Negocios */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Negocios ({data.businesses.length})</Text>
        </View>
        {data.businesses.length === 0 ? (
          <Text style={{ color: colors.muted, marginBottom: 16 }}>Sin negocios</Text>
        ) : (
          data.businesses.map(biz => (
            <View key={biz.id} style={[styles.bizCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.bizName, { color: colors.foreground }]}>{biz.name}</Text>
                <Text style={{ color: colors.muted, fontSize: 12 }}>
                  {new Date(biz.createdAt).toLocaleDateString("es-ES")}
                </Text>
              </View>
              <TouchableOpacity style={[styles.smallBtn, { backgroundColor: "#7C3AED", marginRight: 6 }]} onPress={() => openEditBusiness(biz)}>
                <Text style={{ color: "#fff", fontSize: 12 }}>✏️</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.smallBtn, { backgroundColor: "#EF4444" }]} onPress={() => handleDeleteBusiness(biz.id, biz.name)}>
                <Text style={{ color: "#fff", fontSize: 12 }}>🗑️</Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        {/* Leads */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10, marginTop: 8 }}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Leads ({data.leads.length})</Text>
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: "#7C3AED" }]} onPress={() => setAddLeadModal(true)}>
            <Text style={{ color: "#fff", fontSize: 13, fontWeight: "700" }}>+ Añadir</Text>
          </TouchableOpacity>
        </View>
        {data.leads.length === 0 ? (
          <Text style={{ color: colors.muted, marginBottom: 16 }}>Sin leads</Text>
        ) : (
          data.leads.map(lead => (
            <View key={lead.id} style={[styles.leadCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <Text style={[styles.leadName, { color: colors.foreground }]}>{lead.fullName}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[lead.status] + "20" }]}>
                    <Text style={{ color: STATUS_COLORS[lead.status], fontSize: 11, fontWeight: "600" }}>
                      {STATUS_LABELS[lead.status]}
                    </Text>
                  </View>
                </View>
                <Text style={{ color: colors.muted, fontSize: 12 }}>{lead.phone} · {lead.email}</Text>
                {lead.businessName && <Text style={{ color: "#7C3AED", fontSize: 12, marginTop: 2 }}>🏢 {lead.businessName}</Text>}
                {lead.notes && <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }} numberOfLines={2}>📝 {lead.notes}</Text>}
                <Text style={{ color: colors.muted, fontSize: 11, marginTop: 4 }}>
                  {new Date(lead.createdAt).toLocaleDateString("es-ES")}
                  {lead.files.length > 0 ? ` · 📎 ${lead.files.length} archivo(s)` : ""}
                </Text>
              </View>
              <View style={{ flexDirection: "column", gap: 6 }}>
                <TouchableOpacity style={[styles.smallBtn, { backgroundColor: "#7C3AED" }]} onPress={() => router.push(`/admin/lead/${lead.id}` as never)}>
                  <Text style={{ color: "#fff", fontSize: 12 }}>✏️</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.smallBtn, { backgroundColor: "#EF4444" }]} onPress={() => handleDeleteLead(lead.id, lead.fullName)}>
                  <Text style={{ color: "#fff", fontSize: 12 }}>🗑️</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Modal editar comercial */}
      <Modal visible={editModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Editar comercial</Text>
            <TouchableOpacity onPress={() => setEditModal(false)}>
              <Text style={{ color: colors.muted, fontSize: 16 }}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={{ padding: 20 }}>
            <Text style={[styles.label, { color: colors.foreground }]}>Nombre completo</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]} value={editFullName} onChangeText={setEditFullName} />
            <Text style={[styles.label, { color: colors.foreground, marginTop: 14 }]}>Email</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]} value={editEmail} onChangeText={setEditEmail} keyboardType="email-address" autoCapitalize="none" />
            <Text style={[styles.label, { color: colors.foreground, marginTop: 14 }]}>Usuario</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]} value={editUsername} onChangeText={setEditUsername} autoCapitalize="none" />
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: "#7C3AED", marginTop: 24 }]}
              onPress={() => updateCommercialMutation.mutate({ id: commercialId, fullName: editFullName, email: editEmail, username: editUsername })}
              disabled={updateCommercialMutation.isPending}
            >
              {updateCommercialMutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Guardar cambios</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Modal editar negocio */}
      <Modal visible={editBusinessModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Editar negocio</Text>
            <TouchableOpacity onPress={() => setEditBusinessModal(false)}>
              <Text style={{ color: colors.muted, fontSize: 16 }}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={{ padding: 20 }}>
            <Text style={[styles.label, { color: colors.foreground }]}>Nombre del negocio</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]} value={editBusinessName} onChangeText={setEditBusinessName} />
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: "#7C3AED", marginTop: 24 }]}
              onPress={() => updateBusinessMutation.mutate({ id: editBusinessId, name: editBusinessName })}
              disabled={updateBusinessMutation.isPending}
            >
              {updateBusinessMutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Guardar</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal añadir lead */}
      <Modal visible={addLeadModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Añadir lead</Text>
            <TouchableOpacity onPress={() => setAddLeadModal(false)}>
              <Text style={{ color: colors.muted, fontSize: 16 }}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={{ padding: 20 }}>
            <Text style={[styles.label, { color: colors.foreground }]}>Nombre *</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]} value={newLeadName} onChangeText={setNewLeadName} placeholder="Nombre completo" placeholderTextColor={colors.muted} />
            <Text style={[styles.label, { color: colors.foreground, marginTop: 14 }]}>Teléfono *</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]} value={newLeadPhone} onChangeText={setNewLeadPhone} keyboardType="phone-pad" placeholder="600 000 000" placeholderTextColor={colors.muted} />
            <Text style={[styles.label, { color: colors.foreground, marginTop: 14 }]}>Email *</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]} value={newLeadEmail} onChangeText={setNewLeadEmail} keyboardType="email-address" autoCapitalize="none" placeholder="email@ejemplo.com" placeholderTextColor={colors.muted} />
            <Text style={[styles.label, { color: colors.foreground, marginTop: 14 }]}>Notas</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground, height: 80, textAlignVertical: "top" }]} value={newLeadNotes} onChangeText={setNewLeadNotes} multiline placeholder="Observaciones..." placeholderTextColor={colors.muted} />
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: "#7C3AED", marginTop: 24 }]}
              onPress={() => {
                if (!newLeadName.trim() || !newLeadPhone.trim() || !newLeadEmail.trim()) {
                  Alert.alert("Error", "Nombre, teléfono y email son obligatorios");
                  return;
                }
                createLeadMutation.mutate({ commercialId, fullName: newLeadName.trim(), phone: newLeadPhone.trim(), email: newLeadEmail.trim(), notes: newLeadNotes.trim() || undefined });
              }}
              disabled={createLeadMutation.isPending}
            >
              {createLeadMutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Crear lead</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16 },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  headerSubtitle: { color: "rgba(255,255,255,0.8)", fontSize: 12, marginTop: 2 },
  editBtn: { backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  card: { borderRadius: 14, padding: 16, marginBottom: 20, borderWidth: 1 },
  cardTitle: { fontSize: 16, fontWeight: "700", marginBottom: 10 },
  infoRow: { fontSize: 14, marginBottom: 6 },
  statsRow: { flexDirection: "row", gap: 12, marginTop: 10 },
  statBadge: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, alignItems: "center" },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  bizCard: { flexDirection: "row", alignItems: "center", borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1 },
  bizName: { fontSize: 14, fontWeight: "600" },
  leadCard: { flexDirection: "row", alignItems: "flex-start", borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1 },
  leadName: { fontSize: 15, fontWeight: "700" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  smallBtn: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  addBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8 },
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, paddingTop: 24 },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  saveBtn: { borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
