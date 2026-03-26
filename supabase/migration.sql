-- ============================================
-- Sistema de Encuestas - Municipalidad de Justiniano Posse
-- Migration SQL para Supabase Encuestas
-- ============================================

-- Áreas municipales
CREATE TABLE areas (
  id SERIAL PRIMARY KEY,
  descripcion TEXT NOT NULL,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO areas (id, descripcion) VALUES
  (1, 'Impuestos'),
  (2, 'Registro Civil'),
  (3, 'Obras públicas'),
  (4, 'Carnet de conducir'),
  (5, 'Municipalidad'),
  (6, 'Anexo'),
  (7, 'Hospital'),
  (8, 'Biblioteca');

SELECT setval('areas_id_seq', 8);

-- Secciones municipales
CREATE TABLE secciones (
  id SERIAL PRIMARY KEY,
  descripcion TEXT NOT NULL,
  area_id INT REFERENCES areas(id),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO secciones (id, descripcion, area_id) VALUES
  (1, 'Intendencia', 5),
  (2, 'RRHH', 5),
  (3, 'Administración', 5),
  (4, 'Licencias', 6),
  (5, 'Obras Privadas', 6),
  (6, 'Registro Civil', 6),
  (7, 'Habilitaciones', 6),
  (8, 'PAMI', 6),
  (9, 'Atención Médica', 7),
  (10, 'Solicitud Turno', 7),
  (11, 'Atención', 8);

SELECT setval('secciones_id_seq', 11);

-- Configuración global de encuestas
CREATE TABLE encuesta_config (
  id SERIAL PRIMARY KEY,
  activo BOOLEAN DEFAULT true,
  dias_expiracion INT DEFAULT 7,
  mensaje_whatsapp TEXT DEFAULT '🏛️ *Municipalidad de Justiniano Posse*\n\nGracias por visitarnos. Nos gustaría conocer tu opinión para mejorar nuestros servicios.\n\nCompletá la encuesta (es anónima):\n{link}\n\n⏰ Tenés {dias} días para responder.',
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by TEXT
);

INSERT INTO encuesta_config (id) VALUES (1);

-- Preguntas de la encuesta
CREATE TABLE preguntas (
  id SERIAL PRIMARY KEY,
  texto TEXT NOT NULL,
  categoria TEXT,
  max_estrellas INT DEFAULT 5,
  orden INT DEFAULT 0,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Visitas ciudadanas
CREATE TABLE visitas (
  id SERIAL PRIMARY KEY,
  persona_id BIGINT NOT NULL,
  seccion_id INT REFERENCES secciones(id),
  area_id INT REFERENCES areas(id),
  motivo TEXT,
  prioridad TEXT DEFAULT 'normal' CHECK (prioridad IN ('normal', 'urgente')),
  empleado_id TEXT,
  encuesta_enviada BOOLEAN DEFAULT false,
  encuesta_token TEXT UNIQUE,
  telefono_envio TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Respuestas a encuestas (anónimas)
CREATE TABLE respuestas (
  id SERIAL PRIMARY KEY,
  visita_id INT REFERENCES visitas(id),
  token TEXT NOT NULL,
  comentario TEXT,
  estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_revision', 'resuelto')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Calificaciones individuales por pregunta
CREATE TABLE respuesta_detalles (
  id SERIAL PRIMARY KEY,
  respuesta_id INT REFERENCES respuestas(id) ON DELETE CASCADE,
  pregunta_id INT REFERENCES preguntas(id),
  calificacion INT CHECK (calificacion >= 0 AND calificacion <= 5),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Registro de auditoría
CREATE TABLE audit_log (
  id SERIAL PRIMARY KEY,
  accion TEXT NOT NULL,
  tabla TEXT,
  registro_id TEXT,
  usuario_id TEXT,
  detalles JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_visitas_persona ON visitas(persona_id);
CREATE INDEX idx_visitas_created ON visitas(created_at DESC);
CREATE INDEX idx_visitas_token ON visitas(encuesta_token);
CREATE INDEX idx_respuestas_token ON respuestas(token);
CREATE INDEX idx_respuestas_visita ON respuestas(visita_id);
CREATE INDEX idx_respuesta_detalles_respuesta ON respuesta_detalles(respuesta_id);

-- ============================================
-- RLS Policies
-- ============================================
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE secciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE encuesta_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE preguntas ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitas ENABLE ROW LEVEL SECURITY;
ALTER TABLE respuestas ENABLE ROW LEVEL SECURITY;
ALTER TABLE respuesta_detalles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Lectura pública para áreas y secciones
CREATE POLICY "Anyone can read areas" ON areas FOR SELECT USING (true);
CREATE POLICY "Anyone can read secciones" ON secciones FOR SELECT USING (true);

-- Config: lectura pública, escritura autenticados
CREATE POLICY "Anyone can read config" ON encuesta_config FOR SELECT USING (true);
CREATE POLICY "Auth users manage config" ON encuesta_config FOR ALL USING (auth.role() = 'authenticated');

-- Preguntas: lectura pública (encuesta ciudadano), gestión auth
CREATE POLICY "Anyone can read active preguntas" ON preguntas FOR SELECT USING (true);
CREATE POLICY "Auth users manage preguntas" ON preguntas FOR ALL USING (auth.role() = 'authenticated');

-- Visitas: solo autenticados
CREATE POLICY "Auth users manage visitas" ON visitas FOR ALL USING (auth.role() = 'authenticated');

-- Respuestas: inserción anónima, lectura auth
CREATE POLICY "Anyone can insert respuestas" ON respuestas FOR INSERT WITH CHECK (true);
CREATE POLICY "Auth users read respuestas" ON respuestas FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth users update respuestas" ON respuestas FOR UPDATE USING (auth.role() = 'authenticated');

-- Detalles: inserción anónima, lectura auth
CREATE POLICY "Anyone can insert detalles" ON respuesta_detalles FOR INSERT WITH CHECK (true);
CREATE POLICY "Auth users read detalles" ON respuesta_detalles FOR SELECT USING (auth.role() = 'authenticated');

-- Audit log: solo autenticados
CREATE POLICY "Auth users manage audit" ON audit_log FOR ALL USING (auth.role() = 'authenticated');
