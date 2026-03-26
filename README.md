# 🏛️ Sistema de Encuestas - Municipalidad de Justiniano Posse

Sistema web para registrar visitas ciudadanas y gestionar encuestas de satisfacción.

## ¿Qué hace?

### Panel Administrativo
- **Dashboard** con métricas: satisfacción promedio, total visitas, respuestas y tasa de respuesta
- **Gestión de encuestas**: crear, editar y eliminar preguntas con categorías libres
- **Configuración global**: activar/desactivar encuestas, configurar días de expiración (default: 7)
- **Historial de visitas**: tabla filtrable por área, sección y fecha
- **Registro de auditoría**: log de todas las acciones del sistema
- **WhatsApp**: gestionar conexión, ver QR, reiniciar/recrear instancia

### Panel Empleado
- Buscar ciudadano por DNI (consulta base de personas)
- Registrar visita con área, sección, prioridad y motivo
- Enviar encuesta por WhatsApp automáticamente al registrar

### Vista de Encuesta (Ciudadano)
- Acceso vía link único (`/encuesta/:token`)
- Anónima: sin datos del usuario
- Calificación de 0 a 5 estrellas por pregunta
- Expiración configurable (por defecto 7 días)
- Página de expiración si se agotó el tiempo

## Requisitos

- Node.js 18+
- Dos instancias de Supabase:
  - **Personas**: base existente con datos de ciudadanos
  - **Encuestas**: base propia del sistema
- Evolution API para WhatsApp

## Instalación

```bash
# Instalar dependencias
npm install

# Copiar y configurar variables de entorno
cp .env.example .env
# Editar .env con las claves reales

# Ejecutar migración SQL en Supabase Encuestas
# Copiar el contenido de supabase/migration.sql y ejecutarlo en el SQL Editor de Supabase

# Iniciar servidor de desarrollo
npm run dev
```

## Variables de entorno

| Variable | Descripción |
|----------|-------------|
| `VITE_SUPABASE_ENCUESTAS_URL` | URL de Supabase Encuestas |
| `VITE_SUPABASE_ENCUESTAS_ANON_KEY` | Anon key de Supabase Encuestas |
| `VITE_SUPABASE_PERSONAS_URL` | URL de Supabase Personas |
| `VITE_SUPABASE_PERSONAS_ANON_KEY` | Anon key de Supabase Personas |
| `VITE_EVOLUTION_API_URL` | URL de Evolution API |
| `VITE_EVOLUTION_API_KEY` | API key de Evolution API |
| `VITE_EVOLUTION_INSTANCE` | Nombre de instancia WhatsApp |
| `VITE_APP_URL` | URL pública de la app |

## Base de Datos

El schema SQL está en `supabase/migration.sql`. Incluye:

- **areas**: Áreas municipales (Impuestos, Hospital, etc.)
- **secciones**: Secciones dentro de cada área
- **preguntas**: Preguntas de la encuesta
- **visitas**: Registro de visitas ciudadanas
- **respuestas**: Respuestas anónimas a encuestas
- **respuesta_detalles**: Calificaciones por pregunta
- **encuesta_config**: Configuración global
- **audit_log**: Registro de auditoría

## Deploy con Docker (Easypanel)

```bash
# Build
docker build -t encuestas-muni .

# Run
docker run -p 80:80 encuestas-muni
```

En Easypanel: crear servicio tipo "App", apuntar al repositorio Git, se buildea automáticamente con el Dockerfile.

> **Importante**: Las variables de entorno `VITE_*` se incluyen en el build. Configurarlas antes de buildear.

## Stack

- React + Vite
- Supabase (Auth + DB)
- Recharts (gráficos)
- Evolution API (WhatsApp)
- Nginx (producción)
