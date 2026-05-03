-- =========================================================
-- TABLA CENTRAL PARA HISTORIAL DE CARGUÍO OPITBLAST
-- Ejecutar en Supabase > SQL Editor
-- =========================================================

create table if not exists public.historial_carga_opit (
  clave text primary key,
  blast_id text not null,
  taladro_id text,
  label text,
  taladro text,
  ultimo_ch integer,
  fecha_inicio_seguimiento timestamptz,
  fecha_inicio_seguimiento_texto text,
  fecha_carga_detectada timestamptz,
  fecha_carga_detectada_texto text,
  metodo_fecha_carga text,
  ultima_revision timestamptz,
  ultima_revision_texto text,
  editado_manualmente boolean default false,
  comentario_edicion text,
  updated_at timestamptz default now()
);

create index if not exists idx_historial_carga_opit_blast_id
on public.historial_carga_opit (blast_id);

create index if not exists idx_historial_carga_opit_label
on public.historial_carga_opit (label);

alter table public.historial_carga_opit enable row level security;

-- Lectura pública para que cualquier persona con el dashboard vea el mismo historial.
drop policy if exists "historial_opit_select_public" on public.historial_carga_opit;
create policy "historial_opit_select_public"
on public.historial_carga_opit
for select
to anon
using (true);

-- Inserción pública para que el dashboard registre el primer seguimiento.
drop policy if exists "historial_opit_insert_public" on public.historial_carga_opit;
create policy "historial_opit_insert_public"
on public.historial_carga_opit
for insert
to anon
with check (true);

-- Actualización pública para que el dashboard actualice ultimo_ch y permita edición manual.
drop policy if exists "historial_opit_update_public" on public.historial_carga_opit;
create policy "historial_opit_update_public"
on public.historial_carga_opit
for update
to anon
using (true)
with check (true);

-- Grant de permisos para la API pública con RLS.
grant usage on schema public to anon;
grant select, insert, update on public.historial_carga_opit to anon;
