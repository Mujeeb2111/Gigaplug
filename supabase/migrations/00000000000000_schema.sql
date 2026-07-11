-- GigaPlug Supabase schema

-- API configuration and secrets
CREATE TABLE IF NOT EXISTS api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  key_name text NOT NULL,
  value text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(provider, key_name)
);

-- Admin config (OTP price tiers, FX rate, data markup, etc.)
CREATE TABLE IF NOT EXISTS admin_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Users (passwordless email-only)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  role text DEFAULT 'user' CHECK (role IN ('user')),
  full_name text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  otp_code text,
  otp_expires_at timestamptz,
  otp_used boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  balance numeric(12,2) DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS virtual_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider text DEFAULT 'squad',
  account_number text NOT NULL,
  bank_name text,
  account_name text,
  customer_identifier text,
  reference text,
  raw jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('funding', 'data', 'otp', 'manual_credit', 'manual_debit', 'refund')),
  description text NOT NULL,
  amount numeric(12,2) NOT NULL,
  cost_price numeric(12,2),
  profit numeric(12,2),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
  reference text,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS data_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  network text NOT NULL,
  plan_code text NOT NULL,
  name text NOT NULL,
  cost_price numeric(12,2) NOT NULL,
  sell_price numeric(12,2) NOT NULL,
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(network, plan_code)
);

CREATE TABLE IF NOT EXISTS data_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  network text NOT NULL,
  plan_code text NOT NULL,
  plan_name text,
  phone text NOT NULL,
  cost_price numeric(12,2) NOT NULL,
  sell_price numeric(12,2) NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
  reference text,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS otp_countries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country text UNIQUE NOT NULL,
  name text NOT NULL,
  is_eu boolean DEFAULT false,
  min_profit numeric(12,2) DEFAULT 500,
  max_profit numeric(12,2),
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS otp_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fivesim_order_id text NOT NULL,
  country text NOT NULL,
  operator text NOT NULL,
  service text NOT NULL,
  phone text,
  cost_price numeric(12,2) NOT NULL,
  sell_price numeric(12,2) NOT NULL,
  status text DEFAULT 'PENDING',
  sms_code text,
  sms_text text,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS api_call_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  method text NOT NULL,
  endpoint text NOT NULL,
  request jsonb,
  response jsonb,
  status integer,
  duration_ms integer,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE virtual_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_call_logs ENABLE ROW LEVEL SECURITY;

-- Service role bypass is the default, but explicit policies are safest if RLS is not bypassed
CREATE POLICY IF NOT EXISTS service_role_api_keys ON api_keys FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS service_role_admin_config ON admin_config FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS service_role_users ON users FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS service_role_wallets ON wallets FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS service_role_virtual_accounts ON virtual_accounts FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS service_role_transactions ON transactions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS service_role_data_plans ON data_plans FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS service_role_data_orders ON data_orders FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS service_role_otp_countries ON otp_countries FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS service_role_otp_orders ON otp_orders FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS service_role_api_call_logs ON api_call_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Default seed config
INSERT INTO admin_config (key, value) VALUES
  ('otp_tiers', '[5000, 10000, 15000]'),
  ('fx_rate', '1'),
  ('data_markup', '20')
ON CONFLICT (key) DO NOTHING;

-- Default OTP country rules
INSERT INTO otp_countries (country, name, is_eu, min_profit, max_profit) VALUES
  ('usa', 'United States', true, 1500, 3000),
  ('england', 'United Kingdom', true, 1500, 3000),
  ('germany', 'Germany', true, 1500, 3000),
  ('france', 'France', true, 1500, 3000),
  ('canada', 'Canada', true, 1500, 3000),
  ('nigeria', 'Nigeria', false, 500, null)
ON CONFLICT (country) DO NOTHING;

-- Wallet helpers
CREATE OR REPLACE FUNCTION credit_wallet(
  p_user_id uuid,
  p_amount numeric,
  p_reference text,
  p_description text
) RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO transactions (user_id, type, description, amount, status, reference)
  VALUES (p_user_id, 'funding', p_description, p_amount, 'success', p_reference);

  UPDATE wallets
  SET balance = balance + p_amount,
      updated_at = now()
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    INSERT INTO wallets (user_id, balance) VALUES (p_user_id, p_amount);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION debit_wallet(
  p_user_id uuid,
  p_amount numeric,
  p_reference text,
  p_description text,
  p_type text
) RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  current_balance numeric;
BEGIN
  SELECT balance INTO current_balance FROM wallets WHERE user_id = p_user_id FOR UPDATE;

  IF current_balance IS NULL OR current_balance < p_amount THEN
    RETURN false;
  END IF;

  UPDATE wallets
  SET balance = balance - p_amount,
      updated_at = now()
  WHERE user_id = p_user_id;

  INSERT INTO transactions (user_id, type, description, amount, status, reference)
  VALUES (p_user_id, p_type, p_description, p_amount, 'success', p_reference);

  RETURN true;
END;
$$;

-- Indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_virtual_accounts_user_id ON virtual_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_data_orders_user_id ON data_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_otp_orders_user_id ON otp_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_api_call_logs_provider ON api_call_logs(provider, created_at);
