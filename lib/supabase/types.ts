export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          age_range: string | null;
          sex: string | null;
          region: string | null;
          climate_zone: string | null;
          skin_type: number | null;
          known_triggers: string[];
          has_onboarded: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          age_range?: string | null;
          sex?: string | null;
          region?: string | null;
          climate_zone?: string | null;
          skin_type?: number | null;
          known_triggers?: string[];
          has_onboarded?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          age_range?: string | null;
          sex?: string | null;
          region?: string | null;
          climate_zone?: string | null;
          skin_type?: number | null;
          known_triggers?: string[];
          has_onboarded?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      daily_logs: {
        Row: {
          id: string;
          user_id: string;
          log_date: string;
          itch_level: number | null;
          stress_level: number | null;
          sleep_hours: number | null;
          sleep_quality: number | null;
          affected_areas: string[];
          notes: string | null;
          skin_status: "clear" | "mild" | "flare" | null;
          quick_tags: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          log_date?: string;
          itch_level?: number | null;
          stress_level?: number | null;
          sleep_hours?: number | null;
          sleep_quality?: number | null;
          affected_areas?: string[];
          notes?: string | null;
          skin_status?: "clear" | "mild" | "flare" | null;
          quick_tags?: string[];
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          log_date?: string;
          itch_level?: number | null;
          stress_level?: number | null;
          sleep_hours?: number | null;
          sleep_quality?: number | null;
          affected_areas?: string[];
          notes?: string | null;
          skin_status?: "clear" | "mild" | "flare" | null;
          quick_tags?: string[];
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "daily_logs_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      food_entries: {
        Row: {
          id: string;
          log_id: string;
          food_name: string;
          category: string | null;
          notes: string | null;
        };
        Insert: {
          id?: string;
          log_id: string;
          food_name: string;
          category?: string | null;
          notes?: string | null;
        };
        Update: {
          id?: string;
          log_id?: string;
          food_name?: string;
          category?: string | null;
          notes?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "food_entries_log_id_fkey";
            columns: ["log_id"];
            referencedRelation: "daily_logs";
            referencedColumns: ["id"];
          },
        ];
      };
      photos: {
        Row: {
          id: string;
          log_id: string;
          storage_path: string;
          body_area: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          log_id: string;
          storage_path: string;
          body_area?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          log_id?: string;
          storage_path?: string;
          body_area?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "photos_log_id_fkey";
            columns: ["log_id"];
            referencedRelation: "daily_logs";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_analyses: {
        Row: {
          id: string;
          user_id: string;
          analysis_type: string;
          input_summary: Json | null;
          result: string | null;
          model: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          analysis_type: string;
          input_summary?: Json | null;
          result?: string | null;
          model?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          analysis_type?: string;
          input_summary?: Json | null;
          result?: string | null;
          model?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_analyses_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      saved_routines: {
        Row: {
          id: string;
          user_id: string;
          routine_id: string;
          saved_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          routine_id: string;
          saved_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          routine_id?: string;
          saved_at?: string;
        };
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          endpoint?: string;
          p256dh?: string;
          auth?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

export type Profile = Tables<"profiles">;
export type DailyLog = Tables<"daily_logs">;
export type FoodEntry = Tables<"food_entries">;
export type Photo = Tables<"photos">;
export type AiAnalysis = Tables<"ai_analyses">;
