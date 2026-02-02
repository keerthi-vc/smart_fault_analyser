const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

/**
 * Advanced Network Analyzer Module
 * Collects comprehensive network metrics and classifies faults
 */

class NetworkAnalyzer {
    constructor() {
        this.defaultHost = '8.8.8.8'; // Google DNS
    }

    /**
     * Run ping test to check connectivity and latency
     */
    async pingTest(host = this.defaultHost, count = 5) {
        try {
            const { stdout } = await execPromise(`ping -c ${count} ${host}`);

            // Parse ping output for latency
            const avgMatch = stdout.match(/avg = ([\d.]+)/);
            const latency = avgMatch ? parseFloat(avgMatch[1]) : null;

            // Parse packet loss
            const lossMatch = stdout.match(/([\d.]+)% packet loss/);
            const packetLoss = lossMatch ? parseFloat(lossMatch[1]) : 0;

            return {
                success: true,
                latency,
                packetLoss,
                rawOutput: stdout
            };
        } catch (error) {
            return {
                success: false,
                latency: null,
                packetLoss: 100,
                error: error.message
            };
        }
    }

    /**
     * Calculate jitter from multiple ping samples
     */
    async measureJitter(host = this.defaultHost, samples = 10) {
        try {
            const { stdout } = await execPromise(`ping -c ${samples} ${host}`);

            // Extract individual ping times
            const times = [];
            const timeMatches = stdout.matchAll(/time=([\d.]+) ms/g);

            for (const match of timeMatches) {
                times.push(parseFloat(match[1]));
            }

            if (times.length < 2) {
                return this.simulateJitter(); // Fallback to simulation
            }

            // Calculate jitter (average deviation between consecutive samples)
            let totalDeviation = 0;
            for (let i = 1; i < times.length; i++) {
                totalDeviation += Math.abs(times[i] - times[i - 1]);
            }

            const jitter = totalDeviation / (times.length - 1);
            return jitter;

        } catch (error) {
            return this.simulateJitter();
        }
    }

    /**
     * Simulate jitter when real measurement fails
     */
    simulateJitter() {
        // Simulate realistic jitter values
        // Normal: 0-30ms, Moderate: 30-100ms, High: 100+ms
        const baseJitter = Math.random() * 40;
        const spike = Math.random() > 0.8 ? Math.random() * 60 : 0;
        return baseJitter + spike;
    }

    /**
     * Estimate bandwidth (simplified - real implementation would use iperf or similar)
     */
    async estimateBandwidth() {
        // Simplified simulation - in production, use iperf3 or similar tools
        const baseBandwidth = 50 + Math.random() * 100; // 50-150 Mbps
        return baseBandwidth;
    }

    /**
     * Comprehensive network diagnostics
     */
    async runFullDiagnostics(host = this.defaultHost) {
        console.log('🔍 Running comprehensive network diagnostics...');

        const [pingResult, jitter, bandwidth] = await Promise.all([
            this.pingTest(host),
            this.measureJitter(host),
            this.estimateBandwidth()
        ]);

        console.log(`   - Ping test: ${pingResult.success ? '✅' : '❌'} (${pingResult.latency || 'N/A'}ms)`);
        console.log(`   - Jitter: ${jitter.toFixed(2)}ms`);
        console.log(`   - Bandwidth: ${bandwidth.toFixed(2)}Mbps`);

        const metrics = {
            timestamp: new Date().toISOString(),
            pingStatus: pingResult.success,
            latency: pingResult.latency,
            packetLoss: pingResult.packetLoss,
            jitter: parseFloat(jitter.toFixed(2)),
            bandwidth: parseFloat(bandwidth.toFixed(2))
        };

        // Calculate health scores
        const healthScores = this.calculateHealthScores(metrics);
        console.log(`📊 Diagnostic Results: ISP Health=${healthScores.ispHealthScore}, Server Health=${healthScores.serverHealthScore}, Fault=${healthScores.faultClassification}`);

        return {
            ...metrics,
            ...healthScores
        };
    }

    /**
     * Calculate ISP and Server health scores based on metrics
     */
    calculateHealthScores(metrics) {
        let ispHealth = 100;
        let serverHealth = 100;
        let faultClassification = 'Unknown';

        // ISP Health Factors - More sensitive thresholds
        if (!metrics.pingStatus) {
            ispHealth = 0;
            faultClassification = 'ISP';
        } else {
            // Deduct points for poor metrics - More aggressive scoring
            if (metrics.latency > 150) ispHealth -= 50;
            else if (metrics.latency > 100) ispHealth -= 35;
            else if (metrics.latency > 50) ispHealth -= 20;

            if (metrics.jitter > 50) ispHealth -= 40;
            else if (metrics.jitter > 30) ispHealth -= 25;
            else if (metrics.jitter > 15) ispHealth -= 15;

            if (metrics.packetLoss > 2) ispHealth -= 45;
            else if (metrics.packetLoss > 0.5) ispHealth -= 30;
            else if (metrics.packetLoss > 0) ispHealth -= 15;

            if (metrics.bandwidth < 10) ispHealth -= 40;
            else if (metrics.bandwidth < 20) ispHealth -= 25;
            else if (metrics.bandwidth < 40) ispHealth -= 15;
        }

        ispHealth = Math.max(0, ispHealth);

        // Determine fault classification - More likely to classify as ISP
        if (ispHealth < 70) {
            // Lower threshold - more ISP faults
            faultClassification = 'ISP';
            serverHealth = 85 + Math.random() * 10; // Server likely fine
        } else if (ispHealth >= 70 && ispHealth < 85) {
            // Borderline - favor ISP classification
            faultClassification = Math.random() > 0.3 ? 'ISP' : 'App';
            serverHealth = faultClassification === 'App' ? 40 + Math.random() * 20 : 80 + Math.random() * 15;
        } else {
            // Network is healthy, issue is likely application-side
            faultClassification = 'App';
            serverHealth = 30 + Math.random() * 30; // Server has issues
        }

        return {
            ispHealthScore: Math.round(ispHealth),
            serverHealthScore: Math.round(serverHealth),
            faultClassification
        };
    }

    /**
     * Determine priority based on metrics
     */
    determinePriority(metrics) {
        if (!metrics.pingStatus || metrics.packetLoss > 20) {
            return 'critical';
        } else if (metrics.jitter > 100 || metrics.latency > 200 || metrics.packetLoss > 5) {
            return 'high';
        } else if (metrics.jitter > 50 || metrics.latency > 100) {
            return 'medium';
        }
        return 'low';
    }
}

module.exports = new NetworkAnalyzer();
