export type VoucherStatus = "unused" | "used" | "expired";

export interface Voucher {
  id: string;
  user_id: string | null;
  name: string;
  value: number;
  spent: number;
  category: string;
  code: string | null;
  pin: string | null;
  expires_on: string | null;
  status: VoucherStatus;
  created_at: string;
}
