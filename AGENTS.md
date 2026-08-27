# Versionado del proyecto

- Después de cada cambio funcional solicitado por el usuario, ejecutar una sola vez `npm.cmd run version:bump`.
- No incrementar la versión por inspecciones, pruebas, compilaciones repetidas o cambios que formen parte de la misma solicitud.
- El formato oficial es `2.x.x`; normalmente se incrementa el último segmento.
- `VERSION.json` es la referencia central. El comando sincroniza `package.json`, `package-lock.json`, `js/core/supabase.js` y la versión Android.
- Antes de entregar una APK, ejecutar `npm.cmd run mobile:sync` y compilar Android después del incremento de versión.
