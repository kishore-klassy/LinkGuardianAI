import os
from dotenv import load_dotenv
import requests

# Load from .env file
load_dotenv()

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

print("=== Supabase Connection Test ===")
print(f"URL: {SUPABASE_URL}")
print(f"Anon Key present: {'Yes' if SUPABASE_ANON_KEY else 'No'}")
print(f"Service Role Key present: {'Yes' if SUPABASE_SERVICE_ROLE_KEY else 'No'}\n")

if not SUPABASE_URL:
    print("Error: NEXT_PUBLIC_SUPABASE_URL is missing in .env")
    exit(1)

# Test 1: Check if URL is reachable
print("Testing URL reachability...")
try:
    response = requests.get(f"{SUPABASE_URL}/auth/v1/health", timeout=10)
    print(f"Auth Health Endpoint Status Code: {response.status_code}")
    if response.status_code == 200:
        print("✓ Successfully reached Supabase Auth endpoint.\n")
    else:
        print(f"✗ Failed to reach Auth endpoint properly. Response: {response.text}\n")
except Exception as e:
    print(f"✗ Network Error: Could not reach Supabase URL. Details: {e}\n")

# Test 2: Check Anon Key validity (by querying an endpoint)
print("Testing Anon Key validity...")
if SUPABASE_ANON_KEY:
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}"
    }
    try:
        response = requests.get(f"{SUPABASE_URL}/rest/v1/", headers=headers, timeout=10)
        print(f"REST API Root Status Code: {response.status_code}")
        if response.status_code in [200, 404]: # 404 is okay if no tables, but usually 200
            print("✓ Anon Key is valid and authorized.\n")
        elif response.status_code == 401:
            print("✗ Unauthorized: Your NEXT_PUBLIC_SUPABASE_ANON_KEY is invalid.\n")
        else:
            print(f"✗ Unexpected response. Body: {response.text}\n")
    except Exception as e:
        print(f"✗ Network Error: {e}\n")
else:
    print("✗ No Anon Key to test.\n")

# Test 3: Check Service Role Key validity
print("Testing Service Role Key validity...")
if SUPABASE_SERVICE_ROLE_KEY:
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}"
    }
    try:
        response = requests.get(f"{SUPABASE_URL}/rest/v1/", headers=headers, timeout=10)
        print(f"REST API Root Status Code: {response.status_code}")
        if response.status_code in [200, 404]:
            print("✓ Service Role Key is valid and authorized.\n")
        elif response.status_code == 401:
            print("✗ Unauthorized: Your SUPABASE_SERVICE_ROLE_KEY is invalid.\n")
    except Exception as e:
        print(f"✗ Network Error: {e}\n")
else:
    print("✗ No Service Role Key to test.\n")
