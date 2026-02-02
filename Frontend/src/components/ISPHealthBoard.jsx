import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Wifi,
    TrendingUp,
    TrendingDown,
    Activity,
    Zap,
    Radio,
    Network,
    Server,
    AlertCircle,
    CheckCircle2,
    Gauge
} from 'lucide-react';

const ISPHealthBoard = ({ complaints = [] }) => {
    const [animatedValues, setAnimatedValues] = useState({});

    // Calculate ISP health statistics with advanced metrics
    const ispStats = {};

    complaints.forEach(complaint => {
        if (!complaint.isp) return;

        if (!ispStats[complaint.isp]) {
            ispStats[complaint.isp] = {
                total: 0,
                ispFaults: 0,
                appFaults: 0,
                pending: 0,
                resolved: 0,
                analyzing: 0,
                avgLatency: 0,
                avgJitter: 0,
                avgPacketLoss: 0,
                totalLatency: 0,
                totalJitter: 0,
                totalPacketLoss: 0,
                metricsCount: 0
            };
        }

        ispStats[complaint.isp].total++;

        if (complaint.faultClassification === 'ISP') {
            ispStats[complaint.isp].ispFaults++;
        } else if (complaint.faultClassification === 'App') {
            ispStats[complaint.isp].appFaults++;
        }

        if (complaint.status === 'pending') {
            ispStats[complaint.isp].pending++;
        } else if (complaint.status === 'analyzing') {
            ispStats[complaint.isp].analyzing++;
        } else if (complaint.status === 'resolved') {
            ispStats[complaint.isp].resolved++;
        }

        // Aggregate network metrics
        if (complaint.metrics) {
            ispStats[complaint.isp].metricsCount++;
            if (complaint.metrics.latency) {
                ispStats[complaint.isp].totalLatency += parseFloat(complaint.metrics.latency);
            }
            if (complaint.metrics.jitter) {
                ispStats[complaint.isp].totalJitter += parseFloat(complaint.metrics.jitter);
            }
            if (complaint.metrics.packetLoss) {
                ispStats[complaint.isp].totalPacketLoss += parseFloat(complaint.metrics.packetLoss);
            }
        }
    });

    // Calculate averages
    Object.keys(ispStats).forEach(isp => {
        const stats = ispStats[isp];
        if (stats.metricsCount > 0) {
            stats.avgLatency = stats.totalLatency / stats.metricsCount;
            stats.avgJitter = stats.totalJitter / stats.metricsCount;
            stats.avgPacketLoss = stats.totalPacketLoss / stats.metricsCount;
        }
    });

    // Calculate health score for each ISP (higher is better)
    const getHealthScore = (stats) => {
        if (stats.total === 0) return 100;

        const ispFaultRate = stats.ispFaults / stats.total;
        const resolutionRate = stats.resolved / stats.total;

        // Score based on low ISP faults and high resolution rate
        const score = Math.round((1 - ispFaultRate * 0.7 + resolutionRate * 0.3) * 100);
        return Math.max(0, Math.min(100, score));
    };

    const getHealthColor = (score) => {
        if (score >= 80) return 'text-emerald-400';
        if (score >= 60) return 'text-amber-400';
        return 'text-rose-400';
    };

    const getHealthGradient = (score) => {
        if (score >= 80) return 'from-emerald-500/30 via-green-500/20 to-teal-500/30';
        if (score >= 60) return 'from-amber-500/30 via-yellow-500/20 to-orange-500/30';
        return 'from-rose-500/30 via-red-500/20 to-pink-500/30';
    };

    const getHealthBorder = (score) => {
        if (score >= 80) return 'border-emerald-500/40 shadow-emerald-500/20';
        if (score >= 60) return 'border-amber-500/40 shadow-amber-500/20';
        return 'border-rose-500/40 shadow-rose-500/20';
    };

    const getTrendIcon = (score) => {
        if (score >= 80) return <TrendingUp size={18} className="text-emerald-400" />;
        if (score >= 60) return <Activity size={18} className="text-amber-400" />;
        return <TrendingDown size={18} className="text-rose-400" />;
    };

    // Simulate real-time network metrics
    const getSimulatedMetrics = (isp, stats) => {
        const baseMetrics = {
            throughput: stats.avgLatency > 0 ? Math.max(50, 100 - stats.avgLatency / 2) : 85 + Math.random() * 15,
            bandwidth: stats.avgPacketLoss > 0 ? Math.max(60, 100 - stats.avgPacketLoss * 10) : 75 + Math.random() * 20,
            errorRate: stats.avgPacketLoss > 0 ? stats.avgPacketLoss : Math.random() * 2,
            activeConnections: stats.total * 10 + Math.floor(Math.random() * 50),
            packetsProcessed: stats.total * 1000 + Math.floor(Math.random() * 5000)
        };
        return baseMetrics;
    };

    const ispList = Object.keys(ispStats).length > 0
        ? Object.keys(ispStats)
        : ['Airtel', 'Jio', 'BSNL', 'Vi'];

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-bold flex items-center gap-2">
                    <div className="relative">
                        <Network className="text-cyan-400" size={24} />
                        <motion.div
                            className="absolute -top-1 -right-1 w-2 h-2 bg-cyan-400 rounded-full"
                            animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                        />
                    </div>
                    <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                        Network Infrastructure Status
                    </span>
                </h3>
            </div>

            <div className="grid gap-4">
                {ispList.map((isp, index) => {
                    const stats = ispStats[isp] || {
                        total: 0,
                        ispFaults: 0,
                        appFaults: 0,
                        pending: 0,
                        resolved: 0,
                        analyzing: 0,
                        avgLatency: 0,
                        avgJitter: 0,
                        avgPacketLoss: 0
                    };
                    const healthScore = getHealthScore(stats);
                    const metrics = getSimulatedMetrics(isp, stats);

                    return (
                        <motion.div
                            key={isp}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.15, type: "spring", stiffness: 100 }}
                            className={`relative p-5 rounded-2xl border-2 bg-gradient-to-br ${getHealthGradient(healthScore)} ${getHealthBorder(healthScore)} backdrop-blur-xl shadow-2xl transition-all hover:scale-[1.02] hover:shadow-3xl overflow-hidden group`}
                        >
                            {/* Animated background effect */}
                            <motion.div
                                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
                                animate={{ x: ['-100%', '100%'] }}
                                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                            />

                            {/* Header */}
                            <div className="relative flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <div className={`p-2.5 rounded-xl bg-gradient-to-br ${healthScore >= 80 ? 'from-emerald-500/30 to-teal-500/30' : healthScore >= 60 ? 'from-amber-500/30 to-orange-500/30' : 'from-rose-500/30 to-pink-500/30'} backdrop-blur-sm`}>
                                            <Server size={22} className={getHealthColor(healthScore)} />
                                        </div>
                                        <motion.div
                                            className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full ${healthScore >= 80 ? 'bg-emerald-400' : healthScore >= 60 ? 'bg-amber-400' : 'bg-rose-400'}`}
                                            animate={{ scale: [1, 1.3, 1] }}
                                            transition={{ duration: 2, repeat: Infinity }}
                                        />
                                    </div>
                                    <div>
                                        <span className="font-bold text-lg text-white">{isp}</span>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <div className={`w-1.5 h-1.5 rounded-full ${healthScore >= 80 ? 'bg-emerald-400' : healthScore >= 60 ? 'bg-amber-400' : 'bg-rose-400'} animate-pulse`} />
                                            <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">
                                                {healthScore >= 80 ? 'OPTIMAL' : healthScore >= 60 ? 'DEGRADED' : 'CRITICAL'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <div className="flex items-center gap-2">
                                        {getTrendIcon(healthScore)}
                                        <span className={`text-3xl font-black ${getHealthColor(healthScore)} tabular-nums`}>
                                            {healthScore}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1 text-[10px] text-gray-400">
                                        <Gauge size={10} />
                                        <span>HEALTH INDEX</span>
                                    </div>
                                </div>
                            </div>

                            {/* Technical Metrics Grid */}
                            {stats.total > 0 ? (
                                <div className="relative space-y-3">
                                    {/* Primary Network Metrics */}
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="bg-black/30 backdrop-blur-sm rounded-lg p-3 border border-white/10">
                                            <div className="flex items-center gap-1.5 mb-1.5">
                                                <Zap size={12} className="text-cyan-400" />
                                                <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Throughput</span>
                                            </div>
                                            <div className="text-lg font-bold text-cyan-400 tabular-nums">
                                                {metrics.throughput.toFixed(1)}%
                                            </div>
                                            <div className="w-full bg-gray-700/50 rounded-full h-1.5 mt-2 overflow-hidden">
                                                <motion.div
                                                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${metrics.throughput}%` }}
                                                    transition={{ duration: 1, delay: index * 0.1 }}
                                                />
                                            </div>
                                        </div>

                                        <div className="bg-black/30 backdrop-blur-sm rounded-lg p-3 border border-white/10">
                                            <div className="flex items-center gap-1.5 mb-1.5">
                                                <Radio size={12} className="text-purple-400" />
                                                <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Bandwidth</span>
                                            </div>
                                            <div className="text-lg font-bold text-purple-400 tabular-nums">
                                                {metrics.bandwidth.toFixed(1)}%
                                            </div>
                                            <div className="w-full bg-gray-700/50 rounded-full h-1.5 mt-2 overflow-hidden">
                                                <motion.div
                                                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${metrics.bandwidth}%` }}
                                                    transition={{ duration: 1, delay: index * 0.1 + 0.1 }}
                                                />
                                            </div>
                                        </div>

                                        <div className="bg-black/30 backdrop-blur-sm rounded-lg p-3 border border-white/10">
                                            <div className="flex items-center gap-1.5 mb-1.5">
                                                <AlertCircle size={12} className="text-rose-400" />
                                                <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Error Rate</span>
                                            </div>
                                            <div className="text-lg font-bold text-rose-400 tabular-nums">
                                                {metrics.errorRate.toFixed(2)}%
                                            </div>
                                            <div className="w-full bg-gray-700/50 rounded-full h-1.5 mt-2 overflow-hidden">
                                                <motion.div
                                                    className="h-full bg-gradient-to-r from-rose-500 to-red-500 rounded-full"
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${Math.min(metrics.errorRate * 10, 100)}%` }}
                                                    transition={{ duration: 1, delay: index * 0.1 + 0.2 }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Network Performance Stats */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-gradient-to-br from-indigo-500/10 to-blue-500/10 backdrop-blur-sm rounded-lg p-3 border border-indigo-500/20">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Avg Latency</span>
                                                <Activity size={12} className="text-indigo-400" />
                                            </div>
                                            <div className="text-xl font-black text-indigo-400 tabular-nums">
                                                {stats.avgLatency > 0 ? stats.avgLatency.toFixed(1) : '< 1.0'}
                                                <span className="text-xs font-normal text-gray-400 ml-1">ms</span>
                                            </div>
                                        </div>

                                        <div className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 backdrop-blur-sm rounded-lg p-3 border border-violet-500/20">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Avg Jitter</span>
                                                <Activity size={12} className="text-violet-400" />
                                            </div>
                                            <div className="text-xl font-black text-violet-400 tabular-nums">
                                                {stats.avgJitter > 0 ? stats.avgJitter.toFixed(1) : '< 1.0'}
                                                <span className="text-xs font-normal text-gray-400 ml-1">ms</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Fault Distribution */}
                                    <div className="grid grid-cols-4 gap-2 pt-3 border-t border-white/10">
                                        <div className="text-center">
                                            <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Total</div>
                                            <div className="text-base font-bold text-white tabular-nums">{stats.total}</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-[10px] text-rose-400 uppercase tracking-wider mb-1">ISP Faults</div>
                                            <div className="text-base font-bold text-rose-400 tabular-nums">{stats.ispFaults}</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-[10px] text-blue-400 uppercase tracking-wider mb-1">App Faults</div>
                                            <div className="text-base font-bold text-blue-400 tabular-nums">{stats.appFaults}</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-[10px] text-emerald-400 uppercase tracking-wider mb-1">Resolved</div>
                                            <div className="text-base font-bold text-emerald-400 tabular-nums">{stats.resolved}</div>
                                        </div>
                                    </div>

                                    {/* Packet Statistics */}
                                    <div className="flex items-center justify-between pt-2 border-t border-white/10">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                                            <span className="text-[10px] text-gray-400">
                                                {metrics.activeConnections} active connections
                                            </span>
                                        </div>
                                        <div className="text-[10px] text-gray-400">
                                            {metrics.packetsProcessed.toLocaleString()} packets processed
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="relative text-center py-6">
                                    <div className="inline-flex items-center gap-2 text-sm text-gray-400">
                                        <Server size={16} className="opacity-50" />
                                        <span>No network data available</span>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
};

export default ISPHealthBoard;
