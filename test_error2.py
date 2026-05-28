import urllib.request
import urllib.error
import json

env={}
with open('.env') as f:
    for line in f:
        if '=' in line and not line.startswith('#'):
            env[line.split('=',1)[0].strip()] = line.split('=',1)[1].strip()

req = urllib.request.Request(
    env['SUPABASE_URL']+'/rest/v1/non_existent_table?limit=1', 
    headers={
        'apikey': env['NEXT_PUBLIC_SUPABASE_ANON_KEY'], 
        'Authorization': 'Bearer '+env['NEXT_PUBLIC_SUPABASE_ANON_KEY']
    }
)
try:
    urllib.request.urlopen(req)
except urllib.error.HTTPError as e:
    print('Status:', e.code)
    print('Reason:', e.reason)
    print('Body:', e.read().decode())
