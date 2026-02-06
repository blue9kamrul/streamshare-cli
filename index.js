#!/usr/bin/env node

/**
 * STREAMSHARE v2.0
 * Features: Auto-Port, QR Code, Multi-File, Raw Node.js
 */

const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const net = require('net'); // New: For port checking
const { exec } = require('child_process');

// Configuration
const mimeTypes = {
    '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
    '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpg',
    '.gif': 'image/gif', '.svg': 'image/svg+xml', '.wav': 'audio/wav',
    '.mp4': 'video/mp4', '.pdf': 'application/pdf', '.zip': 'application/zip',
    '.txt': 'text/plain'
};

// --- Helpers ---

function getLocalIp() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if ((iface.family === 'IPv4' || iface.family === 4) && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

function openBrowser(url) {
    const startCommand = process.platform == 'darwin' ? 'open' :
        process.platform == 'win32' ? 'start' : 'xdg-open';
    exec(`${startCommand} ${url}`);
}

// Recursively find a free port starting from 3000
function findAvailablePort(startPort) {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.listen(startPort, () => {
            const { port } = server.address();
            server.close(() => resolve(port));
        });
        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') resolve(findAvailablePort(startPort + 1));
            else reject(err);
        });
    });
}

// --- Main App Logic ---

(async () => {
    const command = process.argv[2];
    const files = process.argv.slice(3);

    if (command !== 'start' || files.length === 0) {
        console.log('Usage: streamshare start <file1> <file2> ...');
        process.exit(1);
    }

    // Validate files
    files.forEach(file => {
        if (!fs.existsSync(file)) {
            console.error(`Error: File not found: "${file}"`);
            process.exit(1);
        }
    });

    const port = await findAvailablePort(3000); // Dynamic Port
    const ip = getLocalIp();
    const networkUrl = `http://${ip}:${port}`;

    const server = http.createServer((req, res) => {

        // 1. LANDING PAGE (UI)
        if (req.url === '/') {
            res.writeHead(200, { 'Content-Type': 'text/html' });

            const fileListHTML = files.map(file => {
                const name = path.basename(file);
                const size = (fs.statSync(file).size / (1024 * 1024)).toFixed(2);
                return `
                    <li class="file-item">
                        <div class="file-info">
                            <span class="file-icon"></span>
                            <div>
                                <strong>${name}</strong>
                                <span class="file-size">${size} MB</span>
                            </div>
                        </div>
                        <a href="/${encodeURIComponent(name)}" class="btn-download">Download</a>
                    </li>
                `;
            }).join('');

            // QR Code API (Generates a QR pointing to the Network URL)
            const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${networkUrl}`;

            res.end(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>StreamShare</title>
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <style>
                        :root { --primary: #2563eb; --bg: #f8fafc; --surface: #ffffff; --text: #1e293b; }
                        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: var(--bg); color: var(--text); padding: 20px; margin: 0; display: flex; justify-content: center; }
                        .container { background: var(--surface); width: 100%; max-width: 480px; padding: 2rem; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); text-align: center; }
                        h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
                        .subtitle { color: #64748b; margin-bottom: 2rem; }
                        .qr-box { background: #fff; padding: 10px; border: 2px dashed #e2e8f0; display: inline-block; border-radius: 12px; margin-bottom: 2rem; }
                        .file-list { list-style: none; padding: 0; text-align: left; }
                        .file-item { display: flex; justify-content: space-between; align-items: center; padding: 1rem 0; border-bottom: 1px solid #e2e8f0; }
                        .file-item:last-child { border-bottom: none; }
                        .file-icon { font-size: 1.5rem; margin-right: 1rem; }
                        .file-info strong { display: block; font-size: 0.95rem; }
                        .file-size { font-size: 0.8rem; color: #64748b; }
                        .btn-download { background: var(--primary); color: white; padding: 0.5rem 1rem; border-radius: 8px; text-decoration: none; font-weight: 500; font-size: 0.9rem; transition: opacity 0.2s; }
                        .btn-download:hover { opacity: 0.9; }
                        .network-info { margin-top: 2rem; padding: 1rem; background: #eff6ff; border-radius: 8px; font-size: 0.9rem; color: #1e40af; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>StreamShare</h1>
                        <p class="subtitle">Scan to connect & download</p>
                        
                        <div class="qr-box">
                            <img src="${qrCodeUrl}" alt="Scan Me" />
                        </div>

                        <ul class="file-list">
                            ${fileListHTML}
                        </ul>

                        <div class="network-info">
                            Serving on <strong>${networkUrl}</strong>
                        </div>
                    </div>
                </body>
                </html>
            `);
            return;
        }

        // 2. DOWNLOAD HANDLER
        const requestedName = decodeURIComponent(req.url.slice(1));
        const targetFile = files.find(f => path.basename(f) === requestedName);

        if (targetFile) {
            const stat = fs.statSync(targetFile);
            const ext = path.extname(targetFile).toLowerCase();
            const contentType = mimeTypes[ext] || 'application/octet-stream';

            res.writeHead(200, {
                'Content-Type': contentType,
                'Content-Disposition': `attachment; filename="${requestedName}"`,
                'Content-Length': stat.size
            });

            const readStream = fs.createReadStream(targetFile);

            // Console Progress Bar
            let downloaded = 0;
            readStream.on('data', (chunk) => {
                downloaded += chunk.length;
                const percentage = ((downloaded / stat.size) * 100).toFixed(2);
                process.stdout.write(`\r[${requestedName}] Progress: ${percentage}%`);
            });

            readStream.pipe(res);

            readStream.on('end', () => {
                process.stdout.write('\n'); // New line
                console.log(`✅ Download complete: ${requestedName}`);
            });
        } else {
            res.writeHead(404);
            res.end('Not Found');
        }
    });

    server.listen(port, () => {
        console.clear();
        console.log(`\n🚀 StreamShare Live!`);
        console.log(`---------------------------------------------`);
        console.log(`📂 Shared Files: ${files.length}`);
        console.log(`👇 Local Interface: http://localhost:${port}`);
        console.log(`📡 Network URL:     ${networkUrl}`);
        console.log(`---------------------------------------------`);
        console.log(`(Opening browser for QR Code...)`);
        openBrowser(`http://localhost:${port}`);
    });

})();