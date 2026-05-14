# Guía de Publicación y Actualización — ComercialApp

## Estado Actual

**Plataforma iOS (App Store):** ✅ Publicada en revisión (7 de abril de 2026)
**Plataforma Android (Google Play):** ✅ Publicada (marzo de 2026)

---

## Flujo de Publicación Inicial (Completado)

### iOS — App Store

1. **Preparación en App Store Connect**
   - Crear app con Bundle ID: `space.manus.comerciales.energia.t20260323181154`
   - Rellenar información de la app (nombre, descripción, categoría, palabras clave)
   - Añadir URLs de soporte y política de privacidad
   - Configurar privacidad de la app (datos recogidos y uso)
   - Clasificación de contenido

2. **Build con EAS Build**
   ```bash
   cd ~/Desktop/comerciales-energia
   npm install
   npx eas-cli build --platform ios --profile production
   ```

3. **Subida con Transporter**
   - Descargar Transporter desde Mac App Store
   - Abrir Transporter e iniciar sesión
   - Arrastrar el IPA a Transporter
   - Hacer clic en "Entregar" (Deliver)

4. **Envío para Revisión**
   - Ir a App Store Connect → ComercialApps → Distribución
   - Hacer clic en "Enviar para revisión" (Submit for Review)
   - Apple revisa en 24-48 horas
   - Si aprueba, se publica automáticamente

### Android — Google Play

1. **Build con EAS Build**
   ```bash
   npx eas-cli build --platform android --profile production
   ```

2. **Subida a Google Play Console**
   - Descargar el AAB (Android App Bundle)
   - Ir a Google Play Console
   - Crear release → Subir AAB
   - Rellenar detalles de release
   - Enviar para revisión

---

## Proceso de Actualización (Para Futuras Versiones)

### Paso 1: Actualizar Versión

Edita `app.config.ts` e incrementa la versión:

```typescript
version: "1.0.0" → "1.0.1"  // Cambio menor
version: "1.0.0" → "1.1.0"  // Cambio de feature
version: "1.0.0" → "2.0.0"  // Cambio mayor
```

**Nota:** Mantén la versión sincronizada entre iOS y Android.

### Paso 2: Hacer Cambios en el Código

Edita los archivos necesarios en `/home/ubuntu/comerciales-energia`:

```bash
cd ~/Desktop/comerciales-energia
# Haz tus cambios aquí
```

### Paso 3: Construir el IPA/APK

**Para iOS:**
```bash
npm install
npx eas-cli build --platform ios --profile production
```

**Para Android:**
```bash
npm install
npx eas-cli build --platform android --profile production
```

### Paso 4: Subir a la Tienda

**iOS — Transporter:**
1. Descarga el IPA de EAS Build
2. Abre Transporter
3. Arrastra el IPA
4. Haz clic en "Entregar"

**Android — Google Play Console:**
1. Descarga el AAB de EAS Build
2. Ve a Google Play Console
3. Crea un nuevo release
4. Sube el AAB
5. Rellena notas de release

### Paso 5: Enviar para Revisión

**iOS:**
- App Store Connect → Distribución → "Enviar para revisión"

**Android:**
- Google Play Console → Release → "Revisar y lanzar"

### Paso 6: Monitorear Revisión

- **iOS:** 24-48 horas típicamente
- **Android:** Puede ser más rápido (horas)

Si Apple rechaza, verás el motivo en App Store Connect. Corrige y reenvía.

---

## Información de Contacto y Recursos

| Recurso | URL |
|---------|-----|
| App Store Connect | https://appstoreconnect.apple.com |
| Google Play Console | https://play.google.com/console |
| Política de Privacidad | https://comercialapp-8bzfimfb.manus.space/api/privacidad |
| Documentación Expo | https://docs.expo.dev |
| EAS Build | https://docs.expo.dev/eas-update/introduction/ |

---

## Checklist Antes de Cada Actualización

- [ ] Versión incrementada en `app.config.ts`
- [ ] Cambios de código completados y testeados
- [ ] `npm install` ejecutado
- [ ] Build completado sin errores
- [ ] IPA/APK descargado
- [ ] Notas de release preparadas
- [ ] Política de privacidad actualizada (si aplica)
- [ ] Transporter/Google Play Console listo

---

## Troubleshooting Común

| Problema | Solución |
|----------|----------|
| Build falla en EAS | Verifica que `package.json` tenga versiones correctas de Expo SDK 54 |
| Transporter rechaza IPA | Asegúrate de que el Bundle ID coincida con App Store Connect |
| Apple rechaza la app | Revisa el motivo en App Store Connect y corrige (suele ser política de privacidad) |
| Android build falla | Verifica `compileSdkVersion` y `targetSdkVersion` en `expo-build-properties` |

---

## Próximos Pasos Recomendados

1. **Monitorear revisión de iOS** — Esperar aprobación de Apple (24-48h)
2. **Recopilar feedback de usuarios** — Una vez publicada, recibir comentarios
3. **Migración a Supabase** — Cambiar de Manus DB a Supabase free tier (cuando sea necesario)
4. **Optimización de performance** — Mejorar velocidad y eficiencia de la app
5. **Nuevas features** — Basadas en feedback de usuarios

---

**Última actualización:** 7 de abril de 2026
**Estado:** iOS en revisión, Android publicada
