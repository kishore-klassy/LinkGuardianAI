import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

os.environ["SUPABASE_URL"] = "https://test.supabase.co"
os.environ["SUPABASE_SERVICE_ROLE_KEY"] = "test-key"
os.environ["ANTHROPIC_API_KEY"] = ""
os.environ["YOUTUBE_API_KEY"] = ""
os.environ["STRIPE_SECRET_KEY"] = "sk_test_placeholder"
os.environ["FRONTEND_URL"] = "http://localhost:3000"
