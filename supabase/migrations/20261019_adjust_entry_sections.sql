-- Make fields removed from the forms optional without deleting historical content.
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
        and char_length(celebration_conclusion) between 20 and 2000
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
        and char_length(independence_participation) between 20 and 2000
        and char_length(achievements) between 20 and 2000
        and char_length(biography_summary) between 20 and 2000
        and char_length(personal_conclusion) between 20 and 2000
      ),
      false
    )
  );

notify pgrst, 'reload schema';
