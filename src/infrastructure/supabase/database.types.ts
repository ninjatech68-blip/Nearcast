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
          actor_id: string | null
          created_at: string
          delivered_at: string | null
          event_name: string
          id: number
          object_id: string | null
          properties: Json
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          delivered_at?: string | null
          event_name: string
          id?: never
          object_id?: string | null
          properties?: Json
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          delivered_at?: string | null
          event_name?: string
          id?: never
          object_id?: string | null
          properties?: Json
        }
        Relationships: []
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
      circle_members: {
        Row: {
          added_at: string
          circle_id: string
          member_id: string
        }
        Insert: {
          added_at?: string
          circle_id: string
          member_id: string
        }
        Update: {
          added_at?: string
          circle_id?: string
          member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "circle_members_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circle_members_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      circles: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "circles_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_presence: {
        Row: {
          active_until: string
          conversation_id: string
          profile_id: string
          updated_at: string
        }
        Insert: {
          active_until: string
          conversation_id: string
          profile_id: string
          updated_at?: string
        }
        Update: {
          active_until?: string
          conversation_id?: string
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_presence_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_presence_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_reads: {
        Row: {
          conversation_id: string
          delivered_through: string | null
          last_read_at: string
          profile_id: string
        }
        Insert: {
          conversation_id: string
          delivered_through?: string | null
          last_read_at?: string
          profile_id: string
        }
        Update: {
          conversation_id?: string
          delivered_through?: string | null
          last_read_at?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_reads_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_reads_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          closed_at: string | null
          created_at: string
          expires_at: string | null
          id: string
          match_id: string
          mode: Database["public"]["Enums"]["conversation_mode"]
          person_high: string | null
          person_low: string | null
          proposed_at: string | null
          proposed_by: string | null
          proposed_mode: Database["public"]["Enums"]["conversation_mode"] | null
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          match_id: string
          mode?: Database["public"]["Enums"]["conversation_mode"]
          person_high?: string | null
          person_low?: string | null
          proposed_at?: string | null
          proposed_by?: string | null
          proposed_mode?:
            Database["public"]["Enums"]["conversation_mode"] | null
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          match_id?: string
          mode?: Database["public"]["Enums"]["conversation_mode"]
          person_high?: string | null
          person_low?: string | null
          proposed_at?: string | null
          proposed_by?: string | null
          proposed_mode?:
            Database["public"]["Enums"]["conversation_mode"] | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: true
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_person_high_fkey"
            columns: ["person_high"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_person_low_fkey"
            columns: ["person_low"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_proposed_by_fkey"
            columns: ["proposed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      device_push_tokens: {
        Row: {
          app_build: string | null
          device_label: string | null
          device_model: string | null
          invalidated_at: string | null
          last_error: string | null
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          app_build?: string | null
          device_label?: string | null
          device_model?: string | null
          invalidated_at?: string | null
          last_error?: string | null
          platform?: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          app_build?: string | null
          device_label?: string | null
          device_model?: string | null
          invalidated_at?: string | null
          last_error?: string | null
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_push_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      intent_confirmations: {
        Row: {
          confirmer_id: string
          created_at: string
          intent_id: string
        }
        Insert: {
          confirmer_id: string
          created_at?: string
          intent_id: string
        }
        Update: {
          confirmer_id?: string
          created_at?: string
          intent_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "intent_confirmations_confirmer_id_fkey"
            columns: ["confirmer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intent_confirmations_intent_id_fkey"
            columns: ["intent_id"]
            isOneToOne: false
            referencedRelation: "intents"
            referencedColumns: ["id"]
          },
        ]
      }
      intent_context: {
        Row: {
          approximate_geography: unknown
          approximate_place: string | null
          cancel_cutoff_hours: number
          coarse_window: string | null
          currency: string | null
          deadline_at: string | null
          intent_id: string
          price_minor: number | null
          quantity: number | null
          requirements: Json
          starts_at: string | null
        }
        Insert: {
          approximate_geography?: unknown
          approximate_place?: string | null
          cancel_cutoff_hours?: number
          coarse_window?: string | null
          currency?: string | null
          deadline_at?: string | null
          intent_id: string
          price_minor?: number | null
          quantity?: number | null
          requirements?: Json
          starts_at?: string | null
        }
        Update: {
          approximate_geography?: unknown
          approximate_place?: string | null
          cancel_cutoff_hours?: number
          coarse_window?: string | null
          currency?: string | null
          deadline_at?: string | null
          intent_id?: string
          price_minor?: number | null
          quantity?: number | null
          requirements?: Json
          starts_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intent_context_intent_id_fkey"
            columns: ["intent_id"]
            isOneToOne: true
            referencedRelation: "intents"
            referencedColumns: ["id"]
          },
        ]
      }
      intent_deliveries: {
        Row: {
          delivered_at: string
          feedback: string | null
          hidden_at: string | null
          id: string
          intent_id: string
          reason_code: string
          reason_text: string
          recipient_id: string
          score: number
          signals: string[]
        }
        Insert: {
          delivered_at?: string
          feedback?: string | null
          hidden_at?: string | null
          id?: string
          intent_id: string
          reason_code: string
          reason_text: string
          recipient_id: string
          score?: number
          signals?: string[]
        }
        Update: {
          delivered_at?: string
          feedback?: string | null
          hidden_at?: string | null
          id?: string
          intent_id?: string
          reason_code?: string
          reason_text?: string
          recipient_id?: string
          score?: number
          signals?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "intent_deliveries_intent_id_fkey"
            columns: ["intent_id"]
            isOneToOne: false
            referencedRelation: "intents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intent_deliveries_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      intent_events: {
        Row: {
          actor_id: string | null
          created_at: string
          event_type: string
          from_status: Database["public"]["Enums"]["intent_status"] | null
          id: number
          intent_id: string
          metadata: Json
          to_status: Database["public"]["Enums"]["intent_status"] | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          event_type: string
          from_status?: Database["public"]["Enums"]["intent_status"] | null
          id?: never
          intent_id: string
          metadata?: Json
          to_status?: Database["public"]["Enums"]["intent_status"] | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          event_type?: string
          from_status?: Database["public"]["Enums"]["intent_status"] | null
          id?: never
          intent_id?: string
          metadata?: Json
          to_status?: Database["public"]["Enums"]["intent_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "intent_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intent_events_intent_id_fkey"
            columns: ["intent_id"]
            isOneToOne: false
            referencedRelation: "intents"
            referencedColumns: ["id"]
          },
        ]
      }
      intent_reach: {
        Row: {
          expanded_at: string | null
          intent_id: string
          level: Database["public"]["Enums"]["reach_level"]
          public_link_enabled: boolean
          radius_km: number
          show_broadcaster_first_name: boolean
          updated_at: string
        }
        Insert: {
          expanded_at?: string | null
          intent_id: string
          level?: Database["public"]["Enums"]["reach_level"]
          public_link_enabled?: boolean
          radius_km?: number
          show_broadcaster_first_name?: boolean
          updated_at?: string
        }
        Update: {
          expanded_at?: string | null
          intent_id?: string
          level?: Database["public"]["Enums"]["reach_level"]
          public_link_enabled?: boolean
          radius_km?: number
          show_broadcaster_first_name?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "intent_reach_intent_id_fkey"
            columns: ["intent_id"]
            isOneToOne: true
            referencedRelation: "intents"
            referencedColumns: ["id"]
          },
        ]
      }
      intents: {
        Row: {
          broadcaster_id: string
          category: Database["public"]["Enums"]["cast_category"]
          created_at: string
          expires_at: string
          id: string
          published_at: string | null
          resolved_at: string | null
          restricted_from: Database["public"]["Enums"]["intent_status"] | null
          seed_demo: boolean
          share_slug: string
          slots_wanted: number | null
          statement: string
          status: Database["public"]["Enums"]["intent_status"]
          updated_at: string
          version: number
        }
        Insert: {
          broadcaster_id: string
          category: Database["public"]["Enums"]["cast_category"]
          created_at?: string
          expires_at: string
          id?: string
          published_at?: string | null
          resolved_at?: string | null
          restricted_from?: Database["public"]["Enums"]["intent_status"] | null
          seed_demo?: boolean
          share_slug?: string
          slots_wanted?: number | null
          statement: string
          status?: Database["public"]["Enums"]["intent_status"]
          updated_at?: string
          version?: number
        }
        Update: {
          broadcaster_id?: string
          category?: Database["public"]["Enums"]["cast_category"]
          created_at?: string
          expires_at?: string
          id?: string
          published_at?: string | null
          resolved_at?: string | null
          restricted_from?: Database["public"]["Enums"]["intent_status"] | null
          seed_demo?: boolean
          share_slug?: string
          slots_wanted?: number | null
          statement?: string
          status?: Database["public"]["Enums"]["intent_status"]
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "intents_broadcaster_id_fkey"
            columns: ["broadcaster_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          broadcaster_id: string
          cancelled_at: string | null
          closed_at: string | null
          conversation_id: string | null
          created_at: string
          id: string
          intent_id: string
          participant_id: string
          response_id: string
        }
        Insert: {
          broadcaster_id: string
          cancelled_at?: string | null
          closed_at?: string | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          intent_id: string
          participant_id: string
          response_id: string
        }
        Update: {
          broadcaster_id?: string
          cancelled_at?: string | null
          closed_at?: string | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          intent_id?: string
          participant_id?: string
          response_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_broadcaster_id_fkey"
            columns: ["broadcaster_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_intent_id_fkey"
            columns: ["intent_id"]
            isOneToOne: false
            referencedRelation: "intents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: true
            referencedRelation: "responses"
            referencedColumns: ["id"]
          },
        ]
      }
      message_receipts: {
        Row: {
          delivered_at: string | null
          message_id: string
          read_at: string | null
          recipient_id: string
        }
        Insert: {
          delivered_at?: string | null
          message_id: string
          read_at?: string | null
          recipient_id: string
        }
        Update: {
          delivered_at?: string | null
          message_id?: string
          read_at?: string | null
          recipient_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_receipts_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_receipts_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          client_message_id: string | null
          conversation_id: string
          created_at: string
          id: string
          is_system: boolean
          latitude: number | null
          longitude: number | null
          media_height: number | null
          media_kind: string | null
          media_path: string | null
          media_thumb_path: string | null
          media_width: number | null
          place_label: string | null
          sender_id: string | null
        }
        Insert: {
          body: string
          client_message_id?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          is_system?: boolean
          latitude?: number | null
          longitude?: number | null
          media_height?: number | null
          media_kind?: string | null
          media_path?: string | null
          media_thumb_path?: string | null
          media_width?: number | null
          place_label?: string | null
          sender_id?: string | null
        }
        Update: {
          body?: string
          client_message_id?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          is_system?: boolean
          latitude?: number | null
          longitude?: number | null
          media_height?: number | null
          media_kind?: string | null
          media_path?: string | null
          media_thumb_path?: string | null
          media_width?: number | null
          place_label?: string | null
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_deliveries: {
        Row: {
          created_at: string
          error_code: string | null
          error_message: string | null
          expo_ticket_id: string | null
          id: string
          outbox_id: string
          receipt_checked_at: string | null
          receipt_status: string | null
          resolved_at: string | null
          submitted_at: string | null
          ticket_status: string
          token: string
        }
        Insert: {
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          expo_ticket_id?: string | null
          id?: string
          outbox_id: string
          receipt_checked_at?: string | null
          receipt_status?: string | null
          resolved_at?: string | null
          submitted_at?: string | null
          ticket_status?: string
          token: string
        }
        Update: {
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          expo_ticket_id?: string | null
          id?: string
          outbox_id?: string
          receipt_checked_at?: string | null
          receipt_status?: string | null
          resolved_at?: string | null
          submitted_at?: string | null
          ticket_status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_deliveries_outbox_id_fkey"
            columns: ["outbox_id"]
            isOneToOne: false
            referencedRelation: "notification_outbox"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_deliveries_token_fkey"
            columns: ["token"]
            isOneToOne: false
            referencedRelation: "device_push_tokens"
            referencedColumns: ["token"]
          },
        ]
      }
      notification_jobs: {
        Row: {
          attempts: number
          available_at: string
          created_at: string
          event_type: string
          id: string
          idempotency_key: string
          object_id: string
          object_type: string
          processed_at: string | null
          recipient_id: string
        }
        Insert: {
          attempts?: number
          available_at?: string
          created_at?: string
          event_type: string
          id?: string
          idempotency_key: string
          object_id: string
          object_type: string
          processed_at?: string | null
          recipient_id: string
        }
        Update: {
          attempts?: number
          available_at?: string
          created_at?: string
          event_type?: string
          id?: string
          idempotency_key?: string
          object_id?: string
          object_type?: string
          processed_at?: string | null
          recipient_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_jobs_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_outbox: {
        Row: {
          attempt_count: number
          conversation_id: string | null
          created_at: string
          delivery_status: string
          id: string
          intent_id: string | null
          kind: string
          last_attempt_at: string | null
          last_error: string | null
          next_attempt_at: string | null
          recipient_id: string
          resolved_at: string | null
          sent_at: string | null
        }
        Insert: {
          attempt_count?: number
          conversation_id?: string | null
          created_at?: string
          delivery_status?: string
          id?: string
          intent_id?: string | null
          kind: string
          last_attempt_at?: string | null
          last_error?: string | null
          next_attempt_at?: string | null
          recipient_id: string
          resolved_at?: string | null
          sent_at?: string | null
        }
        Update: {
          attempt_count?: number
          conversation_id?: string | null
          created_at?: string
          delivery_status?: string
          id?: string
          intent_id?: string | null
          kind?: string
          last_attempt_at?: string | null
          last_error?: string | null
          next_attempt_at?: string | null
          recipient_id?: string
          resolved_at?: string | null
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_outbox_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_outbox_intent_id_fkey"
            columns: ["intent_id"]
            isOneToOne: false
            referencedRelation: "intents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_outbox_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      presence_reports: {
        Row: {
          created_at: string
          intent_id: string
          report: Database["public"]["Enums"]["presence_report"]
          reporter_id: string
          subject_id: string
        }
        Insert: {
          created_at?: string
          intent_id: string
          report: Database["public"]["Enums"]["presence_report"]
          reporter_id: string
          subject_id: string
        }
        Update: {
          created_at?: string
          intent_id?: string
          report?: Database["public"]["Enums"]["presence_report"]
          reporter_id?: string
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "presence_reports_intent_id_fkey"
            columns: ["intent_id"]
            isOneToOne: false
            referencedRelation: "intents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presence_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presence_reports_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_areas: {
        Row: {
          centroid: unknown
          created_at: string
          id: string
          name: string
          profile_id: string
        }
        Insert: {
          centroid?: unknown
          created_at?: string
          id?: string
          name: string
          profile_id: string
        }
        Update: {
          centroid?: unknown
          created_at?: string
          id?: string
          name?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_areas_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_interests: {
        Row: {
          category: Database["public"]["Enums"]["cast_category"]
          created_at: string
          profile_id: string
        }
        Insert: {
          category: Database["public"]["Enums"]["cast_category"]
          created_at?: string
          profile_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["cast_category"]
          created_at?: string
          profile_id?: string
        }
        Relationships: [
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
          contact_preferences: Json
          phone_e164: string | null
          profile_id: string
          updated_at: string
        }
        Insert: {
          contact_preferences?: Json
          phone_e164?: string | null
          profile_id: string
          updated_at?: string
        }
        Update: {
          contact_preferences?: Json
          phone_e164?: string | null
          profile_id?: string
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
      profiles: {
        Row: {
          active_windows: string[]
          avatar_path: string | null
          city: string | null
          created_at: string
          display_name: string
          id: string
          is_restricted: boolean
          updated_at: string
        }
        Insert: {
          active_windows?: string[]
          avatar_path?: string | null
          city?: string | null
          created_at?: string
          display_name: string
          id: string
          is_restricted?: boolean
          updated_at?: string
        }
        Update: {
          active_windows?: string[]
          avatar_path?: string | null
          city?: string | null
          created_at?: string
          display_name?: string
          id?: string
          is_restricted?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason_code: string
          reporter_id: string
          status: Database["public"]["Enums"]["report_status"]
          subject_id: string
          subject_type: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason_code: string
          reporter_id: string
          status?: Database["public"]["Enums"]["report_status"]
          subject_id: string
          subject_type: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason_code?: string
          reporter_id?: string
          status?: Database["public"]["Enums"]["report_status"]
          subject_id?: string
          subject_type?: string
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
      responses: {
        Row: {
          created_at: string
          id: string
          intent_id: string
          message: string
          qualification: Json
          respondent_id: string
          status: Database["public"]["Enums"]["response_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          intent_id: string
          message: string
          qualification?: Json
          respondent_id: string
          status?: Database["public"]["Enums"]["response_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          intent_id?: string
          message?: string
          qualification?: Json
          respondent_id?: string
          status?: Database["public"]["Enums"]["response_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "responses_intent_id_fkey"
            columns: ["intent_id"]
            isOneToOne: false
            referencedRelation: "intents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "responses_respondent_id_fkey"
            columns: ["respondent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      notification_failures: {
        Row: {
          kind: string | null
          last_seen: string | null
          reason: string | null
          rows: number | null
        }
        Relationships: []
      }
      notification_health: {
        Row: {
          delivery_status: string | null
          kind: string | null
          last_tried: string | null
          oldest: string | null
          rows: number | null
          worst_attempts: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_response: {
        Args: {
          expected_intent_status: Database["public"]["Enums"]["intent_status"]
          response_to_accept: string
        }
        Returns: {
          broadcaster_id: string
          cancelled_at: string | null
          closed_at: string | null
          conversation_id: string | null
          created_at: string
          id: string
          intent_id: string
          participant_id: string
          response_id: string
        }
        SetofOptions: {
          from: "*"
          to: "matches"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      add_to_circle: {
        Args: { member: string; target_circle: string }
        Returns: undefined
      }
      attendance_outcome: {
        Args: { as_of?: string; target_intent: string; target_profile: string }
        Returns: Database["public"]["Enums"]["attendance_result"]
      }
      claim_notification_batch: {
        Args: { batch_size?: number }
        Returns: {
          attempt_count: number
          badge: number
          conversation_id: string
          id: string
          intent_id: string
          kind: string
          recipient_id: string
        }[]
      }
      clear_conversation_presence: {
        Args: { target_conversation_id: string }
        Returns: undefined
      }
      close_expired_conversations: {
        Args: { max_rows?: number }
        Returns: number
      }
      conversation_messages: {
        Args: { target_conversation_id: string }
        Returns: {
          body: string
          client_message_id: string
          created_at: string
          id: string
          is_mine: boolean
          is_system: boolean
          latitude: number
          longitude: number
          media_height: number
          media_kind: string
          media_path: string
          media_thumb_path: string
          media_width: number
          place_label: string
          remote_status: string
          sender_id: string
        }[]
      }
      conversation_messages_after: {
        Args: {
          after_created_at: string
          after_id?: string
          page_size?: number
          target_conversation_id: string
        }
        Returns: {
          body: string
          client_message_id: string
          created_at: string
          id: string
          is_mine: boolean
          is_system: boolean
          latitude: number
          longitude: number
          media_height: number
          media_kind: string
          media_path: string
          media_thumb_path: string
          media_width: number
          place_label: string
          remote_status: string
          sender_id: string
        }[]
      }
      conversation_messages_page: {
        Args: {
          before_created_at?: string
          before_id?: string
          page_size?: number
          target_conversation_id: string
        }
        Returns: {
          body: string
          client_message_id: string
          created_at: string
          id: string
          is_mine: boolean
          is_system: boolean
          latitude: number
          longitude: number
          media_height: number
          media_kind: string
          media_path: string
          media_thumb_path: string
          media_width: number
          place_label: string
          remote_status: string
          sender_id: string
        }[]
      }
      conversation_summary: {
        Args: { target_conversation_id: string }
        Returns: {
          cast_title: string
          conversation_id: string
          expires_at: string
          intent_id: string
          last_at: string
          last_message: string
          mode: Database["public"]["Enums"]["conversation_mode"]
          other_first_name: string
          other_id: string
          other_last_read_at: string
          plan_count: number
          proposed_by_me: boolean
          proposed_mode: Database["public"]["Enums"]["conversation_mode"]
          unread_count: number
        }[]
      }
      create_circle: { Args: { circle_name: string }; Returns: string }
      decline_response: {
        Args: { target_response_id: string }
        Returns: undefined
      }
      edit_cast: {
        Args: {
          new_category: Database["public"]["Enums"]["cast_category"]
          new_statement: string
          target_intent_id: string
        }
        Returns: undefined
      }
      get_public_intent: {
        Args: { requested_share_slug: string }
        Returns: {
          approximate_place: string
          broadcaster_first_name: string
          category: Database["public"]["Enums"]["cast_category"]
          confirmation_count: number
          currency: string
          deadline_at: string
          expires_at: string
          id: string
          price_minor: number
          published_at: string
          quantity: number
          seats_taken: number
          share_slug: string
          slots_wanted: number
          starts_at: string
          statement: string
        }[]
      }
      get_public_profile: {
        Args: { target: string }
        Returns: {
          area: string
          first_name: string
          flakes: number
          has_receipt_with_viewer: boolean
          id: string
          member_since: string
          receipts: number
          trust_phrase: string
        }[]
      }
      hide_cast: {
        Args: { not_relevant?: boolean; target_intent_id: string }
        Returns: undefined
      }
      joins_i_sent: {
        Args: never
        Returns: {
          cast_statement: string
          caster_first_name: string
          caster_id: string
          created_at: string
          intent_id: string
          note: string
          response_id: string
          status: Database["public"]["Enums"]["response_status"]
        }[]
      }
      list_chat_media_orphans: {
        Args: { max_objects?: number; older_than?: string }
        Returns: {
          path: string
        }[]
      }
      mark_conversation_delivered: {
        Args: { target_conversation_id: string }
        Returns: undefined
      }
      mark_conversation_read: {
        Args: { target_conversation_id: string }
        Returns: undefined
      }
      my_casts: {
        Args: never
        Returns: {
          area: string
          category: Database["public"]["Enums"]["cast_category"]
          expires_at: string
          intent_id: string
          matched_count: number
          pending_count: number
          starts_at: string
          statement: string
          status: Database["public"]["Enums"]["intent_status"]
        }[]
      }
      my_circles: {
        Args: never
        Returns: {
          circle_id: string
          member_area: string
          member_first_name: string
          member_id: string
          name: string
        }[]
      }
      my_conversations: {
        Args: never
        Returns: {
          cast_title: string
          conversation_id: string
          expires_at: string
          intent_id: string
          last_at: string
          last_message: string
          mode: Database["public"]["Enums"]["conversation_mode"]
          other_first_name: string
          other_id: string
          other_last_read_at: string
          plan_count: number
          proposed_by_me: boolean
          proposed_mode: Database["public"]["Enums"]["conversation_mode"]
          unread_count: number
        }[]
      }
      my_feed: {
        Args: never
        Returns: {
          area: string
          caster_first_name: string
          caster_id: string
          category: Database["public"]["Enums"]["cast_category"]
          distance_m: number
          expires_at: string
          intent_id: string
          reason_text: string
          score: number
          signals: string[]
          starts_at: string
          statement: string
        }[]
      }
      my_profile_areas: {
        Args: never
        Returns: {
          latitude: number
          longitude: number
          name: string
        }[]
      }
      my_receipts: {
        Args: never
        Returns: {
          area: string
          intent_id: string
          other_names: string[]
          outcome: Database["public"]["Enums"]["attendance_result"]
          starts_at: string
          title: string
        }[]
      }
      my_unread_badge: { Args: never; Returns: number }
      pending_joins_on_my_casts: {
        Args: never
        Returns: {
          cast_statement: string
          created_at: string
          intent_id: string
          joiner_first_name: string
          joiner_id: string
          note: string
          response_id: string
        }[]
      }
      plan_detail: {
        Args: { target_intent_id: string }
        Returns: {
          area: string
          caster_first_name: string
          caster_id: string
          category: Database["public"]["Enums"]["cast_category"]
          expires_at: string
          intent_id: string
          is_mine: boolean
          latitude: number
          longitude: number
          participant_count: number
          participant_names: string[]
          radius_km: number
          starts_at: string
          statement: string
          status: Database["public"]["Enums"]["intent_status"]
        }[]
      }
      plans_to_report: {
        Args: never
        Returns: {
          area: string
          intent_id: string
          starts_at: string
          subject_first_name: string
          subject_id: string
          title: string
        }[]
      }
      publish_cast: {
        Args: {
          area_latitude?: number
          area_longitude?: number
          area_name: string
          cast_category: Database["public"]["Enums"]["cast_category"]
          cast_coarse_window?: string
          cast_expires_at: string
          cast_radius_km: number
          cast_starts_at?: string
          cast_statement: string
        }
        Returns: {
          broadcaster_id: string
          category: Database["public"]["Enums"]["cast_category"]
          created_at: string
          expires_at: string
          id: string
          published_at: string | null
          resolved_at: string | null
          restricted_from: Database["public"]["Enums"]["intent_status"] | null
          seed_demo: boolean
          share_slug: string
          slots_wanted: number | null
          statement: string
          status: Database["public"]["Enums"]["intent_status"]
          updated_at: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "intents"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_notification_failure: {
        Args: { error_code: string; outbox_id: string }
        Returns: string
      }
      register_push_token:
        | { Args: { platform: string; token: string }; Returns: undefined }
        | {
            Args: {
              app_build: string
              device_label: string
              device_model: string
              platform: string
              token: string
            }
            Returns: undefined
          }
      remove_from_circle: {
        Args: { member: string; target_circle: string }
        Returns: undefined
      }
      report_presence: {
        Args: {
          report: Database["public"]["Enums"]["presence_report"]
          subject: string
          target_intent: string
        }
        Returns: undefined
      }
      respond_to_cast: {
        Args: { note: string; target_intent_id: string }
        Returns: string
      }
      respond_to_mode_proposal: {
        Args: { accept: boolean; target_conversation_id: string }
        Returns: undefined
      }
      send_location: {
        Args: {
          client_message_id?: string
          label?: string
          share_latitude: number
          share_longitude: number
          target_conversation_id: string
        }
        Returns: string
      }
      send_media: {
        Args: {
          caption?: string
          client_message_id?: string
          height?: number
          kind: string
          path: string
          target_conversation_id: string
          thumb_path?: string
          width?: number
        }
        Returns: string
      }
      send_message: {
        Args: {
          client_message_id?: string
          message_body: string
          target_conversation_id: string
        }
        Returns: string
      }
      set_conversation_mode: {
        Args: {
          next_mode: Database["public"]["Enums"]["conversation_mode"]
          target_conversation_id: string
        }
        Returns: undefined
      }
      shared_history_with: {
        Args: { person: string }
        Returns: {
          flakes: number
          plans: number
          receipts: number
        }[]
      }
      touch_conversation_presence: {
        Args: { target_conversation_id: string }
        Returns: undefined
      }
      vouches_for_me: {
        Args: never
        Returns: {
          voucher_first_name: string
        }[]
      }
      withdraw_response: {
        Args: { target_response_id: string }
        Returns: undefined
      }
    }
    Enums: {
      attendance_result:
        "receipt" | "flake" | "withdrawn" | "disputed" | "unverified"
      cast_category:
        | "social"
        | "sports"
        | "food"
        | "music"
        | "travel"
        | "games"
        | "arts"
        | "learning"
        | "networking"
        | "help"
      conversation_mode: "day" | "week" | "always" | "ended"
      intent_status:
        | "draft"
        | "live"
        | "matched"
        | "resolved"
        | "expired"
        | "withdrawn"
        | "restricted"
      presence_report: "showed" | "no_show"
      reach_level:
        | "origin_only"
        | "adjacent_network"
        | "nearby_relevant"
        | "broader_approved"
      report_status: "open" | "reviewing" | "actioned" | "dismissed"
      response_status: "pending" | "accepted" | "declined" | "withdrawn"
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
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
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
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
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
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
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
      attendance_result: [
        "receipt",
        "flake",
        "withdrawn",
        "disputed",
        "unverified",
      ],
      cast_category: [
        "social",
        "sports",
        "food",
        "music",
        "travel",
        "games",
        "arts",
        "learning",
        "networking",
        "help",
      ],
      conversation_mode: ["day", "week", "always", "ended"],
      intent_status: [
        "draft",
        "live",
        "matched",
        "resolved",
        "expired",
        "withdrawn",
        "restricted",
      ],
      presence_report: ["showed", "no_show"],
      reach_level: [
        "origin_only",
        "adjacent_network",
        "nearby_relevant",
        "broader_approved",
      ],
      report_status: ["open", "reviewing", "actioned", "dismissed"],
      response_status: ["pending", "accepted", "declined", "withdrawn"],
    },
  },
} as const
