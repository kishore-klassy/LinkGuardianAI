import os
import urllib.request
import urllib.error
import json

# Parse .env manually
env = {}
with open(".env", "r") as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith("#"):
            parts = line.split("=", 1)
            if len(parts) == 2:
                env[parts[0].strip()] = parts[1].strip()

SUPABASE_URL = env.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_ANON_KEY = env.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

print("=== Supabase Connection Test ===")
print(f"URL: {SUPABASE_URL}")
print(f"Anon Key present: {'Yes' if SUPABASE_ANON_KEY else 'No'}\n")

if not SUPABASE_URL:
    print("Error: NEXT_PUBLIC_SUPABASE_URL is missing in .env")
    exit(1)

# Test 1: Check Auth endpoint
print("Testing URL reachability...")
try:
    req = urllib.request.Request(f"{SUPABASE_URL}/auth/v1/health")
    with urllib.request.urlopen(req, timeout=10) as response:
        print(f"Auth Health Endpoint Status Code: {response.status}")
        if response.status == 200:
            print("[OK] Successfully reached Supabase Auth endpoint.\n")
except urllib.error.HTTPError as e:
    print(f"[FAIL] Failed to reach Auth endpoint properly. Status: {e.code}\n")
except urllib.error.URLError as e:
    print(f"[FAIL] Network Error: Could not reach Supabase URL. Details: {e.reason}\n")

# Test 2: Check Anon Key validity
print("Testing Anon Key validity...")
if SUPABASE_ANON_KEY:
    try:
        req = urllib.request.Request(f"{SUPABASE_URL}/rest/v1/non_existent_table?limit=1", headers={
            "apikey": SUPABASE_ANON_KEY,
            "Authorization": f"Bearer {SUPABASE_ANON_KEY}"
        })
        with urllib.request.urlopen(req, timeout=10) as response:
            print(f"REST API Root Status Code: {response.status}")
            print("[OK] Anon Key is valid and authorized.\n")
    except urllib.error.HTTPError as e:
        if e.code == 404:
             print(f"REST API Root Status Code: 404 (This is normal if no tables queried)")
             print("[OK] Anon Key is valid and authorized.\n")
        elif e.code == 401:
             print("[FAIL] Unauthorized: Your NEXT_PUBLIC_SUPABASE_ANON_KEY is invalid.\n")
        else:
             print(f"[FAIL] Unexpected response: {e.code}\n")
    except urllib.error.URLError as e:
        print(f"[FAIL] Network Error: {e.reason}\n")

