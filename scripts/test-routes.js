// Simple route tests for extensionless pages and .html redirects
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

async function run() {
  const base = 'http://localhost:3000';

  try {
    let r = await fetch(base + '/about-us', { method: 'HEAD' });
    console.log('/about-us ->', r.status);

    r = await fetch(base + '/about-us.html', { method: 'HEAD', redirect: 'manual' });
    console.log('/about-us.html ->', r.status, 'Location:', r.headers.get('location'));

    r = await fetch(base + '/non-existent.html', { method: 'HEAD', redirect: 'manual' });
    console.log('/non-existent.html ->', r.status);
  } catch (err) {
    console.error('Test error:', err.message || err);
    process.exit(2);
  }
}

run();
