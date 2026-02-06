#!/usr/bin/env node

/*
 * STREAMSHARE - A Raw Node.js CLI Tool
 * No libraries. Just pure Node.js.
 */

const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const { exec } = require('child_process');

// 1. Configuration: MIME Types
const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.wav': 'audio/wav',
    '.mp4': 'video/mp4',
    '.woff': 'application/font-woff',
    '.ttf': 'application/font-ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.otf': 'application/font-otf',
    '.wasm': 'application/wasm'
};

// 2. Helper: Get Local IP Address
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

// 3. Helper: Auto-open Browser
function openBrowser(url) {
    const startCommand = process.platform == 'darwin' ? 'open' :
        process.platform == 'win32' ? 'start' : 'xdg-open';
    exec(`${startCommand} ${url}`);
}

// 4. Main Logic
const command = process.argv[2];
const filePath = process.argv[3];

if (command === 'start') {
    // Validation
    if (!filePath) {
        console.error('Error: Please provide a file path.');
        console.error('Usage: streamshare start <file>');
        process.exit(1);
    }
    if (!fs.existsSync(filePath)) {
        console.error(`Error: The file "${filePath}" does not exist.`);
        process.exit(1);
    }

    // Prepare File Stats
    const stat = fs.statSync(filePath);
    const filename = path.basename(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    // Create Server
    // Create Server
    const server = http.createServer((req, res) => {

        // ROUTE 1: The Landing Page (Show HTML button)
        if (req.url === '/') {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>StreamShare</title>
                    <style>
                        body { font-family: sans-serif; text-align: center; padding: 50px; background: #f4f4f4; }
                        .card { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); display: inline-block; }
                        h1 { color: #333; }
                        p { color: #666; margin-bottom: 20px; }
                        .btn { background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; }
                        .btn:hover { background: #0056b3; }
                    </style>
                </head>
                <body>
                    <div class="card">
                        <h1>📂 File Shared!</h1>
                        <p>The file <strong>${filename}</strong> is ready for download.</p>
                        <p>Size: ${(stat.size / (1024 * 1024)).toFixed(2)} MB</p>
                        <a href="/download" class="btn">Download Now</a>
                    </div>
                </body>
                </html>
            `);
            return; // Stop here so we don't send the file yet
        }

        // ROUTE 2: The Download Link (Actually stream the file)
        if (req.url === '/download') {
            res.writeHead(200, {
                'Content-Type': contentType,
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Content-Length': stat.size
            });

            const readStream = fs.createReadStream(filePath);
            let downloaded = 0;

            readStream.on('data', (chunk) => {
                downloaded += chunk.length;
                const percentage = ((downloaded / stat.size) * 100).toFixed(2);
                process.stdout.write(`Progress: ${percentage}%\r`);
            });

            readStream.pipe(res);

            readStream.on('end', () => {
                console.log('\nDownload Complete!');
                console.log(`[${new Date().toLocaleTimeString()}] Served to ${req.socket.remoteAddress}`);
            });
            return;
        }
    });
    // Start Server
    server.listen(3000, () => {
        const ip = getLocalIp();
        const url = `http://${ip}:3000`;

        console.clear();
        console.log(`\n🚀 StreamShare is live!`);
        console.log(`-----------------------------------`);
        console.log(`📂 Sharing: ${filename}`);
        console.log(`👇 Local:   http://localhost:3000`);
        console.log(`📡 Network: ${url}`);
        console.log(`-----------------------------------`);

        openBrowser(`http://localhost:3000`);
    });

} else {
    console.log('Welcome to StreamShare!');
    console.log('Usage: streamshare start <file>');
}