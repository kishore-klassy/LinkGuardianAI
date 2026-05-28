import os
import urllib.request
import json

def get_openapi():
    env = {}
    with open('.env') as f:
        for line in f:
            if '=' in line and not line.startswith('#'):
                k, v = line.strip().split('=', 1)
                env[k] = v

    url = env['SUPABASE_URL'] + '/rest/v1/'
    req = urllib.request.Request(url, headers={
        'apikey': env['SUPABASE_SERVICE_ROLE_KEY'],
        'Authorization': f"Bearer {env['SUPABASE_SERVICE_ROLE_KEY']}"
    })
    
    try:
        with urllib.request.urlopen(req) as res:
            data = json.loads(res.read())
            scans_props = data['definitions']['scans']['properties']
            print("Columns in 'scans' table:", list(scans_props.keys()))
    except Exception as e:
        print("Error:", e)

get_openapi()
