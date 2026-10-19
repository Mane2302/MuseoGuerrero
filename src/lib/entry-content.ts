import type { EntryType, Tradition } from "@/lib/types";

export function getEntryTypeLabel(entryType: EntryType) {
  return entryType === "celebration" ? "Día de Muertos" : "Personaje de la Independencia";
}

export function getEntrySummary(tradition: Tradition) {
  return tradition.entry_type === "celebration"
    ? tradition.celebration_origin_history ?? ""
    : tradition.biography_summary ?? "";
}
