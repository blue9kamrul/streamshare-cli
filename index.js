#!/usr/bin/env node

/**
 * Streamshare ULTIMATE (v3.3.1)
 */

const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const net = require('net');
const { exec } = require('child_process');

const mimeTypes = {
    '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
    '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpg',
    '.gif': 'image/gif', '.svg': 'image/svg+xml', '.wav': 'audio/wav',
    '.mp4': 'video/mp4', '.mkv': 'video/webm', '.webm': 'video/webm',
    '.pdf': 'application/pdf', '.zip': 'application/zip', '.txt': 'text/plain'
};

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

function resolvePath(inputPath) {
    if (fs.existsSync(inputPath)) return inputPath;
    const dir = path.dirname(inputPath);
    const name = path.basename(inputPath);
    try {
        const files = fs.readdirSync(dir || '.');
        const match = files.find(f => path.parse(f).name === name);
        if (match) return path.join(dir || '.', match);
    } catch (e) { return null; }
    return null;
}

(async () => {
    const command = process.argv[2];
    const rawFiles = process.argv.slice(3);

    if (command !== 'start') {
        console.log('Usage: streamshare start [file1] [file2] ...');
        process.exit(1);
    }

    const files = [];
    rawFiles.forEach(raw => {
        const resolved = resolvePath(raw);
        if (resolved) files.push(resolved);
        else console.error(`⚠️  Warning: Could not find file "${raw}"`);
    });

    if (files.length === 0 && rawFiles.length > 0) {
        console.error('❌ Error: No valid files found to share.');
        process.exit(1);
    }

    const port = await findAvailablePort(3000);
    const ip = getLocalIp();
    const networkUrl = `http://${ip}:${port}`;

    const server = http.createServer((req, res) => {

        // 1. HANDLE UPLOADS
        if (req.method === 'POST' && req.url.startsWith('/upload')) {
            const queryName = req.url.split('?name=')[1];
            const filename = decodeURIComponent(queryName || 'upload_' + Date.now());
            console.log(`\n📥 Receiving file: ${filename}...`);
            const writeStream = fs.createWriteStream(path.join(process.cwd(), filename));
            req.pipe(writeStream);
            req.on('end', () => {
                console.log(`✅ Saved: ${filename}`);
                res.writeHead(200, { 'Content-Type': 'text/plain' });
                res.end('Success');
            });
            return;
        }

        // 2. LANDING PAGE
        if (req.url === '/') {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });

            const fileListHTML = files.length > 0 ? files.map(file => {
                const name = path.basename(file);
                const size = (fs.statSync(file).size / (1024 * 1024)).toFixed(2);
                const isVideo = ['.mp4', '.webm', '.mkv'].includes(path.extname(file).toLowerCase());

                let actionBtns = '';
                if (isVideo) {
                    actionBtns = `
                        <div class="btn-group">
                            <a href="/${encodeURIComponent(name)}" class="btn btn-watch">▶ Watch</a>
                            <a href="/${encodeURIComponent(name)}?download=true" class="btn btn-download">⬇ Save</a>
                        </div>`;
                } else {
                    actionBtns = `<a href="/${encodeURIComponent(name)}" class="btn btn-download">Download</a>`;
                }

                return `
                    <li class="file-item">
                        <div class="file-info">
                            <span class="file-icon">${isVideo ? '🎬' : '📄'}</span>
                            <div>
                                <div class="file-name" title="${name}">${name}</div>
                                <span class="file-size">${size} MB</span>
                            </div>
                        </div>
                        ${actionBtns}
                    </li>`;
            }).join('') : '<li class="empty-state">No files shared locally.<br>Drop files below to send to host.</li>';

            const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${networkUrl}`;

            res.end(`
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <title>StreamShare</title>
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <style>
                        :root { --primary: #3b82f6; --watch: #ef4444; --bg: #f1f5f9; --surface: #ffffff; --text: #1e293b; --border: #e2e8f0; }
                        body { font-family: system-ui, -apple-system, sans-serif; background: var(--bg); color: var(--text); padding: 20px; display: flex; justify-content: center; margin: 0; }
                        .container { background: var(--surface); width: 100%; max-width: 500px; padding: 2rem; border-radius: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.1); text-align: center; }
                        h1 { margin: 0 0 0.5rem; }
                        .qr-box { border: 3px solid var(--border); padding: 10px; border-radius: 12px; display: inline-block; margin-bottom: 2rem; }
                        .qr-box img { display: block; border-radius: 6px; }
                        .file-list { list-style: none; padding: 0; text-align: left; }
                        .file-item { display: flex; justify-content: space-between; align-items: center; padding: 1rem 0; border-bottom: 1px solid var(--border); }
                        .file-info { display: flex; align-items: center; overflow: hidden; margin-right: 1rem; }
                        .file-icon { font-size: 1.5rem; margin-right: 0.8rem; }
                        .file-name { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                        .file-size { font-size: 0.8rem; color: #64748b; }
                        .btn-group { display: flex; gap: 8px; }
                        .btn { padding: 0.5rem 1rem; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 0.85rem; transition: 0.2s; white-space: nowrap; }
                        .btn-download { background: var(--primary); color: white; }
                        .btn-watch { background: var(--watch); color: white; }
                        .btn:hover { opacity: 0.9; transform: translateY(-1px); }
                        .drop-zone { border: 2px dashed var(--border); border-radius: 12px; padding: 2rem; margin-top: 1.5rem; background: #f8fafc; cursor: pointer; }
                        .drop-icon { font-size: 2rem; display: block; margin-bottom: 0.5rem; }
                        #fileInput { display: none; }
                        .upload-status { margin-top: 10px; font-weight: bold; color: var(--primary); }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>🚀 StreamShare</h1>
                        <p style="color: #64748b;">Scan to connect</p>
                        <div class="qr-box"><img src="${qrCodeUrl}" alt="QR"></div>
                        <h3 style="text-align:left; color:#64748b; font-size:0.9rem; text-transform:uppercase;">Files</h3>
                        <ul class="file-list">${fileListHTML}</ul>
                        <h3 style="text-align:left; color:#64748b; font-size:0.9rem; text-transform:uppercase; margin-top:2rem;">Upload</h3>
                        <div class="drop-zone" id="dropZone" onclick="document.getElementById('fileInput').click()">
                            <span class="drop-icon">☁️</span>
                            <span>Tap or Drop files to send</span>
                            <input type="file" id="fileInput" multiple>
                        </div>
                        <div id="status" class="upload-status"></div>
                    </div>
                    <script>
                        const dropZone = document.getElementById('dropZone');
                        const fileInput = document.getElementById('fileInput');
                        const status = document.getElementById('status');
                        dropZone.addEventListener('dragover', (e) => { e.preventDefault(); });
                        dropZone.addEventListener('drop', (e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); });
                        fileInput.addEventListener('change', (e) => handleFiles(e.target.files));
                        async function handleFiles(files) {
                            for (let file of files) {
                                status.innerText = 'Uploading ' + file.name + '...';
                                await fetch('/upload?name=' + encodeURIComponent(file.name), { method: 'POST', body: file });
                                status.innerText = '✅ ' + file.name + ' Sent!';
                            }
                            setTimeout(() => { status.innerText = ''; location.reload(); }, 2000);
                        }
                    </script>
                </body>
                </html>
            `);
            return;
        }

        // 3. FILE DOWNLOAD & STREAMING
        const requestedName = decodeURIComponent(req.url.slice(1).split('?')[0]);
        const targetFile = files.find(f => path.basename(f) === requestedName);
        const isDownload = req.url.includes('download=true');

        if (targetFile) {
            const stat = fs.statSync(targetFile);
            const ext = path.extname(targetFile).toLowerCase();
            const contentType = mimeTypes[ext] || 'application/octet-stream';
            const isVideo = contentType.startsWith('video/');

            // A. Video Streaming
            if (isVideo && !req.url.includes('raw=true') && !isDownload) {
                res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end(`<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Watching: ${requestedName}</title><style>body{background:#000;display:flex;flex-direction:column;justify-content:center;align-items:center;min-height:100vh;margin:0;font-family:system-ui;color:white}video{width:100%;max-width:900px;box-shadow:0 20px 50px rgba(0,0,0,0.5);border-radius:12px}.back{margin-top:2rem;color:rgba(255,255,255,0.7);text-decoration:none;border:1px solid rgba(255,255,255,0.3);padding:0.8rem 1.5rem;border-radius:30px}.back:hover{background:white;color:black}</style></head><body><video controls autoplay playsinline><source src="/${encodeURIComponent(requestedName)}?raw=true" type="${contentType}"></video><a href="/" class="back">⬅ Back to Files</a></body></html>`);
                return;
            }

            // B. Range Requests (Seeking - No progress bar spam)
            const range = req.headers.range;
            if (range && !isDownload) {
                const parts = range.replace(/bytes=/, "").split("-");
                const start = parseInt(parts[0], 10);
                const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
                const chunksize = (end - start) + 1;
                const file = fs.createReadStream(targetFile, { start, end });
                res.writeHead(206, {
                    'Content-Range': `bytes ${start}-${end}/${stat.size}`,
                    'Accept-Ranges': 'bytes',
                    'Content-Length': chunksize,
                    'Content-Type': contentType
                });
                file.pipe(res);
            } else {
                // C. STANDARD DOWNLOAD (Force Download + Progress Bar)
                res.writeHead(200, {
                    'Content-Length': stat.size,
                    'Content-Type': contentType,
                    'Content-Disposition': `attachment; filename="${requestedName}"`
                });

                const readStream = fs.createReadStream(targetFile);
                let downloaded = 0;

                // --- PROGRESS BAR LOGIC ---
                readStream.on('data', (chunk) => {
                    downloaded += chunk.length;
                    const percentage = ((downloaded / stat.size) * 100).toFixed(2);
                    // Use \r to overwrite the line
                    process.stdout.write(`\r📤 Sending ${requestedName}: ${percentage}%`);
                });

                readStream.on('end', () => {
                    process.stdout.write('\n'); // Clear line for next log
                    console.log(`✅ Sent ${requestedName} successfully!`);
                });

                readStream.pipe(res);
            }
        } else {
            res.writeHead(404);
            res.end('Not Found');
        }
    });

    server.listen(port, () => {
        console.clear();
        console.log(`\n🚀 StreamShare Ultimate (v3.3.1)`);
        console.log(`---------------------------------------------`);
        console.log(`📂 Shared:  ${files.length > 0 ? files.map(f => path.basename(f)).join(', ') : 'None (Receive Mode)'}`);
        console.log(`👇 Local:   http://localhost:${port}`);
        console.log(`📡 Network: ${networkUrl}`);
        console.log(`---------------------------------------------`);
        openBrowser(`http://localhost:${port}`);
    });

})();