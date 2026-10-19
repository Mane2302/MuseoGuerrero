export type TraditionStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "changes_requested";

export type AppRole = "student" | "admin";

export type Tradition = {
  id: string;
  author_id: string;
  title: string;
  category: string;
  municipality: string;
  region: string;
  tradition_author: string;
  description: string;
  history: string;
  cultural_significance: string;
  historical_connection: string;
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
          title: string;
          category: string;
          municipality: string;
          region: string;
          tradition_author: string;
          description: string;
          history: string;
          cultural_significance: string;
          historical_connection: string;
          image_path?: string | null;
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
          title?: string;
          category?: string;
          municipality?: string;
          region?: string;
          tradition_author?: string;
          description?: string;
          history?: string;
          cultural_significance?: string;
          historical_connection?: string;
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
