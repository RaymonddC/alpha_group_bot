-- ============================================================================
-- DEV SEED DATA — for manual testing only, do NOT run in production
-- Groups:
--   botTest2     (40910237...)  thresholds: 300/500/700
--   botTest      (33fe61cd...)  thresholds: 100/500/700
--   Alpha Test   (45476ccc...)  thresholds: 100/350/700
-- Admin login: admin@alphagroups.xyz / admin123
-- ============================================================================

-- MEMBERS — botTest2 (300/500/700)
INSERT INTO members (id, group_id, telegram_id, telegram_username, wallet_address, fairscore, tier, last_checked, joined_at) VALUES
  (uuid_generate_v4(), '40910237-a501-45cf-a061-163388c2d9b3', 100001, 'cryptoking',    'So1GxYkzH3pMVtNJLtPq1rDmWqMnKpCJ8bFvX1aYtEk', 892, 'gold',   NOW() - INTERVAL '1 day',  NOW() - INTERVAL '30 days'),
  (uuid_generate_v4(), '40910237-a501-45cf-a061-163388c2d9b3', 100002, 'solana_whale',  'So2Rk9mCpQwLvXzYtHj1bFdGsUeAiVoP7nKqDxWmTy2', 751, 'gold',   NOW() - INTERVAL '2 days', NOW() - INTERVAL '25 days'),
  (uuid_generate_v4(), '40910237-a501-45cf-a061-163388c2d9b3', 100003, 'defi_degen',    'So3Zp8nLqKwJvXyTmHg1rFbCsUdAeVoQ6mKpDxWnTz3', 723, 'gold',   NOW() - INTERVAL '1 day',  NOW() - INTERVAL '20 days'),
  (uuid_generate_v4(), '40910237-a501-45cf-a061-163388c2d9b3', 100004, 'nft_collector', 'So4Yq7oMrLxKwIuSmGf1qEaDbTcZeWnR5lJoDwVmUs4', 612, 'silver', NOW() - INTERVAL '3 days', NOW() - INTERVAL '18 days'),
  (uuid_generate_v4(), '40910237-a501-45cf-a061-163388c2d9b3', 100005, 'alpha_hunter',  'So5Xr6pNsMyJvHtRlFe1pDaCbSdYfXoT4kInCvUlVr5', 588, 'silver', NOW() - INTERVAL '1 day',  NOW() - INTERVAL '15 days'),
  (uuid_generate_v4(), '40910237-a501-45cf-a061-163388c2d9b3', 100006, 'moon_trader',   'So6Ws5qOtNxKwIsQkEd1oCaSbRcXgWnS3jHmBuTkUq6', 541, 'silver', NOW() - INTERVAL '4 days', NOW() - INTERVAL '12 days'),
  (uuid_generate_v4(), '40910237-a501-45cf-a061-163388c2d9b3', 100007, 'hodl_master',   'So7Vr4rPuOwLvJrPjDc1nBaRaQbWfVmR2iGlAtSjTp7', 498, 'bronze', NOW() - INTERVAL '2 days', NOW() - INTERVAL '10 days'),
  (uuid_generate_v4(), '40910237-a501-45cf-a061-163388c2d9b3', 100008, 'pump_spotter',  'So8Uq3sPvPxKuIqOiCb1mAaP9ZaVeUlQ1hFkZsRiSo8', 421, 'bronze', NOW() - INTERVAL '1 day',  NOW() - INTERVAL '8 days'),
  (uuid_generate_v4(), '40910237-a501-45cf-a061-163388c2d9b3', 100009, 'paper_hands',   'So9Tp2tQwQyJtHpNhBa1lZ9OZZUdTkP0gEjYrQhRn9', 187, 'none',   NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
  (uuid_generate_v4(), '40910237-a501-45cf-a061-163388c2d9b3', 100010, 'newcomer_01',   'SoAUo1uRxRzIuGoMgZa1kY8NYYTcSjO9fDiXqPgQmA', 95,  'none',   NOW() - INTERVAL '1 day',  NOW() - INTERVAL '2 days')
ON CONFLICT (group_id, telegram_id) DO NOTHING;

-- MEMBERS — botTest (100/500/700)
INSERT INTO members (id, group_id, telegram_id, telegram_username, wallet_address, fairscore, tier, last_checked, joined_at) VALUES
  (uuid_generate_v4(), '33fe61cd-5172-4840-9d56-d8c0d0f4b37f', 200001, 'vip_staker',    'Sb1GxYkzH3pMVtNJLtPq1rDmWqMnKpCJ8bFvX1aYtEk', 935, 'gold',   NOW() - INTERVAL '1 day',  NOW() - INTERVAL '45 days'),
  (uuid_generate_v4(), '33fe61cd-5172-4840-9d56-d8c0d0f4b37f', 200002, 'yield_farmer',  'Sb2Rk9mCpQwLvXzYtHj1bFdGsUeAiVoP7nKqDxWmTy2', 814, 'gold',   NOW() - INTERVAL '2 days', NOW() - INTERVAL '40 days'),
  (uuid_generate_v4(), '33fe61cd-5172-4840-9d56-d8c0d0f4b37f', 200003, 'liquidity_pro', 'Sb3Zp8nLqKwJvXyTmHg1rFbCsUdAeVoQ6mKpDxWnTz3', 567, 'silver', NOW() - INTERVAL '3 days', NOW() - INTERVAL '35 days'),
  (uuid_generate_v4(), '33fe61cd-5172-4840-9d56-d8c0d0f4b37f', 200004, 'chain_analyst', 'Sb4Yq7oMrLxKwIuSmGf1qEaDbTcZeWnR5lJoDwVmUs4', 312, 'bronze', NOW() - INTERVAL '1 day',  NOW() - INTERVAL '28 days'),
  (uuid_generate_v4(), '33fe61cd-5172-4840-9d56-d8c0d0f4b37f', 200005, 'early_bird_22', 'Sb5Xr6pNsMyJvHtRlFe1pDaCbSdYfXoT4kInCvUlVr5', 145, 'bronze', NOW() - INTERVAL '2 days', NOW() - INTERVAL '20 days')
ON CONFLICT (group_id, telegram_id) DO NOTHING;

-- MEMBERS — Alpha Groups Test Community (100/350/700)
INSERT INTO members (id, group_id, telegram_id, telegram_username, wallet_address, fairscore, tier, last_checked, joined_at) VALUES
  (uuid_generate_v4(), '45476ccc-63b1-4be3-9f17-5de23c2c7626', 300001, 'test_gold_01',  'Sc1GxYkzH3pMVtNJLtPq1rDmWqMnKpCJ8bFvX1aYtEk', 988, 'gold',   NOW() - INTERVAL '1 hour', NOW() - INTERVAL '60 days'),
  (uuid_generate_v4(), '45476ccc-63b1-4be3-9f17-5de23c2c7626', 300002, 'test_silver_01','Sc2Rk9mCpQwLvXzYtHj1bFdGsUeAiVoP7nKqDxWmTy2', 450, 'silver', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '55 days'),
  (uuid_generate_v4(), '45476ccc-63b1-4be3-9f17-5de23c2c7626', 300003, 'test_bronze_01','Sc3Zp8nLqKwJvXyTmHg1rFbCsUdAeVoQ6mKpDxWnTz3', 210, 'bronze', NOW() - INTERVAL '3 hours', NOW() - INTERVAL '50 days'),
  (uuid_generate_v4(), '45476ccc-63b1-4be3-9f17-5de23c2c7626', 300004, 'test_none_01',  'Sc4Yq7oMrLxKwIuSmGf1qEaDbTcZeWnR5lJoDwVmUs4', 42,  'none',   NOW() - INTERVAL '4 hours', NOW() - INTERVAL '3 days')
ON CONFLICT (group_id, telegram_id) DO NOTHING;

-- ACTIVITY LOG — verified events on join
INSERT INTO activity_log (member_id, group_id, action, old_score, new_score, old_tier, new_tier, details, created_at)
SELECT m.id, m.group_id, 'verified', NULL, m.fairscore, NULL, m.tier,
       'Initial wallet verification via SIWS',
       m.joined_at
FROM members m;

-- Score promotions
INSERT INTO activity_log (member_id, group_id, action, old_score, new_score, old_tier, new_tier, details, created_at)
SELECT m.id, m.group_id, 'promoted', 480, 612, 'bronze', 'silver', 'Daily recheck: score improved', NOW() - INTERVAL '10 days'
FROM members m WHERE m.telegram_username = 'nft_collector';

INSERT INTO activity_log (member_id, group_id, action, old_score, new_score, old_tier, new_tier, details, created_at)
SELECT m.id, m.group_id, 'promoted', 680, 751, 'silver', 'gold', 'Daily recheck: score improved', NOW() - INTERVAL '5 days'
FROM members m WHERE m.telegram_username = 'solana_whale';

-- Score demotion + kick
INSERT INTO activity_log (member_id, group_id, action, old_score, new_score, old_tier, new_tier, details, created_at)
SELECT m.id, m.group_id, 'demoted', 340, 187, 'bronze', 'none', 'Daily recheck: score dropped below threshold', NOW() - INTERVAL '3 days'
FROM members m WHERE m.telegram_username = 'paper_hands';

INSERT INTO activity_log (member_id, group_id, action, old_score, new_score, old_tier, new_tier, details, created_at)
SELECT m.id, m.group_id, 'kicked', 187, NULL, 'none', NULL, 'Auto-kicked: score below threshold for 24h', NOW() - INTERVAL '2 days'
FROM members m WHERE m.telegram_username = 'paper_hands';

-- Daily rechecks (no change)
INSERT INTO activity_log (member_id, group_id, action, old_score, new_score, old_tier, new_tier, details, created_at)
SELECT m.id, m.group_id, 'checked', m.fairscore, m.fairscore, m.tier, m.tier, 'Daily recheck: no change', NOW() - INTERVAL '1 day'
FROM members m WHERE m.telegram_username IN ('cryptoking','defi_degen','alpha_hunter','moon_trader','hodl_master','pump_spotter','vip_staker','yield_farmer');

-- VERIFICATIONS
INSERT INTO verifications (telegram_id, wallet_address, signature, message, nonce, verified_at)
SELECT
  m.telegram_id,
  m.wallet_address,
  '{"mock":"seed_sig"}',
  'Sign in to Alpha Groups

URI: http://localhost:3000
Telegram ID: ' || m.telegram_id || '
Issued At: 2026-02-01T00:00:00Z
Nonce: seed-' || m.telegram_id || '

This signature is free and proves wallet ownership.',
  'seed-' || m.telegram_id,
  m.joined_at
FROM members m
ON CONFLICT DO NOTHING;

-- Summary
SELECT g.name, COUNT(m.id) as members FROM groups g LEFT JOIN members m ON m.group_id = g.id GROUP BY g.name ORDER BY g.name;
SELECT tier, COUNT(*) FROM members GROUP BY tier ORDER BY tier;
SELECT action, COUNT(*) FROM activity_log GROUP BY action ORDER BY action;
SELECT COUNT(*) as verifications FROM verifications;
