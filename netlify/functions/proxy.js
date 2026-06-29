const https = require('https');

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, x-api-key, anthropic-version, anthropic-beta',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }

  const apiKey = event.headers['x-api-key'] || event.headers['X-Api-Key'];
  if (!apiKey) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: { message: 'Missing x-api-key' } }) };
  }

  // Netlify sometimes base64-encodes the body
  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body, 'base64').toString('utf8')
    : (event.body || '{}');

  return new Promise((resolve) => {
    const bodyBuf = Buffer.from(rawBody, 'utf8');

    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': bodyBuf.length,
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
    };

    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: { ...CORS, 'Content-Type': 'application/json' },
          body: Buffer.concat(chunks).toString('utf8'),
        });
      });
    });

    req.on('error', (err) => {
      resolve({
        statusCode: 500,
        headers: { ...CORS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: { message: err.message } }),
      });
    });

    req.setTimeout(24000, () => {
      req.destroy();
      resolve({
        statusCode: 504,
        headers: { ...CORS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: { message: 'Request to Anthropic timed out' } }),
      });
    });

    req.write(bodyBuf);
    req.end();
  });
};
