export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      analytics_outbox: {
        Row: {
          created_at: string
          event: string
          id: string
          profile_id: string | null
          properties: Json
        }
        Insert: {
          created_at?: string
          event: string
          id?: string
          profile_id?: string | null
          properties?: Json
        }
        Update: {
          created_at?: string
          event?: string
          id?: string
          profile_id?: string | null
          properties?: Json
        }
        Relationships: [
          {
            foreignKeyName: "analytics_outbox_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      connections: {
        Row: {
          a_id: string
          b_id: string
          created_at: string
          source: string
        }
        Insert: {
          a_id: string
          b_id: string
          created_at?: string
          source: string
        }
        Update: {
          a_id?: string
          b_id?: string
          created_at?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "connections_a_id_fkey"
            columns: ["a_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connections_b_id_fkey"
            columns: ["b_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_members: {
        Row: {
          conversation_id: string
          joined_at: string
          last_read_at: string | null
          left_at: string | null
          muted: boolean
          profile_id: string
        }
        Insert: {
          conversation_id: string
          joined_at?: string
          last_read_at?: string | null
          left_at?: string | null
          muted?: boolean
          profile_id: string
        }
        Update: {
          conversation_id?: string
          joined_at?: string
          last_read_at?: string | null
          left_at?: string | null
          muted?: boolean
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_threads: {
        Row: {
          closed_at: string | null
          created_at: string
          id: string
          plan_id: string
          request_id: string
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          id?: string
          plan_id: string
          request_id: string
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          id?: string
          plan_id?: string
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_threads_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_threads_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "plan_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          closed_at: string | null
          created_at: string
          id: string
          plan_id: string
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          id?: string
          plan_id: string
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          id?: string
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: true
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      devices: {
        Row: {
          id: string
          last_seen_at: string
          platform: string
          profile_id: string
          push_token: string
        }
        Insert: {
          id?: string
          last_seen_at?: string
          platform: string
          profile_id: string
          push_token: string
        }
        Update: {
          id?: string
          last_seen_at?: string
          platform?: string
          profile_id?: string
          push_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "devices_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      interests: {
        Row: {
          emoji: string
          group: string
          id: string
          label: string
          slug: string
          sort_order: number
        }
        Insert: {
          emoji: string
          group: string
          id?: string
          label: string
          slug: string
          sort_order?: number
        }
        Update: {
          emoji?: string
          group?: string
          id?: string
          label?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string | null
          conversation_id: string
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["message_kind"]
          media_path: string | null
          poll_id: string | null
          sender_id: string | null
        }
        Insert: {
          body?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["message_kind"]
          media_path?: string | null
          poll_id?: string | null
          sender_id?: string | null
        }
        Update: {
          body?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["message_kind"]
          media_path?: string | null
          poll_id?: string | null
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_actions: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          note: string | null
          profile_id: string
          report_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          note?: string | null
          profile_id: string
          report_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          note?: string | null
          profile_id?: string
          report_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "moderation_actions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moderation_actions_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_jobs: {
        Row: {
          attempts: number
          available_at: string
          created_at: string
          id: string
          idempotency_key: string
          payload: Json
          processed_at: string | null
          profile_id: string
          type: Database["public"]["Enums"]["notification_type"]
        }
        Insert: {
          attempts?: number
          available_at?: string
          created_at?: string
          id?: string
          idempotency_key: string
          payload: Json
          processed_at?: string | null
          profile_id: string
          type: Database["public"]["Enums"]["notification_type"]
        }
        Update: {
          attempts?: number
          available_at?: string
          created_at?: string
          id?: string
          idempotency_key?: string
          payload?: Json
          processed_at?: string | null
          profile_id?: string
          type?: Database["public"]["Enums"]["notification_type"]
        }
        Relationships: [
          {
            foreignKeyName: "notification_jobs_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_deliveries: {
        Row: {
          delivered_at: string
          hidden_at: string | null
          id: string
          not_for_me_at: string | null
          plan_id: string
          profile_id: string
          reach_level_at_delivery:
            | Database["public"]["Enums"]["reach_level"]
            | null
          reason_code: Database["public"]["Enums"]["delivery_reason"]
          reason_text: string
        }
        Insert: {
          delivered_at?: string
          hidden_at?: string | null
          id?: string
          not_for_me_at?: string | null
          plan_id: string
          profile_id: string
          reach_level_at_delivery?:
            | Database["public"]["Enums"]["reach_level"]
            | null
          reason_code: Database["public"]["Enums"]["delivery_reason"]
          reason_text: string
        }
        Update: {
          delivered_at?: string
          hidden_at?: string | null
          id?: string
          not_for_me_at?: string | null
          plan_id?: string
          profile_id?: string
          reach_level_at_delivery?:
            | Database["public"]["Enums"]["reach_level"]
            | null
          reason_code?: Database["public"]["Enums"]["delivery_reason"]
          reason_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_deliveries_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_deliveries_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_events: {
        Row: {
          actor_id: string | null
          created_at: string
          event_type: string
          from_status: Database["public"]["Enums"]["plan_status"] | null
          id: string
          metadata: Json
          plan_id: string
          to_status: Database["public"]["Enums"]["plan_status"] | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          event_type: string
          from_status?: Database["public"]["Enums"]["plan_status"] | null
          id?: string
          metadata?: Json
          plan_id: string
          to_status?: Database["public"]["Enums"]["plan_status"] | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          event_type?: string
          from_status?: Database["public"]["Enums"]["plan_status"] | null
          id?: string
          metadata?: Json
          plan_id?: string
          to_status?: Database["public"]["Enums"]["plan_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_events_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_members: {
        Row: {
          joined_at: string
          left_at: string | null
          plan_id: string
          profile_id: string
          removed_by: string | null
          status: Database["public"]["Enums"]["member_status"]
        }
        Insert: {
          joined_at?: string
          left_at?: string | null
          plan_id: string
          profile_id: string
          removed_by?: string | null
          status?: Database["public"]["Enums"]["member_status"]
        }
        Update: {
          joined_at?: string
          left_at?: string | null
          plan_id?: string
          profile_id?: string
          removed_by?: string | null
          status?: Database["public"]["Enums"]["member_status"]
        }
        Relationships: [
          {
            foreignKeyName: "plan_members_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_members_removed_by_fkey"
            columns: ["removed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_private: {
        Row: {
          exact_address: string | null
          exact_point: unknown
          plan_id: string
          spot_shared_at: string | null
          spot_shared_by: string | null
          spot_visibility: Database["public"]["Enums"]["spot_visibility"]
          updated_at: string
        }
        Insert: {
          exact_address?: string | null
          exact_point: unknown
          plan_id: string
          spot_shared_at?: string | null
          spot_shared_by?: string | null
          spot_visibility?: Database["public"]["Enums"]["spot_visibility"]
          updated_at?: string
        }
        Update: {
          exact_address?: string | null
          exact_point?: unknown
          plan_id?: string
          spot_shared_at?: string | null
          spot_shared_by?: string | null
          spot_visibility?: Database["public"]["Enums"]["spot_visibility"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_private_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: true
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_private_spot_shared_by_fkey"
            columns: ["spot_shared_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_requests: {
        Row: {
          created_at: string
          decided_at: string | null
          id: string
          note: string | null
          plan_id: string
          profile_id: string
          status: Database["public"]["Enums"]["request_status"]
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          id?: string
          note?: string | null
          plan_id: string
          profile_id: string
          status?: Database["public"]["Enums"]["request_status"]
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          id?: string
          note?: string | null
          plan_id?: string
          profile_id?: string
          status?: Database["public"]["Enums"]["request_status"]
        }
        Relationships: [
          {
            foreignKeyName: "plan_requests_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_requests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          area_name: string
          cancel_reason: string | null
          cancelled_at: string | null
          capacity: number | null
          category_id: string | null
          cell: string | null
          city: string
          connections_only: boolean
          created_at: string
          emoji: string
          ends_at: string
          host_id: string
          id: string
          public_link_enabled: boolean
          published_at: string | null
          reach_level: Database["public"]["Enums"]["reach_level"]
          reach_widened_at: string | null
          repeat_weekly: boolean
          series_id: string | null
          share_slug: string
          snapped_point: unknown
          starts_at: string
          status: Database["public"]["Enums"]["plan_status"]
          text: string
          type: Database["public"]["Enums"]["plan_type"]
          updated_at: string
          verified_only: boolean
          version: number
          women_only: boolean
        }
        Insert: {
          area_name: string
          cancel_reason?: string | null
          cancelled_at?: string | null
          capacity?: number | null
          category_id?: string | null
          cell?: string | null
          city: string
          connections_only?: boolean
          created_at?: string
          emoji: string
          ends_at: string
          host_id: string
          id?: string
          public_link_enabled?: boolean
          published_at?: string | null
          reach_level?: Database["public"]["Enums"]["reach_level"]
          reach_widened_at?: string | null
          repeat_weekly?: boolean
          series_id?: string | null
          share_slug?: string
          snapped_point?: unknown
          starts_at: string
          status?: Database["public"]["Enums"]["plan_status"]
          text: string
          type: Database["public"]["Enums"]["plan_type"]
          updated_at?: string
          verified_only?: boolean
          version?: number
          women_only?: boolean
        }
        Update: {
          area_name?: string
          cancel_reason?: string | null
          cancelled_at?: string | null
          capacity?: number | null
          category_id?: string | null
          cell?: string | null
          city?: string
          connections_only?: boolean
          created_at?: string
          emoji?: string
          ends_at?: string
          host_id?: string
          id?: string
          public_link_enabled?: boolean
          published_at?: string | null
          reach_level?: Database["public"]["Enums"]["reach_level"]
          reach_widened_at?: string | null
          repeat_weekly?: boolean
          series_id?: string | null
          share_slug?: string
          snapped_point?: unknown
          starts_at?: string
          status?: Database["public"]["Enums"]["plan_status"]
          text?: string
          type?: Database["public"]["Enums"]["plan_type"]
          updated_at?: string
          verified_only?: boolean
          version?: number
          women_only?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "plans_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "interests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plans_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_interests: {
        Row: {
          created_at: string
          interest_id: string
          profile_id: string
        }
        Insert: {
          created_at?: string
          interest_id: string
          profile_id: string
        }
        Update: {
          created_at?: string
          interest_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_interests_interest_id_fkey"
            columns: ["interest_id"]
            isOneToOne: false
            referencedRelation: "interests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_interests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_private: {
        Row: {
          birth_date: string
          contact_matching_opt_in: boolean
          gender: Database["public"]["Enums"]["gender"]
          home_cell: string | null
          phone_e164: string | null
          profile_id: string
          trusted_contact_name: string | null
          trusted_contact_phone: string | null
          updated_at: string
        }
        Insert: {
          birth_date: string
          contact_matching_opt_in?: boolean
          gender?: Database["public"]["Enums"]["gender"]
          home_cell?: string | null
          phone_e164?: string | null
          profile_id: string
          trusted_contact_name?: string | null
          trusted_contact_phone?: string | null
          updated_at?: string
        }
        Update: {
          birth_date?: string
          contact_matching_opt_in?: boolean
          gender?: Database["public"]["Enums"]["gender"]
          home_cell?: string | null
          phone_e164?: string | null
          profile_id?: string
          trusted_contact_name?: string | null
          trusted_contact_phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_private_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_settings: {
        Row: {
          alert_asks_nearby: boolean
          alert_friends_plans: boolean
          alert_nearby_radius_km: number
          appearance: string
          distance_unit: string
          language: string
          profile_id: string
          push_enabled: boolean
          quiet_from: string | null
          quiet_to: string | null
          updated_at: string
        }
        Insert: {
          alert_asks_nearby?: boolean
          alert_friends_plans?: boolean
          alert_nearby_radius_km?: number
          appearance?: string
          distance_unit?: string
          language?: string
          profile_id: string
          push_enabled?: boolean
          quiet_from?: string | null
          quiet_to?: string | null
          updated_at?: string
        }
        Update: {
          alert_asks_nearby?: boolean
          alert_friends_plans?: boolean
          alert_nearby_radius_km?: number
          appearance?: string
          distance_unit?: string
          language?: string
          profile_id?: string
          push_enabled?: boolean
          quiet_from?: string | null
          quiet_to?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_settings_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          age_visible_from: string | null
          area_name: string | null
          avatar_path: string | null
          bio: string | null
          city: string | null
          created_at: string
          display_name: string
          first_name: string | null
          id: string
          is_restricted: boolean
          onboarding_completed_at: string | null
          show_interests: boolean
          show_past_plans: boolean
          updated_at: string
          verified_at: string | null
        }
        Insert: {
          age_visible_from?: string | null
          area_name?: string | null
          avatar_path?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          display_name: string
          first_name?: string | null
          id: string
          is_restricted?: boolean
          onboarding_completed_at?: string | null
          show_interests?: boolean
          show_past_plans?: boolean
          updated_at?: string
          verified_at?: string | null
        }
        Update: {
          age_visible_from?: string | null
          area_name?: string | null
          avatar_path?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          display_name?: string
          first_name?: string | null
          id?: string
          is_restricted?: boolean
          onboarding_completed_at?: string | null
          show_interests?: boolean
          show_past_plans?: boolean
          updated_at?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      reports: {
        Row: {
          also_blocked: boolean
          created_at: string
          decided_at: string | null
          id: string
          note: string | null
          reason: Database["public"]["Enums"]["report_reason"]
          reporter_id: string
          reviewer_id: string | null
          status: Database["public"]["Enums"]["report_status"]
          subject_id: string
          subject_type: Database["public"]["Enums"]["report_subject"]
        }
        Insert: {
          also_blocked?: boolean
          created_at?: string
          decided_at?: string | null
          id?: string
          note?: string | null
          reason: Database["public"]["Enums"]["report_reason"]
          reporter_id: string
          reviewer_id?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          subject_id: string
          subject_type: Database["public"]["Enums"]["report_subject"]
        }
        Update: {
          also_blocked?: boolean
          created_at?: string
          decided_at?: string | null
          id?: string
          note?: string | null
          reason?: Database["public"]["Enums"]["report_reason"]
          reporter_id?: string
          reviewer_id?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          subject_id?: string
          subject_type?: Database["public"]["Enums"]["report_subject"]
        }
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      connection_status: "pending" | "accepted" | "declined" | "removed"
      delivery_reason:
        | "friend_going"
        | "friend_vouched"
        | "friend_hosting"
        | "friends_of_friends"
        | "nearby_interest"
        | "nearby"
        | "heading_to"
        | "venue_nearby"
        | "widened"
      gender: "woman" | "man" | "non_binary" | "undisclosed"
      member_status: "going" | "left" | "removed"
      message_kind: "text" | "photo" | "poll" | "system" | "spot_share"
      notification_type:
        | "member_joined"
        | "request_received"
        | "request_accepted"
        | "plan_starting"
        | "spot_unlocked"
        | "plan_nearby"
        | "vouch_received"
        | "showed_up_confirmed"
        | "connection_request"
        | "connection_accepted"
        | "plan_cancelled"
        | "plan_edited"
        | "showed_up_prompt"
      plan_status:
        | "draft"
        | "live"
        | "full"
        | "started"
        | "ended"
        | "cancelled"
        | "restricted"
      plan_type: "plan" | "ask" | "offer"
      reach_level: "friends" | "friends_of_friends" | "nearby" | "city"
      report_reason:
        | "spam_scam"
        | "inappropriate"
        | "safety"
        | "fake_misleading"
        | "other"
      report_status: "open" | "reviewing" | "actioned" | "dismissed"
      report_subject: "plan" | "profile" | "message"
      request_status: "pending" | "accepted" | "declined" | "withdrawn"
      spot_visibility: "on_unlock" | "immediate"
      verification_status: "none" | "pending" | "verified" | "failed"
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
  public: {
    Enums: {
      connection_status: ["pending", "accepted", "declined", "removed"],
      delivery_reason: [
        "friend_going",
        "friend_vouched",
        "friend_hosting",
        "friends_of_friends",
        "nearby_interest",
        "nearby",
        "heading_to",
        "venue_nearby",
        "widened",
      ],
      gender: ["woman", "man", "non_binary", "undisclosed"],
      member_status: ["going", "left", "removed"],
      message_kind: ["text", "photo", "poll", "system", "spot_share"],
      notification_type: [
        "member_joined",
        "request_received",
        "request_accepted",
        "plan_starting",
        "spot_unlocked",
        "plan_nearby",
        "vouch_received",
        "showed_up_confirmed",
        "connection_request",
        "connection_accepted",
        "plan_cancelled",
        "plan_edited",
        "showed_up_prompt",
      ],
      plan_status: [
        "draft",
        "live",
        "full",
        "started",
        "ended",
        "cancelled",
        "restricted",
      ],
      plan_type: ["plan", "ask", "offer"],
      reach_level: ["friends", "friends_of_friends", "nearby", "city"],
      report_reason: [
        "spam_scam",
        "inappropriate",
        "safety",
        "fake_misleading",
        "other",
      ],
      report_status: ["open", "reviewing", "actioned", "dismissed"],
      report_subject: ["plan", "profile", "message"],
      request_status: ["pending", "accepted", "declined", "withdrawn"],
      spot_visibility: ["on_unlock", "immediate"],
      verification_status: ["none", "pending", "verified", "failed"],
    },
  },
} as const

