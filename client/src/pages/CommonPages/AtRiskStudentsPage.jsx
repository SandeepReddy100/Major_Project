import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    AlertTriangle, GraduationCap, Filter, Search, X, RefreshCw,
    TrendingDown, TrendingUp, Minus, ShieldQuestion, Info, ChevronLeft, ChevronRight, Activity
} from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
    ResponsiveContainer, Legend
} from 'recharts';
import Header from '../../components/Header';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axiosConfig';
import { getBatchRisk, getStudentRisk, getBatchTrend, getStudentTrend } from '../../api/analyticsApi';

const SEMESTERS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];
const LEVEL_TABS = ["ALL", "HIGH", "MEDIUM", "LOW", "INSUFFICIENT_DATA"];
const TREND_TABS = ["ALL", "IMPROVING", "STABLE", "DECLINING", "INSUFFICIENT_DATA"];
const ITEMS_PER_PAGE = 25;

const RISK_META = {
    HIGH: { label: "High Risk", dot: "bg-red-500", text: "text-red-400", chip: "bg-red-500/15 border-red-500/30 text-red-300" },
    MEDIUM: { label: "Medium Risk", dot: "bg-amber-500", text: "text-amber-400", chip: "bg-amber-500/15 border-amber-500/30 text-amber-300" },
    LOW: { label: "Low Risk", dot: "bg-emerald-500", text: "text-emerald-400", chip: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300" },
    INSUFFICIENT_DATA: { label: "Insufficient Data", dot: "bg-slate-400", text: "text-slate-400", chip: "bg-slate-500/15 border-slate-500/30 text-slate-300" }
};

const TREND_META = {
    IMPROVING: { label: "Improving", dot: "bg-emerald-500", text: "text-emerald-400", chip: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300" },
    STABLE: { label: "Stable", dot: "bg-blue-500", text: "text-blue-400", chip: "bg-blue-500/15 border-blue-500/30 text-blue-300" },
    DECLINING: { label: "Declining", dot: "bg-red-500", text: "text-red-400", chip: "bg-red-500/15 border-red-500/30 text-red-300" },
    INSUFFICIENT_DATA: { label: "Insufficient Data", dot: "bg-slate-400", text: "text-slate-400", chip: "bg-slate-500/15 border-slate-500/30 text-slate-300" }
};

const SpinnerOverlay = ({ label }) => (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-[100] gap-3" role="status" aria-live="polite">
        <div className="w-12 h-12 border-4 border-gray-500 border-t-blue-500 rounded-full animate-spin"></div>
        {label && <p className="text-sm text-gray-200 font-medium">{label}</p>}
    </div>
);

/** Translates an axios error into a safe, user-facing message. Never surfaces raw backend/stack detail beyond what the API already sanitizes. */
function resolveApiError(err) {
    if (!err.response) {
        return { status: null, message: "Unable to load risk analytics. Please try again." };
    }
    const { status, data } = err.response;
    if (status === 403) {
        return { status, message: "You do not have access to this semester/batch." };
    }
    if (status >= 500) {
        return { status, message: "Unable to load risk analytics. Please try again." };
    }
    return { status, message: data?.error || "Unable to load risk analytics. Please try again." };
}

const formatPct = (v) => (v === null || v === undefined ? "—" : `${v}%`);
const formatProbability = (v) => (v === null || v === undefined ? "—" : `${Math.round(v * 1000) / 10}%`);

const TrendIndicator = ({ value }) => {
    if (value === null || value === undefined) return <span className="text-gray-500">—</span>;
    if (value > 0) return <span className="inline-flex items-center gap-1 text-emerald-400"><TrendingUp size={14} />+{value}</span>;
    if (value < 0) return <span className="inline-flex items-center gap-1 text-red-400"><TrendingDown size={14} />{value}</span>;
    return <span className="inline-flex items-center gap-1 text-gray-400"><Minus size={14} />0</span>;
};

const RiskBadge = ({ level }) => {
    const meta = RISK_META[level] || RISK_META.INSUFFICIENT_DATA;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${meta.chip}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`}></span>
            {meta.label}
        </span>
    );
};

const TrendBadge = ({ direction }) => {
    const meta = TREND_META[direction] || TREND_META.INSUFFICIENT_DATA;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${meta.chip}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`}></span>
            {meta.label}
        </span>
    );
};

/** Student detail modal — every field comes straight from GET /api/analytics/student-risk/:rollno. */
const StudentDetailModal = ({ rollno, semname, batch, onClose }) => {
    const [detail, setDetail] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { logout } = useAuth();

    useEffect(() => {
        let active = true;
        setLoading(true);
        setError(null);

        getStudentRisk({ rollno, semname, batch })
            .then((res) => {
                if (!active) return;
                setDetail(res.data);
            })
            .catch((err) => {
                if (!active) return;
                if (err.response?.status === 401) { logout(); return; }
                setError(resolveApiError(err));
            })
            .finally(() => { if (active) setLoading(false); });

        return () => { active = false; };
    }, [rollno, semname, batch, logout]);

    useEffect(() => {
        const onKeyDown = (e) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [onClose]);

    const student = detail?.data;
    const insufficient = student?.riskLevel === "INSUFFICIENT_DATA";

    return (
        <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[110] p-4"
            role="dialog"
            aria-modal="true"
            aria-label={`Risk detail for ${rollno}`}
            onClick={onClose}
        >
            <div
                className="bg-[#0F172A] border border-white/10 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto custom-scrollbar text-white"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between p-5 border-b border-white/10 sticky top-0 bg-[#0F172A] z-10">
                    <div>
                        <h2 className="text-lg font-bold">{student?.name || rollno}</h2>
                        <p className="text-xs text-gray-400 font-mono">{rollno} {student?.branch ? `· ${student.branch}` : ""} {student?.batch ? `· ${student.sem}/${student.batch}` : ""}</p>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Close student detail"
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="p-5 space-y-5">
                    {loading && (
                        <div className="flex items-center justify-center py-10 gap-3 text-gray-300">
                            <div className="w-6 h-6 border-2 border-gray-500 border-t-blue-500 rounded-full animate-spin"></div>
                            Loading student risk detail…
                        </div>
                    )}

                    {!loading && error && (
                        <div className="flex flex-col items-center text-center gap-2 py-8 text-red-300">
                            <AlertTriangle size={28} />
                            <p className="font-semibold">{error.message}</p>
                        </div>
                    )}

                    {!loading && !error && student && (
                        <>
                            <div className="flex items-center gap-3 flex-wrap">
                                <RiskBadge level={student.riskLevel} />
                                {!insufficient && (
                                    <span className="text-sm text-gray-300">
                                        Risk probability: <span className="font-bold text-white">{formatProbability(student.riskProbability)}</span>
                                    </span>
                                )}
                                {student.confidence && (
                                    <span className="text-xs px-2 py-1 rounded-full bg-white/5 border border-white/10 text-gray-300 capitalize">
                                        {student.confidence} confidence
                                    </span>
                                )}
                            </div>

                            {insufficient ? (
                                <div className="bg-slate-500/10 border border-slate-500/30 rounded-xl p-4 flex gap-3">
                                    <ShieldQuestion size={22} className="text-slate-300 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-bold text-slate-200">Insufficient attendance history</p>
                                        <p className="text-sm text-slate-300 mt-1">
                                            The system does not yet have enough recorded attendance sessions for this student to produce a reliable risk estimate.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                                            <p className="text-[11px] text-gray-400 uppercase font-bold">Overall Attendance</p>
                                            <p className="text-xl font-bold mt-1">{formatPct(student.currentAttendance)}</p>
                                        </div>
                                        <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                                            <p className="text-[11px] text-gray-400 uppercase font-bold">Recent Attendance</p>
                                            <p className="text-xl font-bold mt-1">{formatPct(student.features?.recentPct)}</p>
                                        </div>
                                        <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                                            <p className="text-[11px] text-gray-400 uppercase font-bold">Trend</p>
                                            <p className="text-xl font-bold mt-1"><TrendIndicator value={student.features?.trendDelta} /></p>
                                        </div>
                                        <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                                            <p className="text-[11px] text-gray-400 uppercase font-bold">Sessions</p>
                                            <p className="text-xl font-bold mt-1">{student.attended}/{student.totalSessions}</p>
                                        </div>
                                    </div>

                                    {Array.isArray(student.lowCourses) && student.lowCourses.length > 0 && (
                                        <div>
                                            <h3 className="text-xs font-bold text-gray-400 uppercase mb-2">Courses Below Threshold</h3>
                                            <div className="flex flex-wrap gap-2">
                                                {student.lowCourses.map((c) => (
                                                    <span key={c.course} className="text-xs px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-300">
                                                        {c.course}: {c.pct}%
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {Array.isArray(student.factors) && student.factors.length > 0 && (
                                        <div>
                                            <h3 className="text-xs font-bold text-gray-400 uppercase mb-2">Top Contributing Factors</h3>
                                            <ul className="space-y-2">
                                                {student.factors.map((f, i) => (
                                                    <li key={i} className="bg-white/5 border border-white/10 rounded-xl p-3">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className="font-bold text-sm">{f.factor}</span>
                                                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${f.impact === 'high' ? 'bg-red-500/15 text-red-300' : f.impact === 'medium' ? 'bg-amber-500/15 text-amber-300' : 'bg-slate-500/15 text-slate-300'}`}>
                                                                {f.impact} impact
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-gray-300">{f.detail}</p>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </>
                            )}

                            {Array.isArray(student.recommendations) && student.recommendations.length > 0 && (
                                <div>
                                    <h3 className="text-xs font-bold text-gray-400 uppercase mb-2">Recommended Faculty Actions</h3>
                                    <ul className="space-y-1.5">
                                        {student.recommendations.map((r, i) => (
                                            <li key={i} className="text-sm text-gray-200 flex gap-2">
                                                <span className="text-blue-400 mt-0.5">•</span>{r}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <p className="text-[11px] text-gray-500 border-t border-white/10 pt-3 flex items-start gap-1.5">
                                <Info size={13} className="flex-shrink-0 mt-0.5" />
                                {detail?.disclaimer}
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

/** Attendance trend detail modal — every field comes straight from GET /api/analytics/attendance-trend/:rollno. */
const TrendDetailModal = ({ rollno, semname, batch, onClose }) => {
    const [detail, setDetail] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { logout } = useAuth();

    useEffect(() => {
        let active = true;
        setLoading(true);
        setError(null);

        getStudentTrend({ rollno, semname, batch })
            .then((res) => {
                if (!active) return;
                setDetail(res.data);
            })
            .catch((err) => {
                if (!active) return;
                if (err.response?.status === 401) { logout(); return; }
                setError(resolveApiError(err));
            })
            .finally(() => { if (active) setLoading(false); });

        return () => { active = false; };
    }, [rollno, semname, batch, logout]);

    useEffect(() => {
        const onKeyDown = (e) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [onClose]);

    const student = detail?.data;
    const insufficient = student?.trend?.direction === "INSUFFICIENT_DATA";

    // Two separate series so the chart never implies the projected point is a
    // real recorded session: "actual" stops at the last real session, and a
    // dashed "projected" series is bridged from that same last point to the
    // single forecast value.
    const chartData = useMemo(() => {
        if (!student?.history?.length) return [];
        const points = student.history.map((h) => ({ x: h.sessionIndex, label: h.date, actual: h.runningAttendance, projected: null }));
        if (student.forecast) {
            const lastActual = points[points.length - 1]?.actual ?? null;
            points[points.length - 1] = { ...points[points.length - 1], projected: lastActual };
            points.push({ x: points.length + 1, label: `Projected (+${student.forecast.horizonDays}d)`, actual: null, projected: student.forecast.projectedAttendance });
        }
        return points;
    }, [student]);

    return (
        <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[110] p-4"
            role="dialog"
            aria-modal="true"
            aria-label={`Attendance trend for ${rollno}`}
            onClick={onClose}
        >
            <div
                className="bg-[#0F172A] border border-white/10 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto custom-scrollbar text-white"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between p-5 border-b border-white/10 sticky top-0 bg-[#0F172A] z-10">
                    <div>
                        <h2 className="text-lg font-bold">{student?.name || rollno}</h2>
                        <p className="text-xs text-gray-400 font-mono">{rollno} {student?.branch ? `· ${student.branch}` : ""} {student?.batch ? `· ${student.sem}/${student.batch}` : ""}</p>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Close attendance trend detail"
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="p-5 space-y-5">
                    {loading && (
                        <div className="flex items-center justify-center py-10 gap-3 text-gray-300">
                            <div className="w-6 h-6 border-2 border-gray-500 border-t-blue-500 rounded-full animate-spin"></div>
                            Loading attendance trend…
                        </div>
                    )}

                    {!loading && error && (
                        <div className="flex flex-col items-center text-center gap-2 py-8 text-red-300">
                            <AlertTriangle size={28} />
                            <p className="font-semibold">{error.message}</p>
                        </div>
                    )}

                    {!loading && !error && student && (
                        <>
                            <div className="flex items-center gap-3 flex-wrap">
                                <TrendBadge direction={student.trend.direction} />
                                {student.confidence && (
                                    <span className="text-xs px-2 py-1 rounded-full bg-white/5 border border-white/10 text-gray-300 capitalize">
                                        {student.confidence} confidence
                                    </span>
                                )}
                            </div>

                            {insufficient ? (
                                <div className="bg-slate-500/10 border border-slate-500/30 rounded-xl p-4 flex gap-3">
                                    <ShieldQuestion size={22} className="text-slate-300 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-bold text-slate-200">Insufficient attendance history</p>
                                        <p className="text-sm text-slate-300 mt-1">
                                            The system does not yet have enough recorded attendance sessions for this student to project an attendance trend.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                                            <p className="text-[11px] text-gray-400 uppercase font-bold">Current Attendance</p>
                                            <p className="text-xl font-bold mt-1">{formatPct(student.currentAttendance)}</p>
                                        </div>
                                        <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                                            <p className="text-[11px] text-gray-400 uppercase font-bold">Recent Attendance</p>
                                            <p className="text-xl font-bold mt-1">{formatPct(student.recentAttendance)}</p>
                                        </div>
                                        <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                                            <p className="text-[11px] text-gray-400 uppercase font-bold">Change</p>
                                            <p className="text-xl font-bold mt-1"><TrendIndicator value={student.trend.changePoints} /></p>
                                        </div>
                                        <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                                            <p className="text-[11px] text-gray-400 uppercase font-bold">Projected ({student.forecast?.horizonDays ?? "—"}d)</p>
                                            <p className="text-xl font-bold mt-1">{student.forecast ? formatPct(student.forecast.projectedAttendance) : "—"}</p>
                                        </div>
                                    </div>

                                    {chartData.length > 1 && (
                                        <div>
                                            <h3 className="text-xs font-bold text-gray-400 uppercase mb-2">Attendance History &amp; Projection</h3>
                                            <div className="h-56 bg-white/5 border border-white/10 rounded-xl p-2">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                                                        <XAxis dataKey="x" tick={{ fill: '#94a3b8', fontSize: 11 }} label={{ value: 'Session #', position: 'insideBottom', fill: '#64748b', fontSize: 10, dy: 10 }} />
                                                        <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                                        <RechartsTooltip
                                                            contentStyle={{ background: '#0F172A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                                                            labelFormatter={(_, payload) => payload?.[0]?.payload?.label || ''}
                                                        />
                                                        <Legend wrapperStyle={{ fontSize: 11 }} />
                                                        <Line type="monotone" dataKey="actual" name="Actual" stroke="#38bdf8" strokeWidth={2} dot={false} connectNulls={false} />
                                                        <Line type="monotone" dataKey="projected" name="Projected" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} connectNulls />
                                                    </LineChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                    )}

                                    {Array.isArray(student.factors) && student.factors.length > 0 && (
                                        <div>
                                            <h3 className="text-xs font-bold text-gray-400 uppercase mb-2">Factors</h3>
                                            <ul className="space-y-2">
                                                {student.factors.map((f, i) => (
                                                    <li key={i} className="bg-white/5 border border-white/10 rounded-xl p-3">
                                                        <span className="font-bold text-sm block mb-1">{f.factor}</span>
                                                        <p className="text-sm text-gray-300">{f.detail}</p>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </>
                            )}

                            {student.explanation && (
                                <div>
                                    <h3 className="text-xs font-bold text-gray-400 uppercase mb-2">Explanation</h3>
                                    <p className="text-sm text-gray-200">{student.explanation}</p>
                                </div>
                            )}

                            <p className="text-[11px] text-gray-500 border-t border-white/10 pt-3 flex items-start gap-1.5">
                                <Info size={13} className="flex-shrink-0 mt-0.5" />
                                {detail?.disclaimer}
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

const AtRiskStudentsPage = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [animate, setAnimate] = useState(false);

    const [viewMode, setViewMode] = useState('RISK'); // 'RISK' | 'TREND'

    const [semname, setSemname] = useState('');
    const [batches, setBatches] = useState([]);
    const [isFetchingBatches, setIsFetchingBatches] = useState(false);
    const [batch, setBatch] = useState('');

    const [levelFilter, setLevelFilter] = useState('ALL');
    const [trendFilter, setTrendFilter] = useState('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    const [riskData, setRiskData] = useState(null); // { sem, batch, total, summary, students, model, disclaimer }
    const [isLoadingRisk, setIsLoadingRisk] = useState(false);
    const [riskError, setRiskError] = useState(null);

    const [trendData, setTrendData] = useState(null); // { sem, batch, total, summary, students, model, disclaimer }
    const [isLoadingTrend, setIsLoadingTrend] = useState(false);
    const [trendError, setTrendError] = useState(null);

    const [selectedRollno, setSelectedRollno] = useState(null);
    const [detailMode, setDetailMode] = useState('RISK'); // which modal to open, captured at click time

    useEffect(() => {
        if (!user) { navigate('/'); return; }
        const timer = setTimeout(() => setAnimate(true), 100);
        return () => clearTimeout(timer);
    }, [user, navigate]);

    // Fetch batches for the selected semester (existing get-sem-info convention).
    useEffect(() => {
        if (!semname) { setBatches([]); return; }
        setBatch('');
        setRiskData(null);
        setRiskError(null);
        setTrendData(null);
        setTrendError(null);
        setIsFetchingBatches(true);

        api.get(`/api/get-sem-info/${semname}`)
            .then((res) => {
                setBatches(res.data?.data?.batches || []);
            })
            .catch((err) => {
                if (err.response?.status === 401) { logout(); return; }
                setBatches([]);
            })
            .finally(() => setIsFetchingBatches(false));
    }, [semname, logout]);

    // Fetch batch risk whenever semester+batch changes. Level filtering happens
    // client-side over this already-fetched list so switching tabs never
    // re-hits the API.
    useEffect(() => {
        if (!semname || !batch) return;
        let active = true;
        setIsLoadingRisk(true);
        setRiskError(null);
        setTrendData(null);
        setTrendError(null);
        setCurrentPage(1);

        getBatchRisk({ semname, batch })
            .then((res) => {
                if (!active) return;
                setRiskData(res.data);
            })
            .catch((err) => {
                if (!active) return;
                if (err.response?.status === 401) { logout(); return; }
                setRiskData(null);
                setRiskError(resolveApiError(err));
            })
            .finally(() => { if (active) setIsLoadingRisk(false); });

        return () => { active = false; };
    }, [semname, batch, logout]);

    // Fetch attendance trend lazily — only once the Trend view is actually
    // opened, and only if we don't already have it cached for this sem/batch.
    // Never fetched automatically alongside batch-risk.
    useEffect(() => {
        if (!semname || !batch || viewMode !== 'TREND') return;
        if (trendData?.data?.sem === semname && trendData?.data?.batch === batch) return;

        let active = true;
        setIsLoadingTrend(true);
        setTrendError(null);

        getBatchTrend({ semname, batch })
            .then((res) => {
                if (!active) return;
                setTrendData(res.data);
            })
            .catch((err) => {
                if (!active) return;
                if (err.response?.status === 401) { logout(); return; }
                setTrendData(null);
                setTrendError(resolveApiError(err));
            })
            .finally(() => { if (active) setIsLoadingTrend(false); });

        return () => { active = false; };
    }, [semname, batch, viewMode, trendData, logout]);

    const students = useMemo(() => riskData?.data?.students || [], [riskData]);
    const summary = riskData?.data?.summary || { HIGH: 0, MEDIUM: 0, LOW: 0, INSUFFICIENT_DATA: 0 };
    const modelMeta = riskData?.model;
    const disclaimer = riskData?.disclaimer;

    const trendStudents = useMemo(() => trendData?.data?.students || [], [trendData]);
    const trendSummary = trendData?.data?.summary || { IMPROVING: 0, STABLE: 0, DECLINING: 0, INSUFFICIENT_DATA: 0 };
    const trendModelMeta = trendData?.model;
    const trendDisclaimer = trendData?.disclaimer;

    const filteredStudents = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        return students.filter((s) => {
            const matchesLevel = levelFilter === 'ALL' || s.riskLevel === levelFilter;
            const matchesSearch = !term || s.rollno?.toLowerCase().includes(term) || s.name?.toLowerCase().includes(term);
            return matchesLevel && matchesSearch;
        });
    }, [students, levelFilter, searchTerm]);

    const filteredTrendStudents = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        return trendStudents.filter((s) => {
            const matchesDirection = trendFilter === 'ALL' || s.trend?.direction === trendFilter;
            const matchesSearch = !term || s.rollno?.toLowerCase().includes(term) || s.name?.toLowerCase().includes(term);
            return matchesDirection && matchesSearch;
        });
    }, [trendStudents, trendFilter, searchTerm]);

    const activeFilteredStudents = viewMode === 'RISK' ? filteredStudents : filteredTrendStudents;
    const totalPages = Math.max(1, Math.ceil(activeFilteredStudents.length / ITEMS_PER_PAGE));
    const paginatedStudents = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return activeFilteredStudents.slice(start, start + ITEMS_PER_PAGE);
    }, [activeFilteredStudents, currentPage]);

    const handleLevelChange = useCallback((level) => {
        setLevelFilter(level);
        setCurrentPage(1);
    }, []);

    const handleTrendFilterChange = useCallback((direction) => {
        setTrendFilter(direction);
        setCurrentPage(1);
    }, []);

    const handleViewModeChange = useCallback((mode) => {
        setViewMode(mode);
        setCurrentPage(1);
        setSearchTerm('');
    }, []);

    const retryFetch = useCallback(() => {
        // Re-triggers the batch-risk effect by nudging batch state.
        if (!semname || !batch) return;
        setRiskError(null);
        setIsLoadingRisk(true);
        getBatchRisk({ semname, batch })
            .then((res) => setRiskData(res.data))
            .catch((err) => {
                if (err.response?.status === 401) { logout(); return; }
                setRiskData(null);
                setRiskError(resolveApiError(err));
            })
            .finally(() => setIsLoadingRisk(false));
    }, [semname, batch, logout]);

    const retryTrendFetch = useCallback(() => {
        if (!semname || !batch) return;
        setTrendError(null);
        setIsLoadingTrend(true);
        getBatchTrend({ semname, batch })
            .then((res) => setTrendData(res.data))
            .catch((err) => {
                if (err.response?.status === 401) { logout(); return; }
                setTrendData(null);
                setTrendError(resolveApiError(err));
            })
            .finally(() => setIsLoadingTrend(false));
    }, [semname, batch, logout]);

    if (!user) return null;

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#071225] via-[#0A1B3A] to-[#071225] text-white font-sans">
            <div className="px-4 sm:px-6 lg:px-8 relative z-10">
                <Header animate={animate} />
                <div className="w-full h-px bg-gradient-to-r from-transparent via-white/30 to-transparent my-4"></div>
            </div>

            {isFetchingBatches && <SpinnerOverlay label="Loading batches…" />}

            <main className="px-2 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto pb-32">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold flex items-center gap-3 text-white">
                        <AlertTriangle className="w-8 h-8 text-red-400" /> At-Risk Students
                    </h1>
                    <p className="text-sm text-gray-400 mt-2 max-w-2xl">
                        This page surfaces a risk prediction — a decision-support indicator, not a guaranteed outcome —
                        for each student, based on historical attendance indicators. Review the underlying attendance
                        log before acting on any prediction confidence shown below.
                    </p>

                    <div className="inline-flex mt-4 rounded-xl border border-white/10 bg-white/5 p-1 gap-1">
                        <button
                            onClick={() => handleViewModeChange('RISK')}
                            aria-pressed={viewMode === 'RISK'}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${viewMode === 'RISK' ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'text-gray-400 hover:text-gray-200'}`}
                        >
                            <AlertTriangle size={15} /> At-Risk
                        </button>
                        <button
                            onClick={() => handleViewModeChange('TREND')}
                            aria-pressed={viewMode === 'TREND'}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${viewMode === 'TREND' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'text-gray-400 hover:text-gray-200'}`}
                        >
                            <Activity size={15} /> Attendance Trend
                        </button>
                    </div>

                    {viewMode === 'TREND' && (
                        <p className="text-xs text-gray-500 mt-3 max-w-2xl">
                            Projected attendance is a statistical estimate assuming each student's recent attendance rate
                            continues — it is not a guaranteed future outcome.
                        </p>
                    )}
                </div>

                {/* Filters */}
                <div className={`bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-4 sm:p-6 mb-6 transition-all duration-700 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="relative group">
                            <label className="text-xs font-bold text-gray-400 uppercase mb-1 ml-1 block">Semester</label>
                            <div className="relative">
                                <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400 z-10" />
                                <select
                                    value={semname}
                                    onChange={(e) => setSemname(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-[#0F172A] border border-blue-500/30 rounded-xl text-white appearance-none outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer font-bold transition-all shadow-sm"
                                >
                                    <option value="">Select semester</option>
                                    {SEMESTERS.map((sem) => <option key={sem} value={sem}>Semester {sem}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="relative group">
                            <label className="text-xs font-bold text-gray-400 uppercase mb-1 ml-1 block">Batch</label>
                            <div className="relative">
                                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400 z-10" />
                                <select
                                    value={batch}
                                    onChange={(e) => setBatch(e.target.value)}
                                    disabled={!semname || isFetchingBatches || batches.length === 0}
                                    className="w-full pl-10 pr-4 py-2.5 bg-[#0F172A] border border-blue-500/30 rounded-xl text-white appearance-none outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer font-medium transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    <option value="">{semname ? (batches.length ? "Select batch" : "No batches found") : "Select semester first"}</option>
                                    {batches.map((b) => <option key={b} value={b}>{b}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="relative group">
                            <label className="text-xs font-bold text-gray-400 uppercase mb-1 ml-1 block">Search Student</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400 z-10" />
                                <input
                                    type="text"
                                    placeholder="Roll No or Name…"
                                    value={searchTerm}
                                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                    disabled={viewMode === 'RISK' ? !riskData : !trendData}
                                    className="w-full pl-10 pr-4 py-2.5 bg-[#0F172A] border border-blue-500/30 rounded-xl text-white placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm disabled:opacity-40"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {!semname || !batch ? (
                    <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-dashed border-white/10 p-10 text-center text-gray-400">
                        <GraduationCap size={36} className="mx-auto mb-3 opacity-50" />
                        <p>Select a semester and batch to view {viewMode === 'RISK' ? 'risk predictions' : 'attendance trend projections'}.</p>
                    </div>
                ) : viewMode === 'TREND' ? (
                    trendError ? (
                        <div className={`rounded-2xl border p-8 text-center ${trendError.status === 403 ? 'bg-amber-500/10 border-amber-500/30 text-amber-200' : 'bg-red-500/10 border-red-500/30 text-red-200'}`}>
                            <AlertTriangle size={32} className="mx-auto mb-3" />
                            <p className="font-semibold">{trendError.message}</p>
                            {trendError.status !== 403 && (
                                <button
                                    onClick={retryTrendFetch}
                                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-sm font-bold"
                                >
                                    <RefreshCw size={14} /> Retry
                                </button>
                            )}
                        </div>
                    ) : (
                        <>
                            {/* Trend summary cards */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                                {["IMPROVING", "STABLE", "DECLINING", "INSUFFICIENT_DATA"].map((direction) => {
                                    const meta = TREND_META[direction];
                                    return (
                                        <button
                                            key={direction}
                                            onClick={() => handleTrendFilterChange(direction)}
                                            aria-pressed={trendFilter === direction}
                                            className={`text-left bg-white/5 backdrop-blur-xl rounded-2xl border p-4 transition-all hover:-translate-y-0.5 ${trendFilter === direction ? `${meta.chip} border-2` : 'border-white/10'}`}
                                        >
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className={`w-2 h-2 rounded-full ${meta.dot}`}></span>
                                                <span className="text-xs font-bold text-gray-300 uppercase">{meta.label}</span>
                                            </div>
                                            <p className={`text-2xl font-black ${meta.text}`}>{trendSummary[direction] ?? 0}</p>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
                                {TREND_TABS.map((direction) => (
                                    <button
                                        key={direction}
                                        onClick={() => handleTrendFilterChange(direction)}
                                        className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors border ${trendFilter === direction ? 'bg-blue-500/20 border-blue-500/40 text-blue-300' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}
                                    >
                                        {direction === 'ALL' ? 'All' : TREND_META[direction].label}
                                    </button>
                                ))}
                            </div>

                            {trendModelMeta && (
                                <div className="flex items-center gap-2 text-[11px] text-gray-500 mb-4">
                                    <Info size={12} />
                                    <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10">Statistical baseline — {trendModelMeta.version}</span>
                                    {trendDisclaimer && <span className="truncate">{trendDisclaimer}</span>}
                                </div>
                            )}

                            <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
                                <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 font-bold text-xs text-gray-400 uppercase border-b border-white/10 bg-black/20">
                                    <div className="col-span-3">Student</div>
                                    <div className="col-span-1">Trend</div>
                                    <div className="col-span-1 text-right">Current</div>
                                    <div className="col-span-1 text-right">Recent</div>
                                    <div className="col-span-2">Change</div>
                                    <div className="col-span-2 text-right">Projected</div>
                                    <div className="col-span-1">Confidence</div>
                                    <div className="col-span-1 text-right">Horizon</div>
                                </div>

                                {isLoadingTrend ? (
                                    <div className="p-10 text-center text-gray-400 flex flex-col items-center">
                                        <div className="w-8 h-8 border-2 border-gray-500 border-t-blue-500 rounded-full animate-spin mb-3"></div>
                                        Loading attendance trend projections…
                                    </div>
                                ) : paginatedStudents.length === 0 ? (
                                    <div className="p-10 text-center text-gray-400 flex flex-col items-center">
                                        <Activity size={36} className="mb-2 opacity-50" />
                                        <p>{trendStudents.length === 0 ? "No students found in this batch." : "No students match the current filter."}</p>
                                    </div>
                                ) : (
                                    <div className="max-h-[65vh] overflow-y-auto custom-scrollbar">
                                        {paginatedStudents.map((s) => (
                                            <div
                                                key={s.rollno}
                                                role="button"
                                                tabIndex={0}
                                                aria-label={`View attendance trend for ${s.name || s.rollno}`}
                                                onClick={() => { setSelectedRollno(s.rollno); setDetailMode('TREND'); }}
                                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedRollno(s.rollno); setDetailMode('TREND'); } }}
                                                className="border-b border-white/5 hover:bg-white/10 transition-colors duration-150 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                                            >
                                                {/* Mobile */}
                                                <div className="md:hidden p-4 flex flex-col gap-2">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <div className="font-bold text-white text-sm">{s.name}</div>
                                                            <div className="text-xs text-gray-400 font-mono">{s.rollno}</div>
                                                        </div>
                                                        <TrendBadge direction={s.trend.direction} />
                                                    </div>
                                                    <div className="flex justify-between text-xs text-gray-300">
                                                        <span>Current: <b>{formatPct(s.currentAttendance)}</b></span>
                                                        <span>Projected: <b>{s.forecast ? formatPct(s.forecast.projectedAttendance) : "—"}</b></span>
                                                    </div>
                                                </div>

                                                {/* Desktop */}
                                                <div className="hidden md:grid grid-cols-12 gap-4 items-center px-6 py-3 text-sm">
                                                    <div className="col-span-3">
                                                        <div className="font-bold text-white truncate">{s.name}</div>
                                                        <div className="text-xs text-gray-400 font-mono">{s.rollno}</div>
                                                    </div>
                                                    <div className="col-span-1"><TrendBadge direction={s.trend.direction} /></div>
                                                    <div className="col-span-1 text-right font-bold">{formatPct(s.currentAttendance)}</div>
                                                    <div className="col-span-1 text-right">{formatPct(s.recentAttendance)}</div>
                                                    <div className="col-span-2"><TrendIndicator value={s.trend.changePoints} /></div>
                                                    <div className="col-span-2 text-right font-bold">{s.forecast ? formatPct(s.forecast.projectedAttendance) : "—"}</div>
                                                    <div className="col-span-1 capitalize text-gray-300">{s.confidence || "—"}</div>
                                                    <div className="col-span-1 text-right text-gray-400">{s.forecast ? `${s.forecast.horizonDays}d` : "—"}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )
                ) : riskError ? (
                    <div className={`rounded-2xl border p-8 text-center ${riskError.status === 403 ? 'bg-amber-500/10 border-amber-500/30 text-amber-200' : 'bg-red-500/10 border-red-500/30 text-red-200'}`}>
                        <AlertTriangle size={32} className="mx-auto mb-3" />
                        <p className="font-semibold">{riskError.message}</p>
                        {riskError.status !== 403 && (
                            <button
                                onClick={retryFetch}
                                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-sm font-bold"
                            >
                                <RefreshCw size={14} /> Retry
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        {/* Summary cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                            {["HIGH", "MEDIUM", "LOW", "INSUFFICIENT_DATA"].map((level) => {
                                const meta = RISK_META[level];
                                return (
                                    <button
                                        key={level}
                                        onClick={() => handleLevelChange(level)}
                                        aria-pressed={levelFilter === level}
                                        className={`text-left bg-white/5 backdrop-blur-xl rounded-2xl border p-4 transition-all hover:-translate-y-0.5 ${levelFilter === level ? `${meta.chip} border-2` : 'border-white/10'}`}
                                    >
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className={`w-2 h-2 rounded-full ${meta.dot}`}></span>
                                            <span className="text-xs font-bold text-gray-300 uppercase">{meta.label}</span>
                                        </div>
                                        <p className={`text-2xl font-black ${meta.text}`}>{summary[level] ?? 0}</p>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Level tabs (All + backend-confirmed levels) */}
                        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
                            {LEVEL_TABS.map((level) => (
                                <button
                                    key={level}
                                    onClick={() => handleLevelChange(level)}
                                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors border ${levelFilter === level ? 'bg-blue-500/20 border-blue-500/40 text-blue-300' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}
                                >
                                    {level === 'ALL' ? 'All' : RISK_META[level].label}
                                </button>
                            ))}
                        </div>

                        {modelMeta && (
                            <div className="flex items-center gap-2 text-[11px] text-gray-500 mb-4">
                                <Info size={12} />
                                {!modelMeta.trained && <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10">Not a trained model — {modelMeta.version}</span>}
                                {disclaimer && <span className="truncate">{disclaimer}</span>}
                            </div>
                        )}

                        {/* Table / cards */}
                        <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
                            <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 font-bold text-xs text-gray-400 uppercase border-b border-white/10 bg-black/20">
                                <div className="col-span-3">Student</div>
                                <div className="col-span-1">Risk Level</div>
                                <div className="col-span-1 text-right">Probability</div>
                                <div className="col-span-1 text-right">Attendance</div>
                                <div className="col-span-1 text-right">Recent</div>
                                <div className="col-span-2">Trend</div>
                                <div className="col-span-1">Confidence</div>
                                <div className="col-span-2">Top Factor</div>
                            </div>

                            {isLoadingRisk ? (
                                <div className="p-10 text-center text-gray-400 flex flex-col items-center">
                                    <div className="w-8 h-8 border-2 border-gray-500 border-t-blue-500 rounded-full animate-spin mb-3"></div>
                                    Loading risk predictions…
                                </div>
                            ) : paginatedStudents.length === 0 ? (
                                <div className="p-10 text-center text-gray-400 flex flex-col items-center">
                                    <AlertTriangle size={36} className="mb-2 opacity-50" />
                                    <p>{students.length === 0 ? "No students found in this batch." : "No students match the current filter."}</p>
                                </div>
                            ) : (
                                <div className="max-h-[65vh] overflow-y-auto custom-scrollbar">
                                    {paginatedStudents.map((s) => {
                                        const insufficient = s.riskLevel === "INSUFFICIENT_DATA";
                                        const topFactor = s.factors?.[0]?.detail || (insufficient ? "Insufficient attendance history" : "No significant risk drivers");
                                        return (
                                            <div
                                                key={s.rollno}
                                                role="button"
                                                tabIndex={0}
                                                aria-label={`View risk detail for ${s.name || s.rollno}`}
                                                onClick={() => { setSelectedRollno(s.rollno); setDetailMode('RISK'); }}
                                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedRollno(s.rollno); setDetailMode('RISK'); } }}
                                                className="border-b border-white/5 hover:bg-white/10 transition-colors duration-150 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                                            >
                                                {/* Mobile */}
                                                <div className="md:hidden p-4 flex flex-col gap-2">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <div className="font-bold text-white text-sm">{s.name}</div>
                                                            <div className="text-xs text-gray-400 font-mono">{s.rollno}</div>
                                                        </div>
                                                        <RiskBadge level={s.riskLevel} />
                                                    </div>
                                                    <div className="flex justify-between text-xs text-gray-300">
                                                        <span>Attendance: <b>{formatPct(s.currentAttendance)}</b></span>
                                                        <span>Probability: <b>{formatProbability(s.riskProbability)}</b></span>
                                                    </div>
                                                    <p className="text-xs text-gray-400 truncate">{topFactor}</p>
                                                </div>

                                                {/* Desktop */}
                                                <div className="hidden md:grid grid-cols-12 gap-4 items-center px-6 py-3 text-sm">
                                                    <div className="col-span-3">
                                                        <div className="font-bold text-white truncate">{s.name}</div>
                                                        <div className="text-xs text-gray-400 font-mono">{s.rollno}</div>
                                                    </div>
                                                    <div className="col-span-1"><RiskBadge level={s.riskLevel} /></div>
                                                    <div className="col-span-1 text-right font-bold">{formatProbability(s.riskProbability)}</div>
                                                    <div className="col-span-1 text-right font-bold">{formatPct(s.currentAttendance)}</div>
                                                    <div className="col-span-1 text-right">{formatPct(s.features?.recentPct)}</div>
                                                    <div className="col-span-2"><TrendIndicator value={s.features?.trendDelta} /></div>
                                                    <div className="col-span-1 capitalize text-gray-300">{s.confidence || "—"}</div>
                                                    <div className="col-span-2 text-xs text-gray-400 truncate" title={topFactor}>{topFactor}</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </>
                )}

                {semname && batch && !riskError && !trendError && totalPages > 1 && (
                    <div className="flex justify-center items-center mt-6 gap-2">
                        <button
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            aria-label="Previous page"
                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <span className="text-sm font-bold text-gray-400 px-2">Page {currentPage} of {totalPages}</span>
                        <button
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            aria-label="Next page"
                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                )}
            </main>

            {selectedRollno && detailMode === 'RISK' && (
                <StudentDetailModal
                    rollno={selectedRollno}
                    semname={semname}
                    batch={batch}
                    onClose={() => setSelectedRollno(null)}
                />
            )}

            {selectedRollno && detailMode === 'TREND' && (
                <TrendDetailModal
                    rollno={selectedRollno}
                    semname={semname}
                    batch={batch}
                    onClose={() => setSelectedRollno(null)}
                />
            )}

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(255, 255, 255, 0.1); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: rgba(255, 255, 255, 0.2); }
            `}</style>
        </div>
    );
};

export default AtRiskStudentsPage;
