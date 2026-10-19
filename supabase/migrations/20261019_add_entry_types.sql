-- Add the municipal Day of the Dead celebration and Independence biography forms.
alter table public.traditions
  add column if not exists entry_type text not null default 'celebration';

alter table public.traditions
  add column if not exists celebration_origin_history text,
  add column if not exists celebration_customs text,
  add column if not exists celebration_social_importance text,
  add column if not exists celebration_conclusion text,
  add column if not exists interviewee_name text,
  add column if not exists person_name text,
  add column if not exists birth_date date,
  add column if not exists birth_place text,
  add column if not exists death_date date,
  add column if not exists death_place text,
  add column if not exists occupation text,
  add column if not exists biography_life_formation text,
  add column if not exists independence_participation text,
  add column if not exists achievements text,
  add column if not exists legacy text,
  add column if not exists biography_summary text,
  add column if not exists personal_conclusion text;

alter table public.traditions
  alter column category drop not null,
  alter column region drop not null,
  alter column description drop not null,
  alter column history drop not null,
  alter column cultural_significance drop not null;

alter table public.traditions
  drop constraint if exists traditions_category_check;

update public.traditions
set celebration_origin_history = coalesce(
      celebration_origin_history,
      'Registro anterior: completar con el origen y la historia de la celebración del Día de Muertos en este municipio.'
    ),
    celebration_customs = coalesce(
      celebration_customs,
      'Registro anterior: investigar y documentar las costumbres y actividades tradicionales del Día de Muertos en este municipio.'
    ),
    celebration_social_importance = coalesce(
      celebration_social_importance,
      'Registro anterior: explicar la participación de la comunidad y la importancia social de esta celebración.'
    ),
    celebration_conclusion = coalesce(
      celebration_conclusion,
      'Registro anterior: concluir qué se aprendió y por qué es importante conservar esta celebración.'
    ),
    status = 'pending'::public.tradition_status,
    review_note = null,
    reviewer_id = null,
    reviewed_at = null
where entry_type = 'celebration'
  and (
    celebration_origin_history is null
    or celebration_customs is null
    or celebration_social_importance is null
    or celebration_conclusion is null
  );

alter table public.traditions
  drop constraint if exists traditions_entry_type_check;

alter table public.traditions
  add constraint traditions_entry_type_check
  check (entry_type in ('celebration', 'biography'));

alter table public.traditions
  drop constraint if exists traditions_entry_content_check;

alter table public.traditions
  add constraint traditions_entry_content_check
  check (
    coalesce(
      (
        entry_type = 'celebration'
        and char_length(celebration_origin_history) between 20 and 2000
        and char_length(celebration_customs) between 20 and 2000
        and char_length(celebration_social_importance) between 20 and 2000
        and char_length(celebration_conclusion) between 20 and 2000
        and (interviewee_name is null or char_length(interviewee_name) between 2 and 120)
      )
      or
      (
        entry_type = 'biography'
        and title = person_name
        and char_length(person_name) between 3 and 140
        and birth_date is not null
        and char_length(birth_place) between 2 and 160
        and death_date is not null
        and char_length(death_place) between 2 and 160
        and char_length(occupation) between 2 and 160
        and char_length(biography_life_formation) between 20 and 2000
        and char_length(independence_participation) between 20 and 2000
        and char_length(achievements) between 20 and 2000
        and char_length(legacy) between 20 and 2000
        and char_length(biography_summary) between 20 and 2000
        and char_length(personal_conclusion) between 20 and 2000
      ),
      false
    )
  );

alter table public.traditions
  drop constraint if exists traditions_biography_date_order_check;

alter table public.traditions
  add constraint traditions_biography_date_order_check
  check (entry_type <> 'biography' or death_date >= birth_date);

notify pgrst, 'reload schema';
