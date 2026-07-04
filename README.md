# Territorios 🗺️

Aplicación móvil para Android e iOS que permite registrar visitas y contactos institucionales sobre mapas interactivos de Argentina y la Provincia de Buenos Aires.

---

## Funcionalidades

- **Mapa de Argentina** — 24 jurisdicciones interactivas (23 provincias + CABA)
- **Mapa de Buenos Aires** — 135 partidos interactivos con buscador por nombre
- **Registro por territorio** — fecha de visita, contacto, organización, notas y estado
- **Coloreado dinámico** — las jurisdicciones se colorean según su estado (Pendiente / En gestión / Visitado)
- **Persistencia offline** — todos los datos se guardan localmente con SQLite (sobreviven entre sesiones)
- **Exportación Excel** — genera un `.xlsx` con toda la información registrada y lo comparte desde el dispositivo

---

## Requisitos

- Node.js 18+
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- Android Studio (para Android) o Xcode (para iOS)
- Dispositivo o emulador Android / iOS

---

## Instalación

```bash
# 1. Instalar dependencias
cd territorios-app
npm install

# 2. Iniciar el servidor de desarrollo
npx expo start

# 3. Escanear el QR con Expo Go (Android/iOS)
#    o presionar 'a' para Android / 'i' para iOS en emulador
```

---

## Estructura del proyecto

```
territorios-app/
├── App.tsx                        # Entrada principal
├── src/
│   ├── types/index.ts             # Tipos TypeScript
│   ├── navigation/AppNavigator.tsx # Navegación inferior
│   ├── screens/
│   │   ├── WelcomeScreen.tsx      # Pantalla de inicio
│   │   ├── ArgentinaScreen.tsx    # Mapa de Argentina
│   │   └── BuenosAiresScreen.tsx  # Mapa de Bs. As.
│   ├── components/
│   │   ├── InteractiveMap.tsx     # Componente SVG del mapa
│   │   └── InfoModal.tsx          # Formulario de datos
│   ├── data/
│   │   ├── argentina-geojson.ts   # Polígonos de provincias
│   │   └── buenosaires-geojson.ts # Polígonos de partidos
│   ├── storage/
│   │   └── database.ts            # SQLite (expo-sqlite)
│   └── utils/
│       ├── geoProjection.ts       # GeoJSON → SVG
│       └── exportExcel.ts         # SheetJS + expo-sharing
```

---

## Cómo usar la app

1. Abrí la app y seleccioná un territorio desde la pantalla de inicio
2. Tocá una provincia o partido en el mapa
3. Completá el formulario: estado, fecha, contacto, organización y notas
4. Presioná **Guardar** — el territorio se colorea inmediatamente
5. Para exportar, presioná el botón **📤 Exportar** en la barra superior

---

## Mejorar la precisión del mapa (recomendado para producción)

Los archivos `src/data/argentina-geojson.ts` y `src/data/buenosaires-geojson.ts` contienen polígonos **simplificados**. Para usar formas oficiales y precisas:

### Argentina (provincias)
Descargá el GeoJSON oficial del IGN:
```
https://www.ign.gob.ar/NuestrasActividades/InformacionGeoespacial/CapasSIG
```
→ Sección "Límites" → "Provincias" → descargar en formato GeoJSON o SHP.

### Buenos Aires (partidos)
```
https://datos.gob.ar/dataset/jgm-mapa-digital-republica-argentina
```
→ O desde el portal de datos de la Provincia: https://www.gba.gob.ar/estadistica

Una vez con el archivo `.geojson`, reemplazá el contenido de los archivos de datos manteniendo la misma estructura (propiedad `id` y `name` en cada `Feature.properties`).

---

## Stack tecnológico

| Tecnología | Uso |
|---|---|
| React Native + Expo | Framework multiplataforma |
| react-native-svg | Renderizado del mapa SVG |
| expo-sqlite | Persistencia local (SQLite) |
| SheetJS (xlsx) | Generación del archivo Excel |
| expo-sharing | Compartir el archivo desde el dispositivo |
| expo-file-system | Escritura del archivo temporal |
| React Navigation | Navegación entre pantallas |

---

## Build para producción

```bash
# Android (.apk / .aab)
npx expo build:android
# o con EAS Build:
npx eas build --platform android

# iOS (.ipa)
npx expo build:ios
# o con EAS Build:
npx eas build --platform ios
```

Requerís una cuenta en https://expo.dev para EAS Build.

---

## Licencia

Uso institucional. Desarrollado con Claude (Anthropic).
