// index.js
require('dotenv').config();
const fs = require('fs');
const http = require('http');

// Retrieve the link from your environment variables
const embeddedLink = process.env.EMBEDDED_LINK;

// Read the HTML file
const htmlFilePath = 'index.html';
let htmlContent = fs.readFileSync(htmlFilePath, 'utf8');

// Create a simple HTTP server
const server = http.createServer((req, res) => {
    if (req.method === 'POST') {
        let data = '';

        // Collect data from the request
        req.on('data', chunk => {
            data += chunk;
        });

        // When data collection is complete
        req.on('end', () => {
            // Save the data to a file
            fs.appendFile('data.txt', data + '\n', err => {
                if (err) {
                    console.error('Error saving data:', err);
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('Error saving data');
                } else {
                    res.writeHead(200, { 'Content-Type': 'text/plain' });
                    res.end('Data saved successfully');
                }
            });
        });
    } else {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        // Determine client's IP address
        const xff = req.headers['x-forwarded-for'];
        let clientIp = null;
        if (xff && typeof xff === 'string') {
            clientIp = xff.split(',')[0].trim();
        } else if (req.socket && req.socket.remoteAddress) {
            clientIp = req.socket.remoteAddress;
        }

        // Normalize IPv6-mapped IPv4 addresses like ::ffff:192.168.1.5
        function extractIPv4(addr){
            if(!addr) return null;
            // remove surrounding brackets for IPv6
            addr = addr.replace(/^[\[|\]]+|[\[|\]]+$/g, '');
            const m = addr.match(/(?:^::ffff:)?(\d+\.\d+\.\d+\.\d+)$/);
            if(m) return m[1];
            // also handle plain IPv4
            if(/^\d+\.\d+\.\d+\.\d+$/.test(addr)) return addr;
            return null;
        }

        function isPrivateIPv4(ip){
            if(!ip) return false;
            const parts = ip.split('.').map(n=>parseInt(n,10));
            if(parts.length !== 4 || parts.some(isNaN)) return false;
            const [a,b] = parts;
            if(a === 10) return true;
            if(a === 172 && b >= 16 && b <= 31) return true;
            if(a === 192 && b === 168) return true;
            if(a === 127) return true; // loopback
            return false;
        }

        const clientIpv4 = extractIPv4(clientIp);
        // Prefer a private client IP if available; otherwise fall back to EMBEDDED_LINK or loopback
        let link;
        if(clientIpv4 && isPrivateIPv4(clientIpv4)){
            link = 'http://' + clientIpv4 + '/';
        } else if (embeddedLink) {
            link = embeddedLink;
        } else {
            link = 'http://127.0.0.1/';
        }

        // Replace the explicit placeholder token in the HTML
        const served = htmlContent.replace('__EMBEDDED_LINK__', link);
        res.end(served);
    }
});

// Start the server on port 3000
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
