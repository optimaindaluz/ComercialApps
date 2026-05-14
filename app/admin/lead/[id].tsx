import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  TextInput,
  Linking,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { useColors } from "@/hooks/use-colors";

const STATUS_OPTIONS = [
  { value: "new", label: "Nuevo", color: "#3B82F6" },
  { value: "contacted", label: "Contactado", color: "#F59E0B" },
  { value: "in_progress", label: "En proceso", color: "#8B5CF6" },
  { value: "closed", label: "Cerrado", color: "#10B981" },
] as const;

export default function AdminLeadDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const leadId = parseInt(id ?? "0");

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"new" | "contacted" | "in_progress" | "closed">("new");
  const [notes, setNotes] = useState("");
  const [marketingAccepted, setMarketingAccepted] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Fetch all leads to find this one (admin endpoint)
  const allLeadsQuery = trpc.admin.allLeads.useQuery();
  const lead = allLeadsQuery.data?.find(l => l.id === leadId);

  useEffect(() => {
    if (lead) {
      setFullName(lead.fullName);
      setPhone(lead.phone);
      setEmail(lead.email);
      setStatus(lead.status);
      setNotes(lead.notes ?? "");
      setMarketingAccepted(lead.marketingAccepted);
    }
  }, [lead]);

  const updateLeadMutation = trpc.admin.updateLead.useMutation({
    onSuccess: () => {
      setIsDirty(false);
      Alert.alert("Guardado", "Lead actualizado correctamente");
      allLeadsQuery.refetch();
    },
    onError: (e) => Alert.alert("Error", e.message),
  });

  const deleteLeadMutation = trpc.admin.deleteLead.useMutation({
    onSuccess: () => router.back(),
    onError: (e) => Alert.alert("Error", e.message),
  });

  const handleSave = () => {
    if (!fullName.trim() || !phone.trim() || !email.trim()) {
      Alert.alert("Error", "Nombre, teléfono y email son obligatorios");
      return;
    }
    updateLeadMutation.mutate({ id: leadId, fullName: fullName.trim(), phone: phone.trim(), email: email.trim(), status, notes, marketingAccepted });
  };

  const handleDelete = () => {
    Alert.alert("Eliminar lead", `¿Eliminar a ${lead?.fullName}? Esta acción no se puede deshacer.`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: () => deleteLeadMutation.mutate({ id: leadId }) },
    ]);
  };

  if (allLeadsQuery.isLoading) {
    return (
      <ScreenContainer>
        <ActivityIndicator color="#7C3AED" style={{ marginTop: 60 }} />
      </ScreenContainer>
    );
  }

  if (!lead) {
    return (
      <ScreenContainer className="p-6">
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: "#7C3AED" }}>← Volver</Text>
        </TouchableOpacity>
        <Text style={{ color: colors.foreground, marginTop: 20 }}>Lead no encontrado</Text>
      </ScreenContainer>
    );
  }

  // Advertencia de privacidad si el cliente no aceptó recibir ofertas
  const withMarketingCheck = (action: () => void) => {
    if (!marketingAccepted) {
      Alert.alert(
        "⚠️ Atención — Sin consentimiento comercial",
        "Este cliente no ha marcado la casilla de aceptar recibir ofertas comerciales. Antes de contactarle con propuestas o información comercial, asegúrese de obtener su permiso verbal y anotarlo en las notas del lead.\n\n¿Desea continuar de todas formas?",
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Continuar", style: "destructive", onPress: action },
        ]
      );
    } else {
      action();
    }
  };

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: "#7C3AED" }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Text style={{ color: "#fff", fontSize: 20 }}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Editar Lead</Text>
          <Text style={styles.headerSubtitle}>Comercial: {lead.commercialName}</Text>
        </View>
        <TouchableOpacity style={[styles.deleteBtn]} onPress={handleDelete}>
          <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>🗑️ Borrar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        {/* Acciones rápidas */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={[styles.quickBtn, { backgroundColor: "#DBEAFE" }]} onPress={() => withMarketingCheck(() => Linking.openURL(`tel:${lead.phone}`))}>
            <Text style={{ fontSize: 15 }}>📞</Text>
            <Text style={{ color: "#1D4ED8", fontSize: 13, fontWeight: "600" }}>Llamar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.quickBtn, { backgroundColor: "#D1FAE5" }]} onPress={() => withMarketingCheck(() => Linking.openURL(`https://wa.me/${lead.phone.replace(/\s/g, "")}`))}>
            <Svg width={15} height={15} viewBox="0 0 24 24" fill="#059669">
              <Path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <Path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.528 5.847L.057 23.5l5.797-1.522A11.93 11.93 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.79 9.79 0 01-4.988-1.366l-.358-.213-3.44.903.918-3.352-.234-.374A9.793 9.793 0 012.182 12C2.182 6.58 6.58 2.182 12 2.182S21.818 6.58 21.818 12 17.42 21.818 12 21.818z"/>
            </Svg>
            <Text style={{ color: "#059669", fontSize: 13, fontWeight: "600" }}>WhatsApp</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.quickBtn, { backgroundColor: "#FEF3C7" }]} onPress={() => withMarketingCheck(() => Linking.openURL(`mailto:${lead.email}`))}>
            <Text style={{ fontSize: 15 }}>✉️</Text>
            <Text style={{ color: "#D97706", fontSize: 13, fontWeight: "600" }}>Email</Text>
          </TouchableOpacity>
        </View>

        {/* Campos editables */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Datos del lead</Text>

          <Text style={[styles.label, { color: colors.foreground }]}>Nombre completo</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
            value={fullName}
            onChangeText={(v) => { setFullName(v); setIsDirty(true); }}
          />

          <Text style={[styles.label, { color: colors.foreground, marginTop: 14 }]}>Teléfono</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
            value={phone}
            onChangeText={(v) => { setPhone(v); setIsDirty(true); }}
            keyboardType="phone-pad"
          />

          <Text style={[styles.label, { color: colors.foreground, marginTop: 14 }]}>Email</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
            value={email}
            onChangeText={(v) => { setEmail(v); setIsDirty(true); }}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {/* Estado */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Estado</Text>
          <View style={styles.statusGrid}>
            {STATUS_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.statusOption,
                  { borderColor: opt.color, backgroundColor: status === opt.value ? opt.color : "transparent" },
                ]}
                onPress={() => { setStatus(opt.value); setIsDirty(true); }}
              >
                <Text style={{ color: status === opt.value ? "#fff" : opt.color, fontWeight: "600", fontSize: 13 }}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Notas */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Notas internas</Text>
          <TextInput
            style={[styles.notesInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
            value={notes}
            onChangeText={(v) => { setNotes(v); setIsDirty(true); }}
            multiline
            placeholder="Añade observaciones sobre este lead..."
            placeholderTextColor={colors.muted}
            textAlignVertical="top"
          />
        </View>

        {/* Marketing */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Consentimientos</Text>
          <TouchableOpacity
            style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            onPress={() => { setMarketingAccepted(!marketingAccepted); setIsDirty(true); }}
          >
            <View style={[styles.checkbox, { borderColor: "#7C3AED", backgroundColor: marketingAccepted ? "#7C3AED" : "transparent" }]}>
              {marketingAccepted && <Text style={{ color: "#fff", fontSize: 12 }}>✓</Text>}
            </View>
            <Text style={{ color: colors.foreground, fontSize: 14, flex: 1 }}>Acepta recibir ofertas y comunicaciones</Text>
          </TouchableOpacity>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 }}>
            <View style={[styles.checkbox, { borderColor: "#10B981", backgroundColor: "#10B981" }]}>
              <Text style={{ color: "#fff", fontSize: 12 }}>✓</Text>
            </View>
            <Text style={{ color: colors.muted, fontSize: 14, flex: 1 }}>Política de privacidad aceptada</Text>
          </View>
        </View>

        {/* Archivos adjuntos */}
        {lead && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Info adicional</Text>
            <Text style={{ color: colors.muted, fontSize: 13 }}>
              📅 Captado: {new Date(lead.createdAt).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })}
            </Text>
            {lead.businessName && (
              <Text style={{ color: colors.muted, fontSize: 13, marginTop: 6 }}>🏢 Negocio: {lead.businessName}</Text>
            )}
          </View>
        )}

        {/* Botón guardar */}
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: isDirty ? "#7C3AED" : colors.border, opacity: updateLeadMutation.isPending ? 0.7 : 1 }]}
          onPress={handleSave}
          disabled={updateLeadMutation.isPending || !isDirty}
        >
          {updateLeadMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={[styles.saveBtnText, { color: isDirty ? "#fff" : colors.muted }]}>
              {isDirty ? "Guardar cambios" : "Sin cambios pendientes"}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16 },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  headerSubtitle: { color: "rgba(255,255,255,0.8)", fontSize: 12, marginTop: 2 },
  deleteBtn: { backgroundColor: "#EF4444", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  quickActions: { flexDirection: "row", gap: 10, marginBottom: 16 },
  quickBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 5 },
  card: { borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1 },
  cardTitle: { fontSize: 15, fontWeight: "700", marginBottom: 12 },
  label: { fontSize: 13, fontWeight: "600", marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15 },
  notesInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, minHeight: 100 },
  statusGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statusOption: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 2 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  saveBtn: { borderRadius: 14, paddingVertical: 16, alignItems: "center", marginBottom: 24 },
  saveBtnText: { fontSize: 16, fontWeight: "700" },
});
