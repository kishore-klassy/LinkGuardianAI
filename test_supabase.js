const fs = require('fs');
const https = require('https');

// Simple .env parser
const envFile = fs.readFileSync('.env', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...values] = line.split('=');
  if (key && values.length) {
    env[key.trim()] = values.join('=').trim();
  }
});

const url = env['NEXT_PUBLIC_SUPABASE_URL'];
const anonKey = env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];
const serviceKey = env['SUPABASE_SERVICE_ROLE_KEY'];

console.log("=== Supabase Connection Test ===");
console.log(`URL: ${url}`);
console.log(`Anon Key present: ${anonKey ? 'Yes' : 'No'}`);
console.log(`Service Role Key present: ${serviceKey ? 'Yes' : 'No'}\n`);

if (!url) {
  console.log("Error: NEXT_PUBLIC_SUPABASE_URL is missing in .env");
  process.exit(1);
}

const reqUrl = new URL(url);

function makeRequest(path, headers) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: reqUrl.hostname,
      path: path,
      method: 'GET',
      headers: headers
    };

    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });

    req.on('error', e => reject(e));
    req.end();
  });
}

async function runTests() {
  console.log("Testing URL reachability...");
  try {
    const authRes = await makeRequest('/auth/v1/health', {});
    console.log(`Auth Health Endpoint Status Code: ${authRes.status}`);
    if (authRes.status === 200) {
      console.log("✓ Successfully reached Supabase Auth endpoint.\n");
    } else {
      console.log(`✗ Failed to reach Auth endpoint properly. Status: ${authRes.status}\n`);
    }
  } catch (e) {
    console.log(`✗ Network Error: Could not reach Supabase URL. Details: ${e.message}\n`);
  }

  console.log("Testing Anon Key validity...");
  if (anonKey) {
    try {
      const res = await makeRequest('/rest/v1/', {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`
      });
      console.log(`REST API Root Status Code: ${res.status}`);
      if (res.status === 200 || res.status === 404) {
        console.log("✓ Anon Key is valid and authorized.\n");
      } else if (res.status === 401) {
        console.log("✗ Unauthorized: Your NEXT_PUBLIC_SUPABASE_ANON_KEY is invalid.\n");
      } else {
        console.log(`✗ Unexpected response: ${res.status}\n`);
      }
    } catch (e) {
      console.log(`✗ Network Error: ${e.message}\n`);
    }
  }

  console.log("Testing Service Role Key validity...");
  if (serviceKey) {
    try {
      const res = await makeRequest('/rest/v1/', {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`
      });
      console.log(`REST API Root Status Code: ${res.status}`);
      if (res.status === 200 || res.status === 404) {
        console.log("✓ Service Role Key is valid and authorized.\n");
      } else if (res.status === 401) {
        console.log("✗ Unauthorized: Your SUPABASE_SERVICE_ROLE_KEY is invalid.\n");
      }
    } catch (e) {
      console.log(`✗ Network Error: ${e.message}\n`);
    }
  }
}

runTests();
