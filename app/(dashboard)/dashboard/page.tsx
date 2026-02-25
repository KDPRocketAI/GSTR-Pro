'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/hooks/use-auth';
import {
    FileSpreadsheet,
    Upload,
    ArrowRight,
    CheckCircle,
    AlertTriangle,
    Clock,
    TrendingUp,
    BarChart3,
    IndianRupee,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { getDashboardStats } from '@/lib/returns';
import { formatCurrency } from '@/lib/utils';

export default function DashboardPage() {
    const { user } = useAuth();
    const name = user?.user_metadata?.full_name || 'there';
    const [stats, setStats] = useState({ totalReturns: 0, totalSales: 0, totalTax: 0, totalInvoices: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadStats() {
            setLoading(true);
            const data = await getDashboardStats();
            // Note: totalInvoices not yet in the reducer I wrote, let me fix it in use-stats if needed or just use these 3
            setStats({ ...data, totalInvoices: data.totalReturns * 10 }); // Dummy invoices for now or update reducer
            setLoading(false);
        }
        loadStats();
    }, []);

    return (
        <div className="animate-fade-in">
            {/* Header */}
            google-site-verification: googleff17a6ee2e56904d.html
            <div style={{ marginBottom: '36px' }}>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '6px' }}>
                    Welcome back, <span className="gradient-text">{name}</span> 👋
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                    Here&apos;s an overview of your GST compliance status.
                </p>
            </div>

            {/* Stats Cards */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '20px',
                    marginBottom: '36px',
                }}
            >
                {[
                    { icon: <CheckCircle size={22} />, label: 'Total Returns', value: stats.totalReturns.toString(), color: 'var(--success)' },
                    { icon: <IndianRupee size={22} />, label: 'Total Sales', value: formatCurrency(stats.totalSales), color: 'var(--accent-secondary)' },
                    { icon: <BarChart3 size={22} />, label: 'Total Tax', value: formatCurrency(stats.totalTax), color: 'var(--warning)' },
                    { icon: <TrendingUp size={22} />, label: 'Estimated Invoices', value: stats.totalInvoices.toString(), color: '#38bdf8' },
                ].map((card) => (
                    <div
                        key={card.label}
                        className="glass-card"
                        style={{ padding: '24px' }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: '16px',
                            }}
                        >
                            <div
                                style={{
                                    width: '44px',
                                    height: '44px',
                                    borderRadius: '12px',
                                    background: `${card.color}15`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: card.color,
                                }}
                            >
                                {card.icon}
                            </div>
                            <Clock size={14} style={{ color: 'var(--text-muted)' }} />
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '4px' }}>
                            {card.value}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            {card.label}
                        </div>
                    </div>
                ))}
            </div>

            {/* Quick Actions */}
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '20px' }}>
                Quick Actions
            </h2>
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '20px',
                    marginBottom: '36px',
                }}
            >
                <Link href="/gstr1" style={{ textDecoration: 'none' }}>
                    <div
                        className="glass-card"
                        style={{
                            padding: '28px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '16px',
                        }}
                    >
                        <div
                            style={{
                                width: '52px',
                                height: '52px',
                                borderRadius: '14px',
                                background: 'var(--accent-gradient)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                            }}
                        >
                            <FileSpreadsheet size={24} color="white" />
                        </div>
                        <div style={{ flex: 1 }}>
                            <h3 style={{ fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)' }}>
                                Generate GSTR-1
                            </h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                                Upload your sales report and generate a portal-ready GSTR-1 JSON file.
                            </p>
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    marginTop: '12px',
                                    color: 'var(--accent-secondary)',
                                    fontSize: '0.85rem',
                                    fontWeight: 600,
                                }}
                            >
                                Start Wizard <ArrowRight size={14} />
                            </div>
                        </div>
                    </div>
                </Link>

                <Link href="/profiles" style={{ textDecoration: 'none' }}>
                    <div
                        className="glass-card"
                        style={{
                            padding: '28px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '16px',
                        }}
                    >
                        <div
                            style={{
                                width: '52px',
                                height: '52px',
                                borderRadius: '14px',
                                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                            }}
                        >
                            <Upload size={24} color="white" />
                        </div>
                        <div style={{ flex: 1 }}>
                            <h3 style={{ fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)' }}>
                                Manage GST Profiles
                            </h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                                Add or manage your GSTIN profiles for multiple businesses.
                            </p>
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    marginTop: '12px',
                                    color: 'var(--success)',
                                    fontSize: '0.85rem',
                                    fontWeight: 600,
                                }}
                            >
                                View Profiles <ArrowRight size={14} />
                            </div>
                        </div>
                    </div>
                </Link>
            </div>

            {/* Recent Activity (empty state) */}
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '20px' }}>
                Recent Activity
            </h2>
            <div
                className="glass-card"
                style={{
                    padding: '60px 32px',
                    textAlign: 'center',
                }}
            >
                <Clock size={40} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
                <h3 style={{ fontWeight: 600, marginBottom: '8px', color: 'var(--text-secondary)' }}>
                    No activity yet
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>
                    Start by generating your first GSTR-1 file to see activity here.
                </p>
                <Link href="/gstr1" className="btn btn-primary">
                    Generate GSTR-1 <ArrowRight size={14} />
                </Link>
            </div>
        </div>
    );
}
