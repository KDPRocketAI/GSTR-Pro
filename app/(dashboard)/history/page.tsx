'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/hooks/use-auth';
import { useProfiles } from '@/lib/hooks/use-profiles';
import { getReturns, type ReturnRecord, deleteReturn } from '@/lib/returns';
import { formatCurrency } from '@/lib/utils';
import {
    History,
    Download,
    Trash2,
    FileText,
    Calendar,
    Search,
    RefreshCw,
    Building,
    AlertCircle
} from 'lucide-react';

export default function ReturnsHistoryPage() {
    const { user } = useAuth();
    const { activeProfile, loading: profileLoading } = useProfiles();
    const [history, setHistory] = useState<ReturnRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [periodFilter, setPeriodFilter] = useState('');

    const loadHistory = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getReturns(activeProfile?.id);
            setHistory(data);
        } catch (err) {
            console.error('[HistoryPage] Failed to load history:', err);
        } finally {
            setLoading(false);
        }
    }, [activeProfile?.id]);

    useEffect(() => {
        loadHistory();
    }, [loadHistory]);

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this return record?')) return;

        const success = await deleteReturn(id);
        if (success) {
            setHistory(prev => prev.filter(r => r.id !== id));
        }
    };

    const filteredHistory = history.filter(r => {
        const matchesSearch = r.return_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.period.includes(searchTerm);
        const matchesPeriod = !periodFilter || r.period === periodFilter;
        return matchesSearch && matchesPeriod;
    });

    const formatPeriod = (p: string) => {
        if (p.length !== 6) return p;
        const month = p.substring(0, 2);
        const year = p.substring(2);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${months[parseInt(month) - 1]} ${year}`;
    };

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px', flexWrap: 'wrap', gap: '20px' }}>
                <div>
                    <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '4px' }}>
                        Returns <span className="gradient-text">History</span>
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        View and download your past GSTR-1 generated files
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={loadHistory} className="btn btn-secondary" style={{ padding: '8px 12px' }}>
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Active Profile Info */}
            {activeProfile && (
                <div className="glass-card" style={{ padding: '16px 24px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                        <Building size={20} />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Current Active Profile</div>
                        <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{activeProfile.gstin} <span style={{ fontWeight: 500, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>— {activeProfile.trade_name || activeProfile.legal_name}</span></div>
                    </div>
                </div>
            )}

            {/* Filter & Search */}
            <div className="glass-card" style={{ padding: '24px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
                <div style={{ display: 'flex', gap: '12px', flex: 1, minWidth: '300px' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            placeholder="Search by return type..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ width: '100%', padding: '10px 14px 10px 40px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '0.9rem' }}
                        />
                    </div>
                    <div style={{ position: 'relative', width: '160px' }}>
                        <Calendar size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            placeholder="MMYYYY"
                            value={periodFilter}
                            onChange={(e) => setPeriodFilter(e.target.value)}
                            style={{ width: '100%', padding: '10px 14px 10px 40px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '0.9rem' }}
                        />
                    </div>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    <span style={{ color: 'var(--accent-secondary)' }}>{filteredHistory.length}</span> records found
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '100px 0' }}>
                    <RefreshCw size={40} className="animate-spin" style={{ color: 'var(--accent-secondary)', margin: '0 auto 16px' }} />
                    <p style={{ color: 'var(--text-secondary)' }}>Loading history...</p>
                </div>
            ) : filteredHistory.length === 0 ? (
                <div className="glass-card" style={{ padding: '80px 40px', textAlign: 'center' }}>
                    <History size={60} style={{ color: 'var(--border)', marginBottom: '20px', margin: '0 auto' }} />
                    <h3 style={{ fontWeight: 700, marginBottom: '8px' }}>No returns found</h3>
                    <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto' }}>
                        {searchTerm ? 'No returns match your search criteria.' : 'You haven\'t generated any returns for this GST profile yet.'}
                    </p>
                </div>
            ) : (
                <div className="glass-card" style={{ overflow: 'auto' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Period</th>
                                <th>Return Type</th>
                                <th>Invoices</th>
                                <th>Total Value</th>
                                <th>Tax Amount</th>
                                <th>Generated</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredHistory.map((record) => (
                                <tr key={record.id}>
                                    <td style={{ fontWeight: 700 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <Calendar size={16} style={{ color: 'var(--accent-secondary)' }} />
                                            {formatPeriod(record.period)}
                                        </div>
                                    </td>
                                    <td>
                                        <span className="badge badge-info">{record.return_type}</span>
                                    </td>
                                    <td>{record.total_invoices}</td>
                                    <td style={{ fontWeight: 600 }}>{formatCurrency(record.total_value)}</td>
                                    <td style={{ color: 'var(--warning)', fontWeight: 700 }}>{formatCurrency(record.total_tax)}</td>
                                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                                        {new Date(record.created_at).toLocaleDateString()}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                            <button
                                                className="btn btn-secondary"
                                                title="Download JSON"
                                                style={{ padding: '6px 10px' }}
                                                onClick={() => window.open(record.file_json_url || '#', '_blank')}
                                            >
                                                <Download size={14} /> JSON
                                            </button>
                                            <button
                                                className="btn btn-secondary"
                                                title="Download Excel"
                                                style={{ padding: '6px 10px' }}
                                                onClick={() => window.open(record.file_excel_url || '#', '_blank')}
                                            >
                                                <FileText size={14} /> Excel
                                            </button>
                                            <button
                                                className="btn btn-error-ghost"
                                                onClick={() => handleDelete(record.id)}
                                                style={{ padding: '6px' }}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
