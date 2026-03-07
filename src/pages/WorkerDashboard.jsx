import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocket } from '../context/SocketContext.jsx';
import toast from 'react-hot-toast';

const statusBadge = (status) => {
    if (status === 'pending') return 'bg-accentRed/20 text-accentRed';
    if (status === 'assigned') return 'bg-yellow-400/20 text-yellow-300';
    if (status === 'pending_confirmation') return 'bg-amber-400/20 text-amber-300';
    return 'bg-emerald-500/20 text-emerald-300';
};

const statusLabel = (status) => {
    if (status === 'pending_confirmation') return 'Awaiting User Confirm';
    return status;
};

const WorkerDashboard = () => {
    const { user } = useAuth();
    const { socket } = useSocket();
    const [profile, setProfile] = useState(null);
    const [alerts, setAlerts] = useState([]);
    const [filter, setFilter] = useState('active');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [profileRes, alertsRes] = await Promise.all([
                    api.get('/workers/me'),
                    api.get('/workers/me/alerts'),
                ]);
                setProfile(profileRes.data);
                setAlerts(alertsRes.data);
            } catch (err) {
                if (err.response?.status === 404) {
                    toast.error('Worker profile not found. Contact admin.');
                }
            }
        };
        fetchData();
    }, []);

    // Listen for new assignments via socket
    useEffect(() => {
        if (!socket) return undefined;
        const handleUpdate = ({ alertId, status }) => {
            setAlerts((prev) =>
                prev.map((a) => (a._id === alertId ? { ...a, status } : a))
            );
            if (status === 'assigned') {
                toast('New alert assigned to you!', { icon: '🚨', duration: 6000 });
                // Refetch to get the new alert
                api.get('/workers/me/alerts').then((res) => setAlerts(res.data)).catch(() => { });
            }
        };
        socket.on('sos-updated', handleUpdate);
        return () => { socket.off('sos-updated', handleUpdate); };
    }, [socket]);

    const activeAlerts = alerts.filter((a) => a.status !== 'resolved');
    const resolvedAlerts = alerts.filter((a) => a.status === 'resolved');
    const displayedAlerts = filter === 'active' ? activeAlerts : resolvedAlerts;

    return (
        <div className="pt-4 pb-10">
            <div className="max-w-5xl mx-auto px-4 space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
                    <div>
                        <p className="font-rajdhani text-xs uppercase tracking-[0.26em] text-accentBlue">
                            Field Responder Console
                        </p>
                        <h2 className="font-rajdhani text-3xl font-semibold mt-1">
                            Welcome, <span className="gradient-text">{user?.name || 'Worker'}</span>
                        </h2>
                        <p className="text-xs text-gray-400 mt-1">
                            View and manage your assigned emergency response tasks.
                        </p>
                    </div>
                    {profile && (
                        <div className="glass-card px-4 py-3 text-right hover-lift">
                            <p className="text-[10px] text-gray-400 uppercase tracking-[0.16em]">Area</p>
                            <p className="font-rajdhani text-lg font-semibold">{profile.area}</p>
                            <p className={`text-[11px] font-semibold ${profile.available ? 'text-emerald-400' : 'text-yellow-400'}`}>
                                {profile.available ? '✓ Available' : '◆ Busy'}
                            </p>
                        </div>
                    )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="glass-card px-4 py-3 hover-lift">
                        <p className="text-[10px] text-gray-400 uppercase tracking-[0.16em]">Total Assigned</p>
                        <p className="font-rajdhani text-2xl font-bold mt-1">{alerts.length}</p>
                        <div className="mt-2 h-1 rounded-full bg-gradient-to-r from-accentBlue to-blue-700" />
                    </div>
                    <div className="glass-card px-4 py-3 hover-lift">
                        <p className="text-[10px] text-gray-400 uppercase tracking-[0.16em]">Active</p>
                        <p className="font-rajdhani text-2xl font-bold mt-1 text-accentRed">{activeAlerts.length}</p>
                        <div className="mt-2 h-1 rounded-full bg-gradient-to-r from-accentRed to-red-700" />
                    </div>
                    <div className="glass-card px-4 py-3 hover-lift">
                        <p className="text-[10px] text-gray-400 uppercase tracking-[0.16em]">Resolved</p>
                        <p className="font-rajdhani text-2xl font-bold mt-1 text-emerald-400">{resolvedAlerts.length}</p>
                        <div className="mt-2 h-1 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-700" />
                    </div>
                </div>

                {/* Filter tabs */}
                <div className="flex gap-2">
                    {[
                        { key: 'active', label: `Active Alerts (${activeAlerts.length})` },
                        { key: 'resolved', label: `Resolved (${resolvedAlerts.length})` },
                    ].map((tab) => (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => setFilter(tab.key)}
                            className={`px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-[0.16em] transition ${filter === tab.key
                                    ? 'bg-accentBlue/15 text-accentBlue border border-accentBlue/40'
                                    : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Alerts list */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={filter}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-3"
                    >
                        {displayedAlerts.length === 0 ? (
                            <div className="glass-card px-4 py-8 text-center text-xs text-gray-400">
                                {filter === 'active'
                                    ? 'No active alerts assigned to you. You\'re all clear! ✅'
                                    : 'No resolved alerts yet.'}
                            </div>
                        ) : (
                            displayedAlerts.map((alert) => (
                                <div key={alert._id} className="glass-card p-4 hover-lift transition">
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                {alert.status !== 'resolved' && (
                                                    <span className="h-2 w-2 rounded-full bg-accentRed animate-pulse" />
                                                )}
                                                <p className="font-rajdhani font-semibold text-lg">{alert.userName}</p>
                                            </div>
                                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
                                                <span>📞 <a href={`tel:${alert.userPhone}`} className="text-accentBlue hover:underline">{alert.userPhone}</a></span>
                                                <span>📍 {alert.location?.address || `${alert.location?.lat?.toFixed(3)}, ${alert.location?.lng?.toFixed(3)}`}</span>
                                                <span>🕒 {new Date(alert.createdAt).toLocaleString()}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span
                                                className={`px-3 py-1 rounded-full text-[10px] uppercase tracking-[0.14em] font-semibold ${statusBadge(alert.status)}`}
                                            >
                                                {statusLabel(alert.status)}
                                            </span>
                                            {alert.status === 'assigned' && (
                                                <a
                                                    href={`https://www.google.com/maps/dir/?api=1&destination=${alert.location?.lat},${alert.location?.lng}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="px-3 py-1 rounded-full bg-accentBlue/15 text-[10px] text-accentBlue uppercase tracking-[0.14em] font-semibold hover:bg-accentBlue/25 transition"
                                                >
                                                    Navigate →
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
};

export default WorkerDashboard;
