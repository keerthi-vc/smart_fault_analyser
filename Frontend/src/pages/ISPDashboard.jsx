import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle, Clock, TrendingUp, PieChart, Filter, Activity } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { complaintsAPI, analyticsAPI } from '../utils/api';
import { LineChart, Line, PieChart as RechartsPie, Pie, Cell, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Card from '../components/Card';
import Button from '../components/Button';
import StatusBadge from '../components/StatusBadge';
import ISPHealthBoard from '../components/ISPHealthBoard';
import { showIssueResolvedToast } from '../components/CustomToasts';
import Navbar from '../components/Navbar';
import Loader from '../components/Loader';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

const ISPDashboard = () => {
    const { user } = useAuth();
    const [complaints, setComplaints] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [selectedComplaint, setSelectedComplaint] = useState(null);

    useEffect(() => {
        fetchData();
    }, [filter]);

    const fetchData = async () => {
        try {
            const [complaintsRes, statsRes] = await Promise.all([
                complaintsAPI.getAll({ status: filter === 'all' ? undefined : filter, limit: 50 }),
                analyticsAPI.getStats()
            ]);

            setComplaints(complaintsRes.data.complaints);
            setStats(statsRes.data);
        } catch (error) {
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateComplaint = async (id, updates) => {
        try {
            await complaintsAPI.update(id, updates);

            // Show custom toast for resolution
            if (updates.status === 'resolved') {
                showIssueResolvedToast(updates);
            } else {
                toast.success('Complaint updated successfully');
            }

            fetchData();
            setSelectedComplaint(null);
        } catch (error) {
            toast.error('Failed to update complaint');
        }
    };

    const quickResolve = async (complaint) => {
        await handleUpdateComplaint(complaint.id, {
            status: 'resolved',
            resolutionNotes: `Automatically resolved - ${complaint.faultClassification} fault confirmed`
        });
    };

    if (loading) {
        return (
            <>
                <Navbar />
                <Loader fullScreen />
            </>
        );
    }

    const pieData = [
        { name: 'ISP Faults', value: parseInt(stats?.isp_faults || 0), color: '#ef4444' },
        { name: 'App Faults', value: parseInt(stats?.app_faults || 0), color: '#3b82f6' }
    ];

    const filteredComplaints = complaints.filter(c => {
        if (filter === 'all') return true;
        return c.status === filter;
    });

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
                        <h1 className="text-5xl font-black mb-3 bg-gradient-to-r from-[#00E5FF] via-[#FF00FF] to-[#FF3366] bg-clip-text text-transparent">
                            ISP Control Center
                        </h1>
                        <p className="text-xl font-semibold bg-gradient-to-r from-[#FFD700] to-[#FF9500] bg-clip-text text-transparent">Monitor and manage network complaints in real-time</p>
                    </motion.div>

                    {/* Stats Overview */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                        <Card glass className="card-premium-indigo p-6">
                            <div className="flex items-center gap-4">
                                <div className="p-4 rounded-2xl bg-indigo-500/20 shadow-lg shadow-indigo-500/20">
                                    <AlertTriangle className="text-indigo-400" size={32} />
                                </div>
                                <div>
                                    <div className="text-4xl font-extrabold text-gradient-indigo leading-none mb-1">{stats?.total_complaints || 0}</div>
                                    <div className="text-[#00E5FF] text-sm font-bold tracking-wider uppercase">Total Tickets</div>
                                </div>
                            </div>
                        </Card>

                        <Card glass className="card-premium-yellow p-6">
                            <div className="flex items-center gap-4">
                                <div className="p-4 rounded-2xl bg-yellow-500/20 shadow-lg shadow-yellow-500/20">
                                    <Clock className="text-yellow-400" size={32} />
                                </div>
                                <div>
                                    <div className="text-4xl font-extrabold text-gradient-yellow leading-none mb-1">{stats?.pending_complaints || 0}</div>
                                    <div className="text-[#FFD700] text-sm font-bold tracking-wider uppercase">Under Review</div>
                                </div>
                            </div>
                        </Card>

                        <Card glass className="card-premium-green p-6">
                            <div className="flex items-center gap-4">
                                <div className="p-4 rounded-2xl bg-green-500/20 shadow-lg shadow-green-500/20">
                                    <CheckCircle className="text-green-400" size={32} />
                                </div>
                                <div>
                                    <div className="text-4xl font-extrabold text-gradient-green leading-none mb-1">{stats?.resolved_complaints || 0}</div>
                                    <div className="text-[#00FF00] text-sm font-bold tracking-wider uppercase">Solved</div>
                                </div>
                            </div>
                        </Card>

                        <Card glass className="card-premium-purple p-6">
                            <div className="flex items-center gap-4">
                                <div className="p-4 rounded-2xl bg-purple-500/20 shadow-lg shadow-purple-500/20">
                                    <TrendingUp className="text-purple-400" size={32} />
                                </div>
                                <div>
                                    <div className="text-4xl font-extrabold text-gradient-purple leading-none mb-1">{stats?.avg_resolution_hours ? parseFloat(stats.avg_resolution_hours).toFixed(1) : 'N/A'}</div>
                                    <div className="text-[#FF00FF] text-sm font-bold tracking-wider uppercase">Avg Solve Time</div>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Network Performance Charts - Vibrant Multi-Color */}
                    <div className="grid lg:grid-cols-2 gap-6 mb-8">
                        {/* Network Traffic Chart - Cyan & Red */}
                        <Card glass className="p-6">
                            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <Activity className="text-[#00E5FF]" size={24} />
                                <span className="text-white">Network Traffic Report</span>
                            </h3>
                            <ResponsiveContainer width="100%" height={250}>
                                <AreaChart data={[
                                    { time: 'Jan 20', received: 5, transmitted: 8 },
                                    { time: 'Jan 21', received: 12, transmitted: 15 },
                                    { time: 'Jan 22', received: 8, transmitted: 12 },
                                    { time: 'Jan 23', received: 15, transmitted: 10 },
                                    { time: 'Jan 24', received: 18, transmitted: 45 },
                                    { time: 'Jan 25', received: 10, transmitted: 20 },
                                    { time: 'Jan 26', received: 14, transmitted: 18 }
                                ]}>
                                    <defs>
                                        <linearGradient id="colorReceived" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#00E5FF" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#00E5FF" stopOpacity={0.1} />
                                        </linearGradient>
                                        <linearGradient id="colorTransmitted" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#FF3366" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#FF3366" stopOpacity={0.1} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#2d3e50" />
                                    <XAxis dataKey="time" stroke="#ffffff60" />
                                    <YAxis stroke="#ffffff60" />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1a2332', border: '1px solid #2d3e50', borderRadius: '8px' }}
                                        labelStyle={{ color: '#00E5FF' }}
                                    />
                                    <Legend />
                                    <Area type="monotone" dataKey="received" stroke="#00E5FF" strokeWidth={3} fillOpacity={1} fill="url(#colorReceived)" name="Received (Mbps)" />
                                    <Area type="monotone" dataKey="transmitted" stroke="#FF3366" strokeWidth={3} fillOpacity={1} fill="url(#colorTransmitted)" name="Transmitted (Mbps)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </Card>

                        {/* Latency Trends - Purple & Yellow */}
                        <Card glass className="p-6">
                            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <TrendingUp className="text-[#FF00FF]" size={24} />
                                <span className="text-white">Latency Trends</span>
                            </h3>
                            <ResponsiveContainer width="100%" height={250}>
                                <LineChart data={[
                                    { time: 'Jan 20', latency: 45, target: 50 },
                                    { time: 'Jan 21', latency: 52, target: 50 },
                                    { time: 'Jan 22', latency: 48, target: 50 },
                                    { time: 'Jan 23', latency: 65, target: 50 },
                                    { time: 'Jan 24', latency: 42, target: 50 },
                                    { time: 'Jan 25', latency: 55, target: 50 },
                                    { time: 'Jan 26', latency: 38, target: 50 }
                                ]}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#2d3e50" />
                                    <XAxis dataKey="time" stroke="#ffffff60" />
                                    <YAxis stroke="#ffffff60" />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1a2332', border: '1px solid #2d3e50', borderRadius: '8px' }}
                                        labelStyle={{ color: '#FF00FF' }}
                                    />
                                    <Legend />
                                    <Line type="monotone" dataKey="latency" stroke="#FF00FF" strokeWidth={3} dot={{ fill: '#FF00FF', r: 5 }} name="Latency (ms)" />
                                    <Line type="monotone" dataKey="target" stroke="#FFD700" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Target (ms)" />
                                </LineChart>
                            </ResponsiveContainer>
                        </Card>

                        {/* Packet Loss Analysis - Red */}
                        <Card glass className="p-6">
                            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <AlertTriangle className="text-[#FF3366]" size={24} />
                                <span className="text-white">Packet Loss Analysis</span>
                            </h3>
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={[
                                    { time: 'Jan 20', loss: 0.2 },
                                    { time: 'Jan 21', loss: 0.5 },
                                    { time: 'Jan 22', loss: 0.1 },
                                    { time: 'Jan 23', loss: 1.2 },
                                    { time: 'Jan 24', loss: 0.3 },
                                    { time: 'Jan 25', loss: 0.8 },
                                    { time: 'Jan 26', loss: 0.4 }
                                ]}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#2d3e50" />
                                    <XAxis dataKey="time" stroke="#ffffff60" />
                                    <YAxis stroke="#ffffff60" />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1a2332', border: '1px solid #2d3e50', borderRadius: '8px' }}
                                        labelStyle={{ color: '#FF3366' }}
                                    />
                                    <Legend />
                                    <Bar dataKey="loss" fill="#FF3366" name="Packet Loss %" radius={[8, 8, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </Card>

                        {/* Jitter Analysis - Green & Cyan */}
                        <Card glass className="p-6">
                            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <Activity className="text-[#00FF00]" size={24} />
                                <span className="text-white">Jitter Analysis</span>
                            </h3>
                            <ResponsiveContainer width="100%" height={250}>
                                <AreaChart data={[
                                    { time: 'Jan 20', jitter: 2.5, avg: 3.0 },
                                    { time: 'Jan 21', jitter: 3.2, avg: 3.0 },
                                    { time: 'Jan 22', jitter: 2.8, avg: 3.0 },
                                    { time: 'Jan 23', jitter: 4.1, avg: 3.0 },
                                    { time: 'Jan 24', jitter: 2.1, avg: 3.0 },
                                    { time: 'Jan 25', jitter: 3.5, avg: 3.0 },
                                    { time: 'Jan 26', jitter: 2.9, avg: 3.0 }
                                ]}>
                                    <defs>
                                        <linearGradient id="colorJitter" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#00FF00" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#00FF00" stopOpacity={0.1} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#2d3e50" />
                                    <XAxis dataKey="time" stroke="#ffffff60" />
                                    <YAxis stroke="#ffffff60" />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1a2332', border: '1px solid #2d3e50', borderRadius: '8px' }}
                                        labelStyle={{ color: '#00FF00' }}
                                    />
                                    <Legend />
                                    <Area type="monotone" dataKey="jitter" stroke="#00FF00" strokeWidth={3} fillOpacity={1} fill="url(#colorJitter)" name="Jitter (ms)" />
                                    <Line type="monotone" dataKey="avg" stroke="#00E5FF" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Average (ms)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </Card>
                    </div>

                    <div className="grid lg:grid-cols-3 gap-8">
                        {/* Complaints List */}
                        <div className="lg:col-span-2">
                            <Card glass>
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-3xl font-black flex items-center gap-3">
                                        <Filter size={28} className="text-[#00E5FF]" />
                                        <span className="bg-gradient-to-r from-[#00E5FF] to-[#FF00FF] bg-clip-text text-transparent">
                                            Complaint Queue
                                        </span>
                                    </h2>
                                    <div className="flex gap-2">
                                        {['all', 'pending', 'analyzing', 'resolved'].map((f) => (
                                            <button
                                                key={f}
                                                onClick={() => setFilter(f)}
                                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filter === f
                                                    ? 'bg-gradient-to-r from-[#00E5FF] to-[#00B8D4] text-white shadow-lg shadow-cyan-500/50'
                                                    : 'bg-white/5 text-gray-300 hover:bg-gradient-to-r hover:from-[#FF00FF]/20 hover:to-[#FF3366]/20 hover:text-white'
                                                    }`}
                                            >
                                                {f.charAt(0).toUpperCase() + f.slice(1)}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2">
                                    {filteredComplaints.length === 0 ? (
                                        <div className="text-center py-8 text-gray-400">
                                            No complaints found
                                        </div>
                                    ) : (
                                        filteredComplaints.map((complaint, index) => (
                                            <div key={complaint.id}>
                                                <motion.div
                                                    initial={{ opacity: 0, x: -20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    className="rounded-xl bg-[#1a2332] border-2 border-[#2d3e50] hover:border-cyan-400/50 hover:shadow-xl hover:shadow-cyan-500/20 transition-all overflow-hidden"
                                                >
                                                    {/* Header Section - Dark Navy with Cyan Accents */}
                                                    <div className="bg-gradient-to-r from-[#0f1923] to-[#1a2332] px-6 py-5 border-b-2 border-[#2d3e50]">
                                                        <div className="flex justify-between items-center">
                                                            <div className="flex items-center gap-5">
                                                                <span className="text-lg font-bold text-[#00E5FF] tracking-wide">TICKET #{complaint.id}</span>
                                                                <div className="h-5 w-px bg-white/20"></div>
                                                                <span className="text-base text-[#FF3366] font-bold">{complaint.userFullName}</span>
                                                                {complaint.appName && (
                                                                    <>
                                                                        <div className="h-5 w-px bg-white/20"></div>
                                                                        <span className="text-sm px-4 py-1.5 rounded bg-orange-500/40 text-[#FF9500] font-bold border-2 border-orange-400/60">
                                                                            {complaint.appName}
                                                                        </span>
                                                                    </>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                <StatusBadge status={complaint.status} />
                                                                <StatusBadge priority={complaint.priority} />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Description Section - White Text on Dark */}
                                                    <div className="px-6 py-5 bg-[#0f1923]">
                                                        <p className="text-base text-white/95 leading-relaxed">{complaint.description}</p>
                                                    </div>

                                                    {/* Metadata Row - Cyan and Red Accents */}
                                                    <div className="px-6 py-4 bg-[#1a2332] border-y-2 border-[#2d3e50] flex items-center justify-between">
                                                        <div className="flex items-center gap-8 text-sm">
                                                            <div className="flex items-center gap-2.5 text-[#FFD700]">
                                                                <Clock size={16} className="text-[#FFD700]" />
                                                                <span className="font-semibold">{formatDistanceToNow(new Date(complaint.createdAt), { addSuffix: true })}</span>
                                                            </div>
                                                            {(complaint.issueDate || complaint.issueTime) && (
                                                                <>
                                                                    <div className="h-4 w-px bg-white/20"></div>
                                                                    <div className="flex items-center gap-2.5 text-[#FF3366]">
                                                                        <TrendingUp size={16} className="text-[#FF3366]" />
                                                                        <span className="font-semibold">
                                                                            {complaint.issueDate ? new Date(complaint.issueDate).toLocaleDateString() : ''} {complaint.issueTime || ''}
                                                                        </span>
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>

                                                        {/* Fault Classification - Vibrant Badge */}
                                                        {complaint.faultClassification && (
                                                            <div className="flex items-center gap-4">
                                                                {complaint.status === 'analyzing' && (
                                                                    <div className="flex items-center gap-2 text-sm text-[#00E5FF] font-semibold">
                                                                        <div className="w-2.5 h-2.5 rounded-full bg-[#00E5FF] animate-pulse shadow-lg shadow-cyan-500/50"></div>
                                                                        <span>ANALYZING</span>
                                                                    </div>
                                                                )}
                                                                <span className={`text-sm px-5 py-2 rounded font-bold uppercase tracking-wide ${complaint.faultClassification === 'ISP'
                                                                    ? 'bg-red-500/40 text-[#FF3366] border-2 border-red-400/80 shadow-lg shadow-red-500/30'
                                                                    : 'bg-cyan-500/40 text-[#00E5FF] border-2 border-cyan-400/80 shadow-lg shadow-cyan-500/30'
                                                                    }`}>
                                                                    {complaint.faultClassification} FAULT
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Network Metrics - Clean Grid Layout with Better Spacing */}
                                                    {complaint.metrics && (
                                                        <div className="px-8 py-6 bg-[#0f1923] border-b-2 border-[#2d3e50]">
                                                            <div className="text-sm text-[#00E5FF] font-bold uppercase tracking-wider mb-5 flex items-center gap-2">
                                                                <Activity size={16} className="text-[#00E5FF]" />
                                                                NETWORK DIAGNOSTICS
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-x-16 gap-y-6">
                                                                <div>
                                                                    <div className="text-xs text-[#00FF00] font-bold mb-2 uppercase tracking-wider">Jitter</div>
                                                                    <div className="text-2xl font-bold text-white">
                                                                        {complaint.metrics.jitter ? parseFloat(complaint.metrics.jitter).toFixed(1) : 'N/A'}
                                                                        <span className="text-base text-[#00FF00]/80 ml-2">ms</span>
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <div className="text-xs text-[#00E5FF] font-bold mb-2 uppercase tracking-wider">Latency</div>
                                                                    <div className="text-2xl font-bold text-white">
                                                                        {complaint.metrics.latency ? parseFloat(complaint.metrics.latency).toFixed(1) : 'N/A'}
                                                                        <span className="text-base text-[#00E5FF]/80 ml-2">ms</span>
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <div className="text-xs text-[#FF3366] font-bold mb-2 uppercase tracking-wider">Packet Loss</div>
                                                                    <div className="text-2xl font-bold text-white">
                                                                        {complaint.metrics.packetLoss ? parseFloat(complaint.metrics.packetLoss).toFixed(1) : '0.0'}
                                                                        <span className="text-base text-[#FF3366]/80 ml-2">%</span>
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <div className="text-xs text-[#FF00FF] font-bold mb-2 uppercase tracking-wider">Health Score</div>
                                                                    <div className={`text-2xl font-bold ${complaint.metrics.ispHealthScore >= 80 ? 'text-[#00FF00]' :
                                                                        complaint.metrics.ispHealthScore >= 60 ? 'text-[#FFD700]' : 'text-[#FF3366]'
                                                                        }`}>
                                                                        {complaint.metrics.ispHealthScore || 0}
                                                                        <span className="text-base text-white/50 ml-2">/ 100</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Actions Section - Cyan Buttons */}
                                                    {complaint.status !== 'resolved' && complaint.status !== 'closed' && (
                                                        <div className="px-6 py-5 bg-[#1a2332] border-t-2 border-[#2d3e50]">
                                                            <div className="flex gap-3">
                                                                <Button
                                                                    size="sm"
                                                                    variant="primary"
                                                                    onClick={() => quickResolve(complaint)}
                                                                >
                                                                    <CheckCircle size={16} />
                                                                    Quick Resolve
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="secondary"
                                                                    onClick={() => handleUpdateComplaint(complaint.id, { status: 'analyzing' })}
                                                                >
                                                                    Mark Analyzing
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </motion.div>
                                                {/* Separator Line */}
                                                {index < filteredComplaints.length - 1 && (
                                                    <div className="my-8">
                                                        <div className="h-[3px] bg-gradient-to-r from-transparent via-[#00E5FF] to-transparent opacity-60"></div>
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </Card>
                        </div>

                        {/* Analytics */}
                        <div className="space-y-6">
                            {/* ISP Health Board */}
                            <Card glass>
                                <ISPHealthBoard complaints={complaints} />
                            </Card>

                            {/* Fault Distribution - Enhanced */}
                            <Card glass>
                                <div className="space-y-4">
                                    <h3 className="text-2xl font-black mb-4 flex items-center gap-3">
                                        <div className="relative">
                                            <PieChart size={24} className="text-[#FF3366]" />
                                            <motion.div
                                                className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-[#00E5FF] rounded-full"
                                                animate={{ scale: [1, 1.5, 1], opacity: [1, 0.3, 1] }}
                                                transition={{ duration: 2, repeat: Infinity }}
                                            />
                                        </div>
                                        <span className="bg-gradient-to-r from-[#FF3366] to-[#00E5FF] bg-clip-text text-transparent">
                                            Fault Distribution
                                        </span>
                                    </h3>

                                    {pieData.some(d => d.value > 0) ? (
                                        <>
                                            <div className="relative">
                                                <ResponsiveContainer width="100%" height={220}>
                                                    <RechartsPie>
                                                        <defs>
                                                            <linearGradient id="ispGradient" x1="0" y1="0" x2="1" y2="1">
                                                                <stop offset="0%" stopColor="#ef4444" stopOpacity={0.9} />
                                                                <stop offset="100%" stopColor="#dc2626" stopOpacity={1} />
                                                            </linearGradient>
                                                            <linearGradient id="appGradient" x1="0" y1="0" x2="1" y2="1">
                                                                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.9} />
                                                                <stop offset="100%" stopColor="#2563eb" stopOpacity={1} />
                                                            </linearGradient>
                                                        </defs>
                                                        <Pie
                                                            data={pieData}
                                                            cx="50%"
                                                            cy="50%"
                                                            innerRadius={65}
                                                            outerRadius={90}
                                                            paddingAngle={4}
                                                            dataKey="value"
                                                            strokeWidth={3}
                                                            stroke="rgba(255,255,255,0.1)"
                                                        >
                                                            {pieData.map((entry, index) => (
                                                                <Cell
                                                                    key={`cell-${index}`}
                                                                    fill={index === 0 ? 'url(#ispGradient)' : 'url(#appGradient)'}
                                                                />
                                                            ))}
                                                        </Pie>
                                                        <Tooltip
                                                            contentStyle={{
                                                                backgroundColor: 'rgba(17, 24, 39, 0.95)',
                                                                border: '1px solid rgba(99, 102, 241, 0.3)',
                                                                borderRadius: '12px',
                                                                padding: '8px 12px',
                                                                backdropFilter: 'blur(10px)'
                                                            }}
                                                        />
                                                    </RechartsPie>
                                                </ResponsiveContainer>

                                                {/* Center text */}
                                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                    <div className="text-center">
                                                        <div className="text-4xl font-black text-white tabular-nums">
                                                            {pieData.reduce((sum, d) => sum + d.value, 0)}
                                                        </div>
                                                        <div className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold mt-1">
                                                            Total Faults
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                {pieData.map((item, index) => {
                                                    const total = pieData.reduce((sum, d) => sum + d.value, 0);
                                                    const percentage = total > 0 ? (item.value / total * 100) : 0;

                                                    return (
                                                        <motion.div
                                                            key={item.name}
                                                            initial={{ opacity: 0, x: -20 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            transition={{ delay: index * 0.1 }}
                                                            className="bg-gradient-to-r from-white/5 to-white/[0.02] rounded-xl p-3 border border-white/10 hover:border-white/20 transition-all"
                                                        >
                                                            <div className="flex justify-between items-center mb-2">
                                                                <div className="flex items-center gap-2">
                                                                    <motion.div
                                                                        className="w-3 h-3 rounded-full shadow-lg"
                                                                        style={{
                                                                            backgroundColor: item.color,
                                                                            boxShadow: `0 0 10px ${item.color}60`
                                                                        }}
                                                                        animate={{ scale: [1, 1.2, 1] }}
                                                                        transition={{ duration: 2, repeat: Infinity, delay: index * 0.5 }}
                                                                    />
                                                                    <span className="text-sm font-semibold text-gray-200">{item.name}</span>
                                                                </div>
                                                                <div className="flex items-center gap-3">
                                                                    <span className="text-xs text-gray-400 tabular-nums">
                                                                        {percentage.toFixed(1)}%
                                                                    </span>
                                                                    <span className="text-lg font-bold tabular-nums" style={{ color: item.color }}>
                                                                        {item.value}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="w-full bg-gray-700/50 rounded-full h-2 overflow-hidden">
                                                                <motion.div
                                                                    className="h-full rounded-full"
                                                                    style={{
                                                                        background: `linear-gradient(90deg, ${item.color}, ${item.color}dd)`,
                                                                        boxShadow: `0 0 8px ${item.color}40`
                                                                    }}
                                                                    initial={{ width: 0 }}
                                                                    animate={{ width: `${percentage}%` }}
                                                                    transition={{ duration: 1, delay: index * 0.2, ease: "easeOut" }}
                                                                />
                                                            </div>
                                                        </motion.div>
                                                    );
                                                })}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-center py-8">
                                            <div className="inline-flex items-center gap-2 text-sm text-gray-400">
                                                <PieChart size={16} className="opacity-50" />
                                                <span>No fault data available</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </Card>

                            {/* ISP Comparison Chart */}
                            <Card glass>
                                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                                    <TrendingUp size={20} className="text-cyan-400" />
                                    <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                                        ISP Performance Comparison
                                    </span>
                                </h3>
                                {(() => {
                                    const ispComparison = {};
                                    complaints.forEach(c => {
                                        if (!c.isp) return;
                                        if (!ispComparison[c.isp]) {
                                            ispComparison[c.isp] = { name: c.isp, ispFaults: 0, appFaults: 0, resolved: 0 };
                                        }
                                        if (c.faultClassification === 'ISP') ispComparison[c.isp].ispFaults++;
                                        if (c.faultClassification === 'App') ispComparison[c.isp].appFaults++;
                                        if (c.status === 'resolved') ispComparison[c.isp].resolved++;
                                    });
                                    const chartData = Object.values(ispComparison);

                                    return chartData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height={250}>
                                            <BarChart data={chartData}>
                                                <defs>
                                                    <linearGradient id="barIspGradient" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor="#ef4444" stopOpacity={0.9} />
                                                        <stop offset="100%" stopColor="#dc2626" stopOpacity={0.7} />
                                                    </linearGradient>
                                                    <linearGradient id="barAppGradient" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.9} />
                                                        <stop offset="100%" stopColor="#2563eb" stopOpacity={0.7} />
                                                    </linearGradient>
                                                    <linearGradient id="barResolvedGradient" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                                                        <stop offset="100%" stopColor="#059669" stopOpacity={0.7} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                                <XAxis dataKey="name" stroke="#9ca3af" style={{ fontSize: '12px' }} />
                                                <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
                                                <Tooltip
                                                    contentStyle={{
                                                        backgroundColor: 'rgba(17, 24, 39, 0.95)',
                                                        border: '1px solid rgba(99, 102, 241, 0.3)',
                                                        borderRadius: '12px',
                                                        padding: '8px 12px'
                                                    }}
                                                />
                                                <Legend />
                                                <Bar dataKey="ispFaults" fill="url(#barIspGradient)" name="ISP Faults" radius={[8, 8, 0, 0]} />
                                                <Bar dataKey="appFaults" fill="url(#barAppGradient)" name="App Faults" radius={[8, 8, 0, 0]} />
                                                <Bar dataKey="resolved" fill="url(#barResolvedGradient)" name="Resolved" radius={[8, 8, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="text-center py-8 text-gray-400">No comparison data available</div>
                                    );
                                })()}
                            </Card>

                            {/* Network Performance Trend */}
                            <Card glass>
                                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                                    <Activity size={20} className="text-purple-400" />
                                    <span className="bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                                        Network Performance Trend
                                    </span>
                                </h3>
                                {(() => {
                                    const trendData = complaints
                                        .filter(c => c.metrics && c.createdAt)
                                        .slice(-10)
                                        .map((c, idx) => ({
                                            index: idx + 1,
                                            latency: parseFloat(c.metrics.latency) || 0,
                                            jitter: parseFloat(c.metrics.jitter) || 0,
                                            packetLoss: parseFloat(c.metrics.packetLoss) || 0
                                        }));

                                    return trendData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height={250}>
                                            <AreaChart data={trendData}>
                                                <defs>
                                                    <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1} />
                                                    </linearGradient>
                                                    <linearGradient id="jitterGradient" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#ec4899" stopOpacity={0.8} />
                                                        <stop offset="95%" stopColor="#ec4899" stopOpacity={0.1} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                                <XAxis dataKey="index" stroke="#9ca3af" style={{ fontSize: '12px' }} />
                                                <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
                                                <Tooltip
                                                    contentStyle={{
                                                        backgroundColor: 'rgba(17, 24, 39, 0.95)',
                                                        border: '1px solid rgba(99, 102, 241, 0.3)',
                                                        borderRadius: '12px',
                                                        padding: '8px 12px'
                                                    }}
                                                />
                                                <Legend />
                                                <Area type="monotone" dataKey="latency" stroke="#8b5cf6" fillOpacity={1} fill="url(#latencyGradient)" name="Latency (ms)" />
                                                <Area type="monotone" dataKey="jitter" stroke="#ec4899" fillOpacity={1} fill="url(#jitterGradient)" name="Jitter (ms)" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="text-center py-8 text-gray-400">No trend data available</div>
                                    );
                                })()}
                            </Card>

                            {/* Quick Stats - Enhanced */}
                            <Card glass>
                                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                                    <CheckCircle size={20} className="text-emerald-400" />
                                    <span className="bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent">
                                        Performance Metrics
                                    </span>
                                </h3>
                                <div className="space-y-3">
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.1 }}
                                        className="relative overflow-hidden rounded-xl p-4 bg-gradient-to-br from-emerald-500/10 to-green-500/5 border border-emerald-500/20"
                                    >
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm text-gray-300 font-medium">Resolution Rate</span>
                                            <span className="text-2xl font-black text-emerald-400 tabular-nums">
                                                {stats?.total_complaints > 0
                                                    ? ((stats.resolved_complaints / stats.total_complaints) * 100).toFixed(1)
                                                    : 0}%
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-700/50 rounded-full h-2 overflow-hidden">
                                            <motion.div
                                                className="h-full bg-gradient-to-r from-emerald-500 to-green-500 rounded-full shadow-lg shadow-emerald-500/50"
                                                initial={{ width: 0 }}
                                                animate={{ width: `${stats?.total_complaints > 0 ? ((stats.resolved_complaints / stats.total_complaints) * 100) : 0}%` }}
                                                transition={{ duration: 1.5, ease: "easeOut" }}
                                            />
                                        </div>
                                    </motion.div>

                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.2 }}
                                        className="relative overflow-hidden rounded-xl p-4 bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border border-blue-500/20"
                                    >
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-300 font-medium">Under Analysis</span>
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                                                <span className="text-2xl font-black text-blue-400 tabular-nums">
                                                    {stats?.analyzing_complaints || 0}
                                                </span>
                                            </div>
                                        </div>
                                    </motion.div>

                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.3 }}
                                        className="relative overflow-hidden rounded-xl p-4 bg-gradient-to-br from-rose-500/10 to-red-500/5 border border-rose-500/20"
                                    >
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm text-gray-300 font-medium">ISP Fault Rate</span>
                                            <span className="text-2xl font-black text-rose-400 tabular-nums">
                                                {stats?.total_complaints > 0
                                                    ? ((stats.isp_faults / stats.total_complaints) * 100).toFixed(1)
                                                    : 0}%
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-700/50 rounded-full h-2 overflow-hidden">
                                            <motion.div
                                                className="h-full bg-gradient-to-r from-rose-500 to-red-500 rounded-full shadow-lg shadow-rose-500/50"
                                                initial={{ width: 0 }}
                                                animate={{ width: `${stats?.total_complaints > 0 ? ((stats.isp_faults / stats.total_complaints) * 100) : 0}%` }}
                                                transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
                                            />
                                        </div>
                                    </motion.div>
                                </div>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ISPDashboard;
