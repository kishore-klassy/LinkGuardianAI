import os
from supabase import create_client, Client

env={}
with open('.env') as f:
    for line in f:
        if '=' in line and not line.startswith('#'):
            env[line.split('=',1)[0].strip()] = line.split('=',1)[1].strip()

supabase: Client = create_client(env['SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY'])

r = supabase.table("users").select("plan").eq("id", "00000000-0000-0000-0000-000000000000").maybe_single().execute()
print("Result of maybe_single:", r, type(r))

r2 = supabase.table("scans").select("*").eq("user_id", "00000000-0000-0000-0000-000000000000").execute()
print("Result of non single:", r2, type(r2))
