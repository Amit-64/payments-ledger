
INSERT INTO users (id, email, password_hash, full_name)
VALUES
  ('00000000-0000-4000-8000-000000000001', 'system@bank.internal', 'SYSTEM_LOCKED_ACCOUNT', 'Central Bank Reserve'),
  ('00000000-0000-4000-8000-000000000002', 'amit@example.com', 'DEMO_PLACEHOLDER_HASH', 'Amit Mahale')
ON CONFLICT (email) DO NOTHING;


INSERT INTO accounts (id, user_id, name, currency, balance_minor, status, is_system)
VALUES
  ('00000000-0000-4000-8000-000000000099', '00000000-0000-4000-8000-000000000001', 'SYSTEM_RESERVE_INR', 'INR', 0, 'ACTIVE', TRUE)
ON CONFLICT (id) DO NOTHING;
