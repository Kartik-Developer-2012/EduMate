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
    const fetchHeaders = {
      'User-Agent': req.headers?.get('user-agent') || 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
      'Accept': 'application/pdf, text/html, */*'
    };

    if (targetUrl.includes('cloudfront') || targetUrl.includes('studybeepro') || targetUrl.includes('nexttoppers')) {
      fetchHeaders['Referer'] = 'https://nt.studybeepro.site/';
      fetchHeaders['Origin'] = 'https://nt.studybeepro.site';
    }

    const upstreamRes = await fetch(targetUrl, {
      method: req.method === 'HEAD' ? 'HEAD' : 'GET',
      headers: fetchHeaders
    });

    if (req.method === 'HEAD') {
      const headHeaders = new Headers(CORS_HEADERS);
      headHeaders.set('Content-Type', 'application/pdf');
      headHeaders.set('Accept-Ranges', 'bytes');
      return new Response(null, { status: upstreamRes.status, headers: headHeaders });
    }

    if (!upstreamRes.ok) {
      console.warn(`[stream-pdf] Upstream returned HTTP ${upstreamRes.status} for ${targetUrl}`);
      return new Response(`Failed to fetch upstream PDF: HTTP ${upstreamRes.status}`, {
        status: upstreamRes.status,
        headers: { ...CORS_HEADERS, 'Content-Type': 'text/plain' }
      });
    }

    const arrayBuffer = await upstreamRes.arrayBuffer();

    const responseHeaders = new Headers();
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', '*');
    responseHeaders.set('Content-Type', 'application/pdf');
    responseHeaders.set('Content-Length', String(arrayBuffer.byteLength));
    responseHeaders.set('Accept-Ranges', 'bytes');
    responseHeaders.set('Cache-Control', 'public, max-age=86400');

    if (isDownload) {
      responseHeaders.set('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    } else {
      responseHeaders.set('Content-Disposition', 'inline');
    }

    return new Response(arrayBuffer, {
      status: 200,
      headers: responseHeaders
    });
  } catch (err) {
    console.error('[stream-pdf] Proxy error:', err);
    return new Response('Failed to proxy PDF document: ' + err.message, {
      status: 502,
      headers: { ...CORS_HEADERS, 'Content-Type': 'text/plain' }
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
    const fetchHeaders = {
      'User-Agent': event.headers?.['user-agent'] || 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      'Accept': 'application/pdf, text/html, */*'
    };

    if (targetUrl.includes('cloudfront') || targetUrl.includes('studybeepro') || targetUrl.includes('nexttoppers')) {
      fetchHeaders['Referer'] = 'https://nt.studybeepro.site/';
      fetchHeaders['Origin'] = 'https://nt.studybeepro.site';
    }

    const upstreamRes = await fetch(targetUrl, {
      method: event.httpMethod === 'HEAD' ? 'HEAD' : 'GET',
      headers: fetchHeaders
    });

    if (!upstreamRes.ok) {
      return {
        statusCode: upstreamRes.status,
        headers: { ...CORS_HEADERS, 'Content-Type': 'text/plain' },
        body: `Failed to fetch upstream PDF: HTTP ${upstreamRes.status}`
      };
    }

    const arrayBuffer = await upstreamRes.arrayBuffer();
    return {
      statusCode: 200,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/pdf',
        'Content-Length': String(arrayBuffer.byteLength),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=86400',
        'Content-Disposition': isDownload ? `attachment; filename="${encodeURIComponent(filename)}"` : 'inline'
      },
      isBase64Encoded: true,
      body: Buffer.from(arrayBuffer).toString('base64')
    };
  } catch (err) {
    return { statusCode: 502, headers: CORS_HEADERS, body: 'Failed to proxy PDF document: ' + err.message };
  }
}
