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
      admin_allowlist: {
        Row: {
          created_at: string
          email: string
        }
        Insert: {
          created_at?: string
          email: string
        }
        Update: {
          created_at?: string
          email?: string
        }
        Relationships: []
      }
      ai_documents: {
        Row: {
          char_count: number
          created_at: string
          extracted_text: string
          file_name: string
          file_path: string
          id: string
          mime_type: string
          owner_id: string
        }
        Insert: {
          char_count?: number
          created_at?: string
          extracted_text?: string
          file_name: string
          file_path: string
          id?: string
          mime_type?: string
          owner_id: string
        }
        Update: {
          char_count?: number
          created_at?: string
          extracted_text?: string
          file_name?: string
          file_path?: string
          id?: string
          mime_type?: string
          owner_id?: string
        }
        Relationships: []
      }
      ai_messages: {
        Row: {
          content: string
          created_at: string
          document_id: string | null
          id: string
          owner_id: string
          role: string
        }
        Insert: {
          content: string
          created_at?: string
          document_id?: string | null
          id?: string
          owner_id: string
          role: string
        }
        Update: {
          content?: string
          created_at?: string
          document_id?: string | null
          id?: string
          owner_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "ai_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          body: string
          created_at: string
          id: string
          status: string
          title: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          status?: string
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          status?: string
          title?: string
        }
        Relationships: []
      }
      archived_records: {
        Row: {
          deleted_at: string
          deleted_by: string | null
          id: string
          label: string
          payload: Json
          record_id: string
          table_name: string
        }
        Insert: {
          deleted_at?: string
          deleted_by?: string | null
          id?: string
          label?: string
          payload: Json
          record_id: string
          table_name: string
        }
        Update: {
          deleted_at?: string
          deleted_by?: string | null
          id?: string
          label?: string
          payload?: Json
          record_id?: string
          table_name?: string
        }
        Relationships: []
      }
      assignment_progress: {
        Row: {
          assignment_id: string
          id: string
          state: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assignment_id: string
          id?: string
          state?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assignment_id?: string
          id?: string
          state?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_progress_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          created_at: string
          created_by: string | null
          description: string
          due_date: string | null
          id: string
          status: string
          title: string
          unit_id: string
          weight_percent: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string
          due_date?: string | null
          id?: string
          status?: string
          title: string
          unit_id: string
          weight_percent?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string
          due_date?: string | null
          id?: string
          status?: string
          title?: string
          unit_id?: string
          weight_percent?: number
        }
        Relationships: [
          {
            foreignKeyName: "assignments_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          description: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          description?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          description?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      exams: {
        Row: {
          content: Json
          created_at: string
          id: string
          owner_id: string
          title: string
          unit_id: string | null
        }
        Insert: {
          content: Json
          created_at?: string
          id?: string
          owner_id: string
          title: string
          unit_id?: string | null
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          owner_id?: string
          title?: string
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exams_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      group_announcements: {
        Row: {
          body: string
          created_at: string
          created_by: string
          group_id: string
          id: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by: string
          group_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string
          group_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_announcements_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_messages: {
        Row: {
          body: string
          created_at: string
          group_id: string
          id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          group_id: string
          id?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          group_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_reads: {
        Row: {
          id: string
          notification_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          id?: string
          notification_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          id?: string
          notification_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_reads_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          group_id: string | null
          id: string
          kind: string
          link: string
          title: string
        }
        Insert: {
          body?: string
          created_at?: string
          group_id?: string | null
          id?: string
          kind?: string
          link?: string
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          group_id?: string | null
          id?: string
          kind?: string
          link?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_path: string | null
          created_at: string
          email: string
          full_name: string
          id: string
        }
        Insert: {
          avatar_path?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id: string
        }
        Update: {
          avatar_path?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
        }
        Relationships: []
      }
      quick_links: {
        Row: {
          active: boolean
          created_at: string
          id: string
          label: string
          sort_order: number
          subtitle: string
          url: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          label: string
          sort_order?: number
          subtitle?: string
          url: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          label?: string
          sort_order?: number
          subtitle?: string
          url?: string
        }
        Relationships: []
      }
      recovery_codes: {
        Row: {
          code: string
          created_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      resources: {
        Row: {
          category_id: string
          created_at: string
          description: string
          download_count: number
          file_name: string
          file_path: string
          file_size: number
          id: string
          lecturer: string
          mime_type: string
          status: string
          title: string
          topic: string
          unit_id: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          category_id: string
          created_at?: string
          description?: string
          download_count?: number
          file_name: string
          file_path: string
          file_size?: number
          id?: string
          lecturer?: string
          mime_type?: string
          status?: string
          title: string
          topic?: string
          unit_id: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: string
          download_count?: number
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          lecturer?: string
          mime_type?: string
          status?: string
          title?: string
          topic?: string
          unit_id?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resources_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      study_groups: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string
          description: string
          id: string
          join_code: string
          leader_id: string | null
          logo_path: string | null
          name: string
          status: string
          updated_at: string
          whatsapp_url: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by: string
          description?: string
          id?: string
          join_code: string
          leader_id?: string | null
          logo_path?: string | null
          name: string
          status?: string
          updated_at?: string
          whatsapp_url?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          join_code?: string
          leader_id?: string | null
          logo_path?: string | null
          name?: string
          status?: string
          updated_at?: string
          whatsapp_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_groups_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_groups_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      timetable: {
        Row: {
          day_of_week: number
          end_time: string
          group_label: string | null
          id: string
          lecturer: string
          source_file: string | null
          start_time: string
          status: string
          unit_id: string | null
          venue: string
        }
        Insert: {
          day_of_week: number
          end_time: string
          group_label?: string | null
          id?: string
          lecturer?: string
          source_file?: string | null
          start_time: string
          status?: string
          unit_id?: string | null
          venue?: string
        }
        Update: {
          day_of_week?: number
          end_time?: string
          group_label?: string | null
          id?: string
          lecturer?: string
          source_file?: string | null
          start_time?: string
          status?: string
          unit_id?: string | null
          venue?: string
        }
        Relationships: [
          {
            foreignKeyName: "timetable_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          code: string
          created_at: string
          description: string
          id: string
          lecturer: string
          name: string
          semester: number
          year: number
        }
        Insert: {
          code: string
          created_at?: string
          description?: string
          id?: string
          lecturer?: string
          name: string
          semester?: number
          year?: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string
          id?: string
          lecturer?: string
          name?: string
          semester?: number
          year?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_recovery_code: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "student" | "class_rep"
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
      app_role: ["admin", "student", "class_rep"],
    },
  },
} as const
