const rootCauseAnalyzer = require('../ml/rootCauseAnalyzer');
const anomalyDetector = require('../ml/anomalyDetector');

/**
 * Automated Insight Generation Service
 * Generates actionable insights from network metrics and traffic analysis
 */

class InsightGenerator {
    constructor(pool) {
        this.pool = pool;
    }

    /**
     * Generate comprehensive insights for a complaint
     */
    async generateInsights(complaintId) {
        try {
            console.log(`🔍 Generating insights for complaint #${complaintId}...`);

            // Get complaint and metrics
            const complaint = await this.getComplaintData(complaintId);
            if (!complaint) {
                throw new Error(`Complaint #${complaintId} not found`);
            }

            const insights = [];

            // 1. Root Cause Analysis
            const rootCause = await this.performRootCauseAnalysis(complaint);
            if (rootCause) {
                insights.push(...rootCause);
            }

            // 2. Anomaly Detection
            const anomalies = await this.detectAnomalies(complaint);
            if (anomalies) {
                insights.push(...anomalies);
            }

            // 3. Comparative Analysis
            const comparative = await this.performComparativeAnalysis(complaint);
            if (comparative) {
                insights.push(...comparative);
            }

            // 4. Traffic Pattern Analysis
            const trafficInsights = await this.analyzeTrafficPatterns(complaintId);
            if (trafficInsights) {
                insights.push(...trafficInsights);
            }

            // 5. Trend Analysis
            const trends = await this.analyzeTrends(complaint.user_id);
            if (trends) {
                insights.push(...trends);
            }

            // Store insights in database
            await this.storeInsights(complaintId, insights);

            console.log(`✅ Generated ${insights.length} insights for complaint #${complaintId}`);
            return insights;

        } catch (error) {
            console.error(`Error generating insights for complaint #${complaintId}:`, error);
            return [];
        }
    }

    /**
     * Get complaint data with metrics
     */
    async getComplaintData(complaintId) {
        const result = await this.pool.query(`
            SELECT c.*, nm.*, 
                   u.id as user_id, u.email, u.full_name
            FROM complaints c
            JOIN users u ON c.user_id = u.id
            LEFT JOIN network_metrics nm ON c.id = nm.complaint_id
            WHERE c.id = $1
        `, [complaintId]);

        return result.rows[0] || null;
    }

    /**
     * Perform root cause analysis
     */
    async performRootCauseAnalysis(complaint) {
        const insights = [];

        // Get traffic analysis if available
        const trafficAnalysis = await this.getTrafficAnalysis(complaint.id);

        // Run root cause analyzer
        const analysis = rootCauseAnalyzer.analyze(complaint, trafficAnalysis);

        // Create root cause insight
        insights.push({
            type: 'root_cause',
            title: `Root Cause: ${analysis.primaryCause}`,
            description: `Analysis indicates ${analysis.primaryCause} with ${analysis.confidenceScore}% confidence. ${analysis.recommendedRemediation}`,
            confidence_score: analysis.confidenceScore,
            severity: analysis.severity,
            category: analysis.category.toLowerCase(),
            is_actionable: true,
            recommended_action: analysis.recommendedRemediation,
            supporting_data: {
                evidence: analysis.evidence,
                decision_path: analysis.decisionPath,
                contributing_factors: analysis.contributingFactors,
                estimated_resolution_time: analysis.estimatedResolutionTime
            }
        });

        // Store detailed root cause analysis
        await this.storeRootCauseAnalysis(complaint.id, analysis);

        return insights;
    }

    /**
     * Detect anomalies in metrics
     */
    async detectAnomalies(complaint) {
        const insights = [];

        // Get historical data for user
        const history = await this.pool.query(`
            SELECT nm.* FROM network_metrics nm
            JOIN complaints c ON nm.complaint_id = c.id
            WHERE c.user_id = $1
            ORDER BY nm.timestamp DESC
            LIMIT 50
        `, [complaint.user_id]);

        // Feed to anomaly detector
        history.rows.forEach(row => anomalyDetector.addMetrics(row));

        // Detect anomalies
        const anomalyResult = anomalyDetector.detectAnomalies(complaint);

        if (anomalyResult.isAnomaly) {
            insights.push({
                type: 'anomaly',
                title: 'Anomalous Network Behavior Detected',
                description: `Detected ${anomalyResult.anomalies.length} anomalous metrics with ${anomalyResult.confidence}% confidence.`,
                confidence_score: anomalyResult.confidence,
                severity: anomalyResult.score > 70 ? 'critical' : anomalyResult.score > 40 ? 'warning' : 'info',
                category: 'network',
                is_actionable: true,
                recommended_action: 'Investigate anomalous metrics for potential issues.',
                supporting_data: {
                    anomalies: anomalyResult.anomalies,
                    anomaly_score: anomalyResult.score
                }
            });
        }

        return insights;
    }

    /**
     * Perform comparative analysis
     */
    async performComparativeAnalysis(complaint) {
        const insights = [];

        // Get network averages
        const avgResult = await this.pool.query(`
            SELECT 
                AVG(latency) as avg_latency,
                AVG(jitter) as avg_jitter,
                AVG(packet_loss) as avg_packet_loss,
                AVG(bandwidth) as avg_bandwidth
            FROM network_metrics
            WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '7 days'
        `);

        const networkAvg = avgResult.rows[0];

        // Compare user metrics to network average
        const comparisons = [];

        if (complaint.latency > networkAvg.avg_latency * 1.5) {
            comparisons.push({
                metric: 'latency',
                user_value: complaint.latency,
                network_avg: parseFloat(networkAvg.avg_latency).toFixed(2),
                deviation: ((complaint.latency - networkAvg.avg_latency) / networkAvg.avg_latency * 100).toFixed(1)
            });
        }

        if (complaint.jitter > networkAvg.avg_jitter * 1.5) {
            comparisons.push({
                metric: 'jitter',
                user_value: complaint.jitter,
                network_avg: parseFloat(networkAvg.avg_jitter).toFixed(2),
                deviation: ((complaint.jitter - networkAvg.avg_jitter) / networkAvg.avg_jitter * 100).toFixed(1)
            });
        }

        if (comparisons.length > 0) {
            insights.push({
                type: 'comparative',
                title: 'Performance Below Network Average',
                description: `Your metrics are significantly worse than network average: ${comparisons.map(c => `${c.metric} is ${c.deviation}% higher`).join(', ')}.`,
                confidence_score: 80,
                severity: 'warning',
                category: 'network',
                is_actionable: true,
                recommended_action: 'Your connection is underperforming. Contact ISP for investigation.',
                supporting_data: { comparisons }
            });
        }

        return insights;
    }

    /**
     * Analyze traffic patterns from packet capture
     */
    async analyzeTrafficPatterns(complaintId) {
        const insights = [];

        // Get traffic analysis data
        const tcpAnalysis = await this.pool.query(`
            SELECT * FROM tcp_analysis WHERE complaint_id = $1
        `, [complaintId]);

        const dnsAnalysis = await this.pool.query(`
            SELECT * FROM dns_analysis WHERE complaint_id = $1
        `, [complaintId]);

        const httpAnalysis = await this.pool.query(`
            SELECT * FROM http_analysis WHERE complaint_id = $1
        `, [complaintId]);

        const appTraffic = await this.pool.query(`
            SELECT * FROM application_traffic WHERE complaint_id = $1
        `, [complaintId]);

        // TCP insights
        if (tcpAnalysis.rows.length > 0) {
            const tcp = tcpAnalysis.rows[0];
            if (tcp.retransmission_rate > 5) {
                insights.push({
                    type: 'traffic_analysis',
                    title: 'High TCP Retransmission Rate',
                    description: `TCP retransmission rate is ${tcp.retransmission_rate}%, indicating network instability.`,
                    confidence_score: 85,
                    severity: tcp.retransmission_rate > 10 ? 'critical' : 'warning',
                    category: 'tcp',
                    is_actionable: true,
                    recommended_action: 'Check network equipment and physical connections for issues.',
                    supporting_data: tcp
                });
            }
        }

        // DNS insights
        if (dnsAnalysis.rows.length > 0) {
            const dns = dnsAnalysis.rows[0];
            const successRate = (dns.successful_queries / dns.total_queries * 100);
            if (successRate < 90) {
                insights.push({
                    type: 'traffic_analysis',
                    title: 'DNS Resolution Issues',
                    description: `DNS success rate is ${successRate.toFixed(1)}%, indicating DNS server problems.`,
                    confidence_score: 80,
                    severity: 'warning',
                    category: 'dns',
                    is_actionable: true,
                    recommended_action: 'Try changing DNS servers to 8.8.8.8 (Google) or 1.1.1.1 (Cloudflare).',
                    supporting_data: dns
                });
            }
        }

        // Application insights
        if (appTraffic.rows.length > 0) {
            const apps = appTraffic.rows.map(a => a.application_name).join(', ');
            insights.push({
                type: 'application_detection',
                title: 'Applications Detected',
                description: `Detected traffic from: ${apps}`,
                confidence_score: 70,
                severity: 'info',
                category: 'application',
                is_actionable: false,
                recommended_action: null,
                supporting_data: { applications: appTraffic.rows }
            });
        }

        return insights;
    }

    /**
     * Analyze trends for user
     */
    async analyzeTrends(userId) {
        const insights = [];

        // Get recent complaints
        const recentComplaints = await this.pool.query(`
            SELECT COUNT(*) as count
            FROM complaints
            WHERE user_id = $1
              AND created_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'
        `, [userId]);

        const count = parseInt(recentComplaints.rows[0].count);

        if (count > 3) {
            insights.push({
                type: 'trend',
                title: 'Recurring Network Issues',
                description: `You've reported ${count} issues in the past 7 days, indicating a persistent problem.`,
                confidence_score: 90,
                severity: 'warning',
                category: 'network',
                is_actionable: true,
                recommended_action: 'Schedule a technician visit to investigate persistent issues.',
                supporting_data: { complaint_count: count, period_days: 7 }
            });
        }

        return insights;
    }

    /**
     * Get traffic analysis data
     */
    async getTrafficAnalysis(complaintId) {
        try {
            const tcp = await this.pool.query('SELECT * FROM tcp_analysis WHERE complaint_id = $1', [complaintId]);
            const dns = await this.pool.query('SELECT * FROM dns_analysis WHERE complaint_id = $1', [complaintId]);
            const http = await this.pool.query('SELECT * FROM http_analysis WHERE complaint_id = $1', [complaintId]);

            return {
                tcp_analysis: tcp.rows[0] || null,
                dns_analysis: dns.rows[0] || null,
                http_analysis: http.rows[0] || null
            };
        } catch (error) {
            console.error('Error getting traffic analysis:', error);
            return {};
        }
    }

    /**
     * Store insights in database
     */
    async storeInsights(complaintId, insights) {
        for (const insight of insights) {
            try {
                await this.pool.query(`
                    INSERT INTO automated_insights 
                    (complaint_id, insight_type, title, description, confidence_score, 
                     severity, category, is_actionable, recommended_action, supporting_data)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                `, [
                    complaintId,
                    insight.type,
                    insight.title,
                    insight.description,
                    insight.confidence_score,
                    insight.severity,
                    insight.category,
                    insight.is_actionable,
                    insight.recommended_action,
                    JSON.stringify(insight.supporting_data)
                ]);
            } catch (error) {
                console.error('Error storing insight:', error);
            }
        }
    }

    /**
     * Store root cause analysis
     */
    async storeRootCauseAnalysis(complaintId, analysis) {
        try {
            await this.pool.query(`
                INSERT INTO root_cause_analysis 
                (complaint_id, primary_cause, contributing_factors, confidence_score, 
                 evidence, decision_path, recommended_remediation, estimated_resolution_time)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `, [
                complaintId,
                analysis.primaryCause,
                JSON.stringify(analysis.contributingFactors),
                analysis.confidenceScore,
                JSON.stringify(analysis.evidence),
                JSON.stringify(analysis.decisionPath),
                analysis.recommendedRemediation,
                analysis.estimatedResolutionTime
            ]);
        } catch (error) {
            console.error('Error storing root cause analysis:', error);
        }
    }
}

module.exports = InsightGenerator;
