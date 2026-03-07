import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../utils/api.js';
import useGeolocation from '../hooks/useGeolocation.js';
import MapView from '../components/MapView.jsx';
import SOSButton from '../components/SOSButton.jsx';
import { useSocket } from '../context/SocketContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';

const riskLabel = (risk) => {
  if (risk >= 67) return 'HIGH RISK';
  if (risk >= 34) return 'MODERATE RISK';
  return 'LOW RISK';
};

const riskColor = (risk) => {
  if (risk >= 67) return 'text-accentRed';
  if (risk >= 34) return 'text-yellow-300';
  return 'text-emerald-300';
};

const riskGradient = (risk) => {
  if (risk >= 67) return 'from-accentRed to-red-700';
  if (risk >= 34) return 'from-yellow-400 to-amber-600';
  return 'from-emerald-400 to-emerald-700';
};

const UserDashboard = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const { position, error: geoError, loading: geoLoading } = useGeolocation();
  const [risk, setRisk] = useState(null);
  const [accidents, setAccidents] = useState([]);
  const [pendingConfirmations, setPendingConfirmations] = useState([]);
  const [pastComplaints, setPastComplaints] = useState([]);
  const [activeTab, setActiveTab] = useState('map');

  // Fetch risk + nearby accidents + user alerts + past complaints
  useEffect(() => {
    const fetchData = async () => {
      if (!position) return;
      try {
        const [riskRes, nearbyRes, myAlertsRes, historyRes] = await Promise.all([
          api.get('/accidents/risk', { params: { lat: position.lat, lng: position.lng } }),
          api.get('/accidents/nearby', { params: { lat: position.lat, lng: position.lng } }),
          api.get('/sos/my-alerts'),
          api.get('/sos/nearby-history', { params: { lat: position.lat, lng: position.lng } }),
        ]);
        setRisk(riskRes.data.risk);
        setAccidents(nearbyRes.data);
        setPendingConfirmations(myAlertsRes.data.filter((a) => a.status === 'pending_confirmation'));
        setPastComplaints(historyRes.data);
      } catch (err) {
        // silent fail, UI shows loading states
      }
    };
    fetchData();
  }, [position]);

  // Listen for resolution requests via socket
  useEffect(() => {
    if (!socket || !user) return undefined;
    const handleResolveRequest = ({ alertId, userId }) => {
      if (userId === user._id || userId === user.id) {
        toast('Admin has marked your SOS as resolved. Please confirm!', { icon: '✅', duration: 8000 });
        // Refetch my alerts
        api.get('/sos/my-alerts').then((res) => {
          setPendingConfirmations(res.data.filter((a) => a.status === 'pending_confirmation'));
        }).catch(() => { });
      }
    };
    socket.on('sos-resolve-request', handleResolveRequest);
    return () => {
      socket.off('sos-resolve-request', handleResolveRequest);
    };
  }, [socket, user]);

  const confirmResolve = async (alertId) => {
    try {
      await api.patch(`/sos/${alertId}/confirm`);
      toast.success('Resolution confirmed! Thank you.');
      setPendingConfirmations((prev) => prev.filter((a) => a._id !== alertId));
    } catch {
      toast.error('Failed to confirm resolution');
    }
  };

  const disputeResolve = async (alertId) => {
    try {
      await api.patch(`/sos/${alertId}/dispute`);
      toast.success('Resolution disputed. Worker will be re-notified.');
      setPendingConfirmations((prev) => prev.filter((a) => a._id !== alertId));
    } catch {
      toast.error('Failed to dispute resolution');
    }
  };

  const now = useMemo(() => new Date(), []);

  return (
    <div className="pt-4 pb-10">
      <div className="max-w-6xl mx-auto px-4 space-y-6">
        {/* ─── Header ──────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
          <div>
            <p className="font-rajdhani text-xs uppercase tracking-[0.26em] text-accentBlue">
              Stay Safe, Stay Aware
            </p>
            <h2 className="font-rajdhani text-3xl font-semibold mt-1">
              Citizen <span className="gradient-text">Safety Dashboard</span>
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              Live accident risk, nearby incidents, past complaints and one-tap SOS access.
            </p>
          </div>
          <div className="glass-card px-4 py-3 text-right hover-lift">
            <p className="text-[11px] text-gray-400">Local time</p>
            <p className="font-rajdhani text-xl font-semibold">
              {now.toLocaleTimeString()}
            </p>
            <p className="text-[11px] text-gray-400">
              {now.toLocaleDateString(undefined, {
                weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
              })}
            </p>
          </div>
        </div>

        {/* ─── Pending Resolution Confirmations ────────────── */}
        <AnimatePresence>
          {pendingConfirmations.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3"
            >
              {pendingConfirmations.map((alert) => (
                <div key={alert._id} className="glass-card-red p-4 confirm-pulse">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="h-2 w-2 rounded-full bg-yellow-400 animate-pulse" />
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-yellow-300">
                          Resolution Pending Your Confirmation
                        </p>
                      </div>
                      <p className="text-xs text-gray-300">
                        The admin has marked your SOS at{' '}
                        <span className="font-semibold text-white">
                          {alert.location?.address || `${alert.location?.lat?.toFixed(3)}, ${alert.location?.lng?.toFixed(3)}`}
                        </span>{' '}
                        as resolved. Is the issue actually resolved?
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => confirmResolve(alert._id)}
                        className="px-4 py-2 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold uppercase tracking-[0.16em] hover:bg-emerald-500/30 transition"
                      >
                        ✓ Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => disputeResolve(alert._id)}
                        className="px-4 py-2 rounded-full bg-accentRed/20 text-accentRed text-xs font-semibold uppercase tracking-[0.16em] hover:bg-accentRed/30 transition"
                      >
                        ✗ Dispute
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Risk + Map Grid ─────────────────────────────── */}
        <div className="grid md:grid-cols-[minmax(0,1.4fr)_minmax(0,2fr)] gap-5">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            {/* Risk Gauge */}
            <div className="glass-card p-5 relative overflow-hidden hover-lift">
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-accentBlue/20 blur-2xl" />
              <div className="relative flex items-center gap-5">
                <div className="relative h-28 w-28 rounded-full flex items-center justify-center shrink-0">
                  <div
                    className={`absolute inset-0 rounded-full bg-gradient-to-tr ${riskGradient(risk || 5)} opacity-50`}
                  />
                  <div className="absolute inset-2 rounded-full bg-background border border-white/10" />
                  <div className="relative z-10 text-center">
                    <p className="text-[10px] text-gray-400 uppercase tracking-[0.18em]">Risk</p>
                    <p className="text-3xl font-bold font-rajdhani">
                      {risk != null ? risk : '--'}
                      <span className="text-sm">%</span>
                    </p>
                    <p className={`text-[10px] mt-1 font-bold ${riskColor(risk || 5)}`}>
                      {riskLabel(risk || 5)}
                    </p>
                  </div>
                </div>
                <div className="space-y-2 text-xs text-gray-300">
                  <p>
                    Location status:{' '}
                    <span className="font-semibold">
                      {geoLoading ? 'Acquiring GPS…' : geoError ? 'GPS denied' : '✓ Tracked'}
                    </span>
                  </p>
                  <p className="text-gray-400 text-[11px]">
                    Risk computed from recent accidents within 10km radius.
                    Colored zones on the map show danger levels.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="glass-card px-4 py-3 hover-lift">
                <p className="text-[10px] text-gray-400 uppercase tracking-[0.16em]">Nearby Incidents</p>
                <p className="font-rajdhani text-2xl font-bold mt-1">{accidents.length}</p>
              </div>
              <div className="glass-card px-4 py-3 hover-lift">
                <p className="text-[10px] text-gray-400 uppercase tracking-[0.16em]">Past Complaints</p>
                <p className="font-rajdhani text-2xl font-bold mt-1">{pastComplaints.length}</p>
              </div>
            </div>
          </motion.div>

          {/* Map */}
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
          >
            {geoLoading ? (
              <div className="glass-card h-72 flex flex-col items-center justify-center gap-3">
                <div className="h-10 w-10 rounded-full border-2 border-accentBlue border-t-transparent animate-spin" />
                <p className="text-xs text-gray-400">
                  Acquiring your position to render live map…
                </p>
              </div>
            ) : geoError ? (
              <div className="glass-card h-72 flex flex-col items-center justify-center gap-2 text-center">
                <p className="font-rajdhani font-semibold text-red-400">
                  GPS Permission Required
                </p>
                <p className="text-xs text-gray-400 max-w-xs">
                  We could not access your location. Please enable location services in your
                  browser settings.
                </p>
              </div>
            ) : (
              <MapView center={position} accidents={accidents} height="h-72" showHeatmap />
            )}
          </motion.div>
        </div>

        {/* ─── Tab Navigation ──────────────────────────────── */}
        <div className="flex gap-2">
          {[
            { key: 'map', label: 'Area Insights' },
            { key: 'past', label: `Past Complaints (${pastComplaints.length})` },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-[0.16em] transition ${activeTab === tab.key
                  ? 'bg-accentBlue/15 text-accentBlue border border-accentBlue/40'
                  : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ─── Tab Content ─────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {activeTab === 'past' && (
            <motion.div
              key="past"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="glass-card overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-white/5">
                <h3 className="font-rajdhani font-semibold tracking-[0.18em] uppercase text-xs text-gray-300">
                  Past Incidents in Your Area (15km radius)
                </h3>
              </div>
              {pastComplaints.length === 0 ? (
                <div className="px-4 py-8 text-center text-xs text-gray-400">
                  No past incidents found near your area. That's good news! 🎉
                </div>
              ) : (
                <div className="max-h-80 overflow-y-auto">
                  <table className="min-w-full data-table">
                    <thead className="bg-white/5 sticky top-0">
                      <tr>
                        <th className="px-4 py-2.5 text-left">User</th>
                        <th className="px-4 py-2.5 text-left">Location</th>
                        <th className="px-4 py-2.5 text-left">Time</th>
                        <th className="px-4 py-2.5 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pastComplaints.map((c) => (
                        <tr key={c._id} className="border-t border-white/5 hover:bg-white/[0.02] transition">
                          <td className="px-4 py-3">
                            <p className="font-semibold">{c.userName}</p>
                            <p className="text-[11px] text-gray-400">{c.userPhone}</p>
                          </td>
                          <td className="px-4 py-3 text-gray-300">
                            {c.location?.address || `${c.location?.lat?.toFixed(3)}, ${c.location?.lng?.toFixed(3)}`}
                          </td>
                          <td className="px-4 py-3 text-gray-400">
                            {new Date(c.createdAt).toLocaleDateString()}{' '}
                            <span className="text-[10px]">{new Date(c.createdAt).toLocaleTimeString()}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] uppercase tracking-[0.16em]">
                              {c.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'map' && (
            <motion.div
              key="map-insights"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {accidents.length === 0 ? (
                <div className="glass-card px-4 py-6 text-center text-xs text-gray-400">
                  No nearby accident data found. Your area appears safe! ✅
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {accidents.slice(0, 6).map((a) => (
                    <div key={a._id} className="glass-card p-4 hover-lift">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className="h-3 w-3 rounded-full shrink-0"
                          style={{ background: a.severity === 'high' ? '#FF2D55' : a.severity === 'medium' ? '#FFD60A' : '#30D158' }}
                        />
                        <p className="font-rajdhani font-semibold text-sm truncate">
                          {a.location?.address || a.city}
                        </p>
                      </div>
                      <div className="space-y-1 text-[11px] text-gray-400">
                        <p>Severity: <span className="text-white font-semibold uppercase">{a.severity}</span></p>
                        <p>Accident Rate: <span className="text-white font-semibold">{a.accidentRate}%</span></p>
                        {a.distance != null && (
                          <p>Distance: <span className="text-accentBlue font-semibold">{a.distance.toFixed(1)} km</span></p>
                        )}
                        {a.casualties > 0 && (
                          <p>Casualties: <span className="text-accentRed font-semibold">{a.casualties}</span></p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <SOSButton />
    </div>
  );
};

export default UserDashboard;
