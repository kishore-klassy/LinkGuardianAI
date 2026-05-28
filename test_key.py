import urllib.request
import urllib.error

env = {}
with open(".env", "r") as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith("#"):
            parts = line.split("=", 1)
            if len(parts) == 2:
                env[parts[0].strip()] = parts[1].strip()

url = env.get("NEXT_PUBLIC_SUPABASE_URL")
key = env.get("SUPABASE_SERVICE_ROLE_KEY")

try:
    req = urllib.request.Request(f"{url}/rest/v1/", headers={
        "apikey": key,
        "Authorization": f"Bearer {key}"
    })
    response = urllib.request.urlopen(req, timeout=10)
    print(f"Status: {response.status}")
except urllib.error.HTTPError as e:
    print(f"HTTPError: {e.code}")
except Exception as e:
    print(f"Exception: {e}")
