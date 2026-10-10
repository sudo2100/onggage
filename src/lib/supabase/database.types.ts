
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "assets": {
                  Row: {
                    "created_at": string,"id": string,"site_id": string,"size_bytes": number,"storage_path": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"site_id": string,"size_bytes": number,"storage_path": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"site_id"?: string,"size_bytes"?: number,"storage_path"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "assets_site_id_fkey"
      columns: ["site_id"]
isOneToOne: false
      referencedRelation: "sites"
      referencedColumns: ["id"]
    }
                  ]
                },"inquiries": {
                  Row: {
                    "contact": string,"created_at": string,"id": string,"message": string,"name": string,"site_id": string,"status": Database["public"]['Enums']["inquiry_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "contact": string,"created_at"?: string,"id"?: string,"message": string,"name": string,"site_id": string,"status"?: Database["public"]['Enums']["inquiry_status"]
                  }
                  Update: {
                    "contact"?: string,"created_at"?: string,"id"?: string,"message"?: string,"name"?: string,"site_id"?: string,"status"?: Database["public"]['Enums']["inquiry_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "inquiries_site_id_fkey"
      columns: ["site_id"]
isOneToOne: false
      referencedRelation: "sites"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"id": string,"name": string | null,"signup_source": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id": string,"name"?: string | null,"signup_source"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"name"?: string | null,"signup_source"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"site_versions": {
                  Row: {
                    "created_at": string,"id": string,"kind": Database["public"]['Enums']["version_kind"],"sections": NonNullable<Json>,"site_id": string,"theme": NonNullable<Json>,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"kind": Database["public"]['Enums']["version_kind"],"sections"?: NonNullable<Json>,"site_id": string,"theme"?: NonNullable<Json>,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"kind"?: Database["public"]['Enums']["version_kind"],"sections"?: NonNullable<Json>,"site_id"?: string,"theme"?: NonNullable<Json>,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "site_versions_site_id_fkey"
      columns: ["site_id"]
isOneToOne: false
      referencedRelation: "sites"
      referencedColumns: ["id"]
    }
                  ]
                },"sites": {
                  Row: {
                    "created_at": string,"custom_domain": string | null,"id": string,"industry": Database["public"]['Enums']["industry"],"name": string,"owner_id": string,"slug": string,"status": Database["public"]['Enums']["site_status"],"template_id": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"custom_domain"?: string | null,"id"?: string,"industry": Database["public"]['Enums']["industry"],"name": string,"owner_id"?: string,"slug": string,"status"?: Database["public"]['Enums']["site_status"],"template_id"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"custom_domain"?: string | null,"id"?: string,"industry"?: Database["public"]['Enums']["industry"],"name"?: string,"owner_id"?: string,"slug"?: string,"status"?: Database["public"]['Enums']["site_status"],"template_id"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"subscriptions": {
                  Row: {
                    "created_at": string,"expires_at": string | null,"id": string,"payment_method": string | null,"plan": Database["public"]['Enums']["subscription_plan"],"site_id": string,"starts_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"expires_at"?: string | null,"id"?: string,"payment_method"?: string | null,"plan"?: Database["public"]['Enums']["subscription_plan"],"site_id": string,"starts_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"expires_at"?: string | null,"id"?: string,"payment_method"?: string | null,"plan"?: Database["public"]['Enums']["subscription_plan"],"site_id"?: string,"starts_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "subscriptions_site_id_fkey"
      columns: ["site_id"]
isOneToOne: false
      referencedRelation: "sites"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "is_site_owner":
{ Args: { "target_site_id": string }; Returns: boolean
                           },
"is_site_owner_path":
{ Args: { "object_name": string }; Returns: boolean
                           },
"is_site_published":
{ Args: { "target_site_id": string }; Returns: boolean
                           }
          }
          Enums: {
            "industry": "food"|"beauty"|"stay"|"pro","inquiry_status": "new"|"doing"|"done","site_status": "draft"|"published"|"paused","subscription_plan": "free"|"basic"|"pro","version_kind": "draft"|"published"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "industry": ["food", "beauty", "stay", "pro"],"inquiry_status": ["new", "doing", "done"],"site_status": ["draft", "published", "paused"],"subscription_plan": ["free", "basic", "pro"],"version_kind": ["draft", "published"]
          }
        }
} as const
