const https = require('https');

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, x-api-key, anthropic-version, anthropic-beta',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function httpsPost(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.setTimeout(25000, () => { req.destroy(new Error('timeout')); });
    req.write(body);
    req.end();
  });
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }

  try {
    const apiKey = event.headers['x-api-key'] || event.headers['X-Api-Key'];
    if (!apiKey) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: { message: 'Missing x-api-key header' } }) };
    }

    const reqHeaders = {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': event.headers['anthropic-version'] || '2023-06-01',
    };
    if (event.headers['anthropic-beta']) {
      reqHeaders['anthropic-beta'] = event.headers['anthropic-beta'];
    }

    const bodyStr = event.body || '{}';
    reqHeaders['Content-Length'] = Buffer.byteLength(bodyStr);

    const result = await httpsPost({
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: reqHeaders,
    }, bodyStr);

    return {
      statusCode: result.status,
      headers: { ...CORS, 'Content-Type': 'application/json' },
      body: result.body,
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: { message: err.message } }),
    };
  }
};
