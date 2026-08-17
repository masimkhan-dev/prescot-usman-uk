// Repository-owned Supabase types for the unapplied ERP baseline migrations.
// Regenerate this file with `supabase gen types typescript` after the schema is
// deployed, then compare the generated output before replacing this version.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type AppRole = "admin" | "staff" | "technician";
export type PaymentMethod = "cash" | "card" | "bank_transfer" | "cheque" | "credit_note";
export type DocumentType = "INV" | "CRN" | "REP" | "PO" | "GRN" | "ADJ";
export type RepairStatus =
  "pending" | "assessed" | "in_progress" | "quality_check" | "ready" | "completed" | "cancelled";
export type PurchaseOrderStatus = "draft" | "ordered" | "partial" | "received" | "cancelled";
export type MovementType =
  | "sale"
  | "return"
  | "purchase"
  | "repair_use"
  | "repair_return"
  | "adjustment"
  | "opening"
  | "opening_count";
export type StockTrackType = "quantity" | "serial";

type Relationship = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

type Table<Row, Relations extends Relationship[] = []> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: Relations;
};

type View<Row> = {
  Row: Row;
  Relationships: [];
};

type ProfileRow = {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type UserRoleRow = {
  id: string;
  user_id: string;
  role: AppRole;
  granted_by: string | null;
  granted_at: string;
};

type StoreSettingRow = {
  key: string;
  value: string | null;
  updated_at: string;
  updated_by: string | null;
};

type DocumentSequenceRow = {
  doc_type: DocumentType;
  year: number;
  last_seq: number;
};

type SupplierRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  balance_pence: number;
  created_at: string;
  updated_at: string;
};

type CustomerRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type ProductRow = {
  id: string;
  name: string;
  category: string;
  sku: string | null;
  barcode: string | null;
  type: "product" | "part" | "service";
  track_type: StockTrackType;
  cost_price_pence: number;
  sale_price_pence: number;
  avg_cost_pence: number;
  stock_quantity: number;
  low_stock_threshold: number;
  warranty_days: number;
  status: "active" | "inactive";
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type SerialUnitRow = {
  id: string;
  product_id: string;
  imei: string | null;
  serial_number: string | null;
  condition: "new" | "refurbished" | "used" | "faulty";
  cost_pence: number;
  status: "in_stock" | "reserved" | "sold" | "returned" | "scrapped";
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type ShiftRow = {
  id: string;
  opened_by: string | null;
  closed_by: string | null;
  opening_float_pence: number;
  counted_cash_pence: number | null;
  expected_cash_pence: number | null;
  difference_pence: number | null;
  notes: string | null;
  status: "open" | "closed";
  opened_at: string;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
};

type CashMovementRow = {
  id: string;
  shift_id: string;
  type: "float_in" | "float_out" | "expense" | "sale" | "refund" | "repair_payment";
  amount_pence: number;
  note: string | null;
  ref_id: string | null;
  created_by: string | null;
  created_at: string;
};

type SaleRow = {
  id: string;
  invoice_number: string | null;
  idempotency_key: string;
  customer_id: string | null;
  shift_id: string | null;
  subtotal_pence: number;
  discount_pence: number;
  total_pence: number;
  amount_tendered_pence: number | null;
  change_pence: number | null;
  status: "completed" | "partially_refunded" | "refunded" | "voided";
  warranty_until: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
};

type SaleItemRow = {
  id: string;
  sale_id: string;
  product_id: string | null;
  serial_unit_id: string | null;
  product_name: string;
  quantity: number;
  unit_price_pence: number;
  discount_pence: number;
  line_total_pence: number;
  cost_price_pence: number;
};

type PaymentRow = {
  id: string;
  idempotency_key: string;
  method: PaymentMethod;
  amount_pence: number;
  ref_type: "sale" | "repair" | "supplier";
  ref_id: string;
  shift_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
};

type CreditNoteRow = {
  id: string;
  crn_number: string | null;
  sale_id: string | null;
  customer_id: string | null;
  balance_pence: number;
  total_pence: number;
  reason: string | null;
  is_void: boolean;
  created_by: string | null;
  created_at: string;
};

type SaleReturnRow = {
  id: string;
  sale_id: string;
  credit_note_id: string | null;
  total_pence: number;
  reason: string | null;
  refund_method: PaymentMethod;
  created_by: string | null;
  created_at: string;
};

type ReturnItemRow = {
  id: string;
  return_id: string;
  sale_item_id: string | null;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price_pence: number;
  line_total_pence: number;
};

type RepairTicketRow = {
  id: string;
  rep_number: string | null;
  customer_id: string | null;
  technician_id: string | null;
  shift_id: string | null;
  device: string;
  brand: string | null;
  model: string | null;
  imei: string | null;
  serial_number: string | null;
  device_condition: Json | null;
  accessories_received: string[] | null;
  unlock_reference: string | null;
  issue: string;
  method: "walk-in" | "door-to-door" | "mail-in";
  status: RepairStatus;
  labour_price_pence: number;
  collection_charge_pence: number;
  total_price_pence: number;
  estimate_approved: boolean;
  estimate_approved_at: string | null;
  estimate_approved_by: string | null;
  deposit_pence: number;
  amount_paid_pence: number;
  warranty_days: number | null;
  warranty_until: string | null;
  notes: string | null;
  internal_notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type RepairStatusHistoryRow = {
  id: string;
  repair_id: string;
  from_status: RepairStatus | null;
  to_status: RepairStatus;
  note: string | null;
  changed_by: string | null;
  changed_at: string;
};

type RepairEstimateRow = {
  id: string;
  repair_id: string;
  labour_pence: number;
  parts_pence: number;
  total_pence: number;
  notes: string | null;
  is_approved: boolean;
  approved_at: string | null;
  created_by: string | null;
  created_at: string;
};

type RepairPartRow = {
  id: string;
  idempotency_key: string;
  repair_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_cost_pence: number;
  is_returned: boolean;
  returned_at: string | null;
  created_by: string | null;
  created_at: string;
};

type RepairPaymentRow = {
  id: string;
  idempotency_key: string;
  repair_id: string;
  amount_pence: number;
  method: PaymentMethod;
  is_deposit: boolean;
  shift_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
};

type RepairWarrantyClaimRow = {
  id: string;
  repair_id: string;
  description: string;
  status: "open" | "investigating" | "resolved" | "rejected";
  resolution: string | null;
  created_by: string | null;
  resolved_by: string | null;
  created_at: string;
  resolved_at: string | null;
};

type PurchaseOrderRow = {
  id: string;
  po_number: string | null;
  supplier_id: string | null;
  status: PurchaseOrderStatus;
  total_pence: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type PurchaseOrderItemRow = {
  id: string;
  purchase_order_id: string;
  product_id: string | null;
  product_name: string;
  qty_ordered: number;
  qty_received: number;
  unit_cost_pence: number;
  line_total_pence: number;
  created_at: string;
};

type GoodsReceiptRow = {
  id: string;
  grn_number: string | null;
  purchase_order_id: string;
  idempotency_key: string;
  notes: string | null;
  received_by: string | null;
  received_at: string;
};

type GoodsReceiptItemRow = {
  id: string;
  grn_id: string;
  po_item_id: string;
  qty_received: number;
  unit_cost_pence: number;
};

type SupplierPaymentRow = {
  id: string;
  supplier_id: string;
  purchase_order_id: string | null;
  amount_pence: number;
  method: PaymentMethod;
  payment_date: string;
  reference: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
};

type StockMovementRow = {
  id: string;
  product_id: string;
  movement_type: MovementType;
  qty_change: number;
  qty_before: number;
  qty_after: number;
  unit_cost_pence: number | null;
  reason: string;
  note: string | null;
  ref_id: string | null;
  adj_number: string | null;
  created_by: string | null;
  created_at: string;
};

type ExpenseRow = {
  id: string;
  category: string;
  description: string;
  amount_pence: number;
  expense_date: string;
  shift_id: string | null;
  is_void: boolean;
  void_reason: string | null;
  void_at: string | null;
  void_by: string | null;
  created_by: string | null;
  created_at: string;
};

type AuditEventRow = {
  id: string;
  actor_id: string | null;
  table_name: string;
  record_id: string | null;
  event_type:
    | "create"
    | "update"
    | "delete"
    | "void"
    | "status_change"
    | "stock_deduct"
    | "stock_restore"
    | "payment"
    | "login";
  payload: Json | null;
  created_at: string;
};

type BookingEnquiryRow = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  device: string;
  brand: string | null;
  issue: string;
  method: "walk-in" | "door-to-door" | "mail-in";
  preferred_date: string | null;
  preferred_slot: "morning" | "afternoon" | "evening" | null;
  address: string | null;
  status: "new" | "contacted" | "booked" | "completed" | "cancelled";
  staff_notes: string | null;
  repair_ticket_id: string | null;
  created_at: string;
  updated_at: string;
};

export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.5" };
  public: {
    Tables: {
      profiles: Table<ProfileRow>;
      user_roles: Table<UserRoleRow>;
      store_settings: Table<StoreSettingRow>;
      document_sequences: Table<DocumentSequenceRow>;
      suppliers: Table<SupplierRow>;
      customers: Table<CustomerRow>;
      products: Table<ProductRow>;
      serial_units: Table<
        SerialUnitRow,
        [
          {
            foreignKeyName: "serial_units_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ]
      >;
      shifts: Table<ShiftRow>;
      cash_movements: Table<
        CashMovementRow,
        [
          {
            foreignKeyName: "cash_movements_shift_id_fkey";
            columns: ["shift_id"];
            isOneToOne: false;
            referencedRelation: "shifts";
            referencedColumns: ["id"];
          },
        ]
      >;
      sales: Table<
        SaleRow,
        [
          {
            foreignKeyName: "sales_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
        ]
      >;
      sale_items: Table<
        SaleItemRow,
        [
          {
            foreignKeyName: "sale_items_sale_id_fkey";
            columns: ["sale_id"];
            isOneToOne: false;
            referencedRelation: "sales";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sale_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ]
      >;
      payments: Table<PaymentRow>;
      credit_notes: Table<
        CreditNoteRow,
        [
          {
            foreignKeyName: "credit_notes_sale_id_fkey";
            columns: ["sale_id"];
            isOneToOne: false;
            referencedRelation: "sales";
            referencedColumns: ["id"];
          },
        ]
      >;
      sale_returns: Table<
        SaleReturnRow,
        [
          {
            foreignKeyName: "sale_returns_sale_id_fkey";
            columns: ["sale_id"];
            isOneToOne: false;
            referencedRelation: "sales";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sale_returns_credit_note_id_fkey";
            columns: ["credit_note_id"];
            isOneToOne: false;
            referencedRelation: "credit_notes";
            referencedColumns: ["id"];
          },
        ]
      >;
      return_items: Table<
        ReturnItemRow,
        [
          {
            foreignKeyName: "return_items_return_id_fkey";
            columns: ["return_id"];
            isOneToOne: false;
            referencedRelation: "sale_returns";
            referencedColumns: ["id"];
          },
        ]
      >;
      repair_tickets: Table<
        RepairTicketRow,
        [
          {
            foreignKeyName: "repair_tickets_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
        ]
      >;
      repair_status_history: Table<
        RepairStatusHistoryRow,
        [
          {
            foreignKeyName: "repair_status_history_repair_id_fkey";
            columns: ["repair_id"];
            isOneToOne: false;
            referencedRelation: "repair_tickets";
            referencedColumns: ["id"];
          },
        ]
      >;
      repair_estimates: Table<
        RepairEstimateRow,
        [
          {
            foreignKeyName: "repair_estimates_repair_id_fkey";
            columns: ["repair_id"];
            isOneToOne: false;
            referencedRelation: "repair_tickets";
            referencedColumns: ["id"];
          },
        ]
      >;
      repair_parts: Table<
        RepairPartRow,
        [
          {
            foreignKeyName: "repair_parts_repair_id_fkey";
            columns: ["repair_id"];
            isOneToOne: false;
            referencedRelation: "repair_tickets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "repair_parts_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ]
      >;
      repair_payments: Table<
        RepairPaymentRow,
        [
          {
            foreignKeyName: "repair_payments_repair_id_fkey";
            columns: ["repair_id"];
            isOneToOne: false;
            referencedRelation: "repair_tickets";
            referencedColumns: ["id"];
          },
        ]
      >;
      repair_warranty_claims: Table<
        RepairWarrantyClaimRow,
        [
          {
            foreignKeyName: "repair_warranty_claims_repair_id_fkey";
            columns: ["repair_id"];
            isOneToOne: false;
            referencedRelation: "repair_tickets";
            referencedColumns: ["id"];
          },
        ]
      >;
      purchase_orders: Table<
        PurchaseOrderRow,
        [
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey";
            columns: ["supplier_id"];
            isOneToOne: false;
            referencedRelation: "suppliers";
            referencedColumns: ["id"];
          },
        ]
      >;
      purchase_order_items: Table<
        PurchaseOrderItemRow,
        [
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey";
            columns: ["purchase_order_id"];
            isOneToOne: false;
            referencedRelation: "purchase_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_order_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ]
      >;
      goods_receipts: Table<
        GoodsReceiptRow,
        [
          {
            foreignKeyName: "goods_receipts_purchase_order_id_fkey";
            columns: ["purchase_order_id"];
            isOneToOne: false;
            referencedRelation: "purchase_orders";
            referencedColumns: ["id"];
          },
        ]
      >;
      goods_receipt_items: Table<
        GoodsReceiptItemRow,
        [
          {
            foreignKeyName: "goods_receipt_items_grn_id_fkey";
            columns: ["grn_id"];
            isOneToOne: false;
            referencedRelation: "goods_receipts";
            referencedColumns: ["id"];
          },
        ]
      >;
      supplier_payments: Table<
        SupplierPaymentRow,
        [
          {
            foreignKeyName: "supplier_payments_supplier_id_fkey";
            columns: ["supplier_id"];
            isOneToOne: false;
            referencedRelation: "suppliers";
            referencedColumns: ["id"];
          },
        ]
      >;
      stock_movements: Table<
        StockMovementRow,
        [
          {
            foreignKeyName: "stock_movements_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ]
      >;
      expenses: Table<ExpenseRow>;
      audit_events: Table<AuditEventRow>;
      booking_enquiries: Table<BookingEnquiryRow>;
    };
    Views: {
      v_daily_sales_summary: View<{
        trade_date: string;
        sale_count: number;
        gross_sales_pence: number;
        discount_pence: number;
        net_sales_pence: number;
        revenue_pence: number;
        refunds_pence: number;
        cash_pence: number;
        card_pence: number;
        bank_pence: number;
      }>;
      v_cogs_by_period: View<{
        trade_date: string;
        cogs_pence: number;
        revenue_pence: number;
        gross_profit_pence: number;
        unknown_cost_items_count?: number;
        unknown_cost_revenue_pence?: number;
        is_margin_pending?: boolean;
      }>;
      v_phone_units_summary: View<{
        units_in_stock: number;
        units_sold: number;
        units_total: number;
        stock_cost_value_pence: number;
        total_purchased_pence: number;
        sold_revenue_pence: number;
        sold_cogs_pence: number;
        gross_margin_pence: number;
        direct_sales_count?: number;
        direct_sales_revenue_pence?: number;
        direct_sales_unknown_cost_count?: number;
        direct_sales_unknown_cost_revenue_pence?: number;
        is_margin_pending?: boolean;
      }>;
      v_repair_revenue: View<{
        repair_id: string;
        rep_number: string | null;
        status: RepairStatus;
        total_price_pence: number;
        amount_paid_pence: number;
        outstanding_pence: number;
        warranty_until: string | null;
        is_in_warranty: boolean;
        created_date: string;
        customer_name: string | null;
        customer_phone: string | null;
        parts_cost_pence: number;
        labour_price_pence: number;
        margin_pence: number;
      }>;
      v_stock_valuation: View<{
        id: string;
        name: string;
        category: string;
        sku: string | null;
        stock_quantity: number;
        avg_cost_pence: number;
        sale_price_pence: number;
        stock_value_at_cost_pence: number;
        stock_value_at_retail_pence: number;
        potential_gross_profit_pence: number;
        status: string;
      }>;
      v_low_stock_products: View<{
        id: string;
        name: string;
        category: string;
        sku: string | null;
        barcode: string | null;
        stock_quantity: number;
        low_stock_threshold: number;
        units_below_threshold: number;
        avg_cost_pence: number;
        sale_price_pence: number;
      }>;
      v_supplier_balances: View<{
        supplier_id: string;
        name: string;
        phone: string | null;
        email: string | null;
        balance_pence: number;
        total_ordered_pence: number;
        total_paid_pence: number;
        has_outstanding_balance: boolean;
      }>;
      v_shift_reconciliation: View<{
        shift_id: string;
        opened_at: string;
        closed_at: string | null;
        status: string;
        opening_float_pence: number;
        counted_cash_pence: number | null;
        expected_cash_pence: number | null;
        difference_pence: number | null;
        cash_sales_pence: number;
        card_sales_pence: number;
        bank_sales_pence: number;
        sale_count: number;
        repair_cash_pence: number;
        cash_refunds_pence: number;
        total_refunds_pence: number;
        expenses_pence: number;
        computed_expected_cash_pence: number;
        opened_by_name: string | null;
      }>;
      v_monthly_pnl: View<{
        month: string;
        gross_revenue_pence: number;
        returns_pence: number;
        net_sales_pence: number;
        cogs_pence: number;
        gross_profit_pence: number;
        repair_revenue_pence: number;
        expenses_pence: number;
        net_profit_pence: number;
      }>;
    };
    Functions: {
      has_role: { Args: { _user_id: string; _role: AppRole }; Returns: boolean };
      current_user_has_role: { Args: { _role: AppRole }; Returns: boolean };
      next_doc_number: { Args: { p_type: DocumentType; p_year?: number }; Returns: string };
      complete_sale: {
        Args: {
          p_idempotency_key: string;
          p_customer_id?: string | null;
          p_shift_id?: string | null;
          p_discount_pence?: number;
          p_payment_method?: PaymentMethod;
          p_amount_tendered_pence?: number | null;
          p_notes?: string | null;
          p_items?: Json;
        };
        Returns: Json;
      };
      refund_sale: {
        Args: {
          p_sale_id: string;
          p_refund_method?: PaymentMethod;
          p_reason?: string | null;
          p_items?: Json;
        };
        Returns: Json;
      };
      receive_purchase_order: {
        Args: {
          p_po_id: string;
          p_idempotency_key: string;
          p_update_cost_price?: boolean;
          p_notes?: string | null;
          p_items?: Json;
        };
        Returns: Json;
      };
      issue_repair_parts: {
        Args: { p_repair_id: string; p_idempotency_key: string; p_parts?: Json };
        Returns: Json;
      };
      return_repair_parts: { Args: { p_repair_id: string; p_part_ids: string[] }; Returns: Json };
      adjust_stock: {
        Args: {
          p_product_id: string;
          p_qty_change: number;
          p_reason?: string;
          p_note?: string | null;
          p_approved_by?: string | null;
        };
        Returns: Json;
      };
      open_shift: { Args: { p_opening_float_pence?: number }; Returns: Json };
      close_shift: {
        Args: { p_shift_id: string; p_counted_cash_pence: number; p_notes?: string | null };
        Returns: Json;
      };
      record_repair_payment: {
        Args: {
          p_repair_id: string;
          p_idempotency_key: string;
          p_amount_pence: number;
          p_method?: PaymentMethod;
          p_is_deposit?: boolean;
          p_shift_id?: string | null;
          p_notes?: string | null;
        };
        Returns: Json;
      };
      record_supplier_payment: {
        Args: {
          p_supplier_id: string;
          p_amount_pence: number;
          p_method?: PaymentMethod;
          p_purchase_order_id?: string | null;
          p_reference?: string | null;
          p_payment_date?: string | null;
          p_notes?: string | null;
        };
        Returns: Json;
      };
      update_repair_status: {
        Args: { p_repair_id: string; p_new_status: RepairStatus; p_note?: string | null };
        Returns: Json;
      };
      save_repair_ticket_v2: {
        Args: {
          p_ticket_id?: string | null;
          p_customer_id: string;
          p_device: string;
          p_brand?: string | null;
          p_model?: string | null;
          p_color?: string | null;
          p_imei?: string | null;
          p_serial_number?: string | null;
          p_device_condition?: Json;
          p_accessories_received?: string[];
          p_issue: string;
          p_method?: string;
          p_technician_id?: string | null;
          p_estimated_completion_at?: string | null;
          p_deposit_pence?: number;
          p_initial_quote_pence?: number;
          p_labour_price_pence?: number;
          p_warranty_days?: number;
          p_warranty_policy_text?: string | null;
          p_notes?: string | null;
        };
        Returns: Json;
      };
      approve_repair_quote: {
        Args: {
          p_repair_id: string;
          p_approved_via: string;
          p_total_pence: number;
          p_notes?: string | null;
        };
        Returns: Json;
      };
      finalize_repair_ticket: {
        Args: { p_repair_id: string };
        Returns: Json;
      };
      bulk_import_opening_stock: {
        Args: { p_products: Json };
        Returns: Json;
      };
      bootstrap_admin: { Args: { p_user_id: string }; Returns: string };
    };
    Enums: {
      app_role: AppRole;
      payment_method_type: PaymentMethod;
      doc_type: DocumentType;
      repair_status: RepairStatus;
      po_status: PurchaseOrderStatus;
      movement_type: MovementType;
      stock_track_type: StockTrackType;
    };
    CompositeTypes: Record<string, never>;
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<TableName extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][TableName]["Insert"];
export type TablesUpdate<TableName extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][TableName]["Update"];
export type Enums<EnumName extends keyof DefaultSchema["Enums"]> = DefaultSchema["Enums"][EnumName];

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "staff", "technician"],
      payment_method_type: ["cash", "card", "bank_transfer", "credit_note"],
      doc_type: ["INV", "CRN", "REP", "PO", "GRN", "ADJ"],
      repair_status: [
        "pending",
        "assessed",
        "in_progress",
        "quality_check",
        "ready",
        "completed",
        "cancelled",
      ],
      po_status: ["draft", "ordered", "partial", "received", "cancelled"],
      movement_type: [
        "sale",
        "return",
        "purchase",
        "repair_use",
        "repair_return",
        "adjustment",
        "opening",
        "opening_count",
      ],
      stock_track_type: ["quantity", "serial"],
    },
  },
} as const;
