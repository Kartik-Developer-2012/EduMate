const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': '*'
};

// Netlify Functions v2
export default async (req, context) => {
  if (req && !req.headers?.get && (req.httpMethod || req.rawUrl)) {
    return handler(req, context);
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const url = new URL(req.url);
  const targetUrl = url.searchParams.get('url');

  if (!targetUrl) {
    return new Response('Missing "url" query parameter', {
      status: 400,
      headers: CORS_HEADERS
    });
  }

  try {
    const fetchHeaders = {
      'User-Agent': req.headers?.get('user-agent') || 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      'Accept': '*/*'
    };

    const range = req.headers?.get('range');
    if (range) {
      fetchHeaders['Range'] = range;
    }

    const upstreamRes = await fetch(targetUrl, {
      method: req.method === 'HEAD' ? 'HEAD' : 'GET',
      headers: fetchHeaders
    });

    const responseHeaders = new Headers(upstreamRes.headers);
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Content-Type', 'video/mp4');
    responseHeaders.set('Content-Disposition', 'inline');
    responseHeaders.set('Accept-Ranges', 'bytes');

    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      headers: responseHeaders
    });
  } catch (err) {
    return new Response('Failed to proxy video stream', {
      status: 502,
      headers: CORS_HEADERS
    });
  }
};

// Netlify Functions v1
export async function handler(event, context) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  const targetUrl = event.queryStringParameters?.url;
  if (!targetUrl) {
    return { statusCode: 400, headers: CORS_HEADERS, body: 'Missing "url" query parameter' };
  }

  try {
    const fetchHeaders = {
      'User-Agent': event.headers?.['user-agent'] || 'Mozilla/5.0',
      'Accept': '*/*'
    };
    if (event.headers?.range) {
      fetchHeaders['Range'] = event.headers.range;
    }

    const upstreamRes = await fetch(targetUrl, {
      method: event.httpMethod === 'HEAD' ? 'HEAD' : 'GET',
      headers: fetchHeaders
    });

    const arrayBuffer = await upstreamRes.arrayBuffer();
    return {
      statusCode: upstreamRes.status,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'video/mp4',
        'Content-Disposition': 'inline',
        'Accept-Ranges': 'bytes'
      },
      isBase64Encoded: true,
      body: Buffer.from(arrayBuffer).toString('base64')
    };
  } catch (err) {
    return { statusCode: 502, headers: CORS_HEADERS, body: 'Failed to proxy video stream' };
  }
}
