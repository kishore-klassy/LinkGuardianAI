import os
import urllib.request
import json

def test_insert_user():
    env = {}
    with open('.env') as f:
        for line in f:
            if '=' in line and not line.startswith('#'):
                k, v = line.strip().split('=', 1)
                env[k] = v

    url = env['SUPABASE_URL'] + '/rest/v1/users'
    req = urllib.request.Request(url, data=json.dumps({
        "id": "d23131e2-0857-4dab-afd5-bfc98e2baee9",
        "email": "user@expirelinkx.com",
        "plan": "free"
    }).encode('utf-8'), headers={
        'apikey': env['SUPABASE_SERVICE_ROLE_KEY'],
        'Authorization': f"Bearer {env['SUPABASE_SERVICE_ROLE_KEY']}",
        'Content-Type': 'application/json'
    }, method='POST')
    
    try:
        with urllib.request.urlopen(req) as res:
            print("Success:", res.read())
    except urllib.error.HTTPError as e:
        print("HTTP Error:", e.code, e.read().decode('utf-8'))
    except Exception as e:
        print("Error:", e)

test_insert_user()
