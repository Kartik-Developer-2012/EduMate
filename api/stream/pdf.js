export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const { url: targetUrl, download, name } = req.query || {};

  if (!targetUrl) {
    return res.status(400).send('Missing "url" query parameter');
  }

  try {
    const upstreamRes = await fetch(targetUrl, {
      method: req.method === 'HEAD' ? 'HEAD' : 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        'Accept': 'application/pdf, */*',
      },
    });

    res.status(upstreamRes.status);
    res.setHeader('Content-Type', 'application/pdf');

    if (download === 'true') {
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(name || 'document.pdf')}"`);
    } else {
      res.setHeader('Content-Disposition', 'inline');
    }

    res.removeHeader('X-Frame-Options');
    res.removeHeader('Content-Security-Policy');

    const contentLength = upstreamRes.headers.get('content-length');
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }

    if (req.method === 'HEAD' || !upstreamRes.body) {
      return res.end();
    }

    const arrayBuffer = await upstreamRes.arrayBuffer();
    return res.send(Buffer.from(arrayBuffer));
  } catch (err) {
    console.error('PDF stream proxy error:', err);
    return res.status(502).send('Failed to proxy PDF document');
  }
}
