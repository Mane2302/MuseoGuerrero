export type TraditionStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "changes_requested";

export type AppRole = "student" | "admin";
export type EntryType = "celebration" | "biography";

export type Tradition = {
  id: string;
  author_id: string;
  entry_type: EntryType;
  title: string;
  category: string | null;
  municipality: string;
  region: string | null;
  tradition_author: string;
  description: string | null;
  history: string | null;
  cultural_significance: string | null;
  celebration_origin_history: string | null;
  celebration_customs: string | null;
  celebration_social_importance: string | null;
  celebration_conclusion: string | null;
  interviewee_name: string | null;
  person_name: string | null;
  birth_date: string | null;
  birth_place: string | null;
  death_date: string | null;
  death_place: string | null;
  occupation: string | null;
  biography_life_formation: string | null;
  independence_participation: string | null;
  achievements: string | null;
  legacy: string | null;
  biography_summary: string | null;
  personal_conclusion: string | null;
  image_path: string;
  sources: string[];
  status: TraditionStatus;
  review_note: string | null;
  reviewer_id: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  image_url?: string;
  is_demo?: boolean;
};

export type Profile = {
  id: string;
  display_name: string;
  role: AppRole;
  created_at: string;
};

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: { id: string; display_name: string; role?: AppRole; created_at?: string };
        Update: { display_name?: string; role?: AppRole; created_at?: string };
        Relationships: [];
      };
      traditions: {
        Row: Tradition;
        Insert: {
          id?: string;
          author_id: string;
          entry_type: EntryType;
          title: string;
          category?: string | null;
          municipality: string;
          region?: string | null;
          tradition_author: string;
          description?: string | null;
          history?: string | null;
          cultural_significance?: string | null;
          celebration_origin_history?: string | null;
          celebration_customs?: string | null;
          celebration_social_importance?: string | null;
          celebration_conclusion?: string | null;
          interviewee_name?: string | null;
          person_name?: string | null;
          birth_date?: string | null;
          birth_place?: string | null;
          death_date?: string | null;
          death_place?: string | null;
          occupation?: string | null;
          biography_life_formation?: string | null;
          independence_participation?: string | null;
          achievements?: string | null;
          legacy?: string | null;
          biography_summary?: string | null;
          personal_conclusion?: string | null;
          image_path: string;
          sources: string[];
          status?: TraditionStatus;
          review_note?: string | null;
          reviewer_id?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          author_id?: string;
          entry_type?: EntryType;
          title?: string;
          category?: string | null;
          municipality?: string;
          region?: string | null;
          tradition_author?: string;
          description?: string | null;
          history?: string | null;
          cultural_significance?: string | null;
          celebration_origin_history?: string | null;
          celebration_customs?: string | null;
          celebration_social_importance?: string | null;
          celebration_conclusion?: string | null;
          interviewee_name?: string | null;
          person_name?: string | null;
          birth_date?: string | null;
          birth_place?: string | null;
          death_date?: string | null;
          death_place?: string | null;
          occupation?: string | null;
          biography_life_formation?: string | null;
          independence_participation?: string | null;
          achievements?: string | null;
          legacy?: string | null;
          biography_summary?: string | null;
          personal_conclusion?: string | null;
          image_path?: string | null;
          sources?: string[];
          status?: TraditionStatus;
          review_note?: string | null;
          reviewer_id?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: {
      app_role: AppRole;
      tradition_status: TraditionStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}
