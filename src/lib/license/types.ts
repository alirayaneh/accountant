export type LicenseStatus = 'active' | 'expired' | 'revoked' | 'grace' | 'inactive';

export interface LicenseStatusResponse {
  valid: boolean;
  status: LicenseStatus;
  reason?: string;
  message?: string;
  expires_at?: string | null;
  last_check_at?: string | null;
  next_check_at?: string | null;
  grace_days_left?: number | null;
}

export interface LicenseActivateResponse extends LicenseStatusResponse {
  error_code?: string;
}
