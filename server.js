const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// In-memory storage for communities
// Map<onionAddress, { name, description, lastSeen }>
const communities = new Map();

const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes timeout

// Helper to remove stale communities
const cleanStale = () => {
    const now = Date.now();
    for (const [address, data] of communities.entries()) {
        if (now - data.lastSeen > TIMEOUT_MS) {
            communities.delete(address);
            console.log(`Removed stale community: ${address}`);
        }
    }
};

// Periodic cleanup every minute
setInterval(cleanStale, 60 * 1000);

// --- Routes ---

// Health check
app.get('/', (req, res) => {
    res.send('Tor Chat Discovery Server is running.');
});

// Register or Update a community
app.post('/communities', (req, res) => {
    const { name, description, onionAddress } = req.body;

    if (!onionAddress || !onionAddress.endsWith('.onion')) {
        return res.status(400).json({ error: 'Invalid onion address' });
    }

    if (!name) {
        return res.status(400).json({ error: 'Name is required' });
    }

    communities.set(onionAddress, {
        name,
        description: description || '',
        onionAddress,
        lastSeen: Date.now()
    });

    console.log(`Registered/Updated community: ${name} (${onionAddress})`);
    res.json({ status: 'registered', count: communities.size });
});

// List active communities
app.get('/communities', (req, res) => {
    // Return array of community objects
    const list = Array.from(communities.values()).map(c => ({
        name: c.name,
        description: c.description,
        onionAddress: c.onionAddress,
        lastSeen: c.lastSeen
    }));
    res.json(list);
});

// Heartbeat
app.post('/communities/heartbeat', (req, res) => {
    const { onionAddress } = req.body;
    
    if (communities.has(onionAddress)) {
        const data = communities.get(onionAddress);
        data.lastSeen = Date.now();
        communities.set(onionAddress, data);
        res.json({ status: 'ok' });
    } else {
        res.status(404).json({ error: 'Community not found. Please register again.' });
    }
});

app.listen(PORT, () => {
    console.log(`Discovery Server running on port ${PORT}`);
});
