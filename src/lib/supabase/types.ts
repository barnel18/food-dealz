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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      business_claims: {
        Row: {
          business_id: string
          contact_email: string
          contact_phone: string | null
          created_at: string
          evidence: string | null
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["claim_status"]
          user_id: string
        }
        Insert: {
          business_id: string
          contact_email: string
          contact_phone?: string | null
          created_at?: string
          evidence?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["claim_status"]
          user_id: string
        }
        Update: {
          business_id?: string
          contact_email?: string
          contact_phone?: string | null
          created_at?: string
          evidence?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["claim_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_claims_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          address: string | null
          category: Database["public"]["Enums"]["business_category"]
          chain_key: string | null
          city: string | null
          claimed_by: string | null
          created_at: string
          featured_until: string | null
          google_place_id: string | null
          hours: Json | null
          id: string
          is_active: boolean
          is_aggregator: boolean
          location: unknown
          name: string
          phone: string | null
          postal_code: string | null
          slug: string
          state: string | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          address?: string | null
          category: Database["public"]["Enums"]["business_category"]
          chain_key?: string | null
          city?: string | null
          claimed_by?: string | null
          created_at?: string
          featured_until?: string | null
          google_place_id?: string | null
          hours?: Json | null
          id?: string
          is_active?: boolean
          is_aggregator?: boolean
          location: unknown
          name: string
          phone?: string | null
          postal_code?: string | null
          slug: string
          state?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          address?: string | null
          category?: Database["public"]["Enums"]["business_category"]
          chain_key?: string | null
          city?: string | null
          claimed_by?: string | null
          created_at?: string
          featured_until?: string | null
          google_place_id?: string | null
          hours?: Json | null
          id?: string
          is_active?: boolean
          is_aggregator?: boolean
          location?: unknown
          name?: string
          phone?: string | null
          postal_code?: string | null
          slug?: string
          state?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      canonical_items: {
        Row: {
          aliases: string[]
          business_category: Database["public"]["Enums"]["business_category"]
          category: string
          comparable_unit: Database["public"]["Enums"]["unit_kind"]
          display_name: string
          slug: string
          sort_order: number
        }
        Insert: {
          aliases?: string[]
          business_category: Database["public"]["Enums"]["business_category"]
          category: string
          comparable_unit: Database["public"]["Enums"]["unit_kind"]
          display_name: string
          slug: string
          sort_order?: number
        }
        Update: {
          aliases?: string[]
          business_category?: Database["public"]["Enums"]["business_category"]
          category?: string
          comparable_unit?: Database["public"]["Enums"]["unit_kind"]
          display_name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      deal_clicks: {
        Row: {
          business_id: string
          created_at: string
          deal_id: string
          id: number
          kind: string
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          business_id: string
          created_at?: string
          deal_id: string
          id?: never
          kind: string
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string
          deal_id?: string
          id?: never
          kind?: string
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_clicks_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_clicks_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_reports: {
        Row: {
          created_at: string
          deal_id: string
          id: string
          note: string | null
          reason: Database["public"]["Enums"]["report_reason"]
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          deal_id: string
          id?: string
          note?: string | null
          reason: Database["public"]["Enums"]["report_reason"]
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          deal_id?: string
          id?: string
          note?: string | null
          reason?: Database["public"]["Enums"]["report_reason"]
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_reports_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          business_id: string
          canonical_item_slug: string | null
          conditions: string | null
          created_at: string
          created_by: string | null
          days_of_week: number[] | null
          deal_type: Database["public"]["Enums"]["deal_type"]
          dedupe_key: string
          ends_at: string | null
          evidence_quote: string | null
          extraction_confidence: number | null
          first_seen_at: string
          id: string
          is_featured: boolean
          item_name: string
          last_seen_at: string
          percent_off: number | null
          price: number | null
          quantity: number
          regular_price: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          source_capture_id: string | null
          source_type: Database["public"]["Enums"]["source_type"]
          starts_at: string | null
          status: Database["public"]["Enums"]["deal_status"]
          time_window: string | null
          title: string
          unit: Database["public"]["Enums"]["unit_kind"]
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          business_id: string
          canonical_item_slug?: string | null
          conditions?: string | null
          created_at?: string
          created_by?: string | null
          days_of_week?: number[] | null
          deal_type: Database["public"]["Enums"]["deal_type"]
          dedupe_key: string
          ends_at?: string | null
          evidence_quote?: string | null
          extraction_confidence?: number | null
          first_seen_at?: string
          id?: string
          is_featured?: boolean
          item_name: string
          last_seen_at?: string
          percent_off?: number | null
          price?: number | null
          quantity?: number
          regular_price?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_capture_id?: string | null
          source_type: Database["public"]["Enums"]["source_type"]
          starts_at?: string | null
          status?: Database["public"]["Enums"]["deal_status"]
          time_window?: string | null
          title: string
          unit?: Database["public"]["Enums"]["unit_kind"]
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          canonical_item_slug?: string | null
          conditions?: string | null
          created_at?: string
          created_by?: string | null
          days_of_week?: number[] | null
          deal_type?: Database["public"]["Enums"]["deal_type"]
          dedupe_key?: string
          ends_at?: string | null
          evidence_quote?: string | null
          extraction_confidence?: number | null
          first_seen_at?: string
          id?: string
          is_featured?: boolean
          item_name?: string
          last_seen_at?: string
          percent_off?: number | null
          price?: number | null
          quantity?: number
          regular_price?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_capture_id?: string | null
          source_type?: Database["public"]["Enums"]["source_type"]
          starts_at?: string | null
          status?: Database["public"]["Enums"]["deal_status"]
          time_window?: string | null
          title?: string
          unit?: Database["public"]["Enums"]["unit_kind"]
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deals_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_canonical_item_slug_fkey"
            columns: ["canonical_item_slug"]
            isOneToOne: false
            referencedRelation: "canonical_items"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "deals_source_capture_id_fkey"
            columns: ["source_capture_id"]
            isOneToOne: false
            referencedRelation: "raw_captures"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          attempts: number
          created_at: string
          finished_at: string | null
          id: number
          last_error: string | null
          locked_at: string | null
          max_attempts: number
          payload: Json
          run_at: string
          status: Database["public"]["Enums"]["job_status"]
          type: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          finished_at?: string | null
          id?: never
          last_error?: string | null
          locked_at?: string | null
          max_attempts?: number
          payload?: Json
          run_at?: string
          status?: Database["public"]["Enums"]["job_status"]
          type: string
        }
        Update: {
          attempts?: number
          created_at?: string
          finished_at?: string | null
          id?: never
          last_error?: string | null
          locked_at?: string | null
          max_attempts?: number
          payload?: Json
          run_at?: string
          status?: Database["public"]["Enums"]["job_status"]
          type?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          home_lat: number | null
          home_lng: number | null
          id: string
          radius_km: number
          role: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          home_lat?: number | null
          home_lng?: number | null
          id: string
          radius_km?: number
          role?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          home_lat?: number | null
          home_lng?: number | null
          id?: string
          radius_km?: number
          role?: string
        }
        Relationships: []
      }
      raw_captures: {
        Row: {
          business_id: string
          captured_at: string
          content_hash: string
          content_text: string | null
          external_id: string | null
          extraction_error: string | null
          extraction_model: string | null
          extraction_status: Database["public"]["Enums"]["extraction_status"]
          extraction_tokens: number | null
          id: string
          image_urls: string[]
          payload: Json
          posted_at: string | null
          source_id: string
        }
        Insert: {
          business_id: string
          captured_at?: string
          content_hash: string
          content_text?: string | null
          external_id?: string | null
          extraction_error?: string | null
          extraction_model?: string | null
          extraction_status?: Database["public"]["Enums"]["extraction_status"]
          extraction_tokens?: number | null
          id?: string
          image_urls?: string[]
          payload?: Json
          posted_at?: string | null
          source_id: string
        }
        Update: {
          business_id?: string
          captured_at?: string
          content_hash?: string
          content_text?: string | null
          external_id?: string | null
          extraction_error?: string | null
          extraction_model?: string | null
          extraction_status?: Database["public"]["Enums"]["extraction_status"]
          extraction_tokens?: number | null
          id?: string
          image_urls?: string[]
          payload?: Json
          posted_at?: string | null
          source_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "raw_captures_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "raw_captures_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_deals: {
        Row: {
          created_at: string
          deal_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deal_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          deal_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_deals_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      sources: {
        Row: {
          business_id: string
          consecutive_failures: number
          crawl_interval_hours: number
          created_at: string
          external_id: string | null
          handle: string | null
          id: string
          is_active: boolean
          last_changed_at: string | null
          last_crawled_at: string | null
          notes: string | null
          type: Database["public"]["Enums"]["source_type"]
          url: string | null
        }
        Insert: {
          business_id: string
          consecutive_failures?: number
          crawl_interval_hours?: number
          created_at?: string
          external_id?: string | null
          handle?: string | null
          id?: string
          is_active?: boolean
          last_changed_at?: string | null
          last_crawled_at?: string | null
          notes?: string | null
          type: Database["public"]["Enums"]["source_type"]
          url?: string | null
        }
        Update: {
          business_id?: string
          consecutive_failures?: number
          crawl_interval_hours?: number
          created_at?: string
          external_id?: string | null
          handle?: string | null
          id?: string
          is_active?: boolean
          last_changed_at?: string | null
          last_crawled_at?: string | null
          notes?: string | null
          type?: Database["public"]["Enums"]["source_type"]
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sources_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cheapest_by_item: {
        Args: {
          p_business_category?: Database["public"]["Enums"]["business_category"]
          p_lat: number
          p_lng: number
          p_radius_m: number
        }
        Returns: {
          business_id: string
          business_name: string
          business_slug: string
          canonical_item_slug: string
          category: string
          comparable_unit: Database["public"]["Enums"]["unit_kind"]
          deal_count: number
          deal_id: string
          display_name: string
          distance_m: number
          ends_at: string
          price: number
          quantity: number
          title: string
          unit: Database["public"]["Enums"]["unit_kind"]
          unit_price: number
        }[]
      }
      claim_jobs: {
        Args: { p_limit?: number }
        Returns: {
          attempts: number
          created_at: string
          finished_at: string | null
          id: number
          last_error: string | null
          locked_at: string | null
          max_attempts: number
          payload: Json
          run_at: string
          status: Database["public"]["Enums"]["job_status"]
          type: string
        }[]
        SetofOptions: {
          from: "*"
          to: "jobs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      complete_job: {
        Args: { p_error?: string; p_id: number; p_ok: boolean }
        Returns: undefined
      }
      deals_in_radius: {
        Args: {
          p_category?: Database["public"]["Enums"]["business_category"]
          p_item?: string
          p_lat: number
          p_limit?: number
          p_lng: number
          p_offset?: number
          p_radius_m: number
          p_today_only?: boolean
        }
        Returns: {
          address: string
          business_category: Database["public"]["Enums"]["business_category"]
          business_id: string
          business_name: string
          business_slug: string
          canonical_item_slug: string
          conditions: string
          days_of_week: number[]
          deal_id: string
          deal_type: Database["public"]["Enums"]["deal_type"]
          distance_m: number
          ends_at: string
          is_featured: boolean
          item_name: string
          last_seen_at: string
          lat: number
          lng: number
          percent_off: number
          price: number
          quantity: number
          regular_price: number
          source_type: Database["public"]["Enums"]["source_type"]
          starts_at: string
          time_window: string
          title: string
          unit: Database["public"]["Enums"]["unit_kind"]
          unit_price: number
        }[]
      }
      enqueue_job: {
        Args: {
          p_max_attempts?: number
          p_payload?: Json
          p_run_at?: string
          p_type: string
        }
        Returns: number
      }
      is_admin: { Args: never; Returns: boolean }
      lat: {
        Args: { b: Database["public"]["Tables"]["businesses"]["Row"] }
        Returns: number
      }
      lng: {
        Args: { b: Database["public"]["Tables"]["businesses"]["Row"] }
        Returns: number
      }
      requeue_stale_jobs: { Args: { p_timeout?: string }; Returns: number }
    }
    Enums: {
      business_category: "restaurant" | "grocery"
      claim_status: "pending" | "approved" | "rejected"
      deal_status: "pending" | "approved" | "rejected" | "expired"
      deal_type:
        | "fixed_price"
        | "percent_off"
        | "amount_off"
        | "bogo"
        | "bundle"
        | "free_item"
      extraction_status: "pending" | "done" | "failed" | "skipped"
      job_status: "queued" | "running" | "done" | "failed"
      report_reason:
        | "still_valid"
        | "expired"
        | "wrong_price"
        | "not_a_deal"
        | "other"
      source_type:
        | "website"
        | "instagram"
        | "facebook"
        | "google_posts"
        | "kroger_api"
        | "flipp"
        | "manual"
        | "business_portal"
      unit_kind:
        | "each"
        | "slice"
        | "lb"
        | "oz"
        | "kg"
        | "g"
        | "dozen"
        | "pack"
        | "gallon"
        | "liter"
        | "fl_oz"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      business_category: ["restaurant", "grocery"],
      claim_status: ["pending", "approved", "rejected"],
      deal_status: ["pending", "approved", "rejected", "expired"],
      deal_type: [
        "fixed_price",
        "percent_off",
        "amount_off",
        "bogo",
        "bundle",
        "free_item",
      ],
      extraction_status: ["pending", "done", "failed", "skipped"],
      job_status: ["queued", "running", "done", "failed"],
      report_reason: [
        "still_valid",
        "expired",
        "wrong_price",
        "not_a_deal",
        "other",
      ],
      source_type: [
        "website",
        "instagram",
        "facebook",
        "google_posts",
        "kroger_api",
        "flipp",
        "manual",
        "business_portal",
      ],
      unit_kind: [
        "each",
        "slice",
        "lb",
        "oz",
        "kg",
        "g",
        "dozen",
        "pack",
        "gallon",
        "liter",
        "fl_oz",
      ],
    },
  },
} as const
