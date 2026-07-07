-- ============================================================================
-- 002 — La tabla `visitas` funciona como cola de envío de encuestas
-- ============================================================================
-- El envío de la encuesta por WhatsApp deja de depender de Redis/BullMQ.
-- El worker (workerNotificaciones) recorre esta tabla, envía y actualiza el
-- estado en la misma fila. Estas columnas son el estado de esa "cola".
--
-- Idempotente: se puede correr varias veces sin efectos secundarios.
-- ============================================================================

alter table visitas
  -- Momento real en que el worker confirmó el envío (puede existir de antes)
  add column if not exists encuesta_enviada_at        timestamptz,
  -- Estado del envío: pendiente → enviando → enviada | fallida (con reintentos)
  add column if not exists envio_estado               text        not null default 'pendiente',
  -- Cantidad de intentos de envío realizados
  add column if not exists envio_intentos             int         not null default 0,
  -- No reintentar antes de este momento (backoff / demora configurada)
  add column if not exists envio_proximo_intento_at   timestamptz not null default now(),
  -- Último error de envío (para diagnóstico desde el panel)
  add column if not exists envio_ultimo_error         text;

-- Valores válidos de envio_estado
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'visitas_envio_estado_check'
  ) then
    alter table visitas
      add constraint visitas_envio_estado_check
      check (envio_estado in ('pendiente', 'enviando', 'enviada', 'fallida'));
  end if;
end $$;

-- Backfill: alinear el estado nuevo con el flag histórico `encuesta_enviada`
update visitas
   set envio_estado = 'enviada'
 where encuesta_enviada = true
   and envio_estado <> 'enviada';

-- Índice para la consulta de la cola (estado + próximo intento + orden por antigüedad)
create index if not exists idx_visitas_cola
  on visitas (envio_estado, envio_proximo_intento_at, created_at);
