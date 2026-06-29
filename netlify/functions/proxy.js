exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, x-api-key, anthropic-version, anthropic-beta',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    };
  }

  const apiKey = event.headers['x-api-key'];
  if (!apiKey) return { statusCode: 400, body: JSON.stringify({ error: 'Missing x-api-key' }) };

  const forwardHeaders = {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': event.headers['anthropic-version'] || '2023-06-01',
  };
  if (event.headers['anthropic-beta']) {
    forwardHeaders['anthropic-beta'] = event.headers['anthropic-beta'];
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: forwardHeaders,
    body: event.body,
  });

  const data = await response.text();
  return {
    statusCode: response.status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: data,
  };
};
