const https = require('https');

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, x-api-key, anthropic-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

module.exports = async (req, res) => {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method === 'OPTIONS') return res.status(204).end();

  const apiKey = req.headers['x-api-key'];
  if (!apiKey) return res.status(400).json({ error: { message: 'Missing x-api-key' } });

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const bodyBuf = Buffer.concat(chunks);

  await new Promise((resolve) => {
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

    const proxy = https.request(options, (upstream) => {
      res.status(upstream.statusCode);
      res.setHeader('Content-Type', 'application/json');
      upstream.pipe(res);
      upstream.on('end', resolve);
    });

    proxy.on('error', (err) => {
      res.status(500).json({ error: { message: err.message } });
      resolve();
    });

    proxy.write(bodyBuf);
    proxy.end();
  });
};
