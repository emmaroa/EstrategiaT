# Aplicación móvil

La app reutiliza la aplicación web y Supabase mediante Capacitor. Esto mantiene los mismos módulos, roles, permisos y datos en web, Android e iOS.

## Preparación

1. Instalar Node.js 20 o superior.
2. Ejecutar `npm install`.
3. Crear las plataformas una sola vez con `npx cap add android` y, en macOS, `npx cap add ios`.

## Desarrollo

- Sincronizar cambios: `npm run mobile:sync`
- Abrir Android Studio: `npm run mobile:android`
- Abrir Xcode: `npm run mobile:ios`

La sincronización reconstruye `www/` desde los archivos actuales. No se debe editar `www/` manualmente. Android requiere Android Studio; iOS requiere una Mac con Xcode.
