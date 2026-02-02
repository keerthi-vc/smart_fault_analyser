import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Send, Clock, CheckCircle, TrendingUp, Smartphone, Calendar, Zap, Smartphone as Mobile } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useAuth } from '../context/AuthContext';
import { complaintsAPI } from '../utils/api';
import Card from '../components/Card';
import Button from '../components/Button';
import StatusBadge from '../components/StatusBadge';
import NetworkHealthGauge from '../components/NetworkHealthGauge';
import { showComplaintSubmittedToast, showNetworkErrorToast } from '../components/CustomToasts';
import Navbar from '../components/Navbar';
import Loader from '../components/Loader';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

const UserDashboard = () => {
    const { user } = useAuth();
    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [description, setDescription] = useState('');
    const [appName, setAppName] = useState('');
    const [isp, setIsp] = useState(user?.isp || '');
    const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
    const [issueTime, setIssueTime] = useState(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
    const [latestMetrics, setLatestMetrics] = useState(null);

    useEffect(() => {
        fetchComplaints();
    }, []);

    const fetchComplaints = async () => {
        try {
            const response = await complaintsAPI.getAll({ limit: 10 });
            setComplaints(response.data.complaints);

            // Get latest metrics from most recent complaint
            if (response.data.complaints.length > 0) {
                const latest = response.data.complaints[0];
                setLatestMetrics(latest.metrics);
            }
        } catch (error) {
            toast.error('Failed to load complaints');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitComplaint = async (e) => {
        e.preventDefault();

        if (!description.trim()) {
            toast.error('Please describe the issue');
            return;
        }

        if (!isp) {
            toast.error('Please select your ISP');
            return;
        }

        setSubmitting(true);

        try {
            const response = await complaintsAPI.create({
                description,
                appName,
                isp,
                issueDate,
                issueTime
            });

            // Show custom animated toast
            showComplaintSubmittedToast({
                description,
                appName,
                isp
            });

            setDescription('');
            setAppName('');
            setLatestMetrics(response.data.diagnostics);
            fetchComplaints();
        } catch (error) {
            showNetworkErrorToast(error.response?.data?.error || 'Failed to submit complaint');
        } finally {
            setSubmitting(false);
        }
    };

    const stats = {
        total: complaints.length,
        pending: complaints.filter(c => c.status === 'pending' || c.status === 'analyzing').length,
        resolved: complaints.filter(c => c.status === 'resolved').length
    };

    if (loading) {
        return (
            <>
                <Navbar />
                <Loader fullScreen />
            </>
        );
    }

    return (
        <>
            <Navbar />
            <div className="min-h-screen p-6">
                <div className="container max-w-7xl">
                    {/* Welcome Header */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-8"
                    >
                        <h1 className="text-4xl font-bold mb-2">Welcome back, {user?.fullName}!</h1>
                        <p className="text-gray-400">Monitor your network issues and submit new complaints</p>
                    </motion.div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <Card glass className="card-premium-indigo p-6">
                            <div className="flex items-center gap-4">
                                <div className="p-4 rounded-2xl bg-indigo-500/20 shadow-lg shadow-indigo-500/20">
                                    <AlertCircle className="text-indigo-400" size={32} />
                                </div>
                                <div>
                                    <div className="text-4xl font-extrabold text-gradient-indigo leading-none mb-1">{stats.total}</div>
                                    <div className="text-gray-300 text-sm font-semibold tracking-wide uppercase">Total Reports</div>
                                </div>
                            </div>
                        </Card>

                        <Card glass className="card-premium-yellow p-6">
                            <div className="flex items-center gap-4">
                                <div className="p-4 rounded-2xl bg-yellow-500/20 shadow-lg shadow-yellow-500/20">
                                    <Clock className="text-yellow-400" size={32} />
                                </div>
                                <div>
                                    <div className="text-4xl font-extrabold text-gradient-yellow leading-none mb-1">{stats.pending}</div>
                                    <div className="text-gray-300 text-sm font-semibold tracking-wide uppercase">Under Investigation</div>
                                </div>
                            </div>
                        </Card>

                        <Card glass className="card-premium-green p-6">
                            <div className="flex items-center gap-4">
                                <div className="p-4 rounded-2xl bg-green-500/20 shadow-lg shadow-green-500/20">
                                    <CheckCircle className="text-green-400" size={32} />
                                </div>
                                <div>
                                    <div className="text-4xl font-extrabold text-gradient-green leading-none mb-1">{stats.resolved}</div>
                                    <div className="text-gray-300 text-sm font-semibold tracking-wide uppercase">Successfully Resolved</div>
                                </div>
                            </div>
                        </Card>
                    </div>

                    <div className="grid lg:grid-cols-3 gap-8">
                        {/* Left Column - Submit Complaint */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Submit Form */}
                            <Card glass className="border-indigo-500/30">
                                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                                    <Send size={24} className="text-indigo-400" />
                                    Report New Issue
                                </h2>
                                <form onSubmit={handleSubmitComplaint} className="space-y-4">
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                                                <Smartphone size={16} className="text-indigo-400" />
                                                App Name
                                            </label>
                                            <input
                                                type="text"
                                                className="input"
                                                placeholder="e.g., YouTube, Zoom, Netflix"
                                                value={appName}
                                                onChange={(e) => setAppName(e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                                                <Mobile size={16} className="text-indigo-400" />
                                                Your ISP *
                                            </label>
                                            <select
                                                className="input"
                                                value={isp}
                                                onChange={(e) => setIsp(e.target.value)}
                                                required
                                            >
                                                <option value="">Select your ISP</option>
                                                <option value="Airtel">Airtel</option>
                                                <option value="Jio">Jio</option>
                                                <option value="BSNL">BSNL</option>
                                                <option value="Vi">Vi (Vodafone Idea)</option>
                                                <option value="ACT Fibernet">ACT Fibernet</option>
                                                <option value="Hathway">Hathway</option>
                                                <option value="Excitel">Excitel</option>
                                                <option value="Other">Other</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                                                <Calendar size={16} className="text-indigo-400" />
                                                Date
                                            </label>
                                            <input
                                                type="date"
                                                className="input"
                                                value={issueDate}
                                                onChange={(e) => setIssueDate(e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                                                <Clock size={16} className="text-indigo-400" />
                                                Time
                                            </label>
                                            <input
                                                type="time"
                                                className="input"
                                                value={issueTime}
                                                onChange={(e) => setIssueTime(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-300 mb-2 block">
                                            Describe the issue you're experiencing
                                        </label>
                                        <textarea
                                            className="textarea"
                                            placeholder="e.g., Slow internet speed, frequent disconnections, high latency during video calls..."
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            rows={3}
                                            required
                                        />
                                    </div>
                                    <Button type="submit" loading={submitting} className="w-full btn-premium">
                                        <Zap size={18} />
                                        Submit Report & Run Analysis
                                    </Button>
                                </form>
                            </Card>

                            {/* Recent Complaints */}
                            <Card glass>
                                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                                    <TrendingUp size={24} className="text-indigo-400" />
                                    Recent Complaints
                                </h2>
                                <div className="space-y-3">
                                    {complaints.length === 0 ? (
                                        <div className="text-center py-8 text-gray-400">
                                            No complaints yet. Submit your first issue above.
                                        </div>
                                    ) : (
                                        complaints.slice(0, 5).map((complaint) => (
                                            <motion.div
                                                key={complaint.id}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                className="p-4 rounded-lg bg-white/5 border border-white/10 hover:border-indigo-500/50 transition-all"
                                            >
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <p className="font-bold text-lg">{complaint.description}</p>
                                                            {complaint.appName && (
                                                                <span className="app-highlight">
                                                                    {complaint.appName}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400">
                                                            <div className="flex items-center gap-1">
                                                                <Clock size={12} className="text-indigo-400" />
                                                                {formatDistanceToNow(new Date(complaint.createdAt), { addSuffix: true })}
                                                            </div>
                                                            {(complaint.issueDate || complaint.issueTime) && (
                                                                <div className="flex items-center gap-1">
                                                                    <Calendar size={12} className="text-indigo-400" />
                                                                    {complaint.issueDate ? new Date(complaint.issueDate).toLocaleDateString() : ''} {complaint.issueTime || ''}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col gap-2 items-end">
                                                        <StatusBadge status={complaint.status} />
                                                        {complaint.status === 'analyzing' && (
                                                            <div className="flex items-center gap-1 text-[10px] text-indigo-400 animate-pulse mt-1">
                                                                <div className="w-1 h-1 rounded-full bg-indigo-400"></div>
                                                                Deep Diagnostic Active
                                                            </div>
                                                        )}
                                                        {complaint.faultClassification && (
                                                            <span className={`text-xs px-3 py-1.5 rounded-lg font-bold shadow-lg border-2 mt-1 ${complaint.faultClassification === 'ISP'
                                                                ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white border-red-300 shadow-red-500/50'
                                                                : 'bg-gradient-to-r from-cyan-400 to-blue-500 text-white border-cyan-300 shadow-blue-500/50'
                                                                }`}>
                                                                {complaint.faultClassification} Fault
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                {complaint.metrics && (
                                                    <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/10">
                                                        <div className="text-center">
                                                            <div className="text-xs text-gray-400">Jitter</div>
                                                            <div className="text-sm font-semibold">{complaint.metrics.jitter ? parseFloat(complaint.metrics.jitter).toFixed(1) : 'N/A'}ms</div>
                                                        </div>
                                                        <div className="text-center">
                                                            <div className="text-xs text-gray-400">Latency</div>
                                                            <div className="text-sm font-semibold">{complaint.metrics.latency ? parseFloat(complaint.metrics.latency).toFixed(1) : 'N/A'}ms</div>
                                                        </div>
                                                        <div className="text-center">
                                                            <div className="text-xs text-gray-400">Loss</div>
                                                            <div className="text-sm font-semibold">{complaint.metrics.packetLoss ? parseFloat(complaint.metrics.packetLoss).toFixed(1) : '0.0'}%</div>
                                                        </div>
                                                    </div>
                                                )}
                                            </motion.div>
                                        ))
                                    )}
                                </div>
                            </Card>
                        </div>

                        {/* Right Column - Network Health */}
                        <div className="space-y-6">
                            {/* Network Health Overview */}
                            <Card glass>
                                <h2 className="text-xl font-bold mb-6 text-center">Network Health Overview</h2>
                                {latestMetrics ? (
                                    <div className="space-y-8">
                                        {/* Health Gauges with better spacing */}
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="flex flex-col items-center">
                                                <NetworkHealthGauge
                                                    score={latestMetrics.ispHealthScore || 95}
                                                    label="ISP Health"
                                                />
                                            </div>
                                            <div className="flex flex-col items-center">
                                                <NetworkHealthGauge
                                                    score={latestMetrics.serverHealthScore || 92}
                                                    label="Server Health"
                                                />
                                            </div>
                                        </div>

                                        {/* Metrics Grid with better spacing */}
                                        <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/10">
                                            <motion.div
                                                whileHover={{ scale: 1.05 }}
                                                className="p-4 rounded-lg bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20"
                                            >
                                                <div className="text-xs text-gray-400 mb-2">Jitter</div>
                                                <div className="text-2xl font-bold text-indigo-400">
                                                    {latestMetrics.jitter ? parseFloat(latestMetrics.jitter).toFixed(1) : 'N/A'}
                                                    <span className="text-sm ml-1">ms</span>
                                                </div>
                                            </motion.div>

                                            <motion.div
                                                whileHover={{ scale: 1.05 }}
                                                className="p-4 rounded-lg bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20"
                                            >
                                                <div className="text-xs text-gray-400 mb-2">Latency</div>
                                                <div className="text-2xl font-bold text-blue-400">
                                                    {latestMetrics.latency ? parseFloat(latestMetrics.latency).toFixed(1) : 'N/A'}
                                                    <span className="text-sm ml-1">ms</span>
                                                </div>
                                            </motion.div>

                                            <motion.div
                                                whileHover={{ scale: 1.05 }}
                                                className="p-4 rounded-lg bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/20"
                                            >
                                                <div className="text-xs text-gray-400 mb-2">Packet Loss</div>
                                                <div className="text-2xl font-bold text-red-400">
                                                    {latestMetrics.packetLoss ? parseFloat(latestMetrics.packetLoss).toFixed(1) : '0.0'}
                                                    <span className="text-sm ml-1">%</span>
                                                </div>
                                            </motion.div>

                                            <motion.div
                                                whileHover={{ scale: 1.05 }}
                                                className="p-4 rounded-lg bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20"
                                            >
                                                <div className="text-xs text-gray-400 mb-2">Bandwidth</div>
                                                <div className="text-2xl font-bold text-green-400">
                                                    {latestMetrics.bandwidth ? parseFloat(latestMetrics.bandwidth).toFixed(0) : 'N/A'}
                                                    <span className="text-sm ml-1">Mbps</span>
                                                </div>
                                            </motion.div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-12 text-gray-400">
                                        <div className="text-4xl mb-4">📊</div>
                                        <div>Submit a complaint to see network diagnostics</div>
                                    </div>
                                )}
                            </Card>

                            {/* Network Performance Chart */}
                            {latestMetrics && complaints.length > 0 && (
                                <Card glass>
                                    <h3 className="text-lg font-bold mb-4">Performance Trends</h3>
                                    <ResponsiveContainer width="100%" height={200}>
                                        <LineChart data={complaints.slice(0, 10).reverse().map((c, i) => ({
                                            name: `#${i + 1}`,
                                            latency: c.metrics?.latency || 0,
                                            jitter: c.metrics?.jitter || 0,
                                            loss: c.metrics?.packetLoss || 0
                                        }))}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                            <XAxis dataKey="name" stroke="#9ca3af" />
                                            <YAxis stroke="#9ca3af" />
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: '#1f2937',
                                                    border: '1px solid #374151',
                                                    borderRadius: '8px'
                                                }}
                                            />
                                            <Legend />
                                            <Line type="monotone" dataKey="latency" stroke="#3b82f6" strokeWidth={2} name="Latency (ms)" />
                                            <Line type="monotone" dataKey="jitter" stroke="#8b5cf6" strokeWidth={2} name="Jitter (ms)" />
                                            <Line type="monotone" dataKey="loss" stroke="#ef4444" strokeWidth={2} name="Loss (%)" />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </Card>
                            )}

                            {/* Connection Quality Indicator */}
                            {latestMetrics && (
                                <Card glass>
                                    <h3 className="text-lg font-bold mb-4">Connection Quality</h3>
                                    <div className="space-y-3">
                                        <div>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="text-gray-400">Stability</span>
                                                <span className="font-semibold">
                                                    {latestMetrics.jitter < 30 ? 'Excellent' : latestMetrics.jitter < 50 ? 'Good' : 'Poor'}
                                                </span>
                                            </div>
                                            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${Math.max(0, 100 - (latestMetrics.jitter || 0))}%` }}
                                                    className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="text-gray-400">Speed</span>
                                                <span className="font-semibold">
                                                    {latestMetrics.latency < 50 ? 'Fast' : latestMetrics.latency < 100 ? 'Moderate' : 'Slow'}
                                                </span>
                                            </div>
                                            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${Math.max(0, 100 - (latestMetrics.latency || 0) / 2)}%` }}
                                                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="text-gray-400">Reliability</span>
                                                <span className="font-semibold">
                                                    {latestMetrics.packetLoss < 1 ? 'Excellent' : latestMetrics.packetLoss < 3 ? 'Good' : 'Poor'}
                                                </span>
                                            </div>
                                            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${Math.max(0, 100 - (latestMetrics.packetLoss || 0) * 10)}%` }}
                                                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default UserDashboard;
