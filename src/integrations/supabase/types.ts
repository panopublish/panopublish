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
      clients: {
        Row: {
          address: string | null
          business_type: string | null
          city: string | null
          created_at: string
          id: string
          name: string
          phone: string | null
          user_id: string
        }
        Insert: {
          address?: string | null
          business_type?: string | null
          city?: string | null
          created_at?: string
          id?: string
          name: string
          phone?: string | null
          user_id: string
        }
        Update: {
          address?: string | null
          business_type?: string | null
          city?: string | null
          created_at?: string
          id?: string
          name?: string
          phone?: string | null
          user_id?: string
        }
        Relationships: []
      }
      connections: {
        Row: {
          constellation_id: string | null
          created_at: string
          from_photo_id: string
          group_name: string | null
          heading: number | null
          id: string
          is_locked: boolean
          pitch: number | null
          spacing: string | null
          to_photo_id: string
          tour_id: string
          user_id: string
        }
        Insert: {
          constellation_id?: string | null
          created_at?: string
          from_photo_id: string
          group_name?: string | null
          heading?: number | null
          id?: string
          is_locked?: boolean
          pitch?: number | null
          spacing?: string | null
          to_photo_id: string
          tour_id: string
          user_id: string
        }
        Update: {
          constellation_id?: string | null
          created_at?: string
          from_photo_id?: string
          group_name?: string | null
          heading?: number | null
          id?: string
          is_locked?: boolean
          pitch?: number | null
          spacing?: string | null
          to_photo_id?: string
          tour_id?: string
          user_id?: string
        }
        Relationships: []
      }
      constellations: {
        Row: {
          created_at: string
          id: string
          name: string
          tour_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          tour_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          tour_id?: string
          user_id?: string
        }
        Relationships: []
      }
      google_tokens: {
        Row: {
          access_token: string
          created_at: string | null
          expires_at: string | null
          id: string
          refresh_token: string | null
          user_id: string | null
        }
        Insert: {
          access_token: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          refresh_token?: string | null
          user_id?: string | null
        }
        Update: {
          access_token?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          refresh_token?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      islands: {
        Row: {
          created_at: string
          id: string
          is_level: boolean | null
          level_name: string | null
          level_number: number | null
          name: string
          order_index: number
          show_scene_names: boolean | null
          tour_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_level?: boolean | null
          level_name?: string | null
          level_number?: number | null
          name: string
          order_index?: number
          show_scene_names?: boolean | null
          tour_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_level?: boolean | null
          level_name?: string | null
          level_number?: number | null
          name?: string
          order_index?: number
          show_scene_names?: boolean | null
          tour_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "islands_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      photos: {
        Row: {
          capture_time: string | null
          file_path: string
          file_url: string
          filename: string | null
          heading: number | null
          id: string
          island_id: string | null
          latitude: number | null
          longitude: number | null
          order_index: number
          pitch: number | null
          roll: number | null
          size_bytes: number | null
          status: string
          streetview_photo_id: string | null
          streetview_share_link: string | null
          streetview_status: string | null
          tour_id: string
          uploaded_at: string
          user_id: string
        }
        Insert: {
          capture_time?: string | null
          file_path: string
          file_url: string
          filename?: string | null
          heading?: number | null
          id?: string
          island_id?: string | null
          latitude?: number | null
          longitude?: number | null
          order_index?: number
          pitch?: number | null
          roll?: number | null
          size_bytes?: number | null
          status?: string
          streetview_photo_id?: string | null
          streetview_share_link?: string | null
          streetview_status?: string | null
          tour_id: string
          uploaded_at?: string
          user_id: string
        }
        Update: {
          capture_time?: string | null
          file_path?: string
          file_url?: string
          filename?: string | null
          heading?: number | null
          id?: string
          island_id?: string | null
          latitude?: number | null
          longitude?: number | null
          order_index?: number
          pitch?: number | null
          roll?: number | null
          size_bytes?: number | null
          status?: string
          streetview_photo_id?: string | null
          streetview_share_link?: string | null
          streetview_status?: string | null
          tour_id?: string
          uploaded_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "photos_island_id_fkey"
            columns: ["island_id"]
            isOneToOne: false
            referencedRelation: "islands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          billing_cycle_tours_used: number
          company_name: string | null
          country_code: string | null
          created_at: string
          credits: number
          dark_mode: boolean
          email: string | null
          facebook_url: string | null
          first_name: string | null
          id: string
          instagram_url: string | null
          last_name: string | null
          linkedin_url: string | null
          logo_url: string | null
          name: string | null
          onboarding_dismissed: boolean
          phone: string | null
          plan: string
          trial_ends_at: string | null
          twitter_url: string | null
          username: string | null
          website_url: string | null
        }
        Insert: {
          billing_cycle_tours_used?: number
          company_name?: string | null
          country_code?: string | null
          created_at?: string
          credits?: number
          dark_mode?: boolean
          email?: string | null
          facebook_url?: string | null
          first_name?: string | null
          id: string
          instagram_url?: string | null
          last_name?: string | null
          linkedin_url?: string | null
          logo_url?: string | null
          name?: string | null
          onboarding_dismissed?: boolean
          phone?: string | null
          plan?: string
          trial_ends_at?: string | null
          twitter_url?: string | null
          username?: string | null
          website_url?: string | null
        }
        Update: {
          billing_cycle_tours_used?: number
          company_name?: string | null
          country_code?: string | null
          created_at?: string
          credits?: number
          dark_mode?: boolean
          email?: string | null
          facebook_url?: string | null
          first_name?: string | null
          id?: string
          instagram_url?: string | null
          last_name?: string | null
          linkedin_url?: string | null
          logo_url?: string | null
          name?: string | null
          onboarding_dismissed?: boolean
          phone?: string | null
          plan?: string
          trial_ends_at?: string | null
          twitter_url?: string | null
          username?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          amount_inr: number | null
          created_at: string
          end_date: string | null
          id: string
          plan: string
          razorpay_subscription_id: string | null
          start_date: string
          status: string
          user_id: string
        }
        Insert: {
          amount_inr?: number | null
          created_at?: string
          end_date?: string | null
          id?: string
          plan: string
          razorpay_subscription_id?: string | null
          start_date?: string
          status?: string
          user_id: string
        }
        Update: {
          amount_inr?: number | null
          created_at?: string
          end_date?: string | null
          id?: string
          plan?: string
          razorpay_subscription_id?: string | null
          start_date?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      tours: {
        Row: {
          address: string | null
          cid: string | null
          client_id: string | null
          created_at: string
          google_place_id: string | null
          google_place_url: string | null
          has_been_published: boolean
          id: string
          latitude: number | null
          longitude: number | null
          nadir_logo_url: string | null
          nadir_pos: string | null
          nadir_size: string | null
          nadir_type: string | null
          name: string
          status: string
          type: string
          user_id: string
        }
        Insert: {
          address?: string | null
          cid?: string | null
          client_id?: string | null
          created_at?: string
          google_place_id?: string | null
          google_place_url?: string | null
          has_been_published?: boolean
          id?: string
          latitude?: number | null
          longitude?: number | null
          nadir_logo_url?: string | null
          nadir_pos?: string | null
          nadir_size?: string | null
          nadir_type?: string | null
          name: string
          status?: string
          type?: string
          user_id: string
        }
        Update: {
          address?: string | null
          cid?: string | null
          client_id?: string | null
          created_at?: string
          google_place_id?: string | null
          google_place_url?: string | null
          has_been_published?: boolean
          id?: string
          latitude?: number | null
          longitude?: number | null
          nadir_logo_url?: string | null
          nadir_pos?: string | null
          nadir_size?: string | null
          nadir_type?: string | null
          name?: string
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tours_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
