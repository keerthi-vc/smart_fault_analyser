require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cron = require('node-cron');
const { authenticateToken, authorizeRole, JWT_SECRET } = require('./middleware/auth');
const { errorHandler, asyncHandler, notFoundHandler } = require('./middleware/errorHandler');
const { logger, requestLogger } = require('./utils/logger');
const networkAnalyzer = require('./utils/networkAnalyzer');
const anomalyDetector = require('./ml/anomalyDetector');
const rootCauseAnalyzer = require('./ml/rootCauseAnalyzer');
const WebSocketService = require('./services/websocketService');
const InsightGenerator = require('./services/insightGenerator');
const DatabaseQueries = require('./db/dbQueries');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());
app.use(requestLogger);

// PostgreSQL Connection Pool
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'smart_fault_analyser',
    password: process.env.DB_PASSWORD || 'postgres',
    port: process.env.DB_PORT || 5432,
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('❌ Database connection failed:', err.message);
        console.log('💡 Please ensure PostgreSQL is running and credentials are correct');
    } else {
        console.log('✅ Database connected successfully');
    }
});

// Initialize services
const wsService = new WebSocketService(io, pool);
const dbQueries = new DatabaseQueries(pool);
const insightGenerator = new InsightGenerator(pool);
console.log('🔌 WebSocket service initialized');
console.log('💡 Insight generator initialized');
console.log('🗄️  Database queries module initialized');

// Schedule periodic ML predictions (every 5 minutes)
cron.schedule('*/5 * * * *', async () => {
    console.log('🤖 Running scheduled ML predictions...');
    try {
        // Get recent metrics for prediction
        const result = await pool.query(`
            SELECT nm.*, c.user_id 
            FROM network_metrics nm
            JOIN complaints c ON nm.complaint_id = c.id
            WHERE nm.timestamp >= NOW() - INTERVAL '1 hour'
            ORDER BY nm.timestamp DESC
            LIMIT 50
        `);

        result.rows.forEach(metric => {
            anomalyDetector.addMetrics(metric);
        });

        // Run predictions for active users
        const prediction = anomalyDetector.predictFutureIssues('latency', 15);
        if (prediction.predicted) {
            console.log(`⚠️  Prediction: ${prediction.recommendation}`);
        }
    } catch (error) {
        console.error('Error in ML prediction:', error.message);
    }
});

// ==================== AUTHENTICATION ROUTES ====================

/**
 * POST /api/auth/register
 * Register a new user (either 'user' or 'isp' role)
 */
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, fullName, role, isp } = req.body;

        // Validation
        if (!email || !password || !fullName || !role) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        if (!['user', 'isp'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role. Must be "user" or "isp"' });
        }

        // Check if user already exists
        const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Insert user
        const result = await pool.query(
            'INSERT INTO users (email, password_hash, full_name, role, isp) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, full_name, role, isp, created_at',
            [email, passwordHash, fullName, role, isp || null]
        );

        const user = result.rows[0];

        // Generate JWT token
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, isp: user.isp },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        console.log(`✅ User registered successfully: ${email}`);

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: {
                id: user.id,
                email: user.email,
                fullName: user.full_name,
                role: user.role,
                isp: user.isp
            }
        });
    } catch (error) {
        console.error('❌ Registration error detail:', error.message);
        console.error('Stack trace:', error.stack);
        res.status(500).json({ error: `Registration failed: ${error.message}` });
    }
});

/**
 * POST /api/auth/login
 * Login with email and password
 */
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Find user
        console.log(`🔑 Login attempt for: ${email}`);
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

        if (result.rows.length === 0) {
            console.log(`❌ User not found: ${email}`);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = result.rows[0];
        console.log(`👤 User found: ${user.email}, role: ${user.role}`);


        // Verify password
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, isp: user.isp },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                email: user.email,
                fullName: user.full_name,
                role: user.role,
                isp: user.isp
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

/**
 * GET /api/auth/me
 * Get current user info (requires authentication)
 */
app.get('/api/auth/me', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, email, full_name, role, isp, created_at FROM users WHERE id = $1',
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = result.rows[0];
        res.json({
            id: user.id,
            email: user.email,
            fullName: user.full_name,
            role: user.role,
            isp: user.isp,
            createdAt: user.created_at
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to get user info' });
    }
});

// ==================== COMPLAINT ROUTES ====================

/**
 * POST /api/complaints
 * Create a new complaint (user only)
 */
app.post('/api/complaints', authenticateToken, authorizeRole('user'), async (req, res) => {
    try {
        const { description, appName, issueDate, issueTime, isp } = req.body;

        if (!description || description.trim().length === 0) {
            return res.status(400).json({ error: 'Description is required' });
        }

        console.log(`🔍 Running diagnostics for complaint: "${description}"`);

        // Run network diagnostics
        const diagnostics = await networkAnalyzer.runFullDiagnostics();
        const priority = networkAnalyzer.determinePriority(diagnostics);

        // Create complaint
        const complaintResult = await pool.query(
            `INSERT INTO complaints (user_id, description, app_name, issue_date, issue_time, isp, status, fault_classification, priority) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
             RETURNING *`,
            [req.user.id, description, appName, issueDate, issueTime, isp || null, 'analyzing', diagnostics.faultClassification, priority]
        );

        const complaint = complaintResult.rows[0];

        // Store network metrics
        await pool.query(
            `INSERT INTO network_metrics 
             (complaint_id, jitter, latency, packet_loss, bandwidth, ping_status, isp_health_score, server_health_score) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
                complaint.id,
                diagnostics.jitter,
                diagnostics.latency,
                diagnostics.packetLoss,
                diagnostics.bandwidth,
                diagnostics.pingStatus,
                diagnostics.ispHealthScore,
                diagnostics.serverHealthScore
            ]
        );

        // Trigger asynchronous packet capture
        const { spawn } = require('child_process');
        const scriptPath = require('path').join(__dirname, '..', 'Scripts', 'wireshark_trigger.py');

        console.log(`📡 Triggering packet capture for complaint #${complaint.id}...`);

        const pythonPath = '/opt/homebrew/bin/python3';
        const captureProcess = spawn(pythonPath, [
            scriptPath,
            '--complaint_id', complaint.id.toString(),
            '--duration', '10',
            '--output_dir', require('path').join(__dirname, 'captures')
        ]);

        console.log(`[Capture #${complaint.id}] Process started using ${pythonPath}`);

        captureProcess.stdout.on('data', (data) => {
            console.log(`[Capture #${complaint.id} STDOUT] ${data}`);
        });

        captureProcess.stderr.on('data', (data) => {
            console.error(`[Capture #${complaint.id} STDERR] ${data}`);
        });

        captureProcess.on('close', async (code) => {
            console.log(`[Capture #${complaint.id}] Process exited with code ${code}`);

            try {
                // Update complaint status to pending after diagnostics are finished
                await pool.query(
                    'UPDATE complaints SET status = $1 WHERE id = $2',
                    ['pending', complaint.id]
                );
                console.log(`✅ Complaint #${complaint.id} status updated to "pending"`);
            } catch (err) {
                console.error(`❌ Failed to update status for complaint #${complaint.id}:`, err.message);
            }
        });

        captureProcess.on('error', (err) => {
            console.error(`⚠️ Capture Process Error (#${complaint.id}):`, err.message);
        });

        res.status(201).json({
            message: 'Complaint submitted successfully',
            complaint: {
                id: complaint.id,
                description: complaint.description,
                status: complaint.status,
                faultClassification: complaint.fault_classification,
                priority: complaint.priority,
                isp: complaint.isp,
                createdAt: complaint.created_at
            },
            diagnostics
        });
    } catch (error) {
        console.error('Create complaint error:', error);
        res.status(500).json({ error: 'Failed to create complaint' });
    }
});

/**
 * GET /api/complaints
 * Get complaints (filtered by role)
 */
app.get('/api/complaints', authenticateToken, async (req, res) => {
    try {
        const { status, limit = 50 } = req.query;
        let query;
        let params;

        if (req.user.role === 'user') {
            // Users see only their own complaints
            query = `
                SELECT c.*, u.email, u.full_name,
                       nm.jitter, nm.latency, nm.packet_loss, nm.isp_health_score, nm.server_health_score
                FROM complaints c
                JOIN users u ON c.user_id = u.id
                LEFT JOIN network_metrics nm ON c.id = nm.complaint_id
                WHERE c.user_id = $1
                ${status ? 'AND c.status = $2' : ''}
                ORDER BY c.created_at DESC
                LIMIT $${status ? '3' : '2'}
            `;
            params = status ? [req.user.id, status, limit] : [req.user.id, limit];
        } else {
            // ISP sees only complaints for their ISP
            if (req.user.isp) {
                query = `
                    SELECT c.*, u.email, u.full_name,
                           nm.jitter, nm.latency, nm.packet_loss, nm.isp_health_score, nm.server_health_score
                    FROM complaints c
                    JOIN users u ON c.user_id = u.id
                    LEFT JOIN network_metrics nm ON c.id = nm.complaint_id
                    WHERE c.isp = $1
                    ${status ? 'AND c.status = $2' : ''}
                    ORDER BY 
                        CASE c.priority 
                            WHEN 'critical' THEN 1
                            WHEN 'high' THEN 2
                            WHEN 'medium' THEN 3
                            WHEN 'low' THEN 4
                        END,
                        c.created_at DESC
                    LIMIT $${status ? '3' : '2'}
                `;
                params = status ? [req.user.isp, status, limit] : [req.user.isp, limit];
            } else {
                // ISP without specific ISP assignment sees all complaints
                query = `
                    SELECT c.*, u.email, u.full_name,
                           nm.jitter, nm.latency, nm.packet_loss, nm.isp_health_score, nm.server_health_score
                    FROM complaints c
                    JOIN users u ON c.user_id = u.id
                    LEFT JOIN network_metrics nm ON c.id = nm.complaint_id
                    ${status ? 'WHERE c.status = $1' : ''}
                    ORDER BY 
                        CASE c.priority 
                            WHEN 'critical' THEN 1
                            WHEN 'high' THEN 2
                            WHEN 'medium' THEN 3
                            WHEN 'low' THEN 4
                        END,
                        c.created_at DESC
                    LIMIT $${status ? '2' : '1'}
                `;
                params = status ? [status, limit] : [limit];
            }
        }

        const result = await pool.query(query, params);

        res.json({
            complaints: result.rows.map(row => ({
                id: row.id,
                userId: row.user_id,
                userEmail: row.email,
                userFullName: row.full_name,
                description: row.description,
                appName: row.app_name,
                issueDate: row.issue_date,
                issueTime: row.issue_time,
                isp: row.isp,
                status: row.status,
                faultClassification: row.fault_classification,
                priority: row.priority,
                createdAt: row.created_at,
                resolvedAt: row.resolved_at,
                resolutionNotes: row.resolution_notes,
                metrics: {
                    jitter: row.jitter,
                    latency: row.latency,
                    packetLoss: row.packet_loss,
                    ispHealthScore: row.isp_health_score,
                    serverHealthScore: row.server_health_score
                }
            }))
        });
    } catch (error) {
        console.error('Get complaints error:', error);
        res.status(500).json({ error: 'Failed to get complaints' });
    }
});

/**
 * GET /api/complaints/:id
 * Get single complaint details
 */
app.get('/api/complaints/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `SELECT c.*, u.email, u.full_name,
                    nm.jitter, nm.latency, nm.packet_loss, nm.bandwidth, nm.ping_status,
                    nm.isp_health_score, nm.server_health_score, nm.timestamp as metrics_timestamp
             FROM complaints c
             JOIN users u ON c.user_id = u.id
             LEFT JOIN network_metrics nm ON c.id = nm.complaint_id
             WHERE c.id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Complaint not found' });
        }

        const complaint = result.rows[0];

        // Check authorization
        if (req.user.role === 'user' && complaint.user_id !== req.user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Get ISP actions
        const actionsResult = await pool.query(
            `SELECT ia.*, u.full_name as isp_name
             FROM isp_actions ia
             JOIN users u ON ia.isp_user_id = u.id
             WHERE ia.complaint_id = $1
             ORDER BY ia.timestamp DESC`,
            [id]
        );

        res.json({
            id: complaint.id,
            userId: complaint.user_id,
            userEmail: complaint.email,
            userFullName: complaint.full_name,
            description: complaint.description,
            status: complaint.status,
            faultClassification: complaint.fault_classification,
            priority: complaint.priority,
            createdAt: complaint.created_at,
            resolvedAt: complaint.resolved_at,
            resolutionNotes: complaint.resolution_notes,
            metrics: {
                jitter: complaint.jitter,
                latency: complaint.latency,
                packetLoss: complaint.packet_loss,
                bandwidth: complaint.bandwidth,
                pingStatus: complaint.ping_status,
                ispHealthScore: complaint.isp_health_score,
                serverHealthScore: complaint.server_health_score,
                timestamp: complaint.metrics_timestamp
            },
            actions: actionsResult.rows
        });
    } catch (error) {
        console.error('Get complaint error:', error);
        res.status(500).json({ error: 'Failed to get complaint' });
    }
});

/**
 * PATCH /api/complaints/:id
 * Update complaint (ISP only)
 */
app.patch('/api/complaints/:id', authenticateToken, authorizeRole('isp'), async (req, res) => {
    try {
        const { id } = req.params;
        const { status, faultClassification, resolutionNotes } = req.body;

        const updates = [];
        const values = [];
        let paramCount = 1;

        if (status) {
            updates.push(`status = $${paramCount++}`);
            values.push(status);
        }

        if (faultClassification) {
            updates.push(`fault_classification = $${paramCount++}`);
            values.push(faultClassification);
        }

        if (resolutionNotes) {
            updates.push(`resolution_notes = $${paramCount++}`);
            values.push(resolutionNotes);
        }

        if (status === 'resolved' || status === 'closed') {
            updates.push(`resolved_at = CURRENT_TIMESTAMP`);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No updates provided' });
        }

        values.push(id);

        const result = await pool.query(
            `UPDATE complaints SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
            values
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Complaint not found' });
        }

        // Log ISP action
        await pool.query(
            `INSERT INTO isp_actions (complaint_id, isp_user_id, action_type, notes)
             VALUES ($1, $2, $3, $4)`,
            [id, req.user.id, 'update', `Updated: ${Object.keys(req.body).join(', ')}`]
        );

        res.json({
            message: 'Complaint updated successfully',
            complaint: result.rows[0]
        });
    } catch (error) {
        console.error('Update complaint error:', error);
        res.status(500).json({ error: 'Failed to update complaint' });
    }
});

/**
 * DELETE /api/complaints/all
 * Delete all complaints (ISP only - for testing/demo purposes)
 */
app.delete('/api/complaints/all', authenticateToken, authorizeRole('isp'), async (req, res) => {
    try {
        const result = await pool.query('DELETE FROM complaints');
        console.log(`🗑️  Deleted ${result.rowCount} complaints from database`);

        res.json({
            message: 'All complaints deleted successfully',
            deletedCount: result.rowCount
        });
    } catch (error) {
        console.error('Delete all complaints error:', error);
        res.status(500).json({ error: 'Failed to delete complaints' });
    }
});

// ==================== ANALYTICS ROUTES ====================

/**
 * GET /api/analytics/stats
 * Get overall statistics (ISP only)
 */
app.get('/api/analytics/stats', authenticateToken, authorizeRole('isp'), async (req, res) => {
    try {
        const ispFilter = req.user.isp ? 'WHERE isp = $1' : '';
        const params = req.user.isp ? [req.user.isp] : [];

        const stats = await pool.query(`
            SELECT 
                COUNT(*) as total_complaints,
                COUNT(*) FILTER (WHERE status = 'pending') as pending_complaints,
                COUNT(*) FILTER (WHERE status = 'analyzing') as analyzing_complaints,
                COUNT(*) FILTER (WHERE status = 'resolved') as resolved_complaints,
                COUNT(*) FILTER (WHERE fault_classification = 'ISP') as isp_faults,
                COUNT(*) FILTER (WHERE fault_classification = 'App') as app_faults,
                AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600) FILTER (WHERE resolved_at IS NOT NULL) as avg_resolution_hours
            FROM complaints
            ${ispFilter}
        `, params);

        const priorityStats = await pool.query(`
            SELECT priority, COUNT(*) as count
            FROM complaints
            WHERE status != 'resolved' AND status != 'closed'
            ${req.user.isp ? 'AND isp = $1' : ''}
            GROUP BY priority
        `, params);

        res.json({
            ...stats.rows[0],
            priorityBreakdown: priorityStats.rows
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ error: 'Failed to get statistics' });
    }
});

/**
 * GET /api/analytics/trends
 * Get complaint trends over time
 */
app.get('/api/analytics/trends', authenticateToken, authorizeRole('isp'), async (req, res) => {
    try {
        const { days = 7 } = req.query;
        const ispFilter = req.user.isp ? `AND isp = $2` : '';
        const params = req.user.isp ? [parseInt(days), req.user.isp] : [parseInt(days)];

        const result = await pool.query(`
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE fault_classification = 'ISP') as isp_faults,
                COUNT(*) FILTER (WHERE fault_classification = 'App') as app_faults
            FROM complaints
            WHERE created_at >= CURRENT_DATE - INTERVAL '$1 days'
            ${ispFilter}
            GROUP BY DATE(created_at)
            ORDER BY date DESC
        `, params);

        res.json({ trends: result.rows });
    } catch (error) {
        console.error('Get trends error:', error);
        res.status(500).json({ error: 'Failed to get trends' });
    }
});

/**
 * GET /api/analytics/network-health
 * Get average network health metrics
 */
app.get('/api/analytics/network-health', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                AVG(jitter) as avg_jitter,
                AVG(latency) as avg_latency,
                AVG(packet_loss) as avg_packet_loss,
                AVG(isp_health_score) as avg_isp_health,
                AVG(server_health_score) as avg_server_health
            FROM network_metrics
            WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
        `);

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Get network health error:', error);
        res.status(500).json({ error: 'Failed to get network health' });
    }
});

// ==================== ML & PREDICTIONS ROUTES ====================

/**
 * GET /api/ml/anomalies
 * Detect anomalies in current network metrics
 */
app.get('/api/ml/anomalies', authenticateToken, async (req, res) => {
    try {
        // Get user's recent metrics
        const result = await pool.query(`
            SELECT nm.* FROM network_metrics nm
            JOIN complaints c ON nm.complaint_id = c.id
            WHERE c.user_id = $1
            ORDER BY nm.timestamp DESC
            LIMIT 20
        `, [req.user.id]);

        // Feed historical data to anomaly detector
        result.rows.forEach(metric => anomalyDetector.addMetrics(metric));

        // Get latest metrics
        if (result.rows.length > 0) {
            const latestMetrics = result.rows[0];
            const anomalyResult = anomalyDetector.detectAnomalies(latestMetrics);

            res.json(anomalyResult);
        } else {
            res.json({ isAnomaly: false, score: 0, anomalies: [], confidence: 0 });
        }
    } catch (error) {
        console.error('Anomaly detection error:', error);
        res.status(500).json({ error: 'Failed to detect anomalies' });
    }
});

/**
 * GET /api/ml/predictions
 * Get ML predictions for future network issues
 */
app.get('/api/ml/predictions', authenticateToken, async (req, res) => {
    try {
        const { metric = 'latency', minutesAhead = 15 } = req.query;

        // Get user's historical data
        const result = await pool.query(`
            SELECT nm.* FROM network_metrics nm
            JOIN complaints c ON nm.complaint_id = c.id
            WHERE c.user_id = $1
            ORDER BY nm.timestamp DESC
            LIMIT 50
        `, [req.user.id]);

        result.rows.forEach(m => anomalyDetector.addMetrics(m));

        const prediction = anomalyDetector.predictFutureIssues(metric, parseInt(minutesAhead));

        // Store prediction in database if concerning
        if (prediction.predicted) {
            await pool.query(`
                INSERT INTO ml_predictions 
                (user_id, prediction_type, confidence_score, predicted_for, metrics, status)
                VALUES ($1, $2, $3, NOW() + INTERVAL '${minutesAhead} minutes', $4, 'active')
            `, [
                req.user.id,
                metric,
                prediction.confidence,
                JSON.stringify(prediction)
            ]);
        }

        res.json(prediction);
    } catch (error) {
        console.error('Prediction error:', error);
        res.status(500).json({ error: 'Failed to generate prediction' });
    }
});

/**
 * GET /api/ml/network-health-score
 * Get overall network health score based on ML analysis
 */
app.get('/api/ml/network-health-score', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT nm.* FROM network_metrics nm
            JOIN complaints c ON nm.complaint_id = c.id
            WHERE c.user_id = $1
            ORDER BY nm.timestamp DESC
            LIMIT 30
        `, [req.user.id]);

        result.rows.forEach(m => anomalyDetector.addMetrics(m));
        const healthScore = anomalyDetector.getNetworkHealthScore();

        res.json(healthScore);
    } catch (error) {
        console.error('Health score error:', error);
        res.status(500).json({ error: 'Failed to calculate health score' });
    }
});

// ==================== GAMIFICATION ROUTES ====================

/**
 * GET /api/achievements
 * Get all available achievements
 */
app.get('/api/achievements', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT a.*, 
                   CASE WHEN ua.id IS NOT NULL THEN true ELSE false END as earned,
                   ua.earned_at
            FROM achievements a
            LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = $1
            ORDER BY a.category, a.points
        `, [req.user.id]);

        res.json({ achievements: result.rows });
    } catch (error) {
        console.error('Get achievements error:', error);
        res.status(500).json({ error: 'Failed to get achievements' });
    }
});

/**
 * GET /api/user/stats
 * Get user statistics and level
 */
app.get('/api/user/stats', authenticateToken, async (req, res) => {
    try {
        const stats = await pool.query(`
            SELECT 
                COUNT(DISTINCT c.id) as total_complaints,
                COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'resolved') as resolved_complaints,
                COALESCE(SUM(a.points), 0) as total_points
            FROM users u
            LEFT JOIN complaints c ON u.id = c.user_id
            LEFT JOIN user_achievements ua ON u.id = ua.user_id
            LEFT JOIN achievements a ON ua.achievement_id = a.id
            WHERE u.id = $1
            GROUP BY u.id
        `, [req.user.id]);

        const points = parseInt(stats.rows[0]?.total_points || 0);
        const level = Math.floor(points / 100) + 1;

        res.json({
            ...stats.rows[0],
            level,
            pointsToNextLevel: (level * 100) - points
        });
    } catch (error) {
        console.error('Get user stats error:', error);
        res.status(500).json({ error: 'Failed to get user stats' });
    }
});

// ==================== TRAFFIC INSIGHTS & ANALYTICS ====================

/**
 * GET /api/analytics/traffic-insights/:complaintId
 * Get detailed traffic analysis for a complaint
 */
app.get('/api/analytics/traffic-insights/:id', authenticateToken, asyncHandler(async (req, res) => {
    const { id } = req.params;

    const insights = await dbQueries.getTrafficInsights(id);

    res.json({
        complaintId: id,
        ...insights
    });
}));

/**
 * GET /api/analytics/root-cause/:complaintId
 * Get root cause analysis for a complaint
 */
app.get('/api/analytics/root-cause/:id', authenticateToken, asyncHandler(async (req, res) => {
    const rootCause = await dbQueries.getRootCauseAnalysis(id);

    if (!rootCause) {
        return res.status(404).json({ error: 'Root cause analysis not found' });
    }

    res.json(rootCause);
}));

/**
 * GET /api/analytics/insights/:complaintId
 * Get automated insights for a complaint
 */
app.get('/api/analytics/insights/:id', authenticateToken, asyncHandler(async (req, res) => {
    const insights = await dbQueries.getAutomatedInsights(req.params.id);

    res.json({ insights });
}));

/**
 * POST /api/analytics/generate-insights/:complaintId
 * Manually trigger insight generation
 */
app.post('/api/analytics/generate-insights/:id', authenticateToken, authorizeRole('isp'), asyncHandler(async (req, res) => {
    const insights = await insightGenerator.generateInsights(req.params.id);

    res.json({
        message: 'Insights generated successfully',
        count: insights.length,
        insights
    });
}));

/**
 * GET /api/analytics/comparative/:complaintId
 * Get comparative analysis for a complaint
 */
app.get('/api/analytics/comparative/:id', authenticateToken, asyncHandler(async (req, res) => {
    const comparison = await dbQueries.getComparativeAnalysis(req.params.id);

    res.json({ comparison });
}));

/**
 * GET /api/analytics/protocol-distribution
 * Get protocol distribution across network
 */
app.get('/api/analytics/protocol-distribution', authenticateToken, authorizeRole('isp'), asyncHandler(async (req, res) => {
    const distribution = await dbQueries.getProtocolDistribution();

    res.json({ distribution });
}));

/**
 * GET /api/analytics/trending-issues
 * Get trending network issues
 */
app.get('/api/analytics/trending-issues', authenticateToken, authorizeRole('isp'), asyncHandler(async (req, res) => {
    const trends = await dbQueries.getTrendingIssues();

    res.json({ trends });
}));

/**
 * POST /api/analytics/refresh-views
 * Refresh materialized views
 */
app.post('/api/analytics/refresh-views', authenticateToken, authorizeRole('isp'), asyncHandler(async (req, res) => {
    const result = await dbQueries.refreshMaterializedViews();

    res.json(result);
}));

/**
 * GET /api/search/complaints
 * Search complaints by description
 */
app.get('/api/search/complaints', authenticateToken, asyncHandler(async (req, res) => {
    const { q } = req.query;

    if (!q || q.trim().length === 0) {
        return res.status(400).json({ error: 'Search query is required' });
    }

    const results = await dbQueries.searchComplaints(q, req.user.id, req.user.role);

    res.json({ results, count: results.length });
}));

// ==================== HEALTH CHECK ====================

app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        websocket: wsService.getActiveUsersCount() + ' active connections',
        services: {
            database: 'connected',
            websocket: 'active',
            insights: 'ready'
        }
    });
});

// ==================== ERROR HANDLING ====================

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// ==================== START SERVER ====================

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
    console.log('🚀 Smart Fault Analyser Backend (Enhanced)');
    console.log(`📡 Server running on http://localhost:${PORT}`);
    console.log(`🔌 WebSocket server active`);
    console.log('📊 API Endpoints:');
    console.log('   Authentication:');
    console.log('   - POST /api/auth/register');
    console.log('   - POST /api/auth/login');
    console.log('   - GET  /api/auth/me');
    console.log('   Complaints:');
    console.log('   - POST /api/complaints');
    console.log('   - GET  /api/complaints');
    console.log('   - PATCH /api/complaints/:id');
    console.log('   Analytics:');
    console.log('   - GET  /api/analytics/stats');
    console.log('   - GET  /api/analytics/trends');
    console.log('   - GET  /api/analytics/network-health');
    console.log('   ML & Predictions:');
    console.log('   - GET  /api/ml/anomalies');
    console.log('   - GET  /api/ml/predictions');
    console.log('   - GET  /api/ml/network-health-score');
    console.log('   Gamification:');
    console.log('   - GET  /api/achievements');
    console.log('   - GET  /api/user/stats');
    console.log('   Traffic Insights:');
    console.log('   - GET  /api/analytics/traffic-insights/:id');
    console.log('   - GET  /api/analytics/root-cause/:id');
    console.log('   - GET  /api/analytics/insights/:id');
    console.log('   - POST /api/analytics/generate-insights/:id');
    console.log('   - GET  /api/analytics/comparative/:id');
    console.log('   - GET  /api/analytics/protocol-distribution');
    console.log('   - GET  /api/analytics/trending-issues');
    console.log('   - GET  /api/search/complaints');
    logger.info('Server started successfully');
});