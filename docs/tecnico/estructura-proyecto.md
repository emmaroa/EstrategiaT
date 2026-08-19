# Estructura del proyecto

```text
EstrategiaT/
├── index.html                 # Inicio de sesión
├── dashboard.html             # Panel principal
├── buscador-unidades.html     # Buscador global
├── assets/
│   └── icons/                 # Íconos de la aplicación
├── css/                       # Sistema visual y estilos por módulo
├── js/
│   ├── core/                  # Infraestructura compartida
│   ├── modules/               # Lógica propia de pantallas
│   └── services/              # Datos y reglas de dominio
├── modulos/                   # Interfaces funcionales
├── supabase/migrations/       # Esquema y evolución de base de datos
├── templates/
│   └── tiempo-extra/          # Plantillas del módulo
├── scripts/                   # Desarrollo, verificación y compilación
├── docs/                      # Documentación por audiencia
├── android/                   # Proyecto nativo de Capacitor
└── www/                       # Salida web generada
```

## Reglas de ubicación

- Una pantalla nueva se crea en `modulos/`.
- El comportamiento reutilizable pertenece a `js/core/`.
- Las consultas y operaciones de un dominio pertenecen a `js/services/`.
- La lógica extensa exclusiva de una pantalla pertenece a `js/modules/`.
- Los estilos compartidos van en `css/design-system.css`; los particulares usan un archivo con el nombre del módulo.
- Los cambios de base de datos siempre se agregan como una nueva migración numerada.
- Los archivos comerciales y manuales no deben permanecer en la raíz.
