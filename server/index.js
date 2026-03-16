// TEMPORARY DEBUG - ADD THIS AT THE VERY TOP
console.log('🔥 INDEX.JS STARTED');
console.log('__dirname:', __dirname);
console.log('Files in server:', require('fs').readdirSync(__dirname));

// Add this before your routes
app.use((req, res, next) => {
  console.log(`📨 Request: ${req.method} ${req.url}`);
  next();
});

// Add this error handler at the bottom
app.use((err, req, res, next) => {
  console.error('❌ ERROR:', err);
  res.status(500).json({ error: err.message, stack: err.stack });
});

// Main server entry point

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const apiRoutes = require('./routes.api');

const app = express();
const PORT = process.env.PORT || 3000;

// Handle favicon requests quickly
app.get('/favicon.ico', (req, res) => res.status(204).end());
app.get('/favicon.png', (req, res) => res.status(204).end());

// Middleware
app.use(cors()); // uses CORS for frontend
app.use(express.json()); // Parse JSON bodies
app.use(express.urlendcoded({extended: true })); // Parse URL-encoded bodies 


// Request logging middleware
app.use((req, res, next) => {
    console.log('${new Date().toISOString()} - ${req.method} ${req.path}');
    next();
});

// BEFORE API routes
app.get(['/', '/favicon.ico', '/favicon.png'], (req, res) => {
  res.status(404).json({ error: 'Not an API endpoint' });
});

// API Routes
app.use('/api', apiRoutes);

// Health check endpoint 
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: Date.now(), 
        uptime: process.uptime()
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false, 
        error: 'Endpoint not found'
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        success: false, 
        error: 'Internal server error'
    });
});

// Start server
if (require.main === module) {
app.listen(PORT, () => {
    console.log(' Black Jack Game Server running on port ${PORT}');
    console.log(' Server running on port ${PORT}')
    console.log(' Environment: ${process.env.NODE_ENV || 'development'}');
});

// Graqceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully...');
    process.exit(0);
});
}

module.exports = app; // Export for vercel
