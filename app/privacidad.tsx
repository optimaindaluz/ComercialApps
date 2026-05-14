import { ScrollView, Text, View, StyleSheet, Linking } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";

export default function PrivacidadScreen() {
  const colors = useColors();

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <Text style={styles.headerTitle}>Política de Privacidad</Text>
          <Text style={styles.headerSubtitle}>Óptima Indaluz — ComercialApp</Text>
          <Text style={styles.headerDate}>Última actualización: 3 de abril de 2026</Text>
        </View>

        <View style={styles.content}>
          <Section title="1. Responsable del tratamiento">
            <Text style={[styles.text, { color: colors.foreground }]}>
              <Text style={styles.bold}>Óptima Indaluz S.L.</Text>{"\n"}
              Actividad: Ingeniería y Consultoría Energética{"\n"}
              Contacto:{" "}
              <Text
                style={{ color: colors.primary }}
                onPress={() => Linking.openURL("mailto:optimaindaluz@gmail.com")}
              >
                optimaindaluz@gmail.com
              </Text>
            </Text>
          </Section>

          <Section title="2. Datos que recogemos">
            <Text style={[styles.text, { color: colors.foreground }]}>
              La aplicación recoge los siguientes datos según el perfil del usuario:{"\n\n"}
              <Text style={styles.bold}>Comerciales (usuarios de la app):</Text>{"\n"}
              • Nombre completo{"\n"}
              • Dirección de correo electrónico{"\n"}
              • Contraseña (almacenada de forma cifrada){"\n\n"}
              <Text style={styles.bold}>Leads (clientes potenciales captados mediante formulario):</Text>{"\n"}
              • Nombre completo{"\n"}
              • Número de teléfono{"\n"}
              • Dirección de correo electrónico{"\n"}
              • Tipo de suministro (personal o empresa){"\n"}
              • Documentos adjuntos opcionales (facturas de energía){"\n"}
              • Consentimiento de marketing (sí/no){"\n"}
              • Fecha y hora de envío del formulario
            </Text>
          </Section>

          <Section title="3. Finalidad del tratamiento">
            <Text style={[styles.text, { color: colors.foreground }]}>
              Los datos se tratan para:{"\n"}
              • Gestionar la cartera de leads de cada comercial{"\n"}
              • Facilitar el contacto entre el comercial y el cliente potencial{"\n"}
              • Enviar notificaciones push al comercial cuando llega un nuevo lead{"\n"}
              • Generar informes de actividad comercial en formato Excel
            </Text>
          </Section>

          <Section title="4. Base legal">
            <Text style={[styles.text, { color: colors.foreground }]}>
              El tratamiento de datos de los <Text style={styles.bold}>comerciales</Text> se basa en la relación contractual o laboral con Óptima Indaluz S.L.{"\n\n"}
              El tratamiento de datos de los <Text style={styles.bold}>leads</Text> se basa en el consentimiento explícito otorgado al rellenar el formulario de contacto.
            </Text>
          </Section>

          <Section title="5. Conservación de los datos">
            <Text style={[styles.text, { color: colors.foreground }]}>
              Los datos se conservan mientras la cuenta del comercial esté activa o mientras sean necesarios para la gestión comercial. Los leads pueden ser eliminados manualmente por el comercial en cualquier momento.
            </Text>
          </Section>

          <Section title="6. Destinatarios">
            <Text style={[styles.text, { color: colors.foreground }]}>
              Los datos no se ceden a terceros salvo obligación legal. La infraestructura técnica está alojada en servidores seguros. No se realizan transferencias internacionales de datos.
            </Text>
          </Section>

          <Section title="7. Derechos del interesado">
            <Text style={[styles.text, { color: colors.foreground }]}>
              Cualquier persona cuyos datos estén siendo tratados puede ejercer los siguientes derechos:{"\n"}
              • <Text style={styles.bold}>Acceso:</Text> conocer qué datos se tratan{"\n"}
              • <Text style={styles.bold}>Rectificación:</Text> corregir datos inexactos{"\n"}
              • <Text style={styles.bold}>Supresión:</Text> solicitar la eliminación de sus datos{"\n"}
              • <Text style={styles.bold}>Oposición:</Text> oponerse al tratamiento{"\n"}
              • <Text style={styles.bold}>Limitación:</Text> restringir el tratamiento{"\n"}
              • <Text style={styles.bold}>Portabilidad:</Text> recibir sus datos en formato estructurado{"\n\n"}
              Para ejercer estos derechos, envía un correo a{" "}
              <Text
                style={{ color: colors.primary }}
                onPress={() => Linking.openURL("mailto:optimaindaluz@gmail.com")}
              >
                optimaindaluz@gmail.com
              </Text>
              {" "}indicando el derecho que deseas ejercer y adjuntando una copia de tu documento de identidad.
            </Text>
          </Section>

          <Section title="8. Seguridad">
            <Text style={[styles.text, { color: colors.foreground }]}>
              Aplicamos medidas técnicas y organizativas para proteger los datos contra accesos no autorizados, pérdida o destrucción. Las contraseñas se almacenan cifradas y las comunicaciones se realizan mediante HTTPS.
            </Text>
          </Section>

          <Section title="9. Cookies y tecnologías similares">
            <Text style={[styles.text, { color: colors.foreground }]}>
              La aplicación móvil no utiliza cookies. La versión web puede utilizar cookies de sesión estrictamente necesarias para el funcionamiento del sistema de autenticación.
            </Text>
          </Section>

          <Section title="10. Cambios en esta política">
            <Text style={[styles.text, { color: colors.foreground }]}>
              Podemos actualizar esta política de privacidad ocasionalmente. Notificaremos los cambios significativos a través de la aplicación o por correo electrónico.
            </Text>
          </Section>

          <Section title="11. Contacto">
            <Text style={[styles.text, { color: colors.foreground }]}>
              Para cualquier consulta relacionada con la privacidad de tus datos, contacta con nosotros en{" "}
              <Text
                style={{ color: colors.primary }}
                onPress={() => Linking.openURL("mailto:optimaindaluz@gmail.com")}
              >
                optimaindaluz@gmail.com
              </Text>
              .
            </Text>
          </Section>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
  },
  header: {
    padding: 24,
    paddingTop: 32,
    paddingBottom: 32,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    marginBottom: 4,
  },
  headerDate: {
    fontSize: 12,
    color: "rgba(255,255,255,0.65)",
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0a7ea4",
    marginBottom: 8,
  },
  text: {
    fontSize: 14,
    lineHeight: 22,
  },
  bold: {
    fontWeight: "700",
  },
});
