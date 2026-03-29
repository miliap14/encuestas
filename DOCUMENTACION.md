# Sistema de Encuestas de Satisfacción Ciudadana
### Municipalidad de Justiniano Posse

---

## Índice

1. [Descripción General](#1-descripción-general)
2. [Stack Tecnológico](#2-stack-tecnológico)
3. [Arquitectura de Bases de Datos](#3-arquitectura-de-bases-de-datos)
4. [Esquema de la Base de Datos Principal](#4-esquema-de-la-base-de-datos-principal)
5. [Autenticación y Seguridad](#5-autenticación-y-seguridad)
6. [Flujo Completo del Sistema](#6-flujo-completo-del-sistema)
7. [Módulos del Panel de Administración](#7-módulos-del-panel-de-administración)
8. [Tipos de Preguntas](#8-tipos-de-preguntas)
9. [Integración WhatsApp](#9-integración-whatsapp)
10. [Variables de Entorno](#10-variables-de-entorno)
11. [Estructura de Archivos](#11-estructura-de-archivos)
12. [Desarrollo Local](#12-desarrollo-local)
13. [Despliegue](#13-despliegue)

---

## 1. Descripción General

Este sistema permite a la Municipalidad de Justiniano Posse recolectar opiniones anónimas de los ciudadanos que realizan trámites en las distintas dependencias municipales.

**El flujo principal es:**

1. Un empleado municipal registra la visita del ciudadano en una aplicación separada (`visitas-app`)
2. Si el ciudadano tiene teléfono, se le envía automáticamente un link de encuesta por WhatsApp
3. El ciudadano completa la encuesta desde su celular (anónima, sin login)
4. El equipo administrativo analiza los resultados en el panel de administración de esta app

**Esta aplicación** (`encuestas-app`) es el panel de administración y el formulario público de encuesta. El registro de visitas ocurre en una aplicación separada que comparte la misma base de datos.

---

## 2. Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19 + Vite 8 |
| Routing | React Router v7 |
| Backend / Auth | Supabase (self-hosted) |
| Base de datos | PostgreSQL 15 (vía Supabase) |
| Gráficos | Recharts |
| WhatsApp | Evolution API (Baileys) |
| Contenedores | Docker + Nginx |
| Despliegue | Easypanel |

---

## 3. Arquitectura de Bases de Datos

El sistema involucra **dos instancias separadas de Supabase**. Entender por qué existe esta separación es fundamental.

```
┌─────────────────────────────────────────────────────────┐
│                    EASYPANEL (VPS)                       │
│                                                          │
│  ┌──────────────────────┐   ┌──────────────────────┐    │
│  │  Supabase ENCUESTAS  │   │  Supabase PERSONAS   │    │
│  │  (esta app)          │   │  (app externa)       │    │
│  │                      │   │                      │    │
│  │  • areas             │   │  • personas          │    │
│  │  • secciones         │   │    (DNI, nombre,     │    │
│  │  • preguntas         │   │     teléfono, etc.)  │    │
│  │  • visitas           │   │                      │    │
│  │  • respuestas        │   │  Solo lectura desde  │    │
│  │  • audit_log         │   │  visitas-app         │    │
│  │  • auth (usuarios)   │   │                      │    │
│  └──────────────────────┘   └──────────────────────┘    │
│            ▲                           ▲                 │
│            │                           │                 │
│     encuestas-app               visitas-app              │
│     (este repo)                 (repo separado)          │
└─────────────────────────────────────────────────────────┘
```

### ¿Por qué dos instancias?

**Supabase PERSONAS** contiene el padrón de ciudadanos del municipio: DNI, nombre, apellido, teléfono, dirección, etc. Es un sistema preexistente que pertenece a otra área y tiene sus propias políticas de acceso. Esta base de datos es **de solo lectura** para todos los sistemas externos — ninguna app puede modificar datos de ciudadanos, solo consultarlos.

**Supabase ENCUESTAS** es la base de datos propia de este sistema. Almacena todo lo relacionado con la gestión de encuestas: visitas registradas, respuestas, preguntas, configuración y usuarios del sistema.

### JWT compartido

Ambas instancias de Supabase utilizan el **mismo `JWT_SECRET`**. Esto significa que un usuario autenticado en `encuestas` tiene un token que también es válido en `personas`. Así, las políticas RLS de `personas` pueden verificar `auth.role() = 'authenticated'` y funcionar correctamente para los usuarios logueados en `encuestas`, sin necesidad de un segundo sistema de autenticación.

### URLs de las instancias

| Instancia | URL |
|-----------|-----|
| Encuestas (API) | `https://api-encuestas-supabase.odsfm4.easypanel.host` |
| Encuestas (Studio) | `https://encuestas-supabase.odsfm4.easypanel.host` |
| Personas (API) | `https://api-muni-personas.odsfm4.easypanel.host` |

---

## 4. Esquema de la Base de Datos Principal

### Diagrama de relaciones

```
areas (gestionadas desde /areas)
  └── secciones (gestionadas desde /areas)
        └── visitas ──────────────────────────────────────┐
                                                           │
preguntas                                                  │
  └── pregunta_opciones (opciones para tipo "multiple")    │
                                                           │
encuesta_config (1 registro global)                        │
                                                           ▼
                                                      respuestas
                                                           └── respuesta_detalles

audit_log (independiente)
```

### Tablas

#### `areas`
Dependencias municipales. Gestionadas desde `/areas` en el panel admin.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | SERIAL PK | |
| descripcion | TEXT | Nombre del área (ej: "Hospital", "Registro Civil") |
| activo | BOOLEAN | Las inactivas no aparecen en el selector de secciones |

Áreas iniciales: Impuestos, Registro Civil, Obras Públicas, Carnet de Conducir, Municipalidad, Anexo, Hospital, Biblioteca.

#### `secciones`
Subdivisiones dentro de cada área. Gestionadas desde `/areas` en el panel admin.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | SERIAL PK | |
| descripcion | TEXT | Nombre de la sección |
| area_id | INT FK | Área a la que pertenece |
| activo | BOOLEAN | |

#### `encuesta_config`
Configuración global del sistema. Siempre tiene exactamente **1 registro** (id=1).

| Campo | Tipo | Descripción |
|-------|------|-------------|
| activo | BOOLEAN | Si está en false, todas las encuestas muestran "expirada" |
| dias_expiracion | INT | Días que tiene el ciudadano para responder desde que recibe el link |
| mensaje_whatsapp | TEXT | Plantilla del mensaje de WhatsApp (soporta `{link}` y `{dias}`) |

#### `preguntas`
Las preguntas que aparecen en la encuesta. Gestionadas desde el panel admin.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | SERIAL PK | |
| texto | TEXT | Enunciado de la pregunta |
| categoria | TEXT | Agrupación visual (ej: "Atención al Público") |
| tipo | TEXT | `'estrellas'`, `'texto'` o `'multiple'` |
| max_estrellas | INT | Solo para tipo `estrellas`. Por defecto 5 |
| max_selecciones | INT | Solo para tipo `multiple`. Máximo de opciones elegibles |
| orden | INT | Posición en la encuesta (editable desde el admin) |
| activo | BOOLEAN | Solo las activas aparecen en la encuesta |

#### `pregunta_opciones`
Opciones para preguntas de tipo `multiple`. Se eliminan y recrean al editar la pregunta.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | SERIAL PK | |
| pregunta_id | INT FK | Pregunta a la que pertenece |
| texto | TEXT | Texto de la opción (ej: "Salud", "Seguridad") |
| orden | INT | Orden de aparición |

#### `visitas`
Cada visita de un ciudadano registrada por `visitas-app`. Esta app solo las lee.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | SERIAL PK | |
| persona_id | BIGINT | ID del ciudadano en la base PERSONAS (no es FK, bases distintas) |
| seccion_id | INT FK | Sección atendida |
| area_id | INT FK | Área atendida |
| motivo | TEXT | Motivo de la visita |
| prioridad | TEXT | `'normal'` o `'urgente'` |
| empleado_id | TEXT | Identificador del empleado que registró |
| encuesta_enviada | BOOLEAN | Si se envió el link por WhatsApp |
| encuesta_token | TEXT UNIQUE | UUID que identifica la encuesta de esta visita |
| telefono_envio | TEXT | Número al que se envió el mensaje |
| created_at | TIMESTAMPTZ | |

#### `respuestas`
Una respuesta por visita. La inserción es anónima (no requiere auth).

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | SERIAL PK | |
| visita_id | INT FK | |
| token | TEXT | Mismo token de la visita (para validar acceso) |
| comentario | TEXT | Comentario libre general (campo opcional al final) |
| estado | TEXT | `'pendiente'`, `'en_revision'`, `'resuelto'` |
| created_at | TIMESTAMPTZ | |

#### `respuesta_detalles`
Una fila por cada pregunta respondida. El campo utilizado depende del tipo de pregunta.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | SERIAL PK | |
| respuesta_id | INT FK | |
| pregunta_id | INT FK | |
| calificacion | INT | Para tipo `estrellas` (1-5). NULL en otros tipos |
| respuesta_texto | TEXT | Para tipo `texto`. NULL en otros tipos |
| opciones_seleccionadas | JSONB | Para tipo `multiple`. Array de strings con los textos elegidos. NULL en otros tipos |

#### `audit_log`
Registro de todas las acciones realizadas desde el panel admin.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | SERIAL PK | |
| accion | TEXT | Nombre de la acción (ej: `'crear_pregunta'`, `'actualizar_config'`) |
| tabla | TEXT | Tabla afectada |
| registro_id | TEXT | ID del registro afectado |
| usuario_id | TEXT | ID del usuario que realizó la acción |
| detalles | JSONB | Datos adicionales del cambio |
| created_at | TIMESTAMPTZ | |

### Políticas RLS (Row-Level Security)

Todas las tablas tienen RLS habilitado.

| Tabla | Lectura anónima | Escritura anónima | Auth requerida |
|-------|:-:|:-:|:-:|
| areas | ✅ | ❌ | Escritura |
| secciones | ✅ | ❌ | Escritura |
| encuesta_config | ✅ | ❌ | Escritura |
| preguntas | ✅ | ❌ | Escritura |
| pregunta_opciones | ✅ | ❌ | Escritura |
| visitas | ❌ | ❌ | Todo |
| respuestas | ❌ | ✅ INSERT | Lectura/Update |
| respuesta_detalles | ❌ | ✅ INSERT | Lectura |
| audit_log | ❌ | ❌ | Todo |

> **Por qué `respuestas` permite INSERT anónimo:** El ciudadano que completa la encuesta no tiene cuenta en el sistema. La anonimidad es intencional y está garantizada por RLS — puede insertar pero no leer ni modificar.

---

## 5. Autenticación y Seguridad

### Autenticación
El sistema usa autenticación nativa de Supabase con **email y contraseña**. Los usuarios administradores son creados directamente desde Supabase Studio (no hay registro público).

```
Admin → /login → email + password → Supabase Auth → JWT → sesión en localStorage
```

La sesión se gestiona automáticamente por el cliente de Supabase JS y se persiste entre recargas. Al expirar, Supabase la renueva automáticamente usando el refresh token.

### Protección de rutas
El componente `ProtectedRoute` en `App.jsx` verifica que exista un usuario en el contexto de auth antes de renderizar cualquier ruta admin. Si no hay sesión, redirige a `/login`.

### Seguridad de la encuesta pública
El formulario de encuesta en `/encuesta/:token` es público (sin auth) pero está protegido por:
- **Token UUID**: generado con `crypto.randomUUID()`, prácticamente imposible de adivinar
- **Expiración**: configurable en días desde la fecha de la visita
- **Uso único**: una vez respondida, el token queda marcado y no puede responderse de nuevo
- **RLS**: la inserción de respuestas solo acepta tokens que correspondan a visitas existentes

---

## 6. Flujo Completo del Sistema

### Desde la perspectiva del ciudadano

```
1. El ciudadano realiza un trámite en la municipalidad

2. El empleado registra la visita en visitas-app:
   - Busca al ciudadano por DNI (consulta Supabase PERSONAS)
   - Selecciona área y sección
   - Registra el motivo y prioridad
   - Si el ciudadano tiene teléfono → se genera un token UUID
     y se envía automáticamente el link por WhatsApp

3. El ciudadano recibe el mensaje:
   "Gracias por visitarnos. Completá la encuesta: https://encuestas-app.../encuesta/{token}"

4. El ciudadano abre el link y ve el formulario de encuesta:
   - Preguntas de estrellas (1-5)
   - Preguntas de texto libre
   - Preguntas de selección múltiple
   - Campo de comentario general (opcional)

5. Al enviar:
   - Se crea un registro en `respuestas`
   - Se crea un registro en `respuesta_detalles` por cada pregunta respondida
   - El ciudadano es redirigido a /encuesta/gracias

6. El equipo administrativo ve los resultados en el dashboard
```

### Validaciones del formulario de encuesta

Antes de mostrar el formulario, el sistema verifica en orden:
1. ¿Existe el token en la tabla `visitas`?
2. ¿Ya fue respondida esta encuesta (existe registro en `respuestas` con ese token)?
3. ¿Está activa la encuesta según `encuesta_config.activo`?
4. ¿No expiró según `created_at` + `dias_expiracion`?

Si alguna verificación falla, se muestra una pantalla de error apropiada.

---

## 7. Módulos del Panel de Administración

Todas las rutas bajo `/` requieren sesión activa.

### `/dashboard` — Centro de Control
Métricas generales del sistema:
- Satisfacción promedio (basada en calificaciones de preguntas tipo estrella)
- Total de visitas registradas
- Total de encuestas respondidas
- Tasa de respuesta (respuestas / visitas)
- Gráfico de barras: visitas en los últimos 30 días
- Gráfico de torta: distribución de respuestas por categoría de pregunta
- Tabla de los últimos 5 comentarios recibidos

### `/encuestas` — Gestionar Encuestas
Permite administrar las preguntas y la configuración global:
- Crear, editar y eliminar preguntas
- Tres tipos de pregunta (ver sección 8)
- Activar/desactivar preguntas individualmente
- Reordenar preguntas con botones ▲▼ (el orden se persiste en la BD)
- **Vista Previa**: modal que muestra cómo ve el ciudadano la encuesta
- Configuración global: activar/desactivar sistema, días de expiración

### `/visitas` — Historial de Visitas
Lista paginada (20 por página) de todas las visitas registradas:
- Filtros por área, sección y rango de fechas
- Muestra persona_id, área, sección, prioridad, estado de la encuesta
- Indica si la encuesta fue enviada y si fue respondida

### `/auditoria` — Registro de Auditoría
Log completo de todas las acciones realizadas en el sistema:
- Quién hizo qué y cuándo
- Detalles del cambio en formato JSON

### `/areas` — Áreas y Secciones
Gestión de la estructura organizacional municipal:
- Crear, editar, activar/desactivar y eliminar áreas
- Crear, editar, activar/desactivar y eliminar secciones asignándolas a un área
- Vista jerárquica: cada área muestra sus secciones anidadas con conteo de activas
- Protección al eliminar: no se puede borrar un área que todavía tiene secciones

### `/whatsapp` — Configuración WhatsApp
Gestión de la conexión de WhatsApp vía Evolution API:
- Estado de conexión (activo/desconectado)
- QR Code para vincular sesión (se actualiza automáticamente cada 10 segundos)
- Acciones: Reiniciar instancia, Desconectar, Recrear instancia

---

## 8. Tipos de Preguntas

### `estrellas` (Calificación)
El ciudadano elige entre 1 y 5 estrellas. La respuesta se guarda en `respuesta_detalles.calificacion`.

### `texto` (Respuesta libre)
El ciudadano escribe lo que quiera en un textarea. La respuesta se guarda en `respuesta_detalles.respuesta_texto`.

### `multiple` (Selección múltiple)
El ciudadano elige hasta N opciones de una lista predefinida. Las opciones se configuran al crear/editar la pregunta y se guardan en `pregunta_opciones`. La respuesta se guarda en `respuesta_detalles.opciones_seleccionadas` como un array JSON de strings (textos de las opciones elegidas, no IDs).

> **Nota de diseño:** Las respuestas de tipo `multiple` almacenan el **texto** de la opción, no el ID. Esto es intencional: si una opción es modificada o eliminada en el futuro, las respuestas históricas conservan el valor exacto que el ciudadano vio y eligió.

---

## 9. Integración WhatsApp

Se utiliza **Evolution API** con el adaptador **WhatsApp Baileys** (no requiere API oficial de Meta ni número de negocio verificado). La instancia corre en el mismo servidor de Easypanel.

### Configuración inicial
La primera vez que se usa, desde `/whatsapp` se escanea el QR code con la app de WhatsApp del número que se quiere usar como emisor.

### Envío de mensajes
Cuando `visitas-app` registra una visita con teléfono, llama al endpoint de Evolution API para enviar el mensaje. El número se formatea automáticamente al estándar internacional argentino (código de país 54).

### Plantilla del mensaje
Configurable desde `/encuestas`. Soporta dos variables:
- `{link}` → URL completa de la encuesta
- `{dias}` → Días de vigencia (tomado de `encuesta_config.dias_expiracion`)

---

## 10. Variables de Entorno

El archivo `.env` **no se commitea** ni se incluye en el build de Docker. Las variables se pasan como **build arguments** en Easypanel al momento del deploy.

```env
# Base de datos de encuestas (esta app)
VITE_SUPABASE_ENCUESTAS_URL=https://api-encuestas-supabase.odsfm4.easypanel.host
VITE_SUPABASE_ENCUESTAS_ANON_KEY=eyJ...

# Base de datos de personas (usada por visitas-app, mismo JWT_SECRET)
VITE_SUPABASE_PERSONAS_URL=https://api-muni-personas.odsfm4.easypanel.host
VITE_SUPABASE_PERSONAS_ANON_KEY=eyJ...

# Evolution API (WhatsApp)
VITE_EVOLUTION_API_URL=https://front-evolution-api.odsfm4.easypanel.host
VITE_EVOLUTION_API_KEY=...
VITE_EVOLUTION_INSTANCE=Encuestas

# URL pública de esta app (usado como redirectTo en el callback OAuth si aplica)
VITE_APP_URL=https://encuestas-app.odsfm4.easypanel.host
```

> **Todas las variables son `VITE_*`** porque Vite las bake en el bundle JS en tiempo de build. No son secretos en runtime — están expuestas en el JavaScript que descarga el browser. La seguridad real la proveen las políticas RLS de Supabase y la anon key (que solo permite lo que RLS permite).

### Para desarrollo local
Crear un archivo `.env.local` (ignorado por git y Docker) con:
```env
VITE_APP_URL=http://localhost:5173
```
El resto de las variables se heredan del `.env`.

---

## 11. Estructura de Archivos

```
encuestas/
├── src/
│   ├── App.jsx                    # Rutas y ProtectedRoute
│   ├── main.jsx                   # Entry point
│   ├── contexts/
│   │   └── AuthContext.jsx        # Estado de sesión global (user, signIn, signOut)
│   ├── lib/
│   │   ├── supabaseEncuestas.js   # Cliente Supabase → BD encuestas
│   │   └── evolutionApi.js        # Cliente Evolution API → WhatsApp
│   ├── layouts/
│   │   └── AdminLayout.jsx        # Sidebar + topbar del panel admin
│   ├── components/
│   │   ├── StarRating.jsx         # Input de estrellas (reutilizable)
│   │   └── StatsCard.jsx          # Tarjeta de métricas del dashboard
│   └── pages/
│       ├── Login.jsx              # Pantalla de login
│       ├── admin/
│       │   ├── Dashboard.jsx      # Métricas y gráficos
│       │   ├── ManageSurveys.jsx  # ABM preguntas + config + vista previa + reordenar
│       │   ├── AreasConfig.jsx    # ABM áreas y secciones con vista jerárquica
│       │   ├── Visits.jsx         # Historial de visitas
│       │   ├── AuditLog.jsx       # Log de auditoría
│       │   └── WhatsAppConfig.jsx # Gestión conexión WhatsApp
│       └── survey/
│           ├── SurveyForm.jsx     # Formulario público de encuesta
│           └── ThankYou.jsx       # Página de agradecimiento post-encuesta
├── supabase/
│   └── migration.sql              # Schema completo + RLS (ejecutar en Supabase Studio)
├── Dockerfile                     # Build multistage: node:20 → nginx:alpine
├── nginx.conf                     # SPA fallback (todas las rutas sirven index.html)
├── .env.example                   # Template de variables de entorno
└── .dockerignore                  # Excluye node_modules, dist, .env
```

---

## 12. Desarrollo Local

### Requisitos
- Node.js 20+
- Acceso a las instancias de Supabase (las de producción, no hay instancia local)

### Setup

```bash
# 1. Clonar el repositorio
git clone <repo-url>
cd encuestas

# 2. Instalar dependencias
npm install

# 3. Crear variables de entorno locales
# Copiar el contenido de .env.example a .env y completar los valores
# Luego crear .env.local con:
echo "VITE_APP_URL=http://localhost:5173" > .env.local

# 4. Correr en desarrollo
npm run dev
```

La app estará disponible en `http://localhost:5173`.

> **Nota:** El desarrollo local apunta directamente a las bases de datos de producción. No hay entorno de staging. Tener cuidado con las operaciones de escritura.

---

## 13. Despliegue

El despliegue es automático vía Easypanel cuando se hace push a la rama `main`.

### Proceso de build (Dockerfile)

```
1. node:20-alpine  →  npm ci  →  npm run build  →  genera /dist
2. nginx:alpine    →  copia /dist  →  sirve en puerto 80
```

### Build Arguments en Easypanel

Como las variables `VITE_*` se necesitan en tiempo de build (no runtime), deben configurarse como **Build Arguments** en el servicio de Easypanel — no como environment variables del container.

### Nginx

Configuración mínima con SPA fallback: cualquier ruta que no sea un archivo estático sirve `index.html`, permitiendo que React Router maneje la navegación del lado del cliente.

### Base de datos

Los cambios de schema se aplican manualmente ejecutando el SQL en **Supabase Studio**. No hay migraciones automáticas. El archivo `supabase/migration.sql` es el schema completo y debe ejecutarse desde cero en una instancia nueva.

---

## Consideraciones para el futuro

- **`visitas-app`**: aplicación separada (pendiente de desarrollo) que maneja el registro de visitas ciudadanas. Usa ambas instancias de Supabase con el mismo JWT_SECRET.
- **Reportes exportables**: los datos de `respuesta_detalles` permiten análisis por tipo de pregunta, pero actualmente solo se muestran las calificaciones de estrellas en el dashboard. Las respuestas de texto y selección múltiple están almacenadas pero pendientes de visualización.
