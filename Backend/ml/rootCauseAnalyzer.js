const stats = require('simple-statistics');

/**
 * Root Cause Analyzer
 * Uses decision tree logic to determine root cause of network issues
 */

class RootCauseAnalyzer {
    constructor() {
        this.knownIssues = this.initializeKnownIssues();
    }

    /**
     * Initialize database of known issues and their signatures
     */
    initializeKnownIssues() {
        return [
            {
                id: 'isp_outage',
                name: 'ISP Network Outage',
                category: 'ISP',
                symptoms: {
                    pingStatus: false,
                    packetLoss: { min: 80 }
                },
                confidence: 95,
                remediation: 'Contact ISP immediately. This is a complete network outage.',
                estimatedResolutionTime: 120 // minutes
            },
            {
                id: 'isp_congestion',
                name: 'Network Congestion',
                category: 'ISP',
                symptoms: {
                    jitter: { min: 100 },
                    latency: { min: 150 },
                    packetLoss: { min: 3, max: 20 }
                },
                confidence: 85,
                remediation: 'ISP network is experiencing congestion. May require bandwidth upgrade or QoS configuration.',
                estimatedResolutionTime: 60
            },
            {
                id: 'dns_failure',
                name: 'DNS Resolution Failure',
                category: 'ISP',
                symptoms: {
                    dnsSuccessRate: { max: 70 }
                },
                confidence: 90,
                remediation: 'DNS server issues detected. Try changing DNS servers to 8.8.8.8 or 1.1.1.1.',
                estimatedResolutionTime: 15
            },
            {
                id: 'tcp_retransmission',
                name: 'High TCP Retransmissions',
                category: 'Network',
                symptoms: {
                    tcpRetransmissionRate: { min: 5 }
                },
                confidence: 80,
                remediation: 'High packet retransmission indicates network instability. Check physical connections and network equipment.',
                estimatedResolutionTime: 45
            },
            {
                id: 'application_server_error',
                name: 'Application Server Errors',
                category: 'App',
                symptoms: {
                    httpServerErrors: { min: 5 },
                    ispHealthScore: { min: 70 }
                },
                confidence: 85,
                remediation: 'Application servers are returning errors. This is an application-side issue.',
                estimatedResolutionTime: 90
            },
            {
                id: 'slow_application',
                name: 'Slow Application Response',
                category: 'App',
                symptoms: {
                    httpAvgResponseTime: { min: 3000 },
                    latency: { max: 100 },
                    ispHealthScore: { min: 75 }
                },
                confidence: 75,
                remediation: 'Application is responding slowly despite good network conditions. This is an application performance issue.',
                estimatedResolutionTime: 120
            },
            {
                id: 'wifi_interference',
                name: 'WiFi Interference',
                category: 'Local',
                symptoms: {
                    jitter: { min: 50, max: 150 },
                    packetLoss: { min: 1, max: 5 }
                },
                confidence: 65,
                remediation: 'Possible WiFi interference. Try moving closer to router or switching to 5GHz band.',
                estimatedResolutionTime: 10
            }
        ];
    }

    /**
     * Analyze metrics and determine root cause
     */
    analyze(metrics, trafficAnalysis = {}) {
        const symptoms = this.extractSymptoms(metrics, trafficAnalysis);
        const matches = this.matchKnownIssues(symptoms);

        if (matches.length === 0) {
            return this.generateUnknownIssueAnalysis(symptoms);
        }

        // Get best match
        const primaryCause = matches[0];
        const contributingFactors = matches.slice(1, 3).map(m => ({
            name: m.issue.name,
            confidence: m.matchScore
        }));

        // Build evidence
        const evidence = this.buildEvidence(symptoms, primaryCause.issue);
        const decisionPath = this.buildDecisionPath(symptoms);

        return {
            primaryCause: primaryCause.issue.name,
            category: primaryCause.issue.category,
            confidenceScore: Math.round(primaryCause.matchScore),
            contributingFactors,
            evidence,
            decisionPath,
            recommendedRemediation: primaryCause.issue.remediation,
            estimatedResolutionTime: primaryCause.issue.estimatedResolutionTime,
            severity: this.determineSeverity(primaryCause.issue, symptoms)
        };
    }

    /**
     * Extract symptoms from metrics
     */
    extractSymptoms(metrics, trafficAnalysis) {
        const symptoms = {
            pingStatus: metrics.pingStatus || metrics.ping_status,
            latency: metrics.latency,
            jitter: metrics.jitter,
            packetLoss: metrics.packetLoss || metrics.packet_loss,
            bandwidth: metrics.bandwidth,
            ispHealthScore: metrics.ispHealthScore || metrics.isp_health_score,
            serverHealthScore: metrics.serverHealthScore || metrics.server_health_score
        };

        // Add traffic analysis symptoms if available
        if (trafficAnalysis.tcp_analysis) {
            symptoms.tcpRetransmissionRate = trafficAnalysis.tcp_analysis.retransmission_rate;
        }

        if (trafficAnalysis.dns_analysis) {
            symptoms.dnsSuccessRate = trafficAnalysis.dns_analysis.success_rate;
        }

        if (trafficAnalysis.http_analysis) {
            symptoms.httpServerErrors = trafficAnalysis.http_analysis.server_errors;
            symptoms.httpAvgResponseTime = trafficAnalysis.http_analysis.avg_response_time_ms;
        }

        return symptoms;
    }

    /**
     * Match symptoms against known issues
     */
    matchKnownIssues(symptoms) {
        const matches = [];

        for (const issue of this.knownIssues) {
            const matchScore = this.calculateMatchScore(symptoms, issue.symptoms);

            if (matchScore > 50) { // Threshold for considering a match
                matches.push({
                    issue,
                    matchScore: matchScore * (issue.confidence / 100)
                });
            }
        }

        // Sort by match score (highest first)
        return matches.sort((a, b) => b.matchScore - a.matchScore);
    }

    /**
     * Calculate how well symptoms match an issue
     */
    calculateMatchScore(symptoms, issueSymptoms) {
        let totalChecks = 0;
        let matchedChecks = 0;

        for (const [symptom, criteria] of Object.entries(issueSymptoms)) {
            totalChecks++;
            const value = symptoms[symptom];

            if (value === undefined || value === null) {
                continue; // Skip if symptom not present
            }

            let matched = false;

            if (typeof criteria === 'boolean') {
                matched = value === criteria;
            } else if (typeof criteria === 'object') {
                matched = true;
                if (criteria.min !== undefined && value < criteria.min) matched = false;
                if (criteria.max !== undefined && value > criteria.max) matched = false;
            }

            if (matched) {
                matchedChecks++;
            }
        }

        return totalChecks > 0 ? (matchedChecks / totalChecks) * 100 : 0;
    }

    /**
     * Build evidence supporting the diagnosis
     */
    buildEvidence(symptoms, issue) {
        const evidence = [];

        for (const [symptom, criteria] of Object.entries(issue.symptoms)) {
            const value = symptoms[symptom];
            if (value !== undefined && value !== null) {
                evidence.push({
                    metric: symptom,
                    value: value,
                    expected: criteria,
                    status: this.evaluateSymptom(value, criteria) ? 'abnormal' : 'normal'
                });
            }
        }

        return evidence;
    }

    /**
     * Evaluate if a symptom value matches criteria
     */
    evaluateSymptom(value, criteria) {
        if (typeof criteria === 'boolean') {
            return value === criteria;
        } else if (typeof criteria === 'object') {
            if (criteria.min !== undefined && value < criteria.min) return false;
            if (criteria.max !== undefined && value > criteria.max) return false;
            return true;
        }
        return false;
    }

    /**
     * Build decision tree path
     */
    buildDecisionPath(symptoms) {
        const path = [];

        // Network connectivity check
        if (symptoms.pingStatus === false) {
            path.push({ step: 1, decision: 'Ping Failed', result: 'Network Outage Detected' });
            return path;
        }
        path.push({ step: 1, decision: 'Ping Successful', result: 'Basic Connectivity OK' });

        // Packet loss check
        if (symptoms.packetLoss > 5) {
            path.push({ step: 2, decision: `High Packet Loss (${symptoms.packetLoss}%)`, result: 'Network Quality Issue' });
        } else {
            path.push({ step: 2, decision: `Packet Loss Acceptable (${symptoms.packetLoss}%)`, result: 'Packet Delivery OK' });
        }

        // Latency check
        if (symptoms.latency > 150) {
            path.push({ step: 3, decision: `High Latency (${symptoms.latency}ms)`, result: 'Network Delay Issue' });
        } else {
            path.push({ step: 3, decision: `Latency Acceptable (${symptoms.latency}ms)`, result: 'Response Time OK' });
        }

        // ISP vs App determination
        if (symptoms.ispHealthScore < 70) {
            path.push({ step: 4, decision: `ISP Health Low (${symptoms.ispHealthScore})`, result: 'ISP Fault Likely' });
        } else {
            path.push({ step: 4, decision: `ISP Health Good (${symptoms.ispHealthScore})`, result: 'Application Fault Likely' });
        }

        return path;
    }

    /**
     * Determine severity of the issue
     */
    determineSeverity(issue, symptoms) {
        if (issue.category === 'ISP' && symptoms.pingStatus === false) {
            return 'critical';
        } else if (symptoms.packetLoss > 10 || symptoms.latency > 300) {
            return 'high';
        } else if (symptoms.jitter > 100 || symptoms.packetLoss > 3) {
            return 'medium';
        }
        return 'low';
    }

    /**
     * Generate analysis for unknown issues
     */
    generateUnknownIssueAnalysis(symptoms) {
        return {
            primaryCause: 'Unknown Issue',
            category: 'Unknown',
            confidenceScore: 30,
            contributingFactors: [],
            evidence: Object.entries(symptoms).map(([key, value]) => ({
                metric: key,
                value: value,
                status: 'recorded'
            })),
            decisionPath: this.buildDecisionPath(symptoms),
            recommendedRemediation: 'Unable to determine specific cause. Manual investigation required.',
            estimatedResolutionTime: null,
            severity: 'medium'
        };
    }
}

module.exports = new RootCauseAnalyzer();
