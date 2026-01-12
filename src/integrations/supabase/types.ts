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
      access_groups: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          permissions: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          permissions?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          permissions?: Json
          updated_at?: string
        }
        Relationships: []
      }
      access_requests: {
        Row: {
          business: string
          created_at: string
          email: string
          id: string
          name: string
          reason: string
          status: string
        }
        Insert: {
          business: string
          created_at?: string
          email: string
          id?: string
          name: string
          reason: string
          status?: string
        }
        Update: {
          business?: string
          created_at?: string
          email?: string
          id?: string
          name?: string
          reason?: string
          status?: string
        }
        Relationships: []
      }
      ai_asset_details: {
        Row: {
          archived: boolean
          archived_at: string | null
          archived_by: string | null
          created_at: string
          created_by: string | null
          eu_ai_act_category: string | null
          id: string
          model_name: string | null
          model_provider: string | null
          model_version: string | null
          notes: string | null
          secondary_asset_id: string
          updated_at: string
        }
        Insert: {
          archived?: boolean
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          created_by?: string | null
          eu_ai_act_category?: string | null
          id?: string
          model_name?: string | null
          model_provider?: string | null
          model_version?: string | null
          notes?: string | null
          secondary_asset_id: string
          updated_at?: string
        }
        Update: {
          archived?: boolean
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          created_by?: string | null
          eu_ai_act_category?: string | null
          id?: string
          model_name?: string | null
          model_provider?: string | null
          model_version?: string | null
          notes?: string | null
          secondary_asset_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_asset_details_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_asset_details_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_asset_details_secondary_asset_id_fkey"
            columns: ["secondary_asset_id"]
            isOneToOne: true
            referencedRelation: "secondary_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_control_insights_cache: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          input_hash: string
          insight_type: string
          output_json: Json
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          input_hash: string
          insight_type: string
          output_json: Json
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          input_hash?: string
          insight_type?: string
          output_json?: Json
        }
        Relationships: []
      }
      ai_ops_insights_cache: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          input_hash: string
          insight_type: string
          output_json: Json
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          input_hash: string
          insight_type: string
          output_json: Json
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          input_hash?: string
          insight_type?: string
          output_json?: Json
        }
        Relationships: []
      }
      ai_use_cases: {
        Row: {
          ai_asset_details_id: string
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          rationale: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          ai_asset_details_id: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          rationale?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          ai_asset_details_id?: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          rationale?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_use_cases_ai_asset_details_id_fkey"
            columns: ["ai_asset_details_id"]
            isOneToOne: false
            referencedRelation: "ai_asset_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_use_cases_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_use_cases_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          id: string
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      asset_relationships: {
        Row: {
          business_unit_id: string
          created_at: string
          created_by: string | null
          data_flow_label: string | null
          data_sensitivity: string | null
          from_entity_id: string
          from_entity_type: string
          id: string
          notes: string | null
          relationship_type: string
          to_entity_id: string
          to_entity_type: string
          updated_at: string
        }
        Insert: {
          business_unit_id: string
          created_at?: string
          created_by?: string | null
          data_flow_label?: string | null
          data_sensitivity?: string | null
          from_entity_id: string
          from_entity_type: string
          id?: string
          notes?: string | null
          relationship_type: string
          to_entity_id: string
          to_entity_type: string
          updated_at?: string
        }
        Update: {
          business_unit_id?: string
          created_at?: string
          created_by?: string | null
          data_flow_label?: string | null
          data_sensitivity?: string | null
          from_entity_id?: string
          from_entity_type?: string
          id?: string
          notes?: string | null
          relationship_type?: string
          to_entity_id?: string
          to_entity_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_relationships_business_unit_id_fkey"
            columns: ["business_unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          details: Json | null
          expires_at: string | null
          id: string
          ip_address: string | null
          is_retained: boolean
          retained_at: string | null
          retained_by: string | null
          retention_reason: string | null
          target_id: string | null
          target_type: string
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          details?: Json | null
          expires_at?: string | null
          id?: string
          ip_address?: string | null
          is_retained?: boolean
          retained_at?: string | null
          retained_by?: string | null
          retention_reason?: string | null
          target_id?: string | null
          target_type: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          details?: Json | null
          expires_at?: string | null
          id?: string
          ip_address?: string | null
          is_retained?: boolean
          retained_at?: string | null
          retained_by?: string | null
          retention_reason?: string | null
          target_id?: string | null
          target_type?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      bia_assessments: {
        Row: {
          ai_rationale: string | null
          ai_suggested_mtd_hours: number | null
          ai_suggested_rpo_hours: number | null
          ai_suggested_rto_hours: number | null
          bia_owner: string | null
          business_unit_id: string | null
          created_at: string
          created_by: string | null
          derived_criticality: string | null
          id: string
          last_assessed_at: string | null
          mtd_hours: number | null
          next_review_at: string | null
          notes: string | null
          primary_asset_id: string
          risk_appetite_id: string
          rpo_hours: number | null
          rto_hours: number | null
          time_to_high_bucket: string | null
          updated_at: string
        }
        Insert: {
          ai_rationale?: string | null
          ai_suggested_mtd_hours?: number | null
          ai_suggested_rpo_hours?: number | null
          ai_suggested_rto_hours?: number | null
          bia_owner?: string | null
          business_unit_id?: string | null
          created_at?: string
          created_by?: string | null
          derived_criticality?: string | null
          id?: string
          last_assessed_at?: string | null
          mtd_hours?: number | null
          next_review_at?: string | null
          notes?: string | null
          primary_asset_id: string
          risk_appetite_id: string
          rpo_hours?: number | null
          rto_hours?: number | null
          time_to_high_bucket?: string | null
          updated_at?: string
        }
        Update: {
          ai_rationale?: string | null
          ai_suggested_mtd_hours?: number | null
          ai_suggested_rpo_hours?: number | null
          ai_suggested_rto_hours?: number | null
          bia_owner?: string | null
          business_unit_id?: string | null
          created_at?: string
          created_by?: string | null
          derived_criticality?: string | null
          id?: string
          last_assessed_at?: string | null
          mtd_hours?: number | null
          next_review_at?: string | null
          notes?: string | null
          primary_asset_id?: string
          risk_appetite_id?: string
          rpo_hours?: number | null
          rto_hours?: number | null
          time_to_high_bucket?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bia_assessments_business_unit_id_fkey"
            columns: ["business_unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bia_assessments_primary_asset_id_fkey"
            columns: ["primary_asset_id"]
            isOneToOne: true
            referencedRelation: "primary_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bia_assessments_risk_appetite_id_fkey"
            columns: ["risk_appetite_id"]
            isOneToOne: false
            referencedRelation: "risk_appetites"
            referencedColumns: ["id"]
          },
        ]
      }
      bia_audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          bia_assessment_id: string | null
          changes: Json | null
          continuity_plan_id: string | null
          created_at: string
          id: string
          rationale: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          bia_assessment_id?: string | null
          changes?: Json | null
          continuity_plan_id?: string | null
          created_at?: string
          id?: string
          rationale?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          bia_assessment_id?: string | null
          changes?: Json | null
          continuity_plan_id?: string | null
          created_at?: string
          id?: string
          rationale?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bia_audit_logs_bia_assessment_id_fkey"
            columns: ["bia_assessment_id"]
            isOneToOne: false
            referencedRelation: "bia_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bia_audit_logs_continuity_plan_id_fkey"
            columns: ["continuity_plan_id"]
            isOneToOne: false
            referencedRelation: "continuity_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      bia_impact_timeline: {
        Row: {
          ai_rationale: string | null
          ai_suggested_impact_level_id: string | null
          bia_assessment_id: string
          created_at: string
          id: string
          impact_level_id: string
          rationale: string | null
          time_bucket: string
        }
        Insert: {
          ai_rationale?: string | null
          ai_suggested_impact_level_id?: string | null
          bia_assessment_id: string
          created_at?: string
          id?: string
          impact_level_id: string
          rationale?: string | null
          time_bucket: string
        }
        Update: {
          ai_rationale?: string | null
          ai_suggested_impact_level_id?: string | null
          bia_assessment_id?: string
          created_at?: string
          id?: string
          impact_level_id?: string
          rationale?: string | null
          time_bucket?: string
        }
        Relationships: [
          {
            foreignKeyName: "bia_impact_timeline_ai_suggested_impact_level_id_fkey"
            columns: ["ai_suggested_impact_level_id"]
            isOneToOne: false
            referencedRelation: "matrix_impact_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bia_impact_timeline_bia_assessment_id_fkey"
            columns: ["bia_assessment_id"]
            isOneToOne: false
            referencedRelation: "bia_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bia_impact_timeline_impact_level_id_fkey"
            columns: ["impact_level_id"]
            isOneToOne: false
            referencedRelation: "matrix_impact_levels"
            referencedColumns: ["id"]
          },
        ]
      }
      board_members: {
        Row: {
          created_at: string
          end_date: string | null
          governance_person_id: string
          id: string
          notes: string | null
          position_title: string
          start_date: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          governance_person_id: string
          id?: string
          notes?: string | null
          position_title: string
          start_date?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          governance_person_id?: string
          id?: string
          notes?: string | null
          position_title?: string
          start_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "board_members_governance_person_id_fkey"
            columns: ["governance_person_id"]
            isOneToOne: false
            referencedRelation: "governance_people"
            referencedColumns: ["id"]
          },
        ]
      }
      business_units: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_security_org: boolean
          manager_user_id: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_security_org?: boolean
          manager_user_id?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_security_org?: boolean
          manager_user_id?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      central_logging_config: {
        Row: {
          api_enabled: boolean | null
          api_key_hash: string | null
          created_at: string | null
          delete_after_export: boolean | null
          id: string
          log_admin_actions: boolean | null
          log_api_requests: boolean | null
          log_authentication_events: boolean | null
          log_database_changes: boolean | null
          log_rls_violations: boolean | null
          log_sql_injection_attempts: boolean | null
          retention_days: number | null
          updated_at: string | null
          webhook_enabled: boolean | null
          webhook_url: string | null
        }
        Insert: {
          api_enabled?: boolean | null
          api_key_hash?: string | null
          created_at?: string | null
          delete_after_export?: boolean | null
          id?: string
          log_admin_actions?: boolean | null
          log_api_requests?: boolean | null
          log_authentication_events?: boolean | null
          log_database_changes?: boolean | null
          log_rls_violations?: boolean | null
          log_sql_injection_attempts?: boolean | null
          retention_days?: number | null
          updated_at?: string | null
          webhook_enabled?: boolean | null
          webhook_url?: string | null
        }
        Update: {
          api_enabled?: boolean | null
          api_key_hash?: string | null
          created_at?: string | null
          delete_after_export?: boolean | null
          id?: string
          log_admin_actions?: boolean | null
          log_api_requests?: boolean | null
          log_authentication_events?: boolean | null
          log_database_changes?: boolean | null
          log_rls_violations?: boolean | null
          log_sql_injection_attempts?: boolean | null
          retention_days?: number | null
          updated_at?: string | null
          webhook_enabled?: boolean | null
          webhook_url?: string | null
        }
        Relationships: []
      }
      central_logs: {
        Row: {
          action: string | null
          actor_email: string | null
          actor_ip: string | null
          actor_user_id: string | null
          affected_rows: number | null
          created_at: string | null
          details: Json | null
          exported_at: string | null
          id: string
          log_type: string
          raw_query: string | null
          severity: string
          source: string | null
          user_agent: string | null
        }
        Insert: {
          action?: string | null
          actor_email?: string | null
          actor_ip?: string | null
          actor_user_id?: string | null
          affected_rows?: number | null
          created_at?: string | null
          details?: Json | null
          exported_at?: string | null
          id?: string
          log_type: string
          raw_query?: string | null
          severity?: string
          source?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string | null
          actor_email?: string | null
          actor_ip?: string | null
          actor_user_id?: string | null
          affected_rows?: number | null
          created_at?: string | null
          details?: Json | null
          exported_at?: string | null
          id?: string
          log_type?: string
          raw_query?: string | null
          severity?: string
          source?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      company_profile: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          city: string | null
          country: string | null
          created_at: string
          employee_count: number | null
          id: string
          industry: string | null
          legal_name: string
          logo_url: string | null
          notes: string | null
          postal_code: string | null
          primary_timezone: string | null
          registration_id: string | null
          trading_name: string | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          employee_count?: number | null
          id?: string
          industry?: string | null
          legal_name: string
          logo_url?: string | null
          notes?: string | null
          postal_code?: string | null
          primary_timezone?: string | null
          registration_id?: string | null
          trading_name?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          employee_count?: number | null
          id?: string
          industry?: string | null
          legal_name?: string
          logo_url?: string | null
          notes?: string | null
          postal_code?: string | null
          primary_timezone?: string | null
          registration_id?: string | null
          trading_name?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      confidentiality_levels: {
        Row: {
          breach_impact_level_id: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          rank: number
          updated_at: string
        }
        Insert: {
          breach_impact_level_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          rank: number
          updated_at?: string
        }
        Update: {
          breach_impact_level_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          rank?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "confidentiality_levels_breach_impact_level_id_fkey"
            columns: ["breach_impact_level_id"]
            isOneToOne: false
            referencedRelation: "matrix_impact_levels"
            referencedColumns: ["id"]
          },
        ]
      }
      continuity_plans: {
        Row: {
          alternate_site: string | null
          approved_at: string | null
          approved_by: string | null
          business_unit_id: string | null
          communication_plan: string | null
          created_at: string
          created_by: string | null
          dependencies: string | null
          description: string | null
          id: string
          key_contacts: Json | null
          last_tested_at: string | null
          next_test_at: string | null
          plan_name: string
          plan_version: string | null
          primary_asset_id: string
          recovery_strategy: string | null
          status: string | null
          testing_schedule: string | null
          updated_at: string
        }
        Insert: {
          alternate_site?: string | null
          approved_at?: string | null
          approved_by?: string | null
          business_unit_id?: string | null
          communication_plan?: string | null
          created_at?: string
          created_by?: string | null
          dependencies?: string | null
          description?: string | null
          id?: string
          key_contacts?: Json | null
          last_tested_at?: string | null
          next_test_at?: string | null
          plan_name: string
          plan_version?: string | null
          primary_asset_id: string
          recovery_strategy?: string | null
          status?: string | null
          testing_schedule?: string | null
          updated_at?: string
        }
        Update: {
          alternate_site?: string | null
          approved_at?: string | null
          approved_by?: string | null
          business_unit_id?: string | null
          communication_plan?: string | null
          created_at?: string
          created_by?: string | null
          dependencies?: string | null
          description?: string | null
          id?: string
          key_contacts?: Json | null
          last_tested_at?: string | null
          next_test_at?: string | null
          plan_name?: string
          plan_version?: string | null
          primary_asset_id?: string
          recovery_strategy?: string | null
          status?: string | null
          testing_schedule?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "continuity_plans_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "continuity_plans_business_unit_id_fkey"
            columns: ["business_unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "continuity_plans_primary_asset_id_fkey"
            columns: ["primary_asset_id"]
            isOneToOne: false
            referencedRelation: "primary_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      control_findings: {
        Row: {
          assigned_to: string | null
          business_unit_id: string | null
          closed_date: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          finding_type: string
          framework_control_id: string | null
          id: string
          identified_date: string
          internal_control_id: string | null
          remediation_notes: string | null
          remediation_plan: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          business_unit_id?: string | null
          closed_date?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          finding_type: string
          framework_control_id?: string | null
          id?: string
          identified_date?: string
          internal_control_id?: string | null
          remediation_notes?: string | null
          remediation_plan?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          business_unit_id?: string | null
          closed_date?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          finding_type?: string
          framework_control_id?: string | null
          id?: string
          identified_date?: string
          internal_control_id?: string | null
          remediation_notes?: string | null
          remediation_plan?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "control_findings_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "control_findings_business_unit_id_fkey"
            columns: ["business_unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "control_findings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "control_findings_framework_control_id_fkey"
            columns: ["framework_control_id"]
            isOneToOne: false
            referencedRelation: "framework_controls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "control_findings_internal_control_id_fkey"
            columns: ["internal_control_id"]
            isOneToOne: false
            referencedRelation: "internal_controls"
            referencedColumns: ["id"]
          },
        ]
      }
      control_frameworks: {
        Row: {
          created_at: string
          created_by: string | null
          default_id_prefix: string | null
          description: string | null
          external_id: string | null
          id: string
          is_active: boolean
          name: string
          publisher: string | null
          updated_at: string
          version: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          default_id_prefix?: string | null
          description?: string | null
          external_id?: string | null
          id?: string
          is_active?: boolean
          name: string
          publisher?: string | null
          updated_at?: string
          version?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          default_id_prefix?: string | null
          description?: string | null
          external_id?: string | null
          id?: string
          is_active?: boolean
          name?: string
          publisher?: string | null
          updated_at?: string
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "control_frameworks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      control_import_jobs: {
        Row: {
          created_at: string
          created_by: string | null
          duplicate_behavior: string | null
          error_count: number | null
          framework_id: string
          id: string
          imported_count: number | null
          row_count: number | null
          skipped_count: number | null
          source_file_name: string | null
          source_type: string
          status: string
          updated_at: string
          updated_count: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          duplicate_behavior?: string | null
          error_count?: number | null
          framework_id: string
          id?: string
          imported_count?: number | null
          row_count?: number | null
          skipped_count?: number | null
          source_file_name?: string | null
          source_type: string
          status?: string
          updated_at?: string
          updated_count?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          duplicate_behavior?: string | null
          error_count?: number | null
          framework_id?: string
          id?: string
          imported_count?: number | null
          row_count?: number | null
          skipped_count?: number | null
          source_file_name?: string | null
          source_type?: string
          status?: string
          updated_at?: string
          updated_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "control_import_jobs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "control_import_jobs_framework_id_fkey"
            columns: ["framework_id"]
            isOneToOne: false
            referencedRelation: "control_frameworks"
            referencedColumns: ["id"]
          },
        ]
      }
      control_import_mappings: {
        Row: {
          ai_reasoning: string | null
          canonical_field: string
          confidence: number | null
          created_at: string
          id: string
          job_id: string
          source_column: string | null
          transform_json: Json | null
        }
        Insert: {
          ai_reasoning?: string | null
          canonical_field: string
          confidence?: number | null
          created_at?: string
          id?: string
          job_id: string
          source_column?: string | null
          transform_json?: Json | null
        }
        Update: {
          ai_reasoning?: string | null
          canonical_field?: string
          confidence?: number | null
          created_at?: string
          id?: string
          job_id?: string
          source_column?: string | null
          transform_json?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "control_import_mappings_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "control_import_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      control_import_staging_rows: {
        Row: {
          created_at: string
          id: string
          job_id: string
          normalized: Json | null
          raw: Json
          row_number: number
          validation_errors: Json | null
          will_import: boolean | null
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          normalized?: Json | null
          raw: Json
          row_number: number
          validation_errors?: Json | null
          will_import?: boolean | null
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          normalized?: Json | null
          raw?: Json
          row_number?: number
          validation_errors?: Json | null
          will_import?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "control_import_staging_rows_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "control_import_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      controls: {
        Row: {
          business_unit_id: string | null
          control_category: string | null
          control_id: string
          control_type: string | null
          created_at: string
          created_by: string | null
          description: string | null
          effectiveness: string | null
          id: string
          implementation_date: string | null
          last_review_date: string | null
          name: string
          next_review_date: string | null
          owner_id: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          business_unit_id?: string | null
          control_category?: string | null
          control_id: string
          control_type?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          effectiveness?: string | null
          id?: string
          implementation_date?: string | null
          last_review_date?: string | null
          name: string
          next_review_date?: string | null
          owner_id?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          business_unit_id?: string | null
          control_category?: string | null
          control_id?: string
          control_type?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          effectiveness?: string | null
          id?: string
          implementation_date?: string | null
          last_review_date?: string | null
          name?: string
          next_review_date?: string | null
          owner_id?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "controls_business_unit_id_fkey"
            columns: ["business_unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_insights_cache: {
        Row: {
          created_by: string | null
          expires_at: string
          generated_at: string
          id: string
          insight_data: Json
          insight_type: string
        }
        Insert: {
          created_by?: string | null
          expires_at?: string
          generated_at?: string
          id?: string
          insight_data: Json
          insight_type: string
        }
        Update: {
          created_by?: string | null
          expires_at?: string
          generated_at?: string
          id?: string
          insight_data?: Json
          insight_type?: string
        }
        Relationships: []
      }
      dashboard_snapshots: {
        Row: {
          created_at: string
          id: string
          metrics: Json
          snapshot_date: string
        }
        Insert: {
          created_at?: string
          id?: string
          metrics: Json
          snapshot_date?: string
        }
        Update: {
          created_at?: string
          id?: string
          metrics?: Json
          snapshot_date?: string
        }
        Relationships: []
      }
      dashboard_thresholds: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          threshold_key: string
          threshold_name: string
          threshold_unit: string
          threshold_value: number
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          threshold_key: string
          threshold_name: string
          threshold_unit?: string
          threshold_value: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          threshold_key?: string
          threshold_name?: string
          threshold_unit?: string
          threshold_value?: number
          updated_at?: string
        }
        Relationships: []
      }
      data_forge_connection_endpoints: {
        Row: {
          connection_id: string
          created_at: string | null
          description: string | null
          endpoint_path: string
          field_mappings: Json | null
          http_method: string
          id: string
          is_active: boolean | null
          last_sync_error: string | null
          last_sync_row_count: number | null
          last_sync_status: string | null
          last_synced_at: string | null
          name: string
          pagination_config: Json | null
          pagination_type: string | null
          query_params: Json | null
          request_body_template: Json | null
          response_data_path: string | null
          sync_enabled: boolean | null
          sync_interval: string | null
          target_module: string
          unique_key_field: string | null
          updated_at: string | null
        }
        Insert: {
          connection_id: string
          created_at?: string | null
          description?: string | null
          endpoint_path: string
          field_mappings?: Json | null
          http_method?: string
          id?: string
          is_active?: boolean | null
          last_sync_error?: string | null
          last_sync_row_count?: number | null
          last_sync_status?: string | null
          last_synced_at?: string | null
          name: string
          pagination_config?: Json | null
          pagination_type?: string | null
          query_params?: Json | null
          request_body_template?: Json | null
          response_data_path?: string | null
          sync_enabled?: boolean | null
          sync_interval?: string | null
          target_module: string
          unique_key_field?: string | null
          updated_at?: string | null
        }
        Update: {
          connection_id?: string
          created_at?: string | null
          description?: string | null
          endpoint_path?: string
          field_mappings?: Json | null
          http_method?: string
          id?: string
          is_active?: boolean | null
          last_sync_error?: string | null
          last_sync_row_count?: number | null
          last_sync_status?: string | null
          last_synced_at?: string | null
          name?: string
          pagination_config?: Json | null
          pagination_type?: string | null
          query_params?: Json | null
          request_body_template?: Json | null
          response_data_path?: string | null
          sync_enabled?: boolean | null
          sync_interval?: string | null
          target_module?: string
          unique_key_field?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "data_forge_connection_endpoints_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "data_forge_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      data_forge_connection_secrets: {
        Row: {
          connection_id: string
          created_at: string | null
          id: string
          secret_key: string
          secret_value: string
          updated_at: string | null
        }
        Insert: {
          connection_id: string
          created_at?: string | null
          id?: string
          secret_key: string
          secret_value: string
          updated_at?: string | null
        }
        Update: {
          connection_id?: string
          created_at?: string | null
          id?: string
          secret_key?: string
          secret_value?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "data_forge_connection_secrets_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "data_forge_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      data_forge_connections: {
        Row: {
          auth_config: Json | null
          auth_type: string
          base_url: string
          bucket_name: string | null
          connection_type: string
          created_at: string | null
          created_by: string | null
          database_name: string | null
          description: string | null
          driver_type: string | null
          file_format: string | null
          file_pattern: string | null
          headers_config: Json | null
          id: string
          is_active: boolean | null
          last_sync_at: string | null
          last_test_error: string | null
          last_test_status: string | null
          last_tested_at: string | null
          name: string
          next_sync_at: string | null
          query_template: string | null
          rate_limit_per_minute: number | null
          region: string | null
          schema_name: string | null
          source_category: string | null
          sync_enabled: boolean | null
          sync_schedule: string | null
          system_type: string
          timeout_seconds: number | null
          updated_at: string | null
        }
        Insert: {
          auth_config?: Json | null
          auth_type?: string
          base_url: string
          bucket_name?: string | null
          connection_type: string
          created_at?: string | null
          created_by?: string | null
          database_name?: string | null
          description?: string | null
          driver_type?: string | null
          file_format?: string | null
          file_pattern?: string | null
          headers_config?: Json | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          last_test_error?: string | null
          last_test_status?: string | null
          last_tested_at?: string | null
          name: string
          next_sync_at?: string | null
          query_template?: string | null
          rate_limit_per_minute?: number | null
          region?: string | null
          schema_name?: string | null
          source_category?: string | null
          sync_enabled?: boolean | null
          sync_schedule?: string | null
          system_type: string
          timeout_seconds?: number | null
          updated_at?: string | null
        }
        Update: {
          auth_config?: Json | null
          auth_type?: string
          base_url?: string
          bucket_name?: string | null
          connection_type?: string
          created_at?: string | null
          created_by?: string | null
          database_name?: string | null
          description?: string | null
          driver_type?: string | null
          file_format?: string | null
          file_pattern?: string | null
          headers_config?: Json | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          last_test_error?: string | null
          last_test_status?: string | null
          last_tested_at?: string | null
          name?: string
          next_sync_at?: string | null
          query_template?: string | null
          rate_limit_per_minute?: number | null
          region?: string | null
          schema_name?: string | null
          source_category?: string | null
          sync_enabled?: boolean | null
          sync_schedule?: string | null
          system_type?: string
          timeout_seconds?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "data_forge_connections_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      data_forge_jobs: {
        Row: {
          business_unit_id: string | null
          connection_id: string | null
          created_at: string | null
          created_by: string | null
          duplicate_behavior: string | null
          endpoint_id: string | null
          error_count: number | null
          id: string
          imported_count: number | null
          job_name: string
          last_synced_at: string | null
          next_sync_at: string | null
          row_count: number | null
          skipped_count: number | null
          source_api_config: Json | null
          source_file_name: string | null
          source_type: string
          status: string | null
          sync_enabled: boolean | null
          sync_schedule: string | null
          target_module: string
          updated_at: string | null
        }
        Insert: {
          business_unit_id?: string | null
          connection_id?: string | null
          created_at?: string | null
          created_by?: string | null
          duplicate_behavior?: string | null
          endpoint_id?: string | null
          error_count?: number | null
          id?: string
          imported_count?: number | null
          job_name: string
          last_synced_at?: string | null
          next_sync_at?: string | null
          row_count?: number | null
          skipped_count?: number | null
          source_api_config?: Json | null
          source_file_name?: string | null
          source_type?: string
          status?: string | null
          sync_enabled?: boolean | null
          sync_schedule?: string | null
          target_module: string
          updated_at?: string | null
        }
        Update: {
          business_unit_id?: string | null
          connection_id?: string | null
          created_at?: string | null
          created_by?: string | null
          duplicate_behavior?: string | null
          endpoint_id?: string | null
          error_count?: number | null
          id?: string
          imported_count?: number | null
          job_name?: string
          last_synced_at?: string | null
          next_sync_at?: string | null
          row_count?: number | null
          skipped_count?: number | null
          source_api_config?: Json | null
          source_file_name?: string | null
          source_type?: string
          status?: string | null
          sync_enabled?: boolean | null
          sync_schedule?: string | null
          target_module?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "data_forge_jobs_business_unit_id_fkey"
            columns: ["business_unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_forge_jobs_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "data_forge_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_forge_jobs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_forge_jobs_endpoint_id_fkey"
            columns: ["endpoint_id"]
            isOneToOne: false
            referencedRelation: "data_forge_connection_endpoints"
            referencedColumns: ["id"]
          },
        ]
      }
      data_forge_mappings: {
        Row: {
          ai_reasoning: string | null
          confidence: number | null
          created_at: string | null
          id: string
          job_id: string
          source_column: string | null
          target_field: string
          transform_config: Json | null
        }
        Insert: {
          ai_reasoning?: string | null
          confidence?: number | null
          created_at?: string | null
          id?: string
          job_id: string
          source_column?: string | null
          target_field: string
          transform_config?: Json | null
        }
        Update: {
          ai_reasoning?: string | null
          confidence?: number | null
          created_at?: string | null
          id?: string
          job_id?: string
          source_column?: string | null
          target_field?: string
          transform_config?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "data_forge_mappings_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "data_forge_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      data_forge_staging_rows: {
        Row: {
          created_at: string | null
          id: string
          job_id: string
          normalized_data: Json | null
          raw_data: Json
          row_number: number
          validation_errors: Json | null
          will_import: boolean | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          job_id: string
          normalized_data?: Json | null
          raw_data: Json
          row_number: number
          validation_errors?: Json | null
          will_import?: boolean | null
        }
        Update: {
          created_at?: string | null
          id?: string
          job_id?: string
          normalized_data?: Json | null
          raw_data?: Json
          row_number?: number
          validation_errors?: Json | null
          will_import?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "data_forge_staging_rows_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "data_forge_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence_control_links: {
        Row: {
          created_at: string
          created_by: string | null
          evidence_id: string
          framework_control_id: string | null
          id: string
          internal_control_id: string | null
          notes: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          evidence_id: string
          framework_control_id?: string | null
          id?: string
          internal_control_id?: string | null
          notes?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          evidence_id?: string
          framework_control_id?: string | null
          id?: string
          internal_control_id?: string | null
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evidence_control_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_control_links_evidence_id_fkey"
            columns: ["evidence_id"]
            isOneToOne: false
            referencedRelation: "evidence_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_control_links_framework_control_id_fkey"
            columns: ["framework_control_id"]
            isOneToOne: false
            referencedRelation: "framework_controls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_control_links_internal_control_id_fkey"
            columns: ["internal_control_id"]
            isOneToOne: false
            referencedRelation: "internal_controls"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence_items: {
        Row: {
          ai_extracted_dates: Json | null
          ai_suggested_tags: string[] | null
          ai_summary: string | null
          business_unit_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          evidence_end_date: string | null
          evidence_start_date: string | null
          evidence_type: string | null
          expires_at: string | null
          file_mime: string | null
          file_name: string | null
          file_size_bytes: number | null
          id: string
          name: string
          owner_id: string | null
          storage_key: string | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          ai_extracted_dates?: Json | null
          ai_suggested_tags?: string[] | null
          ai_summary?: string | null
          business_unit_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          evidence_end_date?: string | null
          evidence_start_date?: string | null
          evidence_type?: string | null
          expires_at?: string | null
          file_mime?: string | null
          file_name?: string | null
          file_size_bytes?: number | null
          id?: string
          name: string
          owner_id?: string | null
          storage_key?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          ai_extracted_dates?: Json | null
          ai_suggested_tags?: string[] | null
          ai_summary?: string | null
          business_unit_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          evidence_end_date?: string | null
          evidence_start_date?: string | null
          evidence_type?: string | null
          expires_at?: string | null
          file_mime?: string | null
          file_name?: string | null
          file_size_bytes?: number | null
          id?: string
          name?: string
          owner_id?: string | null
          storage_key?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidence_items_business_unit_id_fkey"
            columns: ["business_unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_items_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      executive_roles: {
        Row: {
          created_at: string
          governance_person_id: string | null
          id: string
          key: string
          label: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          governance_person_id?: string | null
          id?: string
          key: string
          label: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          governance_person_id?: string | null
          id?: string
          key?: string
          label?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "executive_roles_governance_person_id_fkey"
            columns: ["governance_person_id"]
            isOneToOne: false
            referencedRelation: "governance_people"
            referencedColumns: ["id"]
          },
        ]
      }
      finding_milestones: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          finding_id: string
          id: string
          owner_id: string | null
          poam_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          finding_id: string
          id?: string
          owner_id?: string | null
          poam_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          finding_id?: string
          id?: string
          owner_id?: string | null
          poam_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finding_milestones_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finding_milestones_finding_id_fkey"
            columns: ["finding_id"]
            isOneToOne: false
            referencedRelation: "control_findings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finding_milestones_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finding_milestones_poam_id_fkey"
            columns: ["poam_id"]
            isOneToOne: false
            referencedRelation: "finding_poams"
            referencedColumns: ["id"]
          },
        ]
      }
      finding_poams: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          finding_id: string
          id: string
          name: string
          owner_id: string | null
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          finding_id: string
          id?: string
          name: string
          owner_id?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          finding_id?: string
          id?: string
          name?: string
          owner_id?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finding_poams_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finding_poams_finding_id_fkey"
            columns: ["finding_id"]
            isOneToOne: false
            referencedRelation: "control_findings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finding_poams_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      framework_compliance_status: {
        Row: {
          compliance_percentage: number
          created_at: string
          framework_id: string
          id: string
          implemented_controls: number
          last_calculated_at: string
          not_applicable: number
          not_implemented: number
          partially_implemented: number
          total_controls: number
          updated_at: string
        }
        Insert: {
          compliance_percentage?: number
          created_at?: string
          framework_id: string
          id?: string
          implemented_controls?: number
          last_calculated_at?: string
          not_applicable?: number
          not_implemented?: number
          partially_implemented?: number
          total_controls?: number
          updated_at?: string
        }
        Update: {
          compliance_percentage?: number
          created_at?: string
          framework_id?: string
          id?: string
          implemented_controls?: number
          last_calculated_at?: string
          not_applicable?: number
          not_implemented?: number
          partially_implemented?: number
          total_controls?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "framework_compliance_status_framework_id_fkey"
            columns: ["framework_id"]
            isOneToOne: true
            referencedRelation: "control_frameworks"
            referencedColumns: ["id"]
          },
        ]
      }
      framework_control_crosswalk: {
        Row: {
          confidence: number | null
          created_at: string
          created_by: string | null
          from_framework_control_id: string
          id: string
          mapping_type: string
          rationale: string | null
          to_framework_control_id: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          created_by?: string | null
          from_framework_control_id: string
          id?: string
          mapping_type?: string
          rationale?: string | null
          to_framework_control_id: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          created_by?: string | null
          from_framework_control_id?: string
          id?: string
          mapping_type?: string
          rationale?: string | null
          to_framework_control_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "framework_control_crosswalk_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "framework_control_crosswalk_from_framework_control_id_fkey"
            columns: ["from_framework_control_id"]
            isOneToOne: false
            referencedRelation: "framework_controls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "framework_control_crosswalk_to_framework_control_id_fkey"
            columns: ["to_framework_control_id"]
            isOneToOne: false
            referencedRelation: "framework_controls"
            referencedColumns: ["id"]
          },
        ]
      }
      framework_controls: {
        Row: {
          control_code: string | null
          control_type: string | null
          created_at: string
          description: string | null
          domain: string | null
          framework_id: string
          guidance: string | null
          id: string
          implementation_guidance: string | null
          reference_links: string | null
          security_function: string | null
          source_hash: string | null
          subcategory: string | null
          title: string
          updated_at: string
        }
        Insert: {
          control_code?: string | null
          control_type?: string | null
          created_at?: string
          description?: string | null
          domain?: string | null
          framework_id: string
          guidance?: string | null
          id?: string
          implementation_guidance?: string | null
          reference_links?: string | null
          security_function?: string | null
          source_hash?: string | null
          subcategory?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          control_code?: string | null
          control_type?: string | null
          created_at?: string
          description?: string | null
          domain?: string | null
          framework_id?: string
          guidance?: string | null
          id?: string
          implementation_guidance?: string | null
          reference_links?: string | null
          security_function?: string | null
          source_hash?: string | null
          subcategory?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "framework_controls_framework_id_fkey"
            columns: ["framework_id"]
            isOneToOne: false
            referencedRelation: "control_frameworks"
            referencedColumns: ["id"]
          },
        ]
      }
      governance_people: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_internal: boolean
          organization: string | null
          phone: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          is_internal?: boolean
          organization?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_internal?: boolean
          organization?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      internal_control_asset_links: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          internal_control_id: string
          link_type: string
          notes: string | null
          primary_asset_id: string | null
          secondary_asset_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          internal_control_id: string
          link_type?: string
          notes?: string | null
          primary_asset_id?: string | null
          secondary_asset_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          internal_control_id?: string
          link_type?: string
          notes?: string | null
          primary_asset_id?: string | null
          secondary_asset_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "internal_control_asset_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_control_asset_links_internal_control_id_fkey"
            columns: ["internal_control_id"]
            isOneToOne: false
            referencedRelation: "internal_controls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_control_asset_links_primary_asset_id_fkey"
            columns: ["primary_asset_id"]
            isOneToOne: false
            referencedRelation: "primary_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_control_asset_links_secondary_asset_id_fkey"
            columns: ["secondary_asset_id"]
            isOneToOne: false
            referencedRelation: "secondary_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_control_framework_map: {
        Row: {
          created_at: string
          created_by: string | null
          framework_control_id: string
          id: string
          internal_control_id: string
          mapping_type: string
          notes: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          framework_control_id: string
          id?: string
          internal_control_id: string
          mapping_type?: string
          notes?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          framework_control_id?: string
          id?: string
          internal_control_id?: string
          mapping_type?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "internal_control_framework_map_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_control_framework_map_framework_control_id_fkey"
            columns: ["framework_control_id"]
            isOneToOne: false
            referencedRelation: "framework_controls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_control_framework_map_internal_control_id_fkey"
            columns: ["internal_control_id"]
            isOneToOne: false
            referencedRelation: "internal_controls"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_controls: {
        Row: {
          automation_level: string | null
          business_unit_id: string | null
          control_type: string | null
          created_at: string
          created_by: string | null
          description: string | null
          effective_date: string | null
          frequency: string | null
          id: string
          internal_control_code: string
          legacy_control_id: string | null
          owner_id: string | null
          review_date: string | null
          security_function: string | null
          source_framework_control_ids: string[] | null
          status: string
          system_scope: string | null
          title: string
          updated_at: string
        }
        Insert: {
          automation_level?: string | null
          business_unit_id?: string | null
          control_type?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          effective_date?: string | null
          frequency?: string | null
          id?: string
          internal_control_code: string
          legacy_control_id?: string | null
          owner_id?: string | null
          review_date?: string | null
          security_function?: string | null
          source_framework_control_ids?: string[] | null
          status?: string
          system_scope?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          automation_level?: string | null
          business_unit_id?: string | null
          control_type?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          effective_date?: string | null
          frequency?: string | null
          id?: string
          internal_control_code?: string
          legacy_control_id?: string | null
          owner_id?: string | null
          review_date?: string | null
          security_function?: string | null
          source_framework_control_ids?: string[] | null
          status?: string
          system_scope?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_controls_business_unit_id_fkey"
            columns: ["business_unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_controls_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_controls_legacy_control_id_fkey"
            columns: ["legacy_control_id"]
            isOneToOne: false
            referencedRelation: "controls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_controls_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          created_at: string | null
          created_by: string | null
          email: string | null
          expires_at: string
          id: string
          notes: string | null
          role: Database["public"]["Enums"]["app_role"]
          token: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          expires_at: string
          id?: string
          notes?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          expires_at?: string
          id?: string
          notes?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      knowledge_base: {
        Row: {
          category: string
          content: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      matrix_impact_levels: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          id: string
          label: string
          level: number
          matrix_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          label: string
          level: number
          matrix_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          label?: string
          level?: number
          matrix_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "matrix_impact_levels_matrix_id_fkey"
            columns: ["matrix_id"]
            isOneToOne: false
            referencedRelation: "risk_matrices"
            referencedColumns: ["id"]
          },
        ]
      }
      matrix_likelihood_levels: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          id: string
          label: string
          level: number
          matrix_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          label: string
          level: number
          matrix_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          label?: string
          level?: number
          matrix_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "matrix_likelihood_levels_matrix_id_fkey"
            columns: ["matrix_id"]
            isOneToOne: false
            referencedRelation: "risk_matrices"
            referencedColumns: ["id"]
          },
        ]
      }
      maturity_assessments: {
        Row: {
          ai_rationale: string | null
          assessed_at: string
          created_at: string
          evidence_summary: Json | null
          id: string
          overall_score: number | null
          run_by: string | null
          score_detect: number
          score_govern: number
          score_identify: number
          score_protect: number
          score_recover: number
          score_respond: number
        }
        Insert: {
          ai_rationale?: string | null
          assessed_at?: string
          created_at?: string
          evidence_summary?: Json | null
          id?: string
          overall_score?: number | null
          run_by?: string | null
          score_detect: number
          score_govern: number
          score_identify: number
          score_protect: number
          score_recover: number
          score_respond: number
        }
        Update: {
          ai_rationale?: string | null
          assessed_at?: string
          created_at?: string
          evidence_summary?: Json | null
          id?: string
          overall_score?: number | null
          run_by?: string | null
          score_detect?: number
          score_govern?: number
          score_identify?: number
          score_protect?: number
          score_recover?: number
          score_respond?: number
        }
        Relationships: [
          {
            foreignKeyName: "maturity_assessments_run_by_fkey"
            columns: ["run_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      points_of_contact: {
        Row: {
          created_at: string
          escalation_window: string | null
          governance_person_id: string
          id: string
          notes: string | null
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          escalation_window?: string | null
          governance_person_id: string
          id?: string
          notes?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          escalation_window?: string | null
          governance_person_id?: string
          id?: string
          notes?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "points_of_contact_governance_person_id_fkey"
            columns: ["governance_person_id"]
            isOneToOne: false
            referencedRelation: "governance_people"
            referencedColumns: ["id"]
          },
        ]
      }
      policies: {
        Row: {
          accountable_user_id: string
          approver_user_id: string | null
          business_unit_id: string
          consulted_user_ids: string[] | null
          created_at: string
          document_type: string
          effective_date: string | null
          id: string
          informed_user_ids: string[] | null
          last_published_at: string | null
          owner_user_id: string
          policy_type: string | null
          responsible_user_id: string | null
          review_by_date: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          accountable_user_id: string
          approver_user_id?: string | null
          business_unit_id: string
          consulted_user_ids?: string[] | null
          created_at?: string
          document_type?: string
          effective_date?: string | null
          id?: string
          informed_user_ids?: string[] | null
          last_published_at?: string | null
          owner_user_id: string
          policy_type?: string | null
          responsible_user_id?: string | null
          review_by_date?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          accountable_user_id?: string
          approver_user_id?: string | null
          business_unit_id?: string
          consulted_user_ids?: string[] | null
          created_at?: string
          document_type?: string
          effective_date?: string | null
          id?: string
          informed_user_ids?: string[] | null
          last_published_at?: string | null
          owner_user_id?: string
          policy_type?: string | null
          responsible_user_id?: string | null
          review_by_date?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "policies_business_unit_id_fkey"
            columns: ["business_unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_sections: {
        Row: {
          ai_generated: boolean | null
          content_markdown: string
          created_at: string
          id: string
          policy_id: string
          section_order: number
          title: string
          updated_at: string
        }
        Insert: {
          ai_generated?: boolean | null
          content_markdown?: string
          created_at?: string
          id?: string
          policy_id: string
          section_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          ai_generated?: boolean | null
          content_markdown?: string
          created_at?: string
          id?: string
          policy_id?: string
          section_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "policy_sections_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_versions: {
        Row: {
          ai_generated: boolean
          ai_prompt_context: Json | null
          ai_rationale: string | null
          content_markdown: string
          created_at: string
          created_by_user_id: string | null
          id: string
          policy_id: string
          version: number
        }
        Insert: {
          ai_generated?: boolean
          ai_prompt_context?: Json | null
          ai_rationale?: string | null
          content_markdown: string
          created_at?: string
          created_by_user_id?: string | null
          id?: string
          policy_id: string
          version: number
        }
        Update: {
          ai_generated?: boolean
          ai_prompt_context?: Json | null
          ai_rationale?: string | null
          content_markdown?: string
          created_at?: string
          created_by_user_id?: string | null
          id?: string
          policy_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "policy_versions_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
        ]
      }
      predisposing_conditions: {
        Row: {
          business_unit_id: string | null
          condition_type: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          identifier: string
          notes: string | null
          pervasiveness_qual: string | null
          pervasiveness_score: number | null
          source_info_id: string | null
          subtype: string | null
          updated_at: string
        }
        Insert: {
          business_unit_id?: string | null
          condition_type: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          identifier: string
          notes?: string | null
          pervasiveness_qual?: string | null
          pervasiveness_score?: number | null
          source_info_id?: string | null
          subtype?: string | null
          updated_at?: string
        }
        Update: {
          business_unit_id?: string | null
          condition_type?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          identifier?: string
          notes?: string | null
          pervasiveness_qual?: string | null
          pervasiveness_score?: number | null
          source_info_id?: string | null
          subtype?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "predisposing_conditions_business_unit_id_fkey"
            columns: ["business_unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "predisposing_conditions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "predisposing_conditions_source_info_id_fkey"
            columns: ["source_info_id"]
            isOneToOne: false
            referencedRelation: "threat_info_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      primary_assets: {
        Row: {
          asset_id: string
          asset_kind: string
          bia_completed: boolean | null
          bia_id: string | null
          business_unit_id: string | null
          confidentiality_level_id: string | null
          created_at: string
          created_by: string | null
          criticality: string | null
          description: string | null
          id: string
          inherit_from_parent: boolean
          mtd_hours: number | null
          name: string
          owner_id: string | null
          parent_primary_asset_id: string | null
          primary_type: string
          process_level: string | null
          rpo_hours: number | null
          rto_hours: number | null
          updated_at: string
        }
        Insert: {
          asset_id: string
          asset_kind?: string
          bia_completed?: boolean | null
          bia_id?: string | null
          business_unit_id?: string | null
          confidentiality_level_id?: string | null
          created_at?: string
          created_by?: string | null
          criticality?: string | null
          description?: string | null
          id?: string
          inherit_from_parent?: boolean
          mtd_hours?: number | null
          name: string
          owner_id?: string | null
          parent_primary_asset_id?: string | null
          primary_type?: string
          process_level?: string | null
          rpo_hours?: number | null
          rto_hours?: number | null
          updated_at?: string
        }
        Update: {
          asset_id?: string
          asset_kind?: string
          bia_completed?: boolean | null
          bia_id?: string | null
          business_unit_id?: string | null
          confidentiality_level_id?: string | null
          created_at?: string
          created_by?: string | null
          criticality?: string | null
          description?: string | null
          id?: string
          inherit_from_parent?: boolean
          mtd_hours?: number | null
          name?: string
          owner_id?: string | null
          parent_primary_asset_id?: string | null
          primary_type?: string
          process_level?: string | null
          rpo_hours?: number | null
          rto_hours?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "primary_assets_bia_id_fkey"
            columns: ["bia_id"]
            isOneToOne: true
            referencedRelation: "bia_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "primary_assets_business_unit_id_fkey"
            columns: ["business_unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "primary_assets_confidentiality_level_id_fkey"
            columns: ["confidentiality_level_id"]
            isOneToOne: false
            referencedRelation: "confidentiality_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "primary_assets_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "primary_assets_parent_primary_asset_id_fkey"
            columns: ["parent_primary_asset_id"]
            isOneToOne: false
            referencedRelation: "primary_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      process_primary_asset_links: {
        Row: {
          business_unit_id: string
          created_at: string
          created_by: string | null
          id: string
          link_type: string
          notes: string | null
          primary_asset_id: string
          process_id: string
          updated_at: string
        }
        Insert: {
          business_unit_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          link_type: string
          notes?: string | null
          primary_asset_id: string
          process_id: string
          updated_at?: string
        }
        Update: {
          business_unit_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          link_type?: string
          notes?: string | null
          primary_asset_id?: string
          process_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "process_primary_asset_links_business_unit_id_fkey"
            columns: ["business_unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_primary_asset_links_primary_asset_id_fkey"
            columns: ["primary_asset_id"]
            isOneToOne: false
            referencedRelation: "primary_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_primary_asset_links_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "primary_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      process_secondary_asset_links: {
        Row: {
          business_unit_id: string
          created_at: string
          created_by: string | null
          id: string
          link_type: string
          notes: string | null
          process_id: string
          secondary_asset_id: string
          updated_at: string
        }
        Insert: {
          business_unit_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          link_type: string
          notes?: string | null
          process_id: string
          secondary_asset_id: string
          updated_at?: string
        }
        Update: {
          business_unit_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          link_type?: string
          notes?: string | null
          process_id?: string
          secondary_asset_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "process_secondary_asset_links_business_unit_id_fkey"
            columns: ["business_unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_secondary_asset_links_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "primary_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_secondary_asset_links_secondary_asset_id_fkey"
            columns: ["secondary_asset_id"]
            isOneToOne: false
            referencedRelation: "secondary_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          business_unit_id: string | null
          created_at: string
          department: string | null
          email: string | null
          expires_at: string | null
          full_name: string | null
          id: string
          is_active: boolean
          job_title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          business_unit_id?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          expires_at?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          job_title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          business_unit_id?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          expires_at?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          job_title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_business_unit_id_fkey"
            columns: ["business_unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
        ]
      }
      regulatory_compliance_cache: {
        Row: {
          analysis_data: Json
          coverage_percentage: number
          created_at: string
          expires_at: string
          generated_at: string
          id: string
          regulation: string
        }
        Insert: {
          analysis_data: Json
          coverage_percentage?: number
          created_at?: string
          expires_at?: string
          generated_at?: string
          id?: string
          regulation: string
        }
        Update: {
          analysis_data?: Json
          coverage_percentage?: number
          created_at?: string
          expires_at?: string
          generated_at?: string
          id?: string
          regulation?: string
        }
        Relationships: []
      }
      risk_appetite_bands: {
        Row: {
          acceptance_owner_id: string | null
          acceptance_role: string | null
          appetite_id: string
          authorized_actions: string[] | null
          band: string
          color: string | null
          created_at: string
          description: string | null
          id: string
          label: string | null
          max_score: number
          min_score: number
        }
        Insert: {
          acceptance_owner_id?: string | null
          acceptance_role?: string | null
          appetite_id: string
          authorized_actions?: string[] | null
          band: string
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          label?: string | null
          max_score: number
          min_score: number
        }
        Update: {
          acceptance_owner_id?: string | null
          acceptance_role?: string | null
          appetite_id?: string
          authorized_actions?: string[] | null
          band?: string
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          label?: string | null
          max_score?: number
          min_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "risk_appetite_bands_acceptance_owner_id_fkey"
            columns: ["acceptance_owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_appetite_bands_appetite_id_fkey"
            columns: ["appetite_id"]
            isOneToOne: false
            referencedRelation: "risk_appetites"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_appetites: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          effective_date: string | null
          escalation_criteria: string | null
          gray_swan_config: Json | null
          high_threshold_level: number
          id: string
          is_active: boolean
          is_archived: boolean
          matrix_id: string
          name: string
          narrative_statement: string | null
          owner_id: string | null
          privacy_constraints: string | null
          reporting_cadence: string | null
          status: string | null
          updated_at: string
          version: number | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          effective_date?: string | null
          escalation_criteria?: string | null
          gray_swan_config?: Json | null
          high_threshold_level?: number
          id?: string
          is_active?: boolean
          is_archived?: boolean
          matrix_id: string
          name: string
          narrative_statement?: string | null
          owner_id?: string | null
          privacy_constraints?: string | null
          reporting_cadence?: string | null
          status?: string | null
          updated_at?: string
          version?: number | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          effective_date?: string | null
          escalation_criteria?: string | null
          gray_swan_config?: Json | null
          high_threshold_level?: number
          id?: string
          is_active?: boolean
          is_archived?: boolean
          matrix_id?: string
          name?: string
          narrative_statement?: string | null
          owner_id?: string | null
          privacy_constraints?: string | null
          reporting_cadence?: string | null
          status?: string | null
          updated_at?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "risk_appetites_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_appetites_matrix_id_fkey"
            columns: ["matrix_id"]
            isOneToOne: false
            referencedRelation: "risk_matrices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_appetites_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_asset_links: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          link_type: string
          primary_asset_id: string | null
          risk_id: string
          secondary_asset_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          link_type?: string
          primary_asset_id?: string | null
          risk_id: string
          secondary_asset_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          link_type?: string
          primary_asset_id?: string | null
          risk_id?: string
          secondary_asset_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "risk_asset_links_primary_asset_id_fkey"
            columns: ["primary_asset_id"]
            isOneToOne: false
            referencedRelation: "primary_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_asset_links_risk_id_fkey"
            columns: ["risk_id"]
            isOneToOne: false
            referencedRelation: "risks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_asset_links_secondary_asset_id_fkey"
            columns: ["secondary_asset_id"]
            isOneToOne: false
            referencedRelation: "secondary_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_categories: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          id: string
          is_enabled: boolean | null
          name: string
          thresholds_config: Json | null
          worst_case_description: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_enabled?: boolean | null
          name: string
          thresholds_config?: Json | null
          worst_case_description?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_enabled?: boolean | null
          name?: string
          thresholds_config?: Json | null
          worst_case_description?: string | null
        }
        Relationships: []
      }
      risk_control_links: {
        Row: {
          created_at: string
          created_by: string | null
          framework_control_id: string | null
          id: string
          internal_control_id: string | null
          link_type: string
          notes: string | null
          risk_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          framework_control_id?: string | null
          id?: string
          internal_control_id?: string | null
          link_type?: string
          notes?: string | null
          risk_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          framework_control_id?: string | null
          id?: string
          internal_control_id?: string | null
          link_type?: string
          notes?: string | null
          risk_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "risk_control_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_control_links_framework_control_id_fkey"
            columns: ["framework_control_id"]
            isOneToOne: false
            referencedRelation: "framework_controls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_control_links_internal_control_id_fkey"
            columns: ["internal_control_id"]
            isOneToOne: false
            referencedRelation: "internal_controls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_control_links_risk_id_fkey"
            columns: ["risk_id"]
            isOneToOne: false
            referencedRelation: "risks"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_controls: {
        Row: {
          control_id: string
          created_at: string
          created_by: string | null
          effectiveness_rating: string | null
          id: string
          notes: string | null
          risk_id: string
        }
        Insert: {
          control_id: string
          created_at?: string
          created_by?: string | null
          effectiveness_rating?: string | null
          id?: string
          notes?: string | null
          risk_id: string
        }
        Update: {
          control_id?: string
          created_at?: string
          created_by?: string | null
          effectiveness_rating?: string | null
          id?: string
          notes?: string | null
          risk_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "risk_controls_control_id_fkey"
            columns: ["control_id"]
            isOneToOne: false
            referencedRelation: "controls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_controls_risk_id_fkey"
            columns: ["risk_id"]
            isOneToOne: false
            referencedRelation: "risks"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_history: {
        Row: {
          action: string
          actor_user_id: string | null
          chain_index: number | null
          changes: Json | null
          created_at: string
          hash: string | null
          id: string
          previous_hash: string | null
          rationale: string | null
          risk_id: string
          snapshot: Json | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          chain_index?: number | null
          changes?: Json | null
          created_at?: string
          hash?: string | null
          id?: string
          previous_hash?: string | null
          rationale?: string | null
          risk_id: string
          snapshot?: Json | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          chain_index?: number | null
          changes?: Json | null
          created_at?: string
          hash?: string | null
          id?: string
          previous_hash?: string | null
          rationale?: string | null
          risk_id?: string
          snapshot?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "risk_history_risk_id_fkey"
            columns: ["risk_id"]
            isOneToOne: false
            referencedRelation: "risks"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_matrices: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          size: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          size: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          size?: number
          updated_at?: string
        }
        Relationships: []
      }
      risk_predisposing_condition_links: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          predisposing_condition_id: string
          risk_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          predisposing_condition_id: string
          risk_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          predisposing_condition_id?: string
          risk_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "risk_predisposing_condition_link_predisposing_condition_id_fkey"
            columns: ["predisposing_condition_id"]
            isOneToOne: false
            referencedRelation: "predisposing_conditions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_predisposing_condition_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_predisposing_condition_links_risk_id_fkey"
            columns: ["risk_id"]
            isOneToOne: false
            referencedRelation: "risks"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_threat_event_links: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          risk_id: string
          threat_event_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          risk_id: string
          threat_event_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          risk_id?: string
          threat_event_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "risk_threat_event_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_threat_event_links_risk_id_fkey"
            columns: ["risk_id"]
            isOneToOne: false
            referencedRelation: "risks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_threat_event_links_threat_event_id_fkey"
            columns: ["threat_event_id"]
            isOneToOne: false
            referencedRelation: "threat_events"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_threat_source_links: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          risk_id: string
          threat_source_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          risk_id: string
          threat_source_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          risk_id?: string
          threat_source_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "risk_threat_source_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_threat_source_links_risk_id_fkey"
            columns: ["risk_id"]
            isOneToOne: false
            referencedRelation: "risks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_threat_source_links_threat_source_id_fkey"
            columns: ["threat_source_id"]
            isOneToOne: false
            referencedRelation: "threat_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_treatments: {
        Row: {
          assigned_to: string | null
          business_unit_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          residual_likelihood: string | null
          residual_severity: string | null
          risk_id: string
          status: Database["public"]["Enums"]["treatment_status"]
          strategy: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          business_unit_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          residual_likelihood?: string | null
          residual_severity?: string | null
          risk_id: string
          status?: Database["public"]["Enums"]["treatment_status"]
          strategy?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          business_unit_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          residual_likelihood?: string | null
          residual_severity?: string | null
          risk_id?: string
          status?: Database["public"]["Enums"]["treatment_status"]
          strategy?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "risk_treatments_business_unit_id_fkey"
            columns: ["business_unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_treatments_risk_id_fkey"
            columns: ["risk_id"]
            isOneToOne: false
            referencedRelation: "risks"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_vendors: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          risk_id: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          risk_id: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          risk_id?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "risk_vendors_risk_id_fkey"
            columns: ["risk_id"]
            isOneToOne: false
            referencedRelation: "risks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_vendors_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_vulnerability_links: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          risk_id: string
          vulnerability_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          risk_id: string
          vulnerability_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          risk_id?: string
          vulnerability_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "risk_vulnerability_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_vulnerability_links_risk_id_fkey"
            columns: ["risk_id"]
            isOneToOne: false
            referencedRelation: "risks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_vulnerability_links_vulnerability_id_fkey"
            columns: ["vulnerability_id"]
            isOneToOne: false
            referencedRelation: "vulnerabilities"
            referencedColumns: ["id"]
          },
        ]
      }
      risks: {
        Row: {
          business_unit_id: string | null
          category_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          inherent_likelihood: Database["public"]["Enums"]["risk_likelihood"]
          inherent_score: number | null
          inherent_severity: Database["public"]["Enums"]["risk_severity"]
          is_archived: boolean
          net_likelihood: Database["public"]["Enums"]["risk_likelihood"] | null
          net_severity: Database["public"]["Enums"]["risk_severity"] | null
          owner_id: string | null
          residual_impact: number | null
          residual_likelihood: string | null
          residual_rating: string | null
          residual_score: number | null
          residual_updated_at: string | null
          review_date: string | null
          risk_id: string
          risk_level: string | null
          status: Database["public"]["Enums"]["risk_status"]
          threat_id: string | null
          title: string
          treatment_action: string | null
          treatment_plan: string | null
          updated_at: string
          vulnerability_id: string | null
        }
        Insert: {
          business_unit_id?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          inherent_likelihood?: Database["public"]["Enums"]["risk_likelihood"]
          inherent_score?: number | null
          inherent_severity?: Database["public"]["Enums"]["risk_severity"]
          is_archived?: boolean
          net_likelihood?: Database["public"]["Enums"]["risk_likelihood"] | null
          net_severity?: Database["public"]["Enums"]["risk_severity"] | null
          owner_id?: string | null
          residual_impact?: number | null
          residual_likelihood?: string | null
          residual_rating?: string | null
          residual_score?: number | null
          residual_updated_at?: string | null
          review_date?: string | null
          risk_id: string
          risk_level?: string | null
          status?: Database["public"]["Enums"]["risk_status"]
          threat_id?: string | null
          title: string
          treatment_action?: string | null
          treatment_plan?: string | null
          updated_at?: string
          vulnerability_id?: string | null
        }
        Update: {
          business_unit_id?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          inherent_likelihood?: Database["public"]["Enums"]["risk_likelihood"]
          inherent_score?: number | null
          inherent_severity?: Database["public"]["Enums"]["risk_severity"]
          is_archived?: boolean
          net_likelihood?: Database["public"]["Enums"]["risk_likelihood"] | null
          net_severity?: Database["public"]["Enums"]["risk_severity"] | null
          owner_id?: string | null
          residual_impact?: number | null
          residual_likelihood?: string | null
          residual_rating?: string | null
          residual_score?: number | null
          residual_updated_at?: string | null
          review_date?: string | null
          risk_id?: string
          risk_level?: string | null
          status?: Database["public"]["Enums"]["risk_status"]
          threat_id?: string | null
          title?: string
          treatment_action?: string | null
          treatment_plan?: string | null
          updated_at?: string
          vulnerability_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "risks_business_unit_id_fkey"
            columns: ["business_unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risks_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "risk_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risks_threat_id_fkey"
            columns: ["threat_id"]
            isOneToOne: false
            referencedRelation: "threat_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risks_vulnerability_id_fkey"
            columns: ["vulnerability_id"]
            isOneToOne: false
            referencedRelation: "vulnerabilities"
            referencedColumns: ["id"]
          },
        ]
      }
      secondary_assets: {
        Row: {
          ai_enabled: boolean
          asset_id: string
          business_unit_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          deviation_reason: string | null
          deviation_status: string | null
          effective_criticality: string | null
          effective_mtd_hours: number | null
          effective_rpo_hours: number | null
          effective_rto_hours: number | null
          id: string
          inherited_criticality: string | null
          inherited_mtd_hours: number | null
          inherited_rpo_hours: number | null
          inherited_rto_hours: number | null
          name: string
          owner_id: string | null
          primary_asset_id: string | null
          secondary_type: string
          updated_at: string
        }
        Insert: {
          ai_enabled?: boolean
          asset_id: string
          business_unit_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          deviation_reason?: string | null
          deviation_status?: string | null
          effective_criticality?: string | null
          effective_mtd_hours?: number | null
          effective_rpo_hours?: number | null
          effective_rto_hours?: number | null
          id?: string
          inherited_criticality?: string | null
          inherited_mtd_hours?: number | null
          inherited_rpo_hours?: number | null
          inherited_rto_hours?: number | null
          name: string
          owner_id?: string | null
          primary_asset_id?: string | null
          secondary_type?: string
          updated_at?: string
        }
        Update: {
          ai_enabled?: boolean
          asset_id?: string
          business_unit_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          deviation_reason?: string | null
          deviation_status?: string | null
          effective_criticality?: string | null
          effective_mtd_hours?: number | null
          effective_rpo_hours?: number | null
          effective_rto_hours?: number | null
          id?: string
          inherited_criticality?: string | null
          inherited_mtd_hours?: number | null
          inherited_rpo_hours?: number | null
          inherited_rto_hours?: number | null
          name?: string
          owner_id?: string | null
          primary_asset_id?: string | null
          secondary_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "secondary_assets_business_unit_id_fkey"
            columns: ["business_unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secondary_assets_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secondary_assets_primary_asset_id_fkey"
            columns: ["primary_asset_id"]
            isOneToOne: false
            referencedRelation: "primary_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      secops_scales: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_default: boolean
          org_id: string | null
          qualitative: string
          scale_name: string
          score_0_to_10: number
          semi_quant_max: number | null
          semi_quant_min: number | null
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          org_id?: string | null
          qualitative: string
          scale_name: string
          score_0_to_10: number
          semi_quant_max?: number | null
          semi_quant_min?: number | null
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          org_id?: string | null
          qualitative?: string
          scale_name?: string
          score_0_to_10?: number
          semi_quant_max?: number | null
          semi_quant_min?: number | null
          sort_order?: number
        }
        Relationships: []
      }
      secops_threat_event_sources: {
        Row: {
          created_at: string
          id: string
          threat_event_id: string
          threat_source_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          threat_event_id: string
          threat_source_id: string
        }
        Update: {
          created_at?: string
          id?: string
          threat_event_id?: string
          threat_source_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "secops_threat_event_sources_threat_event_id_fkey"
            columns: ["threat_event_id"]
            isOneToOne: false
            referencedRelation: "threat_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secops_threat_event_sources_threat_source_id_fkey"
            columns: ["threat_source_id"]
            isOneToOne: false
            referencedRelation: "threat_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      secops_threat_event_taxonomy: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          is_adversarial: boolean
          is_default: boolean
          name: string
          org_id: string | null
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          is_adversarial?: boolean
          is_default?: boolean
          name: string
          org_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_adversarial?: boolean
          is_default?: boolean
          name?: string
          org_id?: string | null
        }
        Relationships: []
      }
      secops_threat_source_taxonomy: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_default: boolean
          org_id: string | null
          risk_factors: string[] | null
          subtype: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          org_id?: string | null
          risk_factors?: string[] | null
          subtype: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          org_id?: string | null
          risk_factors?: string[] | null
          subtype?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      secops_threats: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          identifier: string
          in_scope: boolean
          name: string
          notes: string | null
          relevance: string | null
          threat_event_id: string | null
          threat_source_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          identifier: string
          in_scope?: boolean
          name: string
          notes?: string | null
          relevance?: string | null
          threat_event_id?: string | null
          threat_source_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          identifier?: string
          in_scope?: boolean
          name?: string
          notes?: string | null
          relevance?: string | null
          threat_event_id?: string | null
          threat_source_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "secops_threats_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secops_threats_threat_event_id_fkey"
            columns: ["threat_event_id"]
            isOneToOne: false
            referencedRelation: "threat_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secops_threats_threat_source_id_fkey"
            columns: ["threat_source_id"]
            isOneToOne: false
            referencedRelation: "threat_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      secops_vulnerability_nature_taxonomy: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          is_default: boolean
          org_id: string | null
          subcategory: string | null
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          org_id?: string | null
          subcategory?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          org_id?: string | null
          subcategory?: string | null
        }
        Relationships: []
      }
      security_position_assignments: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          is_primary: boolean
          notes: string | null
          security_position_id: string
          start_date: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          is_primary?: boolean
          notes?: string | null
          security_position_id: string
          start_date?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          is_primary?: boolean
          notes?: string | null
          security_position_id?: string
          start_date?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "security_position_assignments_security_position_id_fkey"
            columns: ["security_position_id"]
            isOneToOne: false
            referencedRelation: "security_positions"
            referencedColumns: ["id"]
          },
        ]
      }
      security_positions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          reports_to_position_id: string | null
          requires_access_group_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          reports_to_position_id?: string | null
          requires_access_group_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          reports_to_position_id?: string | null
          requires_access_group_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "security_positions_reports_to_position_id_fkey"
            columns: ["reports_to_position_id"]
            isOneToOne: false
            referencedRelation: "security_positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_positions_requires_access_group_id_fkey"
            columns: ["requires_access_group_id"]
            isOneToOne: false
            referencedRelation: "access_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      security_tools: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          integration_status: string
          is_pinned_default: boolean
          last_check_at: string | null
          name: string
          owner_id: string | null
          tags: string[] | null
          updated_at: string
          url: string
        }
        Insert: {
          category: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          integration_status?: string
          is_pinned_default?: boolean
          last_check_at?: string | null
          name: string
          owner_id?: string | null
          tags?: string[] | null
          updated_at?: string
          url: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          integration_status?: string
          is_pinned_default?: boolean
          last_check_at?: string | null
          name?: string
          owner_id?: string | null
          tags?: string[] | null
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "security_tools_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_tools_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sirt_members: {
        Row: {
          availability: string | null
          backup_member_id: string | null
          created_at: string
          created_by: string | null
          email: string | null
          escalation_tier: number | null
          id: string
          is_on_call: boolean
          location: string | null
          name: string
          phone: string | null
          profile_id: string | null
          role: string
          skills_tags: string[] | null
          team_id: string | null
          timezone: string | null
          updated_at: string
        }
        Insert: {
          availability?: string | null
          backup_member_id?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          escalation_tier?: number | null
          id?: string
          is_on_call?: boolean
          location?: string | null
          name: string
          phone?: string | null
          profile_id?: string | null
          role: string
          skills_tags?: string[] | null
          team_id?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          availability?: string | null
          backup_member_id?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          escalation_tier?: number | null
          id?: string
          is_on_call?: boolean
          location?: string | null
          name?: string
          phone?: string | null
          profile_id?: string | null
          role?: string
          skills_tags?: string[] | null
          team_id?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sirt_members_backup_member_id_fkey"
            columns: ["backup_member_id"]
            isOneToOne: false
            referencedRelation: "sirt_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sirt_members_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sirt_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sirt_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "sirt_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      sirt_teams: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      threat_events: {
        Row: {
          business_unit_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          event_type: string
          id: string
          identifier: string
          mitre_technique_id: string | null
          name: string | null
          relevance: string
          source_info_id: string | null
          tags: string[] | null
          taxonomy_id: string | null
          threat_source_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          business_unit_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_type: string
          id?: string
          identifier: string
          mitre_technique_id?: string | null
          name?: string | null
          relevance: string
          source_info_id?: string | null
          tags?: string[] | null
          taxonomy_id?: string | null
          threat_source_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          business_unit_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_type?: string
          id?: string
          identifier?: string
          mitre_technique_id?: string | null
          name?: string | null
          relevance?: string
          source_info_id?: string | null
          tags?: string[] | null
          taxonomy_id?: string | null
          threat_source_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "threat_events_business_unit_id_fkey"
            columns: ["business_unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "threat_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "threat_events_source_info_id_fkey"
            columns: ["source_info_id"]
            isOneToOne: false
            referencedRelation: "threat_info_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "threat_events_taxonomy_id_fkey"
            columns: ["taxonomy_id"]
            isOneToOne: false
            referencedRelation: "secops_threat_event_taxonomy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "threat_events_threat_source_id_fkey"
            columns: ["threat_source_id"]
            isOneToOne: false
            referencedRelation: "threat_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      threat_info_sources: {
        Row: {
          created_at: string
          created_by: string | null
          credibility_notes: string | null
          id: string
          name: string
          source_type: string | null
          updated_at: string
          url: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          credibility_notes?: string | null
          id?: string
          name: string
          source_type?: string | null
          updated_at?: string
          url?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          credibility_notes?: string | null
          id?: string
          name?: string
          source_type?: string | null
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "threat_info_sources_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      threat_source_adversarial_profiles: {
        Row: {
          capability_qual: string | null
          capability_score: number | null
          intent_qual: string | null
          intent_score: number | null
          rationale: string | null
          targeting_qual: string | null
          targeting_score: number | null
          threat_source_id: string
          updated_at: string
        }
        Insert: {
          capability_qual?: string | null
          capability_score?: number | null
          intent_qual?: string | null
          intent_score?: number | null
          rationale?: string | null
          targeting_qual?: string | null
          targeting_score?: number | null
          threat_source_id: string
          updated_at?: string
        }
        Update: {
          capability_qual?: string | null
          capability_score?: number | null
          intent_qual?: string | null
          intent_score?: number | null
          rationale?: string | null
          targeting_qual?: string | null
          targeting_score?: number | null
          threat_source_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "threat_source_adversarial_profiles_threat_source_id_fkey"
            columns: ["threat_source_id"]
            isOneToOne: true
            referencedRelation: "threat_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      threat_source_nonadversarial_profiles: {
        Row: {
          range_effects_qual: string | null
          range_effects_score: number | null
          rationale: string | null
          threat_source_id: string
          updated_at: string
        }
        Insert: {
          range_effects_qual?: string | null
          range_effects_score?: number | null
          rationale?: string | null
          threat_source_id: string
          updated_at?: string
        }
        Update: {
          range_effects_qual?: string | null
          range_effects_score?: number | null
          rationale?: string | null
          threat_source_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "threat_source_nonadversarial_profiles_threat_source_id_fkey"
            columns: ["threat_source_id"]
            isOneToOne: true
            referencedRelation: "threat_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      threat_sources: {
        Row: {
          business_unit_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          identifier: string
          in_scope: boolean
          name: string | null
          notes: string | null
          source_info_id: string | null
          subtype: string | null
          taxonomy_id: string | null
          threat_type: string
          updated_at: string
        }
        Insert: {
          business_unit_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          identifier: string
          in_scope?: boolean
          name?: string | null
          notes?: string | null
          source_info_id?: string | null
          subtype?: string | null
          taxonomy_id?: string | null
          threat_type: string
          updated_at?: string
        }
        Update: {
          business_unit_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          identifier?: string
          in_scope?: boolean
          name?: string | null
          notes?: string | null
          source_info_id?: string | null
          subtype?: string | null
          taxonomy_id?: string | null
          threat_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "threat_sources_business_unit_id_fkey"
            columns: ["business_unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "threat_sources_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "threat_sources_source_info_id_fkey"
            columns: ["source_info_id"]
            isOneToOne: false
            referencedRelation: "threat_info_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "threat_sources_taxonomy_id_fkey"
            columns: ["taxonomy_id"]
            isOneToOne: false
            referencedRelation: "secops_threat_source_taxonomy"
            referencedColumns: ["id"]
          },
        ]
      }
      treatment_controls: {
        Row: {
          control_id: string
          created_at: string
          created_by: string | null
          effectiveness_estimate: number | null
          evidence_links: Json | null
          id: string
          implementation_status: string
          notes: string | null
          poam_id: string | null
          treatment_id: string
        }
        Insert: {
          control_id: string
          created_at?: string
          created_by?: string | null
          effectiveness_estimate?: number | null
          evidence_links?: Json | null
          id?: string
          implementation_status?: string
          notes?: string | null
          poam_id?: string | null
          treatment_id: string
        }
        Update: {
          control_id?: string
          created_at?: string
          created_by?: string | null
          effectiveness_estimate?: number | null
          evidence_links?: Json | null
          id?: string
          implementation_status?: string
          notes?: string | null
          poam_id?: string | null
          treatment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "treatment_controls_control_id_fkey"
            columns: ["control_id"]
            isOneToOne: false
            referencedRelation: "controls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_controls_poam_id_fkey"
            columns: ["poam_id"]
            isOneToOne: false
            referencedRelation: "treatment_poams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_controls_treatment_id_fkey"
            columns: ["treatment_id"]
            isOneToOne: false
            referencedRelation: "risk_treatments"
            referencedColumns: ["id"]
          },
        ]
      }
      treatment_milestones: {
        Row: {
          completed_at: string | null
          control_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          owner_id: string | null
          poam_id: string | null
          status: string
          title: string
          treatment_id: string
        }
        Insert: {
          completed_at?: string | null
          control_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          owner_id?: string | null
          poam_id?: string | null
          status?: string
          title: string
          treatment_id: string
        }
        Update: {
          completed_at?: string | null
          control_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          owner_id?: string | null
          poam_id?: string | null
          status?: string
          title?: string
          treatment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "treatment_milestones_control_id_fkey"
            columns: ["control_id"]
            isOneToOne: false
            referencedRelation: "controls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_milestones_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_milestones_poam_id_fkey"
            columns: ["poam_id"]
            isOneToOne: false
            referencedRelation: "treatment_poams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_milestones_treatment_id_fkey"
            columns: ["treatment_id"]
            isOneToOne: false
            referencedRelation: "risk_treatments"
            referencedColumns: ["id"]
          },
        ]
      }
      treatment_poams: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          id: string
          name: string
          owner_id: string | null
          start_date: string | null
          status: string
          treatment_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          owner_id?: string | null
          start_date?: string | null
          status?: string
          treatment_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          owner_id?: string | null
          start_date?: string | null
          status?: string
          treatment_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "treatment_poams_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_poams_treatment_id_fkey"
            columns: ["treatment_id"]
            isOneToOne: false
            referencedRelation: "risk_treatments"
            referencedColumns: ["id"]
          },
        ]
      }
      user_access_groups: {
        Row: {
          access_group_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          access_group_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          access_group_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_access_groups_access_group_id_fkey"
            columns: ["access_group_id"]
            isOneToOne: false
            referencedRelation: "access_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      user_journey_progress: {
        Row: {
          completed_steps: Json | null
          created_at: string | null
          current_step: number | null
          id: string
          journey_completed: boolean | null
          journey_completed_at: string | null
          journey_mode: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_steps?: Json | null
          created_at?: string | null
          current_step?: number | null
          id?: string
          journey_completed?: boolean | null
          journey_completed_at?: string | null
          journey_mode?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_steps?: Json | null
          created_at?: string | null
          current_step?: number | null
          id?: string
          journey_completed?: boolean | null
          journey_completed_at?: string | null
          journey_mode?: string
          updated_at?: string | null
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
          role?: Database["public"]["Enums"]["app_role"]
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
      user_security_tool_pins: {
        Row: {
          created_at: string
          id: string
          security_tool_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          security_tool_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          security_tool_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_security_tool_pins_security_tool_id_fkey"
            columns: ["security_tool_id"]
            isOneToOne: false
            referencedRelation: "security_tools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_security_tool_pins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_documents: {
        Row: {
          business_unit_id: string
          doc_type: string
          file_name: string
          id: string
          mime_type: string | null
          notes: string | null
          storage_key: string
          title: string | null
          uploaded_at: string
          uploaded_by_user_id: string | null
          vendor_id: string
        }
        Insert: {
          business_unit_id: string
          doc_type: string
          file_name: string
          id?: string
          mime_type?: string | null
          notes?: string | null
          storage_key: string
          title?: string | null
          uploaded_at?: string
          uploaded_by_user_id?: string | null
          vendor_id: string
        }
        Update: {
          business_unit_id?: string
          doc_type?: string
          file_name?: string
          id?: string
          mime_type?: string | null
          notes?: string | null
          storage_key?: string
          title?: string | null
          uploaded_at?: string
          uploaded_by_user_id?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_documents_business_unit_id_fkey"
            columns: ["business_unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_documents_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_primary_assets: {
        Row: {
          created_at: string
          id: string
          primary_asset_id: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          primary_asset_id: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          id?: string
          primary_asset_id?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_primary_assets_primary_asset_id_fkey"
            columns: ["primary_asset_id"]
            isOneToOne: false
            referencedRelation: "primary_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_primary_assets_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_secondary_assets: {
        Row: {
          created_at: string
          id: string
          secondary_asset_id: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          secondary_asset_id: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          id?: string
          secondary_asset_id?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_secondary_assets_secondary_asset_id_fkey"
            columns: ["secondary_asset_id"]
            isOneToOne: false
            referencedRelation: "secondary_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_secondary_assets_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          business_unit_id: string
          contract_owner_user_id: string
          created_at: string
          created_by: string | null
          id: string
          legal_name: string | null
          name: string
          next_review_at: string | null
          notes: string | null
          service_description: string | null
          status: string
          trust_center_url: string | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          business_unit_id: string
          contract_owner_user_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          legal_name?: string | null
          name: string
          next_review_at?: string | null
          notes?: string | null
          service_description?: string | null
          status?: string
          trust_center_url?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          business_unit_id?: string
          contract_owner_user_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          legal_name?: string | null
          name?: string
          next_review_at?: string | null
          notes?: string | null
          service_description?: string | null
          status?: string
          trust_center_url?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendors_business_unit_id_fkey"
            columns: ["business_unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
        ]
      }
      vulnerabilities: {
        Row: {
          business_unit_id: string | null
          category: string | null
          created_at: string
          created_by: string | null
          cves: Json | null
          description: string | null
          discovered_at: string | null
          id: string
          identifier: string
          nature_taxonomy_id: string | null
          notes: string | null
          resolved_at: string | null
          severity_qual: string | null
          severity_score: number | null
          source_info_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          business_unit_id?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          cves?: Json | null
          description?: string | null
          discovered_at?: string | null
          id?: string
          identifier: string
          nature_taxonomy_id?: string | null
          notes?: string | null
          resolved_at?: string | null
          severity_qual?: string | null
          severity_score?: number | null
          source_info_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          business_unit_id?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          cves?: Json | null
          description?: string | null
          discovered_at?: string | null
          id?: string
          identifier?: string
          nature_taxonomy_id?: string | null
          notes?: string | null
          resolved_at?: string | null
          severity_qual?: string | null
          severity_score?: number | null
          source_info_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vulnerabilities_business_unit_id_fkey"
            columns: ["business_unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vulnerabilities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vulnerabilities_nature_taxonomy_id_fkey"
            columns: ["nature_taxonomy_id"]
            isOneToOne: false
            referencedRelation: "secops_vulnerability_nature_taxonomy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vulnerabilities_source_info_id_fkey"
            columns: ["source_info_id"]
            isOneToOne: false
            referencedRelation: "threat_info_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      vulnerability_asset_links: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          secondary_asset_id: string
          vulnerability_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          secondary_asset_id: string
          vulnerability_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          secondary_asset_id?: string
          vulnerability_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vulnerability_asset_links_secondary_asset_id_fkey"
            columns: ["secondary_asset_id"]
            isOneToOne: false
            referencedRelation: "secondary_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vulnerability_asset_links_vulnerability_id_fkey"
            columns: ["vulnerability_id"]
            isOneToOne: false
            referencedRelation: "vulnerabilities"
            referencedColumns: ["id"]
          },
        ]
      }
      vulnerability_predisposing_links: {
        Row: {
          created_at: string
          id: string
          predisposing_condition_id: string
          vulnerability_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          predisposing_condition_id: string
          vulnerability_id: string
        }
        Update: {
          created_at?: string
          id?: string
          predisposing_condition_id?: string
          vulnerability_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vulnerability_predisposing_links_predisposing_condition_id_fkey"
            columns: ["predisposing_condition_id"]
            isOneToOne: false
            referencedRelation: "predisposing_conditions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vulnerability_predisposing_links_vulnerability_id_fkey"
            columns: ["vulnerability_id"]
            isOneToOne: false
            referencedRelation: "vulnerabilities"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      latest_maturity_assessment: {
        Row: {
          ai_rationale: string | null
          assessed_at: string | null
          created_at: string | null
          evidence_summary: Json | null
          id: string | null
          overall_score: number | null
          run_by: string | null
          score_detect: number | null
          score_govern: number | null
          score_identify: number | null
          score_protect: number | null
          score_recover: number | null
          score_respond: number | null
        }
        Relationships: [
          {
            foreignKeyName: "maturity_assessments_run_by_fkey"
            columns: ["run_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      can_access_business_unit: {
        Args: { _business_unit_id: string; _user_id: string }
        Returns: boolean
      }
      can_access_risk_data: {
        Args: { _business_unit_id: string; _user_id: string }
        Returns: boolean
      }
      cleanup_central_logs: { Args: never; Returns: number }
      cleanup_expired_audit_logs: { Args: never; Returns: number }
      create_audit_log: {
        Args: {
          p_action: string
          p_actor_user_id?: string
          p_details?: Json
          p_ip_address?: string
          p_target_id?: string
          p_target_type: string
          p_user_agent?: string
        }
        Returns: string
      }
      get_profile_id: { Args: { _user_id: string }; Returns: string }
      get_user_business_unit: { Args: { _user_id: string }; Returns: string }
      has_global_access: {
        Args: { _module?: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_in_access_group: {
        Args: { _group_name: string; _user_id: string }
        Returns: boolean
      }
      is_security_org_member: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user" | "auditor"
      risk_likelihood:
        | "almost_certain"
        | "likely"
        | "possible"
        | "unlikely"
        | "rare"
      risk_severity: "critical" | "high" | "medium" | "low" | "negligible"
      risk_status:
        | "draft"
        | "pending_review"
        | "approved"
        | "active"
        | "monitoring"
        | "treated"
        | "closed"
        | "archived"
      treatment_status: "planned" | "in_progress" | "completed" | "cancelled"
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
      app_role: ["admin", "user", "auditor"],
      risk_likelihood: [
        "almost_certain",
        "likely",
        "possible",
        "unlikely",
        "rare",
      ],
      risk_severity: ["critical", "high", "medium", "low", "negligible"],
      risk_status: [
        "draft",
        "pending_review",
        "approved",
        "active",
        "monitoring",
        "treated",
        "closed",
        "archived",
      ],
      treatment_status: ["planned", "in_progress", "completed", "cancelled"],
    },
  },
} as const
