import os
import json
import urllib.request
import urllib.error

def load_env():
    env = {}
    if os.path.exists('.env'):
        with open('.env', 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, val = line.split('=', 1)
                    env[key.strip()] = val.strip()
    return env

def main():
    print("=== Supabase Scans Verification ===")
    env = load_env()
    
    supabase_url = env.get('SUPABASE_URL')
    service_key = env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if not supabase_url or not service_key:
        print("Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not found in .env")
        return

    # Query the 'scans' table for the latest 5 records
    url = f"{supabase_url}/rest/v1/scans?select=id,created_at,user_id,page_url,total_links,broken_count&order=created_at.desc&limit=5"
    
    req = urllib.request.Request(url, headers={
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}"
    })
    
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode('utf-8'))
            
            if not data:
                print("No scans found in the database. Try running a scan first!")
                return
                
            print(f"Found {len(data)} recent scan(s):\n")
            for i, scan in enumerate(data, 1):
                print(f"--- Scan #{i} ---")
                print(f"ID:           {scan.get('id')}")
                print(f"Date:         {scan.get('created_at')}")
                print(f"User ID:      {scan.get('user_id')}")
                print(f"Target URL:   {scan.get('page_url')}")
                print(f"Total Links:  {scan.get('total_links')}")
                print(f"Broken Links: {scan.get('broken_count')}")
                print()
                
    except urllib.error.HTTPError as e:
        print(f"HTTP Error {e.code}: {e.read().decode('utf-8')}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
