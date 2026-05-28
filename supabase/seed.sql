-- Sample data for testing

INSERT INTO public.users (id, email, full_name, plan)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin@expirelinkx.dev', 'Dev Admin', 'admin'),
  ('00000000-0000-0000-0000-000000000002', 'demo@expirelinkx.com', 'Demo User', 'free'),
  ('00000000-0000-0000-0000-000000000003', 'pro@expirelinkx.com', 'Pro User', 'pro')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.scans (user_id, page_url, total_links, broken_count, ok_count, redirect_count, estimated_loss)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'https://myblog.com/best-laptops-2026', 42, 3, 36, 3, 1500),
  ('00000000-0000-0000-0000-000000000001', 'https://myblog.com/top-cameras', 28, 1, 25, 2, 500),
  ('00000000-0000-0000-0000-000000000002', 'https://myblog.com/protein-supplements', 55, 7, 44, 4, 3500);

INSERT INTO public.monitored_sites (user_id, url, site_type)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'https://myblog.com', 'website'),
  ('00000000-0000-0000-0000-000000000001', 'https://myotherblog.com', 'website'),
  ('00000000-0000-0000-0000-000000000002', 'https://demoblog.com', 'website');

INSERT INTO public.user_settings (user_id, email_alerts, weekly_report, whatsapp_alerts, theme)
VALUES
  ('00000000-0000-0000-0000-000000000001', true, true, false, 'dark'),
  ('00000000-0000-0000-0000-000000000002', true, false, false, 'dark');
