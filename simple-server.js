import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Test API endpoint
app.get('/api/prices', (req, res) => {
    console.log('API prices called');
    res.json([
        { name: 'BigGeek', price: 149990, url: 'https://biggeek.ru' },
        { name: 'Wildberries', price: 151990, url: 'https://wildberries.ru' },
        { name: 'Test Store', price: 150000, url: 'https://example.com' }
    ]);
});

app.post('/api/check-now', (req, res) => {
    console.log('Check now called');
    res.json({ message: 'Price check completed' });
});

app.get('/api/history/:id', (req, res) => {
    res.json([
        { price: 149990, timestamp: new Date().toISOString() },
        { price: 148990, timestamp: new Date(Date.now() - 86400000).toISOString() }
    ]);
});

// Serve frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Make sure you access the site at: http://localhost:3000');
});