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
      bookings: {
        Row: {
          address: string | null
          brand: string | null
          created_at: string
          device: string
          email: string | null
          id: string
          issue: string
          method: string
          name: string
          phone: string
          preferred_date: string | null
          preferred_slot: string | null
          repair_ticket_id: string | null
          staff_notes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          brand?: string | null
          created_at?: string
          device: string
          email?: string | null
          id?: string
          issue: string
          method?: string
          name: string
          phone: string
          preferred_date?: string | null
          preferred_slot?: string | null
          repair_ticket_id?: string | null
          staff_notes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          brand?: string | null
          created_at?: string
          device?: string
          email?: string | null
          id?: string
          issue?: string
          method?: string
          name?: string
          phone?: string
          preferred_date?: string | null
          preferred_slot?: string | null
          repair_ticket_id?: string | null
          staff_notes?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_repair_ticket_id_fkey"
            columns: ["repair_ticket_id"]
            isOneToOne: false
            referencedRelation: "repair_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string | null
          description: string
          expense_date: string
          id: string
        }
        Insert: {
          amount?: number
          category: string
          created_at?: string
          created_by?: string | null
          description: string
          expense_date?: string
          id?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string
          expense_date?: string
          id?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          barcode: string | null
          category: string
          cost_price: number
          created_at: string
          id: string
          low_stock_threshold: number
          name: string
          sale_price: number
          sku: string | null
          status: string
          stock_quantity: number
          type: string
          updated_at: string
          warranty_days: number
        }
        Insert: {
          barcode?: string | null
          category?: string
          cost_price?: number
          created_at?: string
          id?: string
          low_stock_threshold?: number
          name: string
          sale_price?: number
          sku?: string | null
          status?: string
          stock_quantity?: number
          type?: string
          updated_at?: string
          warranty_days?: number
        }
        Update: {
          barcode?: string | null
          category?: string
          cost_price?: number
          created_at?: string
          id?: string
          low_stock_threshold?: number
          name?: string
          sale_price?: number
          sku?: string | null
          status?: string
          stock_quantity?: number
          type?: string
          updated_at?: string
          warranty_days?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      purchase_order_items: {
        Row: {
          created_at: string
          id: string
          product_id: string | null
          product_name: string
          purchase_order_id: string
          quantity: number
          total: number
          unit_cost: number
        }
        Insert: {
          created_at?: string
          id?: string
          product_id?: string | null
          product_name: string
          purchase_order_id: string
          quantity?: number
          total?: number
          unit_cost?: number
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string | null
          product_name?: string
          purchase_order_id?: string
          quantity?: number
          total?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          received_at: string | null
          reference: string | null
          status: string
          supplier_id: string | null
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          received_at?: string | null
          reference?: string | null
          status?: string
          supplier_id?: string | null
          total?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          received_at?: string | null
          reference?: string | null
          status?: string
          supplier_id?: string | null
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      repair_parts: {
        Row: {
          created_at: string
          id: string
          product_id: string
          product_name: string
          quantity: number
          repair_id: string
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          product_name: string
          quantity?: number
          repair_id: string
          unit_price?: number
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          product_name?: string
          quantity?: number
          repair_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "repair_parts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_parts_repair_id_fkey"
            columns: ["repair_id"]
            isOneToOne: false
            referencedRelation: "repair_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      repair_tickets: {
        Row: {
          brand: string | null
          created_at: string
          customer_id: string | null
          device: string
          id: string
          issue: string
          labour_cost: number
          method: string
          notes: string | null
          paid: boolean
          price: number | null
          status: string
          technician_id: string | null
          updated_at: string
          warranty_until: string | null
        }
        Insert: {
          brand?: string | null
          created_at?: string
          customer_id?: string | null
          device: string
          id?: string
          issue: string
          labour_cost?: number
          method?: string
          notes?: string | null
          paid?: boolean
          price?: number | null
          status?: string
          technician_id?: string | null
          updated_at?: string
          warranty_until?: string | null
        }
        Update: {
          brand?: string | null
          created_at?: string
          customer_id?: string | null
          device?: string
          id?: string
          issue?: string
          labour_cost?: number
          method?: string
          notes?: string | null
          paid?: boolean
          price?: number | null
          status?: string
          technician_id?: string | null
          updated_at?: string
          warranty_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "repair_tickets_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          id: string
          product_id: string | null
          product_name: string
          quantity: number
          sale_id: string
          total: number
          unit_price: number
        }
        Insert: {
          id?: string
          product_id?: string | null
          product_name: string
          quantity?: number
          sale_id: string
          total?: number
          unit_price?: number
        }
        Update: {
          id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          sale_id?: string
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_return_items: {
        Row: {
          created_at: string
          id: string
          product_id: string | null
          product_name: string
          quantity: number
          return_id: string
          sale_item_id: string | null
          total: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          product_id?: string | null
          product_name: string
          quantity?: number
          return_id: string
          sale_item_id?: string | null
          total?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          return_id?: string
          sale_item_id?: string | null
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_return_items_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "sale_returns"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_returns: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          reason: string | null
          refund_method: string
          sale_id: string
          total: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          reason?: string | null
          refund_method?: string
          sale_id: string
          total?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          reason?: string | null
          refund_method?: string
          sale_id?: string
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_returns_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string | null
          discount: number
          id: string
          payment_method: string
          status: string
          total: number
          warranty_until: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          discount?: number
          id?: string
          payment_method?: string
          status?: string
          total?: number
          warranty_until?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          discount?: number
          id?: string
          payment_method?: string
          status?: string
          total?: number
          warranty_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          bank_sales: number
          card_sales: number
          cash_sales: number
          closed_at: string | null
          closed_by: string | null
          counted_cash: number | null
          created_at: string
          difference: number | null
          expected_cash: number | null
          expenses_total: number
          id: string
          notes: string | null
          opened_at: string
          opened_by: string | null
          opening_float: number
          refunds_total: number
          sales_count: number
          status: string
          updated_at: string
        }
        Insert: {
          bank_sales?: number
          card_sales?: number
          cash_sales?: number
          closed_at?: string | null
          closed_by?: string | null
          counted_cash?: number | null
          created_at?: string
          difference?: number | null
          expected_cash?: number | null
          expenses_total?: number
          id?: string
          notes?: string | null
          opened_at?: string
          opened_by?: string | null
          opening_float?: number
          refunds_total?: number
          sales_count?: number
          status?: string
          updated_at?: string
        }
        Update: {
          bank_sales?: number
          card_sales?: number
          cash_sales?: number
          closed_at?: string | null
          closed_by?: string | null
          counted_cash?: number | null
          created_at?: string
          difference?: number | null
          expected_cash?: number | null
          expenses_total?: number
          id?: string
          notes?: string | null
          opened_at?: string
          opened_by?: string | null
          opening_float?: number
          refunds_total?: number
          sales_count?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          product_id: string
          quantity_change: number
          reason: string
          ref_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          product_id: string
          quantity_change: number
          reason: string
          ref_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          product_id?: string
          quantity_change?: number
          reason?: string
          ref_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "staff" | "technician"
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
      app_role: ["admin", "staff", "technician"],
    },
  },
} as const
