import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { router, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { useColors } from "@/hooks/use-colors";

const STATUS_OPTIONS = [
  { key: "new", label: "Nuevo", color: "#16A34A", bg: "#DCFCE7" },
  { key: "contacted", label: "Contactado", color: "#D97706", bg: "#FEF3C7" },
  { key: "in_progress", label: "En proceso", color: "#1A56DB", bg: "#DBEAFE" },
  { key: "closed", label: "Cerrado", color: "#64748B", bg: "#F1F5F9" },
];

export default function LeadDetailScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const leadId = parseInt(id ?? "0", 10);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesText, setNotesText] = useState("");

  const { data: lead, isLoading, refetch } = trpc.leads.getById.useQuery({ id: leadId });

  const updateStatusMutation = trpc.leads.updateStatus.useMutation({
    onSuccess: () => { refetch(); setShowStatusPicker(false); },
    onError: (err) => Alert.alert("Error", err.message),
  });

  const updateNotesMutation = trpc.leads.updateNotes.useMutation({
    onSuccess: () => { refetch(); setEditingNotes(false); },
    onError: (err) => Alert.alert("Error", err.message),
  });

  const currentStatus = STATUS_OPTIONS.find(s => s.key === lead?.status) ?? STATUS_OPTIONS[0];

  // Advertencia de privacidad si el cliente no aceptó recibir ofertas
  const withMarketingCheck = (action: () => void) => {
    if (!lead?.marketingAccepted) {
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
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: colors.surface, alignItems: "center", justifyContent: "center",
      borderWidth: 1, borderColor: colors.border,
    },
    backBtnText: { fontSize: 18, color: colors.foreground },
    headerTitle: { fontSize: 20, fontWeight: "700", color: colors.foreground, flex: 1 },
    // Tarjeta de info
    infoCard: {
      marginHorizontal: 20, marginBottom: 16,
      backgroundColor: colors.surface, borderRadius: 16,
      padding: 20, borderWidth: 1, borderColor: colors.border,
    },
    infoRow: { flexDirection: "row", alignItems: "center", marginBottom: 14, gap: 12 },
    infoIcon: { fontSize: 20, width: 28 },
    infoContent: { flex: 1 },
    infoLabel: { fontSize: 11, fontWeight: "700", color: colors.muted, letterSpacing: 0.5 },
    infoValue: { fontSize: 15, color: colors.foreground, fontWeight: "500", marginTop: 1 },
    infoValueLink: { color: colors.primary },
    // Estado
    statusSection: { marginHorizontal: 20, marginBottom: 16 },
    statusTitle: { fontSize: 13, fontWeight: "700", color: colors.muted, letterSpacing: 0.5, marginBottom: 10 },
    statusBtn: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border,
    },
    statusBadge: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5 },
    statusBadgeText: { fontSize: 13, fontWeight: "700" },
    statusArrow: { fontSize: 14, color: colors.muted },
    // Picker de estado
    statusPickerOverlay: {
      position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: "rgba(0,0,0,0.3)", zIndex: 100,
      justifyContent: "center", alignItems: "center",
    },
    statusPickerCard: {
      backgroundColor: colors.surface, borderRadius: 20, padding: 20,
      marginHorizontal: 40, width: "80%",
    },
    statusPickerTitle: { fontSize: 16, fontWeight: "700", color: colors.foreground, marginBottom: 16 },
    statusOption: {
      flexDirection: "row", alignItems: "center", paddingVertical: 12,
      borderBottomWidth: 1, borderBottomColor: colors.border, gap: 12,
    },
    statusOptionDot: { width: 10, height: 10, borderRadius: 5 },
    statusOptionText: { fontSize: 15, color: colors.foreground },
    // Archivos
    filesSection: { marginHorizontal: 20, marginBottom: 16 },
    filesTitle: { fontSize: 13, fontWeight: "700", color: colors.muted, letterSpacing: 0.5, marginBottom: 10 },
    fileItem: {
      flexDirection: "row", alignItems: "center",
      backgroundColor: colors.surface, borderRadius: 12, padding: 14,
      marginBottom: 8, borderWidth: 1, borderColor: colors.border,
    },
    fileIcon: { fontSize: 22, marginRight: 12 },
    fileInfo: { flex: 1 },
    fileName: { fontSize: 14, fontWeight: "600", color: colors.foreground },
    fileSize: { fontSize: 12, color: colors.muted, marginTop: 2 },
    fileOpenBtn: {
      backgroundColor: colors.primary + "15", borderRadius: 8,
      paddingHorizontal: 12, paddingVertical: 6,
    },
    fileOpenText: { color: colors.primary, fontWeight: "600", fontSize: 12 },
    noFiles: { fontSize: 14, color: colors.muted, textAlign: "center", paddingVertical: 16 },
    // Acciones rápidas
    actionsSection: { marginHorizontal: 20, marginBottom: 32 },
    actionsTitle: { fontSize: 13, fontWeight: "700", color: colors.muted, letterSpacing: 0.5, marginBottom: 10 },
    actionsRow: { flexDirection: "row", gap: 10 },
    actionBtn: {
      flex: 1, borderRadius: 12, paddingVertical: 14,
      alignItems: "center", justifyContent: "center",
      flexDirection: "row", gap: 6,
      borderWidth: 1.5,
    },
    actionBtnText: { fontWeight: "700", fontSize: 14 },
  });

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (isLoading) {
    return (
      <ScreenContainer>
        <ActivityIndicator color={colors.primary} style={{ marginTop: 80 }} />
      </ScreenContainer>
    );
  }

  if (!lead) {
    return (
      <ScreenContainer>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: colors.muted }}>Lead no encontrado</Text>
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
          <Text style={styles.headerTitle} numberOfLines={1}>{lead.fullName}</Text>
        </View>

        {/* Info del lead */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>👤</Text>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>NOMBRE</Text>
              <Text style={styles.infoValue}>{lead.fullName}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>📱</Text>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>TELÉFONO</Text>
              <Text style={styles.infoValue}>{lead.phone}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>✉️</Text>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>EMAIL</Text>
              <Text style={styles.infoValue}>{lead.email}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>{lead.businessId ? "🏢" : "👤"}</Text>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>ORIGEN</Text>
              <Text style={styles.infoValue}>
                {lead.businessId ? `Negocio: ${lead.businessName ?? "—"}` : "Formulario personal"}
              </Text>
            </View>
          </View>
          <View style={[styles.infoRow, { marginBottom: 0 }]}>
            <Text style={styles.infoIcon}>📅</Text>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>FECHA</Text>
              <Text style={styles.infoValue}>
                {new Date(lead.createdAt).toLocaleDateString("es-ES", {
                  weekday: "long", year: "numeric", month: "long", day: "numeric"
                })}
              </Text>
            </View>
          </View>
        </View>

        {/* Estado */}
        <View style={styles.statusSection}>
          <Text style={styles.statusTitle}>ESTADO DEL LEAD</Text>
          <TouchableOpacity
            style={styles.statusBtn}
            onPress={() => setShowStatusPicker(true)}
          >
            <View style={[styles.statusBadge, { backgroundColor: currentStatus.bg }]}>
              <Text style={[styles.statusBadgeText, { color: currentStatus.color }]}>
                {currentStatus.label}
              </Text>
            </View>
            <Text style={styles.statusArrow}>Cambiar ›</Text>
          </TouchableOpacity>
        </View>

        {/* Notas internas */}
        <View style={styles.filesSection}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <Text style={styles.filesTitle}>NOTAS INTERNAS</Text>
            {!editingNotes ? (
              <TouchableOpacity
                onPress={() => { setNotesText(lead.notes ?? ""); setEditingNotes(true); }}
                style={{ backgroundColor: colors.primary + "15", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8 }}
              >
                <Text style={{ color: colors.primary, fontSize: 13, fontWeight: "600" }}>{lead.notes ? "Editar" : "+ Añadir"}</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TouchableOpacity
                  onPress={() => setEditingNotes(false)}
                  style={{ backgroundColor: colors.border, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8 }}
                >
                  <Text style={{ color: colors.muted, fontSize: 13, fontWeight: "600" }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => updateNotesMutation.mutate({ id: leadId, notes: notesText })}
                  style={{ backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8 }}
                  disabled={updateNotesMutation.isPending}
                >
                  {updateNotesMutation.isPending
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>Guardar</Text>}
                </TouchableOpacity>
              </View>
            )}
          </View>
          {editingNotes ? (
            <TextInput
              style={[
                {
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.primary,
                  borderRadius: 12,
                  padding: 14,
                  fontSize: 15,
                  color: colors.foreground,
                  minHeight: 100,
                  textAlignVertical: "top",
                }
              ]}
              value={notesText}
              onChangeText={setNotesText}
              multiline
              placeholder="Escribe tus notas sobre este lead..."
              placeholderTextColor={colors.muted}
              autoFocus
            />
          ) : lead.notes ? (
            <View style={[styles.fileItem, { backgroundColor: colors.surface }]}>
              <Text style={{ fontSize: 20, marginRight: 12 }}>📝</Text>
              <Text style={{ flex: 1, color: colors.foreground, fontSize: 14, lineHeight: 20 }}>{lead.notes}</Text>
            </View>
          ) : (
            <Text style={styles.noFiles}>Sin notas. Toca "+ Añadir" para escribir.</Text>
          )}
        </View>

        {/* Consentimientos del formulario */}
        <View style={styles.filesSection}>
          <Text style={styles.filesTitle}>CONSENTIMIENTOS</Text>
          <View style={[styles.fileItem, { backgroundColor: colors.surface, gap: 0, paddingVertical: 12 }]}>
            <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={[
                { width: 22, height: 22, borderRadius: 6, alignItems: "center", justifyContent: "center" },
                lead.privacyAccepted
                  ? { backgroundColor: "#16A34A" }
                  : { backgroundColor: colors.border }
              ]}>
                <Text style={{ color: "#fff", fontSize: 13, fontWeight: "700" }}>{lead.privacyAccepted ? "✓" : "✗"}</Text>
              </View>
              <Text style={{ color: colors.foreground, fontSize: 14 }}>Política de privacidad</Text>
            </View>
          </View>
          <View style={[styles.fileItem, { backgroundColor: colors.surface, gap: 0, paddingVertical: 12, marginTop: 8 }]}>
            <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={[
                { width: 22, height: 22, borderRadius: 6, alignItems: "center", justifyContent: "center" },
                lead.marketingAccepted
                  ? { backgroundColor: "#16A34A" }
                  : { backgroundColor: colors.error + "80" }
              ]}>
                <Text style={{ color: "#fff", fontSize: 13, fontWeight: "700" }}>{lead.marketingAccepted ? "✓" : "✗"}</Text>
              </View>
              <Text style={{ color: colors.foreground, fontSize: 14 }}>Acepta recibir ofertas comerciales</Text>
            </View>
          </View>
        </View>

        {/* Archivos adjuntos */}
        <View style={styles.filesSection}>
          <Text style={styles.filesTitle}>FACTURAS ADJUNTAS ({lead.files?.length ?? 0})</Text>
          {!lead.files || lead.files.length === 0 ? (
            <Text style={styles.noFiles}>El cliente no adjuntó ningún archivo</Text>
          ) : (
            lead.files.map((file: any) => (
              <View key={file.id} style={styles.fileItem}>
                <Text style={styles.fileIcon}>
                  {file.mimeType?.includes("pdf") ? "📄" : "🖼️"}
                </Text>
                <View style={styles.fileInfo}>
                  <Text style={styles.fileName} numberOfLines={1}>{file.originalName}</Text>
                  <Text style={styles.fileSize}>{formatFileSize(file.fileSize)}</Text>
                </View>
                <TouchableOpacity
                  style={styles.fileOpenBtn}
                  onPress={() => Linking.openURL(file.storageUrl)}
                >
                  <Text style={styles.fileOpenText}>Abrir</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* Acciones rápidas */}
        <View style={styles.actionsSection}>
          <Text style={styles.actionsTitle}>ACCIONES RÁPIDAS</Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionBtn, { borderColor: colors.primary }]}
              onPress={() => withMarketingCheck(() => Linking.openURL(`tel:${lead.phone}`))}
            >
              <Text style={{ fontSize: 16 }}>📞</Text>
              <Text style={[styles.actionBtnText, { color: colors.primary }]}>Llamar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { borderColor: colors.success }]}
              onPress={() => withMarketingCheck(() => Linking.openURL(`mailto:${lead.email}`))}
            >
              <Text style={{ fontSize: 16 }}>✉️</Text>
              <Text style={[styles.actionBtnText, { color: colors.success }]}>Email</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { borderColor: "#25D366" }]}
              onPress={() => withMarketingCheck(() => Linking.openURL(`https://wa.me/${lead.phone.replace(/\s+/g, "")}`))}
            >
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="#25D366">
                <Path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <Path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.528 5.847L.057 23.5l5.797-1.522A11.93 11.93 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.79 9.79 0 01-4.988-1.366l-.358-.213-3.44.903.918-3.352-.234-.374A9.793 9.793 0 012.182 12C2.182 6.58 6.58 2.182 12 2.182S21.818 6.58 21.818 12 17.42 21.818 12 21.818z"/>
              </Svg>
              <Text style={[styles.actionBtnText, { color: "#25D366" }]}>WhatsApp</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Picker de estado (overlay) */}
      {showStatusPicker && (
        <TouchableOpacity
          style={styles.statusPickerOverlay}
          onPress={() => setShowStatusPicker(false)}
        >
          <View style={styles.statusPickerCard}>
            <Text style={styles.statusPickerTitle}>Cambiar estado</Text>
            {STATUS_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.key}
                style={styles.statusOption}
                onPress={() => updateStatusMutation.mutate({ id: leadId, status: opt.key as any })}
              >
                <View style={[styles.statusOptionDot, { backgroundColor: opt.color }]} />
                <Text style={styles.statusOptionText}>{opt.label}</Text>
                {lead.status === opt.key && <Text style={{ color: colors.primary, marginLeft: "auto" }}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      )}
    </ScreenContainer>
  );
}
