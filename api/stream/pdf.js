const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': '*'
};

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
    const fetchHeaders = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
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
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Accept-Ranges', 'bytes');
      return res.status(upstreamRes.status).end();
    }

    if (!upstreamRes.ok) {
      return res.status(upstreamRes.status).send(`Failed to fetch upstream PDF: HTTP ${upstreamRes.status}`);
    }

    const arrayBuffer = await upstreamRes.arrayBuffer();

    res.status(200);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', String(arrayBuffer.byteLength));
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=86400');

    if (download === 'true') {
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(name || 'document.pdf')}"`);
    } else {
      res.setHeader('Content-Disposition', 'inline');
    }

    res.removeHeader('X-Frame-Options');
    res.removeHeader('Content-Security-Policy');

    return res.send(Buffer.from(arrayBuffer));
  } catch (err) {
    console.error('PDF stream proxy error:', err);
    return res.status(502).send('Failed to proxy PDF document: ' + err.message);
  }
}
