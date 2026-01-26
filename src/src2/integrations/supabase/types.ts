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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      brain_app_sessions: {
        Row: {
          app_category: string | null
          app_switches_during: number | null
          created_at: string
          duration_minutes: number | null
          id: string
          is_deep_work: boolean | null
          session_end: string | null
          session_start: string
          user_id: string
        }
        Insert: {
          app_category?: string | null
          app_switches_during?: number | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          is_deep_work?: boolean | null
          session_end?: string | null
          session_start: string
          user_id: string
        }
        Update: {
          app_category?: string | null
          app_switches_during?: number | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          is_deep_work?: boolean | null
          session_end?: string | null
          session_start?: string
          user_id?: string
        }
        Relationships: []
      }
      brain_game_sessions: {
        Row: {
          accuracy: number | null
          avg_reaction_time_ms: number | null
          best_reaction_time_ms: number | null
          correct_responses: number | null
          created_at: string
          duration_seconds: number | null
          game_type: string
          id: string
          incorrect_responses: number | null
          level_reached: number | null
          metadata: Json | null
          moves_made: number | null
          score: number
          user_id: string
        }
        Insert: {
          accuracy?: number | null
          avg_reaction_time_ms?: number | null
          best_reaction_time_ms?: number | null
          correct_responses?: number | null
          created_at?: string
          duration_seconds?: number | null
          game_type: string
          id?: string
          incorrect_responses?: number | null
          level_reached?: number | null
          metadata?: Json | null
          moves_made?: number | null
          score?: number
          user_id: string
        }
        Update: {
          accuracy?: number | null
          avg_reaction_time_ms?: number | null
          best_reaction_time_ms?: number | null
          correct_responses?: number | null
          created_at?: string
          duration_seconds?: number | null
          game_type?: string
          id?: string
          incorrect_responses?: number | null
          level_reached?: number | null
          metadata?: Json | null
          moves_made?: number | null
          score?: number
          user_id?: string
        }
        Relationships: []
      }
      brain_metrics: {
        Row: {
          app_switches: number | null
          avg_session_length_minutes: number | null
          brain_performance_score: number | null
          cognitive_consistency: number | null
          created_at: string
          deep_work_minutes: number | null
          focus_score: number | null
          id: string
          insights: Json | null
          metric_date: string
          mood_notes: string | null
          mood_stability: number | null
          night_usage_minutes: number | null
          notification_interactions: number | null
          reaction_speed: number | null
          self_reported_energy: number | null
          self_reported_focus: number | null
          self_reported_mood: number | null
          session_count: number | null
          stress_load: number | null
          total_screen_time_minutes: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          app_switches?: number | null
          avg_session_length_minutes?: number | null
          brain_performance_score?: number | null
          cognitive_consistency?: number | null
          created_at?: string
          deep_work_minutes?: number | null
          focus_score?: number | null
          id?: string
          insights?: Json | null
          metric_date: string
          mood_notes?: string | null
          mood_stability?: number | null
          night_usage_minutes?: number | null
          notification_interactions?: number | null
          reaction_speed?: number | null
          self_reported_energy?: number | null
          self_reported_focus?: number | null
          self_reported_mood?: number | null
          session_count?: number | null
          stress_load?: number | null
          total_screen_time_minutes?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          app_switches?: number | null
          avg_session_length_minutes?: number | null
          brain_performance_score?: number | null
          cognitive_consistency?: number | null
          created_at?: string
          deep_work_minutes?: number | null
          focus_score?: number | null
          id?: string
          insights?: Json | null
          metric_date?: string
          mood_notes?: string | null
          mood_stability?: number | null
          night_usage_minutes?: number | null
          notification_interactions?: number | null
          reaction_speed?: number | null
          self_reported_energy?: number | null
          self_reported_focus?: number | null
          self_reported_mood?: number | null
          session_count?: number | null
          stress_load?: number | null
          total_screen_time_minutes?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      brain_mood_logs: {
        Row: {
          context: string | null
          created_at: string
          energy_level: number | null
          focus_level: number | null
          id: string
          logged_at: string
          mood_score: number
          notes: string | null
          stress_level: number | null
          user_id: string
        }
        Insert: {
          context?: string | null
          created_at?: string
          energy_level?: number | null
          focus_level?: number | null
          id?: string
          logged_at?: string
          mood_score: number
          notes?: string | null
          stress_level?: number | null
          user_id: string
        }
        Update: {
          context?: string | null
          created_at?: string
          energy_level?: number | null
          focus_level?: number | null
          id?: string
          logged_at?: string
          mood_score?: number
          notes?: string | null
          stress_level?: number | null
          user_id?: string
        }
        Relationships: []
      }
      brain_profiles: {
        Row: {
          age: number
          baseline_established: boolean | null
          baseline_start_date: string | null
          created_at: string
          focus_goals: string[] | null
          gender: string
          id: string
          occupation: string | null
          sleep_goal_hours: number | null
          updated_at: string
          user_id: string
          work_schedule: string | null
        }
        Insert: {
          age: number
          baseline_established?: boolean | null
          baseline_start_date?: string | null
          created_at?: string
          focus_goals?: string[] | null
          gender: string
          id?: string
          occupation?: string | null
          sleep_goal_hours?: number | null
          updated_at?: string
          user_id: string
          work_schedule?: string | null
        }
        Update: {
          age?: number
          baseline_established?: boolean | null
          baseline_start_date?: string | null
          created_at?: string
          focus_goals?: string[] | null
          gender?: string
          id?: string
          occupation?: string | null
          sleep_goal_hours?: number | null
          updated_at?: string
          user_id?: string
          work_schedule?: string | null
        }
        Relationships: []
      }
      calorie_profiles: {
        Row: {
          activity_level: string
          age: number
          calculated_bmr: number
          calculated_tdee: number
          created_at: string
          gender: string
          goal: string
          height_cm: number
          id: string
          recommended_calories: number
          recommended_carbs: number
          recommended_fat: number
          recommended_protein: number
          target_weight_kg: number | null
          updated_at: string
          user_id: string
          weight_kg: number
        }
        Insert: {
          activity_level: string
          age: number
          calculated_bmr: number
          calculated_tdee: number
          created_at?: string
          gender: string
          goal: string
          height_cm: number
          id?: string
          recommended_calories: number
          recommended_carbs: number
          recommended_fat: number
          recommended_protein: number
          target_weight_kg?: number | null
          updated_at?: string
          user_id: string
          weight_kg: number
        }
        Update: {
          activity_level?: string
          age?: number
          calculated_bmr?: number
          calculated_tdee?: number
          created_at?: string
          gender?: string
          goal?: string
          height_cm?: number
          id?: string
          recommended_calories?: number
          recommended_carbs?: number
          recommended_fat?: number
          recommended_protein?: number
          target_weight_kg?: number | null
          updated_at?: string
          user_id?: string
          weight_kg?: number
        }
        Relationships: []
      }
      chat_folders: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: Json
          conversation_id: string
          created_at: string
          id: string
          images: string[] | null
          role: string
        }
        Insert: {
          content: Json
          conversation_id: string
          created_at?: string
          id?: string
          images?: string[] | null
          role: string
        }
        Update: {
          content?: Json
          conversation_id?: string
          created_at?: string
          id?: string
          images?: string[] | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          folder_id: string | null
          id: string
          model: string
          pinned: boolean
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          folder_id?: string | null
          id?: string
          model: string
          pinned?: boolean
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          folder_id?: string | null
          id?: string
          model?: string
          pinned?: boolean
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "chat_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          reference_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      email_verifications: {
        Row: {
          code: string
          country: string | null
          created_at: string
          email: string
          expires_at: string
          full_name: string
          id: string
          password_hash: string
          referral_code: string | null
          verified: boolean
        }
        Insert: {
          code: string
          country?: string | null
          created_at?: string
          email: string
          expires_at?: string
          full_name: string
          id?: string
          password_hash: string
          referral_code?: string | null
          verified?: boolean
        }
        Update: {
          code?: string
          country?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          full_name?: string
          id?: string
          password_hash?: string
          referral_code?: string | null
          verified?: boolean
        }
        Relationships: []
      }
      featured_items: {
        Row: {
          created_at: string
          description: string
          display_order: number
          id: string
          is_active: boolean
          link_url: string | null
          tag: string
          title: string
          updated_at: string
          video_url: string
        }
        Insert: {
          created_at?: string
          description: string
          display_order?: number
          id?: string
          is_active?: boolean
          link_url?: string | null
          tag?: string
          title: string
          updated_at?: string
          video_url: string
        }
        Update: {
          created_at?: string
          description?: string
          display_order?: number
          id?: string
          is_active?: boolean
          link_url?: string | null
          tag?: string
          title?: string
          updated_at?: string
          video_url?: string
        }
        Relationships: []
      }
      financial_analyses: {
        Row: {
          analysis_summary: string | null
          analysis_type: string
          created_at: string
          expense_ratio: number | null
          financial_score: number
          id: string
          insights: Json | null
          period_end: string | null
          period_start: string | null
          recommendations: string[] | null
          savings_rate: number | null
          user_id: string
        }
        Insert: {
          analysis_summary?: string | null
          analysis_type: string
          created_at?: string
          expense_ratio?: number | null
          financial_score: number
          id?: string
          insights?: Json | null
          period_end?: string | null
          period_start?: string | null
          recommendations?: string[] | null
          savings_rate?: number | null
          user_id: string
        }
        Update: {
          analysis_summary?: string | null
          analysis_type?: string
          created_at?: string
          expense_ratio?: number | null
          financial_score?: number
          id?: string
          insights?: Json | null
          period_end?: string | null
          period_start?: string | null
          recommendations?: string[] | null
          savings_rate?: number | null
          user_id?: string
        }
        Relationships: []
      }
      financial_profiles: {
        Row: {
          created_at: string
          currency: string
          debt_types: string[] | null
          employment_status: string
          expense_categories: string[] | null
          financial_goals: string[] | null
          has_debt: boolean | null
          has_emergency_fund: boolean | null
          has_investments: boolean | null
          id: string
          monthly_income: number
          risk_tolerance: string
          savings_target_percent: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          debt_types?: string[] | null
          employment_status: string
          expense_categories?: string[] | null
          financial_goals?: string[] | null
          has_debt?: boolean | null
          has_emergency_fund?: boolean | null
          has_investments?: boolean | null
          id?: string
          monthly_income: number
          risk_tolerance: string
          savings_target_percent?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          debt_types?: string[] | null
          employment_status?: string
          expense_categories?: string[] | null
          financial_goals?: string[] | null
          has_debt?: boolean | null
          has_emergency_fund?: boolean | null
          has_investments?: boolean | null
          id?: string
          monthly_income?: number
          risk_tolerance?: string
          savings_target_percent?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      financial_reports: {
        Row: {
          analysis_content: string
          asset_type: string
          created_at: string
          id: string
          price_data: Json | null
          symbol: string
          technical_data: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          analysis_content: string
          asset_type?: string
          created_at?: string
          id?: string
          price_data?: Json | null
          symbol: string
          technical_data?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          analysis_content?: string
          asset_type?: string
          created_at?: string
          id?: string
          price_data?: Json | null
          symbol?: string
          technical_data?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      financial_transactions: {
        Row: {
          amount: number
          category: string
          created_at: string
          description: string | null
          id: string
          is_recurring: boolean | null
          recurring_frequency: string | null
          transaction_date: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          description?: string | null
          id?: string
          is_recurring?: boolean | null
          recurring_frequency?: string | null
          transaction_date?: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_recurring?: boolean | null
          recurring_frequency?: string | null
          transaction_date?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      fingerprint_searches: {
        Row: {
          additional_info: string | null
          created_at: string
          credits_used: number
          id: string
          image_url: string | null
          profiles: Json | null
          search_mode: string
          search_query: string | null
          sources: Json | null
          summary: string | null
          user_id: string
        }
        Insert: {
          additional_info?: string | null
          created_at?: string
          credits_used?: number
          id?: string
          image_url?: string | null
          profiles?: Json | null
          search_mode?: string
          search_query?: string | null
          sources?: Json | null
          summary?: string | null
          user_id: string
        }
        Update: {
          additional_info?: string | null
          created_at?: string
          credits_used?: number
          id?: string
          image_url?: string | null
          profiles?: Json | null
          search_mode?: string
          search_query?: string | null
          sources?: Json | null
          summary?: string | null
          user_id?: string
        }
        Relationships: []
      }
      generations: {
        Row: {
          aspect_ratio: string | null
          created_at: string
          credits_used: number
          id: string
          model: string
          output_url: string | null
          prompt: string
          provider_endpoint: string | null
          quality: string | null
          status: string
          task_id: string | null
          thumbnail_url: string | null
          title: string | null
          type: string
          user_id: string
        }
        Insert: {
          aspect_ratio?: string | null
          created_at?: string
          credits_used?: number
          id?: string
          model?: string
          output_url?: string | null
          prompt: string
          provider_endpoint?: string | null
          quality?: string | null
          status?: string
          task_id?: string | null
          thumbnail_url?: string | null
          title?: string | null
          type?: string
          user_id: string
        }
        Update: {
          aspect_ratio?: string | null
          created_at?: string
          credits_used?: number
          id?: string
          model?: string
          output_url?: string | null
          prompt?: string
          provider_endpoint?: string | null
          quality?: string | null
          status?: string
          task_id?: string | null
          thumbnail_url?: string | null
          title?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      marketing_campaign_logs: {
        Row: {
          campaign_id: string
          created_at: string
          device_token: string
          device_type: string | null
          error_message: string | null
          id: string
          sent_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          device_token: string
          device_type?: string | null
          error_message?: string | null
          id?: string
          sent_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          device_token?: string
          device_type?: string | null
          error_message?: string | null
          id?: string
          sent_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_campaign_logs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_campaigns: {
        Row: {
          batch_size: number | null
          body: string
          campaign_type: string
          completed_at: string | null
          created_at: string
          created_by: string
          current_batch: number | null
          email_from_name: string | null
          email_subject: string | null
          error_message: string | null
          failed_count: number | null
          id: string
          image_url: string | null
          sent_count: number | null
          started_at: string | null
          status: string
          target_device_type: string | null
          title: string
          total_recipients: number | null
          updated_at: string
        }
        Insert: {
          batch_size?: number | null
          body: string
          campaign_type?: string
          completed_at?: string | null
          created_at?: string
          created_by: string
          current_batch?: number | null
          email_from_name?: string | null
          email_subject?: string | null
          error_message?: string | null
          failed_count?: number | null
          id?: string
          image_url?: string | null
          sent_count?: number | null
          started_at?: string | null
          status?: string
          target_device_type?: string | null
          title: string
          total_recipients?: number | null
          updated_at?: string
        }
        Update: {
          batch_size?: number | null
          body?: string
          campaign_type?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string
          current_batch?: number | null
          email_from_name?: string | null
          email_subject?: string | null
          error_message?: string | null
          failed_count?: number | null
          id?: string
          image_url?: string | null
          sent_count?: number | null
          started_at?: string | null
          status?: string
          target_device_type?: string | null
          title?: string
          total_recipients?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      marketing_email_logs: {
        Row: {
          campaign_id: string
          created_at: string
          email: string
          error_message: string | null
          id: string
          opened_at: string | null
          sent_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          email: string
          error_message?: string | null
          id?: string
          opened_at?: string | null
          sent_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          email?: string
          error_message?: string | null
          id?: string
          opened_at?: string | null
          sent_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_email_logs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_logs: {
        Row: {
          created_at: string
          foods: Json
          health_score: number | null
          id: string
          image_url: string | null
          logged_at: string
          meal_description: string | null
          meal_type: string | null
          total_calories: number
          total_carbs: number
          total_fat: number
          total_protein: number
          user_id: string
        }
        Insert: {
          created_at?: string
          foods?: Json
          health_score?: number | null
          id?: string
          image_url?: string | null
          logged_at?: string
          meal_description?: string | null
          meal_type?: string | null
          total_calories?: number
          total_carbs?: number
          total_fat?: number
          total_protein?: number
          user_id: string
        }
        Update: {
          created_at?: string
          foods?: Json
          health_score?: number | null
          id?: string
          image_url?: string | null
          logged_at?: string
          meal_description?: string | null
          meal_type?: string | null
          total_calories?: number
          total_carbs?: number
          total_fat?: number
          total_protein?: number
          user_id?: string
        }
        Relationships: []
      }
      notification_history: {
        Row: {
          body: string
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string
          id: string
          notification_id: string | null
          read_at: string | null
          sent_via: string[] | null
          title: string
          user_id: string
        }
        Insert: {
          body: string
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          id?: string
          notification_id?: string | null
          read_at?: string | null
          sent_via?: string[] | null
          title: string
          user_id: string
        }
        Update: {
          body?: string
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          id?: string
          notification_id?: string | null
          read_at?: string | null
          sent_via?: string[] | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_history_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          channel: Database["public"]["Enums"]["notification_channel"]
          condition_config: Json
          created_at: string
          description: string | null
          id: string
          last_checked_at: string | null
          max_triggers: number | null
          original_request: string
          status: Database["public"]["Enums"]["notification_status"]
          title: string
          trigger_count: number
          triggered_at: string | null
          type: Database["public"]["Enums"]["notification_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          channel?: Database["public"]["Enums"]["notification_channel"]
          condition_config?: Json
          created_at?: string
          description?: string | null
          id?: string
          last_checked_at?: string | null
          max_triggers?: number | null
          original_request: string
          status?: Database["public"]["Enums"]["notification_status"]
          title: string
          trigger_count?: number
          triggered_at?: string | null
          type: Database["public"]["Enums"]["notification_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["notification_channel"]
          condition_config?: Json
          created_at?: string
          description?: string | null
          id?: string
          last_checked_at?: string | null
          max_triggers?: number | null
          original_request?: string
          status?: Database["public"]["Enums"]["notification_status"]
          title?: string
          trigger_count?: number
          triggered_at?: string | null
          type?: Database["public"]["Enums"]["notification_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notify_conversations: {
        Row: {
          created_at: string
          id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notify_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "notify_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "notify_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          country: string | null
          created_at: string
          credits: number
          display_name: string | null
          id: string
          plan: string
          referral_code: string | null
          referred_by: string | null
          source: string | null
          subscription_end_date: string | null
          subscription_id: string | null
          subscription_status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          credits?: number
          display_name?: string | null
          id?: string
          plan?: string
          referral_code?: string | null
          referred_by?: string | null
          source?: string | null
          subscription_end_date?: string | null
          subscription_id?: string | null
          subscription_status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          credits?: number
          display_name?: string | null
          id?: string
          plan?: string
          referral_code?: string | null
          referred_by?: string | null
          source?: string | null
          subscription_end_date?: string | null
          subscription_id?: string | null
          subscription_status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          completed_at: string | null
          created_at: string
          credits_awarded: number
          id: string
          referred_id: string
          referrer_id: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          credits_awarded?: number
          id?: string
          referred_id: string
          referrer_id: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          credits_awarded?: number
          id?: string
          referred_id?: string
          referrer_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      skin_analyses: {
        Row: {
          analysis_summary: string | null
          concerns: Json | null
          created_at: string
          hydration_level: number | null
          id: string
          image_url: string | null
          oiliness_level: number | null
          overall_score: number
          recommendations: Json | null
          skin_type: string
          user_id: string
        }
        Insert: {
          analysis_summary?: string | null
          concerns?: Json | null
          created_at?: string
          hydration_level?: number | null
          id?: string
          image_url?: string | null
          oiliness_level?: number | null
          overall_score: number
          recommendations?: Json | null
          skin_type: string
          user_id: string
        }
        Update: {
          analysis_summary?: string | null
          concerns?: Json | null
          created_at?: string
          hydration_level?: number | null
          id?: string
          image_url?: string | null
          oiliness_level?: number | null
          overall_score?: number
          recommendations?: Json | null
          skin_type?: string
          user_id?: string
        }
        Relationships: []
      }
      skin_profiles: {
        Row: {
          age: number
          created_at: string
          current_routine: string | null
          diet_type: string | null
          gender: string
          id: string
          primary_concerns: string[] | null
          skin_goals: string[] | null
          skin_type: string
          sleep_quality: string | null
          stress_level: string | null
          sun_exposure: string | null
          updated_at: string
          user_id: string
          water_intake: string | null
        }
        Insert: {
          age: number
          created_at?: string
          current_routine?: string | null
          diet_type?: string | null
          gender: string
          id?: string
          primary_concerns?: string[] | null
          skin_goals?: string[] | null
          skin_type: string
          sleep_quality?: string | null
          stress_level?: string | null
          sun_exposure?: string | null
          updated_at?: string
          user_id: string
          water_intake?: string | null
        }
        Update: {
          age?: number
          created_at?: string
          current_routine?: string | null
          diet_type?: string | null
          gender?: string
          id?: string
          primary_concerns?: string[] | null
          skin_goals?: string[] | null
          skin_type?: string
          sleep_quality?: string | null
          stress_level?: string | null
          sun_exposure?: string | null
          updated_at?: string
          user_id?: string
          water_intake?: string | null
        }
        Relationships: []
      }
      sleep_analyses: {
        Row: {
          analysis_summary: string | null
          analysis_type: string
          avg_sleep_duration: number | null
          avg_sleep_quality: number | null
          consistency_score: number | null
          created_at: string
          efficiency_score: number | null
          id: string
          insights: Json | null
          period_end: string | null
          period_start: string | null
          recommendations: string[] | null
          sleep_score: number
          user_id: string
        }
        Insert: {
          analysis_summary?: string | null
          analysis_type: string
          avg_sleep_duration?: number | null
          avg_sleep_quality?: number | null
          consistency_score?: number | null
          created_at?: string
          efficiency_score?: number | null
          id?: string
          insights?: Json | null
          period_end?: string | null
          period_start?: string | null
          recommendations?: string[] | null
          sleep_score: number
          user_id: string
        }
        Update: {
          analysis_summary?: string | null
          analysis_type?: string
          avg_sleep_duration?: number | null
          avg_sleep_quality?: number | null
          consistency_score?: number | null
          created_at?: string
          efficiency_score?: number | null
          id?: string
          insights?: Json | null
          period_end?: string | null
          period_start?: string | null
          recommendations?: string[] | null
          sleep_score?: number
          user_id?: string
        }
        Relationships: []
      }
      sleep_logs: {
        Row: {
          awakenings: number | null
          bed_time: string | null
          created_at: string
          deep_sleep_percent: number | null
          energy_level: number | null
          factors: Json | null
          id: string
          light_sleep_percent: number | null
          mood_on_wake: string | null
          notes: string | null
          rem_sleep_percent: number | null
          sleep_date: string
          sleep_duration_hours: number | null
          sleep_latency_minutes: number | null
          sleep_quality: number | null
          user_id: string
          wake_time: string | null
        }
        Insert: {
          awakenings?: number | null
          bed_time?: string | null
          created_at?: string
          deep_sleep_percent?: number | null
          energy_level?: number | null
          factors?: Json | null
          id?: string
          light_sleep_percent?: number | null
          mood_on_wake?: string | null
          notes?: string | null
          rem_sleep_percent?: number | null
          sleep_date: string
          sleep_duration_hours?: number | null
          sleep_latency_minutes?: number | null
          sleep_quality?: number | null
          user_id: string
          wake_time?: string | null
        }
        Update: {
          awakenings?: number | null
          bed_time?: string | null
          created_at?: string
          deep_sleep_percent?: number | null
          energy_level?: number | null
          factors?: Json | null
          id?: string
          light_sleep_percent?: number | null
          mood_on_wake?: string | null
          notes?: string | null
          rem_sleep_percent?: number | null
          sleep_date?: string
          sleep_duration_hours?: number | null
          sleep_latency_minutes?: number | null
          sleep_quality?: number | null
          user_id?: string
          wake_time?: string | null
        }
        Relationships: []
      }
      sleep_profiles: {
        Row: {
          age: number
          bed_goal_time: string | null
          bedtime_reminders_enabled: boolean | null
          caffeine_intake: string | null
          created_at: string
          exercise_frequency: string | null
          gender: string
          id: string
          reminder_minutes_before: number | null
          screen_time_before_bed: string | null
          sleep_environment: string | null
          sleep_goal_hours: number | null
          sleep_goals: string[] | null
          sleep_issues: string[] | null
          stress_level: string | null
          updated_at: string
          user_id: string
          wake_goal_time: string | null
          weekly_email_enabled: boolean | null
          work_schedule: string | null
        }
        Insert: {
          age: number
          bed_goal_time?: string | null
          bedtime_reminders_enabled?: boolean | null
          caffeine_intake?: string | null
          created_at?: string
          exercise_frequency?: string | null
          gender: string
          id?: string
          reminder_minutes_before?: number | null
          screen_time_before_bed?: string | null
          sleep_environment?: string | null
          sleep_goal_hours?: number | null
          sleep_goals?: string[] | null
          sleep_issues?: string[] | null
          stress_level?: string | null
          updated_at?: string
          user_id: string
          wake_goal_time?: string | null
          weekly_email_enabled?: boolean | null
          work_schedule?: string | null
        }
        Update: {
          age?: number
          bed_goal_time?: string | null
          bedtime_reminders_enabled?: boolean | null
          caffeine_intake?: string | null
          created_at?: string
          exercise_frequency?: string | null
          gender?: string
          id?: string
          reminder_minutes_before?: number | null
          screen_time_before_bed?: string | null
          sleep_environment?: string | null
          sleep_goal_hours?: number | null
          sleep_goals?: string[] | null
          sleep_issues?: string[] | null
          stress_level?: string | null
          updated_at?: string
          user_id?: string
          wake_goal_time?: string | null
          weekly_email_enabled?: boolean | null
          work_schedule?: string | null
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          created_at: string
          id: string
          message: string
          priority: Database["public"]["Enums"]["ticket_priority"]
          status: Database["public"]["Enums"]["ticket_status"]
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          status?: Database["public"]["Enums"]["ticket_status"]
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          status?: Database["public"]["Enums"]["ticket_status"]
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ticket_replies: {
        Row: {
          created_at: string
          id: string
          is_admin: boolean
          message: string
          ticket_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_admin?: boolean
          message: string
          ticket_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_admin?: boolean
          message?: string
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_replies_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_calendar_connections: {
        Row: {
          access_token: string
          calendar_id: string | null
          created_at: string
          id: string
          provider: string
          refresh_token: string | null
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          calendar_id?: string | null
          created_at?: string
          id?: string
          provider?: string
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          calendar_id?: string | null
          created_at?: string
          id?: string
          provider?: string
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_devices: {
        Row: {
          created_at: string
          device_name: string | null
          device_type: string | null
          fcm_token: string
          id: string
          is_active: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_name?: string | null
          device_type?: string | null
          fcm_token: string
          id?: string
          is_active?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_name?: string | null
          device_type?: string | null
          fcm_token?: string
          id?: string
          is_active?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      water_logs: {
        Row: {
          amount_ml: number
          created_at: string
          id: string
          logged_at: string
          user_id: string
        }
        Insert: {
          amount_ml?: number
          created_at?: string
          id?: string
          logged_at?: string
          user_id: string
        }
        Update: {
          amount_ml?: number
          created_at?: string
          id?: string
          logged_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_get_all_generations: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          created_at: string
          credits_used: number
          id: string
          model: string
          output_url: string
          prompt: string
          status: string
          thumbnail_url: string
          type: string
          user_id: string
        }[]
      }
      admin_get_all_profiles: {
        Args: { p_limit?: number; p_offset?: number; p_search?: string }
        Returns: {
          avatar_url: string
          created_at: string
          credits: number
          display_name: string
          email: string
          id: string
          plan: string
          source: string
          subscription_end_date: string
          subscription_status: string
          total_count: number
          updated_at: string
          user_id: string
        }[]
      }
      admin_get_credit_stats: { Args: never; Returns: Json }
      admin_get_stats: { Args: never; Returns: Json }
      admin_get_stats_by_range: {
        Args: { p_end_date?: string; p_start_date?: string }
        Returns: Json
      }
      admin_get_subscribed_users: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_search?: string
          p_source?: string
          p_status?: string
        }
        Returns: {
          created_at: string
          display_name: string
          email: string
          id: string
          plan: string
          source: string
          subscription_end_date: string
          subscription_status: string
          total_count: number
          user_id: string
        }[]
      }
      admin_get_top_credit_usage: {
        Args: { p_end_date?: string; p_limit?: number; p_start_date?: string }
        Returns: {
          avatar_url: string
          display_name: string
          email: string
          generation_count: number
          plan: string
          subscription_status: string
          total_credits_used: number
          user_id: string
        }[]
      }
      admin_get_users_by_credits: {
        Args: { p_limit?: number; p_offset?: number; p_search?: string }
        Returns: {
          avatar_url: string
          created_at: string
          credits: number
          display_name: string
          email: string
          id: string
          plan: string
          subscription_status: string
          total_count: number
          user_id: string
        }[]
      }
      admin_get_weekly_stats: { Args: never; Returns: Json }
      admin_get_weekly_stats_by_range: {
        Args: { p_end_date?: string; p_start_date?: string }
        Returns: Json
      }
      admin_update_credits: {
        Args: { p_credits: number; p_user_id: string }
        Returns: boolean
      }
      cleanup_expired_verifications: { Args: never; Returns: undefined }
      complete_referral: { Args: { p_user_id: string }; Returns: undefined }
      generate_referral_code: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      notification_channel: "push" | "email" | "both"
      notification_status:
        | "active"
        | "paused"
        | "triggered"
        | "expired"
        | "cancelled"
      notification_type:
        | "time_reminder"
        | "crypto_price"
        | "weather"
        | "custom"
        | "sports_match"
        | "news_monitoring"
        | "social_media"
        | "screen_time"
        | "stock_price"
        | "location_based"
        | "flight_status"
        | "calendar_event"
      ticket_priority: "low" | "medium" | "high" | "urgent"
      ticket_status: "open" | "in_progress" | "resolved" | "closed"
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
      app_role: ["admin", "moderator", "user"],
      notification_channel: ["push", "email", "both"],
      notification_status: [
        "active",
        "paused",
        "triggered",
        "expired",
        "cancelled",
      ],
      notification_type: [
        "time_reminder",
        "crypto_price",
        "weather",
        "custom",
        "sports_match",
        "news_monitoring",
        "social_media",
        "screen_time",
        "stock_price",
        "location_based",
        "flight_status",
        "calendar_event",
      ],
      ticket_priority: ["low", "medium", "high", "urgent"],
      ticket_status: ["open", "in_progress", "resolved", "closed"],
    },
  },
} as const
