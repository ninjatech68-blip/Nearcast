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
      account_deletions: {
        Row: {
          id: string
          profile_id: string
          requested_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          requested_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          requested_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_deletions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
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
          id: string
          match_id: string
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          id?: string
          match_id: string
        }
        Update: {
          closed_at?: string | null
          created_at?: string
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
      devices: {
        Row: {
          created_at: string
          id: string
          last_seen_at: string
          locale: string | null
          notify_decisions: boolean
          notify_expiry: boolean
          notify_messages: boolean
          notify_responses: boolean
          platform: Database["public"]["Enums"]["device_platform"]
          profile_id: string
          push_token: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_seen_at?: string
          locale?: string | null
          notify_decisions?: boolean
          notify_expiry?: boolean
          notify_messages?: boolean
          notify_responses?: boolean
          platform: Database["public"]["Enums"]["device_platform"]
          profile_id: string
          push_token: string
        }
        Update: {
          created_at?: string
          id?: string
          last_seen_at?: string
          locale?: string | null
          notify_decisions?: boolean
          notify_expiry?: boolean
          notify_messages?: boolean
          notify_responses?: boolean
          platform?: Database["public"]["Enums"]["device_platform"]
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
      idempotency_keys: {
        Row: {
          actor_id: string
          created_at: string
          fingerprint: string
          key: string
          operation: string
          result: Json | null
        }
        Insert: {
          actor_id: string
          created_at?: string
          fingerprint: string
          key: string
          operation: string
          result?: Json | null
        }
        Update: {
          actor_id?: string
          created_at?: string
          fingerprint?: string
          key?: string
          operation?: string
          result?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "idempotency_keys_actor_id_fkey"
            columns: ["actor_id"]
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
          delivered_at: string
          feedback: string | null
          hidden_at: string | null
          id: string
          intent_id: string
          rank_position: number | null
          reason_code: string
          reason_text: string
          recipient_id: string
        }
        Insert: {
          delivered_at?: string
          feedback?: string | null
          hidden_at?: string | null
          id?: string
          intent_id: string
          rank_position?: number | null
          reason_code: string
          reason_text: string
          recipient_id: string
        }
        Update: {
          delivered_at?: string
          feedback?: string | null
          hidden_at?: string | null
          id?: string
          intent_id?: string
          rank_position?: number | null
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
          consumed_at: string | null
          consumed_by: string | null
          created_at: string
          expires_at: string
          id: string
          issued_by: string | null
          note: string | null
          token_hash: string
        }
        Insert: {
          consumed_at?: string | null
          consumed_by?: string | null
          created_at?: string
          expires_at: string
          id?: string
          issued_by?: string | null
          note?: string | null
          token_hash: string
        }
        Update: {
          consumed_at?: string | null
          consumed_by?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          issued_by?: string | null
          note?: string | null
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_consumed_by_fkey"
            columns: ["consumed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          sender_id: string | null
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          is_system?: boolean
          sender_id?: string | null
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_system?: boolean
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
      moderation_actions: {
        Row: {
          action: string
          captured_state: Json
          created_at: string
          id: string
          moderator_id: string
          reason_code: string
          report_id: string | null
          subject_id: string
          subject_type: string
        }
        Insert: {
          action: string
          captured_state?: Json
          created_at?: string
          id?: string
          moderator_id: string
          reason_code: string
          report_id?: string | null
          subject_id: string
          subject_type: string
        }
        Update: {
          action?: string
          captured_state?: Json
          created_at?: string
          id?: string
          moderator_id?: string
          reason_code?: string
          report_id?: string | null
          subject_id?: string
          subject_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "moderation_actions_moderator_id_fkey"
            columns: ["moderator_id"]
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
          adult_affirmed_at: string | null
          approximate_geography: unknown | null
          contact_preferences: Json
          phone_e164: string | null
          profile_id: string
          updated_at: string
        }
        Insert: {
          adult_affirmed_at?: string | null
          approximate_geography?: unknown | null
          contact_preferences?: Json
          phone_e164?: string | null
          profile_id: string
          updated_at?: string
        }
        Update: {
          adult_affirmed_at?: string | null
          approximate_geography?: unknown | null
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
          avatar_path: string | null
          city: string | null
          created_at: string
          deleted_at: string | null
          display_name: string
          id: string
          is_restricted: boolean
          updated_at: string
        }
        Insert: {
          avatar_path?: string | null
          city?: string | null
          created_at?: string
          deleted_at?: string | null
          display_name: string
          id: string
          is_restricted?: boolean
          updated_at?: string
        }
        Update: {
          avatar_path?: string | null
          city?: string | null
          created_at?: string
          deleted_at?: string | null
          display_name?: string
          id?: string
          is_restricted?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      reliability_aggregates: {
        Row: {
          completed_count: number
          confirmed_count: number
          context: Database["public"]["Enums"]["intent_primitive"]
          disputed_count: number
          profile_id: string
          updated_at: string
        }
        Insert: {
          completed_count?: number
          confirmed_count?: number
          context: Database["public"]["Enums"]["intent_primitive"]
          disputed_count?: number
          profile_id: string
          updated_at?: string
        }
        Update: {
          completed_count?: number
          confirmed_count?: number
          context?: Database["public"]["Enums"]["intent_primitive"]
          disputed_count?: number
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reliability_aggregates_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      verifications: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          kind: Database["public"]["Enums"]["verification_kind"]
          profile_id: string
          provider_reference: string | null
          state: Database["public"]["Enums"]["verification_state"]
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          kind: Database["public"]["Enums"]["verification_kind"]
          profile_id: string
          provider_reference?: string | null
          state?: Database["public"]["Enums"]["verification_state"]
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["verification_kind"]
          profile_id?: string
          provider_reference?: string | null
          state?: Database["public"]["Enums"]["verification_state"]
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "verifications_profile_id_fkey"
            columns: ["profile_id"]
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
      apply_retention_policy: { Args: never; Returns: Json }
      change_intent_reach: {
        Args: {
          disclosure_confirmed: boolean
          expected_version: number
          target_intent_id: string
          target_level: Database["public"]["Enums"]["reach_level"]
        }
        Returns: {
          expanded_at: string | null
          intent_id: string
          level: Database["public"]["Enums"]["reach_level"]
          public_link_enabled: boolean
          show_broadcaster_first_name: boolean
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "intent_reach"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      close_intent: {
        Args: {
          expected_status: Database["public"]["Enums"]["intent_status"]
          outcome: Database["public"]["Enums"]["resolution_outcome"]
          target_intent_id: string
        }
        Returns: {
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
        SetofOptions: {
          from: "*"
          to: "intents"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      confirm_intent: {
        Args: { requested_share_slug: string }
        Returns: number
      }
      confirm_interaction_outcome: {
        Args: { completed: boolean; disputed: boolean; target_match_id: string }
        Returns: {
          completed: boolean
          created_at: string
          disputed: boolean
          id: string
          match_id: string
          reporter_id: string
        }
        SetofOptions: {
          from: "*"
          to: "interaction_outcomes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_report: {
        Args: {
          details: string
          reason_code: string
          subject_id: string
          subject_type: string
        }
        Returns: {
          created_at: string
          details: string | null
          id: string
          reason_code: string
          reporter_id: string
          status: Database["public"]["Enums"]["report_status"]
          subject_id: string
          subject_type: string
        }
        SetofOptions: {
          from: "*"
          to: "reports"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      decide_response: {
        Args: {
          decision: string
          expected_intent_status: Database["public"]["Enums"]["intent_status"]
          target_response_id: string
        }
        Returns: {
          created_at: string
          id: string
          intent_id: string
          message: string
          qualification: Json
          respondent_id: string
          status: Database["public"]["Enums"]["response_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "responses"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      delete_account: { Args: { confirmation: string }; Returns: string }
      expire_intents: { Args: never; Returns: number }
      generate_deliveries: {
        Args: { target_intent_id: string }
        Returns: number
      }
      get_match_disclosures: {
        Args: { target_match_id: string }
        Returns: {
          field_name: string
          field_value: string
        }[]
      }
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
      publish_intent: {
        Args: {
          draft_intent_id: string
          enable_public_link: boolean
          expected_version: number
          idempotency_key: string
          show_first_name: boolean
          target_reach: Database["public"]["Enums"]["reach_level"]
        }
        Returns: {
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
        SetofOptions: {
          from: "*"
          to: "intents"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      redeem_invite: {
        Args: {
          adult_affirmed: boolean
          chosen_display_name: string
          invite_token: string
        }
        Returns: {
          avatar_path: string | null
          city: string | null
          created_at: string
          deleted_at: string | null
          display_name: string
          id: string
          is_restricted: boolean
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      release_disclosure: {
        Args: { field_names: string[]; target_match_id: string }
        Returns: number
      }
      send_message: {
        Args: {
          body: string
          idempotency_key: string
          target_conversation_id: string
        }
        Returns: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          is_system: boolean
          sender_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "messages"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_response: {
        Args: {
          idempotency_key: string
          qualification_answers: Json
          response_message: string
          target_intent_id: string
        }
        Returns: {
          created_at: string
          id: string
          intent_id: string
          message: string
          qualification: Json
          respondent_id: string
          status: Database["public"]["Enums"]["response_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "responses"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_intent: {
        Args: {
          changes: Json
          expected_version: number
          target_intent_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      device_platform: "ios" | "android"
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
      resolution_outcome:
        | "resolved_through_nearcast"
        | "resolved_elsewhere"
        | "no_longer_needed"
        | "could_not_resolve"
        | "withdrawn"
      response_status: "pending" | "accepted" | "declined" | "withdrawn"
      verification_kind: "email" | "phone" | "identity_document"
      verification_state: "pending" | "verified" | "failed" | "expired"
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
      device_platform: ["ios", "android"],
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
      resolution_outcome: [
        "resolved_through_nearcast",
        "resolved_elsewhere",
        "no_longer_needed",
        "could_not_resolve",
        "withdrawn",
      ],
      response_status: ["pending", "accepted", "declined", "withdrawn"],
      verification_kind: ["email", "phone", "identity_document"],
      verification_state: ["pending", "verified", "failed", "expired"],
    },
  },
} as const

