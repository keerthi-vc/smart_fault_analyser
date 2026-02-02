/**
 * WebSocket Service for Real-time Updates
 * Handles real-time communication between server and clients
 */

class WebSocketService {
    constructor(io, pool) {
        this.io = io;
        this.pool = pool;
        this.activeUsers = new Map(); // userId -> socketId
        this.setupEventHandlers();
    }

    setupEventHandlers() {
        this.io.on('connection', (socket) => {
            console.log(`🔌 Client connected: ${socket.id}`);

            // Handle user authentication
            socket.on('authenticate', async (data) => {
                const { userId, role } = data;
                socket.userId = userId;
                socket.role = role;
                this.activeUsers.set(userId, socket.id);

                // Join role-specific room
                socket.join(`role:${role}`);
                socket.join(`user:${userId}`);

                console.log(`✅ User ${userId} (${role}) authenticated`);

                // Send initial data
                this.sendInitialData(socket);
            });

            // Handle real-time metric updates
            socket.on('subscribe:metrics', (complaintId) => {
                socket.join(`complaint:${complaintId}`);
                console.log(`📊 Socket ${socket.id} subscribed to complaint ${complaintId}`);
            });

            socket.on('unsubscribe:metrics', (complaintId) => {
                socket.leave(`complaint:${complaintId}`);
            });

            // Handle collaboration session events
            socket.on('join:collaboration', async (sessionId) => {
                socket.join(`session:${sessionId}`);

                // Notify other participants
                socket.to(`session:${sessionId}`).emit('user:joined', {
                    userId: socket.userId,
                    socketId: socket.id,
                    timestamp: new Date()
                });
            });

            socket.on('collaboration:cursor', (data) => {
                const { sessionId, position } = data;
                socket.to(`session:${sessionId}`).emit('cursor:update', {
                    userId: socket.userId,
                    position,
                    timestamp: new Date()
                });
            });

            socket.on('collaboration:annotation', async (data) => {
                const { sessionId, annotation } = data;
                socket.to(`session:${sessionId}`).emit('annotation:new', {
                    userId: socket.userId,
                    annotation,
                    timestamp: new Date()
                });
            });

            // Handle disconnection
            socket.on('disconnect', () => {
                console.log(`🔌 Client disconnected: ${socket.id}`);
                if (socket.userId) {
                    this.activeUsers.delete(socket.userId);
                }
            });
        });
    }

    async sendInitialData(socket) {
        try {
            if (socket.role === 'isp') {
                // Send pending complaints count
                const result = await this.pool.query(
                    "SELECT COUNT(*) as count FROM complaints WHERE status IN ('pending', 'analyzing')"
                );
                socket.emit('initial:data', {
                    pendingComplaints: parseInt(result.rows[0].count)
                });
            }
        } catch (error) {
            console.error('Error sending initial data:', error);
        }
    }

    /**
     * Broadcast new complaint to ISP staff
     */
    broadcastNewComplaint(complaint) {
        this.io.to('role:isp').emit('complaint:new', {
            id: complaint.id,
            description: complaint.description,
            priority: complaint.priority,
            faultClassification: complaint.fault_classification,
            createdAt: complaint.created_at
        });
    }

    /**
     * Broadcast real-time metrics update
     */
    broadcastMetricsUpdate(complaintId, metrics) {
        this.io.to(`complaint:${complaintId}`).emit('metrics:update', {
            complaintId,
            metrics,
            timestamp: new Date()
        });
    }

    /**
     * Broadcast status update
     */
    broadcastStatusUpdate(complaint) {
        // Notify the user who created the complaint
        this.io.to(`user:${complaint.user_id}`).emit('complaint:status', {
            id: complaint.id,
            status: complaint.status,
            timestamp: new Date()
        });

        // Notify ISP staff
        this.io.to('role:isp').emit('complaint:updated', {
            id: complaint.id,
            status: complaint.status
        });
    }

    /**
     * Broadcast ML prediction
     */
    broadcastPrediction(userId, prediction) {
        this.io.to(`user:${userId}`).emit('prediction:new', {
            type: prediction.prediction_type,
            confidence: prediction.confidence_score,
            predictedFor: prediction.predicted_for,
            metrics: prediction.metrics
        });
    }

    /**
     * Broadcast anomaly detection
     */
    broadcastAnomaly(userId, anomaly) {
        this.io.to(`user:${userId}`).emit('anomaly:detected', {
            score: anomaly.score,
            anomalies: anomaly.anomalies,
            confidence: anomaly.confidence,
            timestamp: new Date()
        });

        // Also notify ISP staff
        this.io.to('role:isp').emit('anomaly:detected', {
            userId,
            ...anomaly
        });
    }

    /**
     * Get active users count
     */
    getActiveUsersCount() {
        return this.activeUsers.size;
    }
}

module.exports = WebSocketService;
