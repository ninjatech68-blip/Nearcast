export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
      conversations: {
        Row: {
          closed_at: string | null
          created_at: string
          expires_at: string
          id: string
          match_id: string
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          match_id: string
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          match_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: true
            referencedRelation: "matches"
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
          saved_at: string | null
          delivered_at: string
          feedback: string | null
          hidden_at: string | null
          id: string
          intent_id: string
          reason_code: string
          reason_text: string
          recipient_id: string
        }
        Insert: {
          saved_at?: string | null
          delivered_at?: string
          feedback?: string | null
          hidden_at?: string | null
          id?: string
          intent_id: string
          reason_code: string
          reason_text: string
          recipient_id: string
        }
        Update: {
          saved_at?: string | null
          delivered_at?: string
          feedback?: string | null
          hidden_at?: string | null
          id?: string
          intent_id?: string
          reason_code?: string
          reason_text?: string
          recipient_id?: string
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
      intent_private: {
        Row: {
          coordination_notes: string | null
          exact_address: string | null
          exact_geography: unknown
          intent_id: string
          private_contact: string | null
          updated_at: string
        }
        Insert: {
          coordination_notes?: string | null
          exact_address?: string | null
          exact_geography?: unknown
          intent_id: string
          private_contact?: string | null
          updated_at?: string
        }
        Update: {
          coordination_notes?: string | null
          exact_address?: string | null
          exact_geography?: unknown
          intent_id?: string
          private_contact?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "intent_private_intent_id_fkey"
            columns: ["intent_id"]
            isOneToOne: true
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
          show_broadcaster_first_name: boolean
          updated_at: string
        }
        Insert: {
          expanded_at?: string | null
          intent_id: string
          level?: Database["public"]["Enums"]["reach_level"]
          public_link_enabled?: boolean
          show_broadcaster_first_name?: boolean
          updated_at?: string
        }
        Update: {
          expanded_at?: string | null
          intent_id?: string
          level?: Database["public"]["Enums"]["reach_level"]
          public_link_enabled?: boolean
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
          created_at: string
          expires_at: string
          id: string
          primitive: Database["public"]["Enums"]["intent_primitive"]
          published_at: string | null
          resolved_at: string | null
          response_action: string
          restricted_from: Database["public"]["Enums"]["intent_status"] | null
          share_slug: string
          statement: string
          status: Database["public"]["Enums"]["intent_status"]
          updated_at: string
          version: number
        }
        Insert: {
          broadcaster_id: string
          created_at?: string
          expires_at: string
          id?: string
          primitive: Database["public"]["Enums"]["intent_primitive"]
          published_at?: string | null
          resolved_at?: string | null
          response_action: string
          restricted_from?: Database["public"]["Enums"]["intent_status"] | null
          share_slug?: string
          statement: string
          status?: Database["public"]["Enums"]["intent_status"]
          updated_at?: string
          version?: number
        }
        Update: {
          broadcaster_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          primitive?: Database["public"]["Enums"]["intent_primitive"]
          published_at?: string | null
          resolved_at?: string | null
          response_action?: string
          restricted_from?: Database["public"]["Enums"]["intent_status"] | null
          share_slug?: string
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
      interaction_outcomes: {
        Row: {
          completed: boolean
          created_at: string
          disputed: boolean
          id: string
          match_id: string
          reporter_id: string
        }
        Insert: {
          completed: boolean
          created_at?: string
          disputed?: boolean
          id?: string
          match_id: string
          reporter_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          disputed?: boolean
          id?: string
          match_id?: string
          reporter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interaction_outcomes_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interaction_outcomes_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          issued_by: string | null
          note: string | null
          redeemed_at: string | null
          redeemed_by: string | null
          token_hash: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          issued_by?: string | null
          note?: string | null
          redeemed_at?: string | null
          redeemed_by?: string | null
          token_hash: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          issued_by?: string | null
          note?: string | null
          redeemed_at?: string | null
          redeemed_by?: string | null
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_redeemed_by_fkey"
            columns: ["redeemed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invite_attempts: {
        Row: {
          attempted_at: string
          id: number
          user_id: string
        }
        Insert: {
          attempted_at?: string
          id?: never
          user_id: string
        }
        Update: {
          attempted_at?: string
          id?: never
          user_id?: string
        }
        Relationships: []
      }
      match_disclosures: {
        Row: {
          field_name: string
          match_id: string
          released_at: string
          released_by: string
        }
        Insert: {
          field_name: string
          match_id: string
          released_at?: string
          released_by: string
        }
        Update: {
          field_name?: string
          match_id?: string
          released_at?: string
          released_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_disclosures_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_disclosures_released_by_fkey"
            columns: ["released_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          broadcaster_id: string
          closed_at: string | null
          created_at: string
          id: string
          intent_id: string
          participant_id: string
          response_id: string
        }
        Insert: {
          broadcaster_id: string
          closed_at?: string | null
          created_at?: string
          id?: string
          intent_id: string
          participant_id: string
          response_id: string
        }
        Update: {
          broadcaster_id?: string
          closed_at?: string | null
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
            foreignKeyName: "matches_intent_id_fkey"
            columns: ["intent_id"]
            isOneToOne: true
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
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          is_system: boolean
          reply_to_id: string | null
          sender_id: string | null
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          is_system?: boolean
          reply_to_id?: string | null
          sender_id?: string | null
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_system?: boolean
          reply_to_id?: string | null
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
            foreignKeyName: "messages_reply_same_conversation"
            columns: ["reply_to_id", "conversation_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id", "conversation_id"]
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
          approximate_home: unknown | null
          avatar_path: string | null
          city: string | null
          created_at: string
          display_name: string
          id: string
          is_restricted: boolean
          updated_at: string
        }
        Insert: {
          approximate_home?: unknown | null
          avatar_path?: string | null
          city?: string | null
          created_at?: string
          display_name: string
          id: string
          is_restricted?: boolean
          updated_at?: string
        }
        Update: {
          approximate_home?: unknown | null
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
      request_idempotency: {
        Row: {
          actor_id: string
          created_at: string
          fingerprint: string
          operation: string
          request_key: string
          result: Json
        }
        Insert: {
          actor_id: string
          created_at?: string
          fingerprint: string
          operation: string
          request_key: string
          result: Json
        }
        Update: {
          actor_id?: string
          created_at?: string
          fingerprint?: string
          operation?: string
          request_key?: string
          result?: Json
        }
        Relationships: [
          {
            foreignKeyName: "request_idempotency_actor_id_fkey"
            columns: ["actor_id"]
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
      [_ in never]: never
    }
    Functions: {
      accept_response: {
        Args: {
          expected_intent_status: Database["public"]["Enums"]["intent_status"]
          response_to_accept: string
        }
        Returns: {
          broadcaster_id: string
          closed_at: string | null
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
      close_expired_conversations: { Args: never; Returns: number }
      get_public_intent: {
        Args: { requested_share_slug: string }
        Returns: {
          approximate_place: string
          broadcaster_first_name: string
          confirmation_count: number
          currency: string
          deadline_at: string
          expires_at: string
          id: string
          price_minor: number
          primitive: Database["public"]["Enums"]["intent_primitive"]
          published_at: string
          quantity: number
          response_action: string
          share_slug: string
          starts_at: string
          statement: string
        }[]
      }
      confirm_intent: {
        Args: { requested_share_slug: string }
        Returns: {
          confirmation_count: number
          viewer_has_confirmed: boolean
        }[]
      }
      publish_intent: {
        Args: {
          context_approximate_latitude?: number
          context_approximate_longitude?: number
          context_approximate_place?: string
          context_currency?: string
          context_deadline_at?: string
          context_price_minor?: number
          context_quantity?: number
          context_requirements?: Json
          context_starts_at?: string
          intent_expires_at: string
          intent_primitive: Database["public"]["Enums"]["intent_primitive"]
          intent_response_action: string
          intent_statement: string
          link_enabled?: boolean
          private_contact?: string
          private_coordination_notes?: string
          private_exact_address?: string
          reach?: Database["public"]["Enums"]["reach_level"]
          request_key?: string
          show_first_name?: boolean
        }
        Returns: {
          intent_id: string
          intent_share_slug: string
          intent_status: Database["public"]["Enums"]["intent_status"]
          intent_version: number
        }[]
      }
      redeem_invite: {
        Args: { chosen_display_name: string; invite_token: string }
        Returns: {
          member_display_name: string
          member_id: string
          outcome: string
        }[]
      }
      resolve_intent: {
        Args: { expected_version: number; target_intent: string }
        Returns: {
          intent_status: Database["public"]["Enums"]["intent_status"]
          intent_version: number
        }[]
      }
      withdraw_intent: {
        Args: { expected_version: number; target_intent: string }
        Returns: {
          intent_status: Database["public"]["Enums"]["intent_status"]
          intent_version: number
        }[]
      }
      update_intent: {
        Args: {
          expected_version: number
          new_approximate_place?: string
          new_currency?: string
          new_deadline_at?: string
          new_expires_at: string
          new_price_minor?: number
          new_quantity?: number
          new_requirements?: Json
          new_response_action: string
          new_starts_at?: string
          new_statement: string
          target_intent: string
        }
        Returns: {
          intent_status: Database["public"]["Enums"]["intent_status"]
          intent_version: number
        }[]
      }
      expire_intents: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      change_intent_reach: {
        Args: {
          disclosure_confirmed?: boolean
          expected_level: Database["public"]["Enums"]["reach_level"]
          target_intent: string
          target_level: Database["public"]["Enums"]["reach_level"]
        }
        Returns: {
          intent_version: number
          level: Database["public"]["Enums"]["reach_level"]
        }[]
      }
      generate_deliveries: {
        Args: { target_intent: string }
        Returns: number
      }
      home_feed: {
        Args: { page_size?: number }
        Returns: {
          approximate_place: string | null
          broadcaster_first_name: string | null
          delivery_id: string
          distance_band: string | null
          expires_at: string
          intent_id: string
          is_saved: boolean
          primitive: Database["public"]["Enums"]["intent_primitive"]
          reason_code: string
          reason_text: string
          response_action: string
          statement: string
        }[]
      }
      distance_band: {
        Args: { meters: number }
        Returns: string
      }
      discover_intents: {
        Args: { max_distance_meters?: number }
        Returns: {
          approximate_place: string | null
          broadcaster_first_name: string | null
          distance_band: string | null
          expires_at: string
          intent_id: string
          primitive: Database["public"]["Enums"]["intent_primitive"]
          response_action: string
          statement: string
        }[]
      }
      decline_response: {
        Args: {
          expected_status: Database["public"]["Enums"]["response_status"]
          target_response: string
        }
        Returns: {
          response_id: string
          response_status: Database["public"]["Enums"]["response_status"]
        }[]
      }
      submit_response: {
        Args: {
          request_key?: string
          response_message: string
          response_qualification?: Json
          target_intent: string
        }
        Returns: {
          response_id: string
          response_status: Database["public"]["Enums"]["response_status"]
        }[]
      }
      send_message: {
        Args: {
          message_body: string
          reply_to?: string
          request_key?: string
          target_conversation: string
        }
        Returns: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          is_system: boolean
          reply_to_id: string | null
          sender_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "messages"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      intent_primitive: "request" | "offer" | "plan"
      intent_status:
        | "draft"
        | "live"
        | "matched"
        | "resolved"
        | "expired"
        | "withdrawn"
        | "restricted"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      intent_primitive: ["request", "offer", "plan"],
      intent_status: [
        "draft",
        "live",
        "matched",
        "resolved",
        "expired",
        "withdrawn",
        "restricted",
      ],
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

