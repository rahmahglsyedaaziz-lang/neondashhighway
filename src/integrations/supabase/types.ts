export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      cars: {
        Row: {
          acceleration: number
          accent: string
          braking: number
          color: string
          created_at: string
          description: string
          handling: number
          id: string
          name: string
          rarity: string
          slug: string
          sort_order: number
          speed: number
          style: number
          unlock_type: string
          unlock_value: number
        }
        Insert: {
          acceleration?: number
          accent: string
          braking?: number
          color: string
          created_at?: string
          description?: string
          handling?: number
          id?: string
          name: string
          rarity?: string
          slug: string
          sort_order?: number
          speed?: number
          style?: number
          unlock_type?: string
          unlock_value?: number
        }
        Update: {
          acceleration?: number
          accent?: string
          braking?: number
          color?: string
          created_at?: string
          description?: string
          handling?: number
          id?: string
          name?: string
          rarity?: string
          slug?: string
          sort_order?: number
          speed?: number
          style?: number
          unlock_type?: string
          unlock_value?: number
        }
        Relationships: []
      }
      challenge_progress: {
        Row: {
          challenge_id: string
          completed: boolean
          created_at: string
          id: string
          progress: number
          reward_claimed: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          challenge_id: string
          completed?: boolean
          created_at?: string
          id?: string
          progress?: number
          reward_claimed?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          challenge_id?: string
          completed?: boolean
          created_at?: string
          id?: string
          progress?: number
          reward_claimed?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_progress_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "daily_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_challenges: {
        Row: {
          challenge_date: string
          created_at: string
          description: string
          id: string
          kind: string
          reward_coins: number
          target: number
          title: string
          updated_at: string
        }
        Insert: {
          challenge_date: string
          created_at?: string
          description: string
          id?: string
          kind: string
          reward_coins?: number
          target: number
          title: string
          updated_at?: string
        }
        Update: {
          challenge_date?: string
          created_at?: string
          description?: string
          id?: string
          kind?: string
          reward_coins?: number
          target?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      game_runs: {
        Row: {
          best_combo: number
          car_slug: string
          coins: number
          created_at: string
          distance_m: number
          duration_ms: number
          id: string
          near_misses: number
          police_escapes: number
          score: number
          user_id: string
        }
        Insert: {
          best_combo?: number
          car_slug?: string
          coins?: number
          created_at?: string
          distance_m?: number
          duration_ms?: number
          id?: string
          near_misses?: number
          police_escapes?: number
          score: number
          user_id: string
        }
        Update: {
          best_combo?: number
          car_slug?: string
          coins?: number
          created_at?: string
          distance_m?: number
          duration_ms?: number
          id?: string
          near_misses?: number
          police_escapes?: number
          score?: number
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          games_played: number
          high_score: number
          id: string
          selected_car_slug: string
          total_coins: number
          total_score: number
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          games_played?: number
          high_score?: number
          id: string
          selected_car_slug?: string
          total_coins?: number
          total_score?: number
          updated_at?: string
          username: string
        }
        Update: {
          created_at?: string
          games_played?: number
          high_score?: number
          id?: string
          selected_car_slug?: string
          total_coins?: number
          total_score?: number
          updated_at?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_selected_car_slug_fkey"
            columns: ["selected_car_slug"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["slug"]
          },
        ]
      }
      unlocked_cars: {
        Row: {
          car_id: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          car_id: string
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          car_id?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unlocked_cars_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      leaderboard: {
        Row: {
          games_played: number | null
          high_score: number | null
          id: string | null
          selected_car_slug: string | null
          total_coins: number | null
          username: string | null
        }
        Insert: {
          games_played?: number | null
          high_score?: number | null
          id?: string | null
          selected_car_slug?: string | null
          total_coins?: number | null
          username?: string | null
        }
        Update: {
          games_played?: number | null
          high_score?: number | null
          id?: string | null
          selected_car_slug?: string | null
          total_coins?: number | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_selected_car_slug_fkey"
            columns: ["selected_car_slug"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["slug"]
          },
        ]
      }
    }
    Functions: {
      ensure_daily_challenge: {
        Args: never
        Returns: {
          challenge_date: string
          created_at: string
          description: string
          id: string
          kind: string
          reward_coins: number
          target: number
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "daily_challenges"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_player_rank: { Args: { _user_id: string }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "owner" | "admin" | "player"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["owner", "admin", "player"],
    },
  },
} as const
