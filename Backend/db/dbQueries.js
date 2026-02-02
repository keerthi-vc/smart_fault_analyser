/**
 * Centralized Database Query Module
 * All database queries in one place with error handling and transaction support
 */

class DatabaseQueries {
    constructor(pool) {
        this.pool = pool;
    }

    // ==================== COMPLAINT QUERIES ====================

    async createComplaint(userId, description, status, faultClassification, priority) {
        const result = await this.pool.query(
            `INSERT INTO complaints (user_id, description, status, fault_classification, priority) 
             VALUES ($1, $2, $3, $4, $5) 
             RETURNING *`,
            [userId, description, status, faultClassification, priority]
        );
        return result.rows[0];
    }

    async getComplaintById(complaintId) {
        const result = await this.pool.query(
            `SELECT c.*, u.email, u.full_name,
                    nm.jitter, nm.latency, nm.packet_loss, nm.bandwidth, nm.ping_status,
                    nm.isp_health_score, nm.server_health_score, nm.timestamp as metrics_timestamp
             FROM complaints c
             JOIN users u ON c.user_id = u.id
             LEFT JOIN network_metrics nm ON c.id = nm.complaint_id
             WHERE c.id = $1`,
            [complaintId]
        );
        return result.rows[0];
    }

    async updateComplaint(complaintId, updates) {
        const { status, faultClassification, resolutionNotes } = updates;
        const result = await this.pool.query(
            `UPDATE complaints 
             SET status = COALESCE($1, status),
                 fault_classification = COALESCE($2, fault_classification),
                 resolution_notes = COALESCE($3, resolution_notes),
                 resolved_at = CASE WHEN $1 IN ('resolved', 'closed') THEN CURRENT_TIMESTAMP ELSE resolved_at END
             WHERE id = $4
             RETURNING *`,
            [status, faultClassification, resolutionNotes, complaintId]
        );
        return result.rows[0];
    }

    // ==================== NETWORK METRICS QUERIES ====================

    async storeNetworkMetrics(complaintId, metrics) {
        const result = await this.pool.query(
            `INSERT INTO network_metrics 
             (complaint_id, jitter, latency, packet_loss, bandwidth, ping_status, 
              isp_health_score, server_health_score) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [
                complaintId,
                metrics.jitter,
                metrics.latency,
                metrics.packetLoss,
                metrics.bandwidth,
                metrics.pingStatus,
                metrics.ispHealthScore,
                metrics.serverHealthScore
            ]
        );
        return result.rows[0];
    }

    // ==================== TRAFFIC ANALYSIS QUERIES ====================

    async storeTCPAnalysis(complaintId, tcpData) {
        const result = await this.pool.query(
            `INSERT INTO tcp_analysis 
             (complaint_id, total_connections, retransmissions, retransmission_rate,
              out_of_order_packets, duplicate_acks, zero_window_count, avg_window_size)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [
                complaintId,
                tcpData.total_packets || 0,
                tcpData.retransmissions || 0,
                tcpData.retransmission_rate || 0,
                tcpData.out_of_order_packets || 0,
                tcpData.duplicate_acks || 0,
                tcpData.zero_window_count || 0,
                tcpData.avg_window_size || 0
            ]
        );
        return result.rows[0];
    }

    async storeDNSAnalysis(complaintId, dnsData) {
        const result = await this.pool.query(
            `INSERT INTO dns_analysis 
             (complaint_id, total_queries, successful_queries, failed_queries,
              avg_response_time_ms, timeout_count, top_domains, dns_servers)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [
                complaintId,
                dnsData.total_queries || 0,
                dnsData.successful_queries || 0,
                dnsData.failed_queries || 0,
                dnsData.avg_response_time_ms || 0,
                dnsData.timeout_count || 0,
                JSON.stringify(dnsData.top_domains || []),
                JSON.stringify(dnsData.dns_servers || [])
            ]
        );
        return result.rows[0];
    }

    async storeHTTPAnalysis(complaintId, httpData) {
        const result = await this.pool.query(
            `INSERT INTO http_analysis 
             (complaint_id, total_requests, successful_requests, client_errors,
              server_errors, avg_response_time_ms, slow_requests, top_domains, status_code_distribution)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING *`,
            [
                complaintId,
                httpData.total_requests || 0,
                httpData.successful_requests || 0,
                httpData.client_errors || 0,
                httpData.server_errors || 0,
                httpData.avg_response_time_ms || 0,
                httpData.slow_requests || 0,
                JSON.stringify(httpData.top_domains || []),
                JSON.stringify(httpData.status_code_distribution || {})
            ]
        );
        return result.rows[0];
    }

    async storeProtocolMetrics(complaintId, protocolDistribution) {
        const results = [];
        for (const [protocol, data] of Object.entries(protocolDistribution)) {
            const result = await this.pool.query(
                `INSERT INTO protocol_metrics 
                 (complaint_id, protocol_name, packet_count, byte_count, percentage, avg_packet_size)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 RETURNING *`,
                [
                    complaintId,
                    protocol,
                    data.packet_count || 0,
                    data.byte_count || 0,
                    data.percentage || 0,
                    data.avg_packet_size || 0
                ]
            );
            results.push(result.rows[0]);
        }
        return results;
    }

    async storeApplicationTraffic(complaintId, applications) {
        const results = [];
        for (const [appName, appData] of Object.entries(applications)) {
            const result = await this.pool.query(
                `INSERT INTO application_traffic 
                 (complaint_id, application_name, protocol, total_bytes, total_packets,
                  bandwidth_mbps, percentage_of_total, domains)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 RETURNING *`,
                [
                    complaintId,
                    appName,
                    appData.protocol || 'unknown',
                    appData.total_bytes || 0,
                    appData.total_packets || 0,
                    appData.bandwidth_mbps || 0,
                    appData.percentage_of_total || 0,
                    JSON.stringify(appData.domains || [])
                ]
            );
            results.push(result.rows[0]);
        }
        return results;
    }

    // ==================== ANALYTICS QUERIES ====================

    async getNetworkHealthSummary(days = 7) {
        const result = await this.pool.query(`
            SELECT * FROM mv_network_health_summary
            WHERE date >= CURRENT_DATE - INTERVAL '${parseInt(days)} days'
            ORDER BY date DESC
        `);
        return result.rows;
    }

    async getProtocolDistribution() {
        const result = await this.pool.query(`
            SELECT * FROM mv_protocol_distribution
            ORDER BY total_bytes DESC
        `);
        return result.rows;
    }

    async getComparativeAnalysis(complaintId) {
        const result = await this.pool.query(`
            SELECT * FROM get_comparative_analysis($1)
        `, [complaintId]);
        return result.rows;
    }

    async getTrendingIssues() {
        const result = await this.pool.query(`
            SELECT * FROM detect_trending_issues()
        `);
        return result.rows;
    }

    async getTrafficInsights(complaintId) {
        const tcp = await this.pool.query('SELECT * FROM tcp_analysis WHERE complaint_id = $1', [complaintId]);
        const dns = await this.pool.query('SELECT * FROM dns_analysis WHERE complaint_id = $1', [complaintId]);
        const http = await this.pool.query('SELECT * FROM http_analysis WHERE complaint_id = $1', [complaintId]);
        const protocols = await this.pool.query('SELECT * FROM protocol_metrics WHERE complaint_id = $1', [complaintId]);
        const apps = await this.pool.query('SELECT * FROM application_traffic WHERE complaint_id = $1', [complaintId]);

        return {
            tcp: tcp.rows[0] || null,
            dns: dns.rows[0] || null,
            http: http.rows[0] || null,
            protocols: protocols.rows,
            applications: apps.rows
        };
    }

    async getAutomatedInsights(complaintId) {
        const result = await this.pool.query(`
            SELECT * FROM automated_insights
            WHERE complaint_id = $1
            ORDER BY confidence_score DESC, created_at DESC
        `, [complaintId]);
        return result.rows;
    }

    async getRootCauseAnalysis(complaintId) {
        const result = await this.pool.query(`
            SELECT * FROM root_cause_analysis
            WHERE complaint_id = $1
            ORDER BY created_at DESC
            LIMIT 1
        `, [complaintId]);
        return result.rows[0];
    }

    // ==================== UTILITY QUERIES ====================

    async refreshMaterializedViews() {
        await this.pool.query('SELECT refresh_all_materialized_views()');
        return { success: true, message: 'Materialized views refreshed' };
    }

    async executeInTransaction(callback) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // ==================== SEARCH QUERIES ====================

    async searchComplaints(searchTerm, userId = null, role = 'user') {
        let query = `
            SELECT c.*, u.email, u.full_name,
                   ts_rank(to_tsvector('english', c.description), plainto_tsquery('english', $1)) as rank
            FROM complaints c
            JOIN users u ON c.user_id = u.id
            WHERE to_tsvector('english', c.description) @@ plainto_tsquery('english', $1)
        `;

        const params = [searchTerm];

        if (role === 'user' && userId) {
            query += ` AND c.user_id = $2`;
            params.push(userId);
        }

        query += ` ORDER BY rank DESC, c.created_at DESC LIMIT 50`;

        const result = await this.pool.query(query, params);
        return result.rows;
    }
}

module.exports = DatabaseQueries;
