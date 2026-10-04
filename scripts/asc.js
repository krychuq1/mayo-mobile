// tiny App Store Connect API client: node asc.js METHOD PATH [jsonBody]
const crypto = require('crypto'), fs = require('fs');
const eas = JSON.parse(fs.readFileSync('/Users/krystian/mayo-mobile/eas.json', 'utf8')).submit.production.ios;
const key = fs.readFileSync(require('path').resolve('/Users/krystian/mayo-mobile', eas.ascApiKeyPath));
function token() {
  const b = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const head = b({ alg: 'ES256', kid: eas.ascApiKeyId, typ: 'JWT' });
  const body = b({ iss: eas.ascApiKeyIssuerId, iat: now, exp: now + 900, aud: 'appstoreconnect-v1' });
  const sig = crypto.sign('sha256', Buffer.from(head + '.' + body), { key, dsaEncoding: 'ieee-p1363' }).toString('base64url');
  return `${head}.${body}.${sig}`;
}
async function asc(method, path, body) {
  const r = await fetch('https://api.appstoreconnect.apple.com' + path, {
    method, headers: { Authorization: 'Bearer ' + token(), 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined });
  const t = await r.text();
  let j; try { j = t ? JSON.parse(t) : {}; } catch { j = { raw: t }; }
  if (!r.ok) throw new Error(`${method} ${path} -> ${r.status} ${JSON.stringify(j.errors || j).slice(0, 6000)}`);
  return j;
}
module.exports = { asc };
if (require.main === module) {
  const [m, p, b] = process.argv.slice(2);
  asc(m, p, b && JSON.parse(b)).then((j) => console.log(JSON.stringify(j, null, 1))).catch((e) => { console.error(e.message); process.exit(1); });
}
