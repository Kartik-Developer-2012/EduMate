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
  const isDownload = url.searchParams.get('download') === 'true';
  const filename = url.searchParams.get('name') || 'document.pdf';

  if (!targetUrl) {
    return new Response('Missing "url" query parameter', {
      status: 400,
      headers: CORS_HEADERS
    });
  }

  try {
    const upstreamRes = await fetch(targetUrl, {
      method: req.method === 'HEAD' ? 'HEAD' : 'GET',
      headers: {
        'User-Agent': req.headers?.get('user-agent') || 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        'Accept': 'application/pdf, */*'
      }
    });

    const responseHeaders = new Headers(upstreamRes.headers);
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Content-Type', 'application/pdf');
    responseHeaders.delete('X-Frame-Options');
    responseHeaders.delete('Content-Security-Policy');

    if (isDownload) {
      responseHeaders.set('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    } else {
      responseHeaders.set('Content-Disposition', 'inline');
    }

    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      headers: responseHeaders
    });
  } catch (err) {
    return new Response('Failed to proxy PDF document', {
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
  const isDownload = event.queryStringParameters?.download === 'true';
  const filename = event.queryStringParameters?.name || 'document.pdf';

  if (!targetUrl) {
    return { statusCode: 400, headers: CORS_HEADERS, body: 'Missing "url" query parameter' };
  }

  try {
    const upstreamRes = await fetch(targetUrl, {
      method: event.httpMethod === 'HEAD' ? 'HEAD' : 'GET',
      headers: {
        'User-Agent': event.headers?.['user-agent'] || 'Mozilla/5.0',
        'Accept': 'application/pdf, */*'
      }
    });

    const arrayBuffer = await upstreamRes.arrayBuffer();
    return {
      statusCode: upstreamRes.status,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/pdf',
        'Content-Disposition': isDownload ? `attachment; filename="${encodeURIComponent(filename)}"` : 'inline'
      },
      isBase64Encoded: true,
      body: Buffer.from(arrayBuffer).toString('base64')
    };
  } catch (err) {
    return { statusCode: 502, headers: CORS_HEADERS, body: 'Failed to proxy PDF document' };
  }
}
