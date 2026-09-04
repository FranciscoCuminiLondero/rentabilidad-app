# Rentabilidad de alquiler (PWA)

App para calcular en segundos si un alquiler rinde: precio de compra en
dólares, alquiler mensual en pesos, y el dólar oficial (venta) traído
automáticamente desde [DolarAPI](https://dolarapi.com) (con opción de
carga manual).

- Si escribís `47` en "Precio de compra" se interpreta como `47.000`
  (y lo mismo para el alquiler). Si escribís el número completo, se
  toma tal cual.
- Rentabilidad ≥ 6% se muestra en verde; por debajo, en rojo.
- Funciona offline una vez instalada (service worker + caché de la
  última cotización del dólar).

## Requisitos

- Node.js 18 o superior

## Desarrollo local

```bash
npm install
npm run dev
```

## Build de producción

```bash
npm run build
npm run preview   # para probar el build localmente
```

`npm run build` genera la carpeta `dist/` con la PWA completa
(HTML/CSS/JS + manifest.webmanifest + service worker `sw.js`).

## Publicarla para que se pueda "instalar"

Una PWA necesita estar servida por HTTPS para ser instalable (no
alcanza con abrir el archivo local). Opciones gratuitas y rápidas:

- **Vercel**: `npx vercel` desde esta carpeta (o conectar el repo de
  GitHub).
- **Netlify**: arrastrar la carpeta `dist/` a
  [app.netlify.com/drop](https://app.netlify.com/drop), o conectar el
  repo.
- **GitHub Pages**: subir el contenido de `dist/` a una rama
  `gh-pages`.

Una vez publicada, entrando desde el celular (Chrome en Android o
Safari en iOS) aparece la opción "Agregar a pantalla de inicio" /
"Instalar app".

## Migración futura a Capacitor (APK real)

Cuando quieras un `.apk` instalable fuera del navegador, el mismo
código sirve de base:

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init "Rentabilidad" "com.tuusuario.rentabilidad" --web-dir=dist
npm run build
npx cap add android
npx cap sync
npx cap open android   # abre Android Studio para compilar el APK
```

No hace falta reescribir nada de la interfaz: Capacitor empaqueta el
mismo `dist/` que ya genera esta PWA.
