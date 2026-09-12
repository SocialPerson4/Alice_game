const assert = require('node:assert/strict');
const test = require('node:test');
const { app } = require('../src/server');

test('health endpoint returns service status', async () => {
    const server = app.listen(0);

    try {
        const { port } = server.address();
        const response = await fetch(`http://127.0.0.1:${port}/api/health`);
        const body = await response.json();

        assert.equal(response.status, 200);
        assert.deepEqual(body, { success: true, service: 'alice-game-api' });
    } finally {
        await new Promise((resolve, reject) => {
            server.close((error) => error ? reject(error) : resolve());
        });
    }
});

test('home page is served from public directory', async () => {
    const server = app.listen(0);

    try {
        const { port } = server.address();
        const response = await fetch(`http://127.0.0.1:${port}/`);
        const html = await response.text();

        assert.equal(response.status, 200);
        assert.match(html, /奇域|爱丽丝|Alice/i);
    } finally {
        await new Promise((resolve, reject) => {
            server.close((error) => error ? reject(error) : resolve());
        });
    }
});

test('protected API rejects a request without JWT before database access', async () => {
    const server = app.listen(0);

    try {
        const { port } = server.address();
        const response = await fetch(`http://127.0.0.1:${port}/api/items`);
        const body = await response.json();

        assert.equal(response.status, 401);
        assert.equal(body.success, false);
    } finally {
        await new Promise((resolve, reject) => {
            server.close((error) => error ? reject(error) : resolve());
        });
    }
});

test('same-origin default does not reflect arbitrary CORS origins', async () => {
    const server = app.listen(0);

    try {
        const { port } = server.address();
        const response = await fetch(`http://127.0.0.1:${port}/api/health`, {
            headers: { Origin: 'https://untrusted.example' }
        });

        assert.equal(response.status, 200);
        assert.equal(response.headers.get('access-control-allow-origin'), null);
    } finally {
        await new Promise((resolve, reject) => {
            server.close((error) => error ? reject(error) : resolve());
        });
    }
});
