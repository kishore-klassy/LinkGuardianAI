import os
import urllib.request
import json
from datetime import datetime

def test_insert_scan():
    env = {}
    with open('.env') as f:
        for line in f:
            if '=' in line and not line.startswith('#'):
                k, v = line.strip().split('=', 1)
                env[k] = v

    url = env['SUPABASE_URL'] + '/rest/v1/scans'
    data = {
        "user_id": "d23131e2-0857-4dab-afd5-bfc98e2baee9",
        "page_url": "https://test.com",
        "total_links": 10,
        "broken_count": 2,
        "ok_count": 8,
        "timeout_count": 0,
        "redirect_count": 0,
        "estimated_loss": 0,
        "broken_links_data": [],
        "ok_links_data": [],
        "unverifiable_links_data": [],
        "redirect_links_data": []
    }
    
    req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers={
        'apikey': env['SUPABASE_SERVICE_ROLE_KEY'],
        'Authorization': f"Bearer {env['SUPABASE_SERVICE_ROLE_KEY']}",
        'Content-Type': 'application/json'
    }, method='POST')
    
    try:
        with urllib.request.urlopen(req) as res:
            print("HTTP Status:", res.status)
            print("Response:", res.read())
    except urllib.error.HTTPError as e:
        print("HTTP Error Status:", e.code)
        print("HTTP Error Body:", e.read().decode('utf-8'))
    except Exception as e:
        print("Error:", e)

test_insert_scan()
