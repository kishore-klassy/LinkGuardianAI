import os
import urllib.request
import json

def test_fetch_scans():
    env = {}
    with open('.env') as f:
        for line in f:
            if '=' in line and not line.startswith('#'):
                k, v = line.strip().split('=', 1)
                env[k] = v

    url = env['SUPABASE_URL'] + '/rest/v1/scans?select=id,created_at,broken_count'
    
    req = urllib.request.Request(url, headers={
        'apikey': env['SUPABASE_SERVICE_ROLE_KEY'],
        'Authorization': f"Bearer {env['SUPABASE_SERVICE_ROLE_KEY']}",
        'Content-Type': 'application/json'
    }, method='GET')
    
    try:
        with urllib.request.urlopen(req) as res:
            print("HTTP Status:", res.status)
            print("Response:", res.read())
    except urllib.error.HTTPError as e:
        print("HTTP Error Status:", e.code)
        print("HTTP Error Body:", e.read().decode('utf-8'))
    except Exception as e:
        print("Error:", e)

test_fetch_scans()
