const stats = require('simple-statistics');

/**
 * Simple ML-based Anomaly Detection Service
 * Uses statistical methods to detect network anomalies
 */

class AnomalyDetector {
    constructor() {
        this.historicalData = {
            jitter: [],
            latency: [],
            packetLoss: [],
            bandwidth: []
        };
        this.maxHistorySize = 100; // Keep last 100 measurements
    }

    /**
     * Add new metrics to historical data
     */
    addMetrics(metrics) {
        const { jitter, latency, packetLoss, bandwidth } = metrics;

        this.historicalData.jitter.push(jitter);
        this.historicalData.latency.push(latency || 0);
        this.historicalData.packetLoss.push(packetLoss);
        this.historicalData.bandwidth.push(bandwidth);

        // Keep only recent history
        Object.keys(this.historicalData).forEach(key => {
            if (this.historicalData[key].length > this.maxHistorySize) {
                this.historicalData[key].shift();
            }
        });
    }

    /**
     * Detect anomalies using Z-score method
     * Returns anomaly score (0-100) and detected anomalies
     */
    detectAnomalies(currentMetrics) {
        const anomalies = [];
        let totalAnomalyScore = 0;

        // Need at least 10 data points for meaningful analysis
        if (this.historicalData.jitter.length < 10) {
            return {
                isAnomaly: false,
                score: 0,
                anomalies: [],
                confidence: 0
            };
        }

        // Check each metric
        const metrics = ['jitter', 'latency', 'packetLoss', 'bandwidth'];

        metrics.forEach(metric => {
            const history = this.historicalData[metric];
            const currentValue = currentMetrics[metric] || 0;

            if (history.length > 0) {
                const mean = stats.mean(history);
                const stdDev = stats.standardDeviation(history);

                // Calculate Z-score
                const zScore = stdDev > 0 ? Math.abs((currentValue - mean) / stdDev) : 0;

                // Z-score > 2 indicates anomaly (95% confidence)
                // Z-score > 3 indicates strong anomaly (99.7% confidence)
                if (zScore > 2) {
                    const severity = zScore > 3 ? 'high' : 'medium';
                    anomalies.push({
                        metric,
                        currentValue,
                        expectedValue: mean.toFixed(2),
                        deviation: ((currentValue - mean) / mean * 100).toFixed(1) + '%',
                        zScore: zScore.toFixed(2),
                        severity
                    });
                    totalAnomalyScore += zScore * 10; // Scale to 0-100
                }
            }
        });

        const anomalyScore = Math.min(100, totalAnomalyScore);

        return {
            isAnomaly: anomalies.length > 0,
            score: Math.round(anomalyScore),
            anomalies,
            confidence: anomalies.length > 0 ? Math.min(99, 60 + anomalies.length * 10) : 0
        };
    }

    /**
     * Predict future network issues using linear regression
     */
    predictFutureIssues(metric = 'latency', minutesAhead = 15) {
        const history = this.historicalData[metric];

        if (history.length < 20) {
            return {
                predicted: false,
                confidence: 0,
                message: 'Insufficient data for prediction'
            };
        }

        // Simple linear regression on recent trend
        const recentData = history.slice(-20);
        const xValues = recentData.map((_, i) => i);
        const yValues = recentData;

        const regression = stats.linearRegression([xValues, yValues]);
        const slope = regression.m;

        // Predict value at future point
        const futureX = xValues.length + minutesAhead;
        const predictedValue = regression.m * futureX + regression.b;

        // Determine if trend is concerning
        const currentMean = stats.mean(recentData);
        const threshold = metric === 'latency' ? 200 :
            metric === 'jitter' ? 100 :
                metric === 'packetLoss' ? 5 : 50;

        const willExceedThreshold = predictedValue > threshold;
        const trendStrength = Math.abs(slope);

        return {
            predicted: willExceedThreshold,
            metric,
            currentValue: recentData[recentData.length - 1].toFixed(2),
            predictedValue: predictedValue.toFixed(2),
            threshold,
            trend: slope > 0 ? 'increasing' : 'decreasing',
            trendStrength: trendStrength.toFixed(2),
            confidence: Math.min(95, 50 + trendStrength * 10),
            minutesAhead,
            recommendation: willExceedThreshold ?
                `${metric} is trending upward and may exceed ${threshold} in ${minutesAhead} minutes` :
                `${metric} is within normal range`
        };
    }

    /**
     * Get overall network health score based on historical data
     */
    getNetworkHealthScore() {
        if (this.historicalData.jitter.length < 10) {
            return { score: 100, status: 'unknown', message: 'Collecting baseline data...' };
        }

        let score = 100;
        const issues = [];

        // Analyze recent trends
        const recentJitter = this.historicalData.jitter.slice(-10);
        const recentLatency = this.historicalData.latency.slice(-10);
        const recentLoss = this.historicalData.packetLoss.slice(-10);

        const avgJitter = stats.mean(recentJitter);
        const avgLatency = stats.mean(recentLatency);
        const avgLoss = stats.mean(recentLoss);

        // Deduct points for poor metrics
        if (avgJitter > 50) {
            score -= 15;
            issues.push('High jitter detected');
        }
        if (avgLatency > 100) {
            score -= 20;
            issues.push('Elevated latency');
        }
        if (avgLoss > 2) {
            score -= 25;
            issues.push('Packet loss detected');
        }

        // Check for increasing trends
        const jitterTrend = stats.linearRegression([
            recentJitter.map((_, i) => i),
            recentJitter
        ]).m;

        if (jitterTrend > 1) {
            score -= 10;
            issues.push('Jitter increasing');
        }

        score = Math.max(0, score);

        return {
            score: Math.round(score),
            status: score > 80 ? 'excellent' : score > 60 ? 'good' : score > 40 ? 'fair' : 'poor',
            issues,
            avgMetrics: {
                jitter: avgJitter.toFixed(2),
                latency: avgLatency.toFixed(2),
                packetLoss: avgLoss.toFixed(2)
            }
        };
    }
}

module.exports = new AnomalyDetector();
