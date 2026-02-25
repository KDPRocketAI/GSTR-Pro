'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/hooks/use-auth';
import { createClient } from '@/lib/supabase/client';
import {
    FileText,
    Download,
    Calendar,
    CreditCard,
    ArrowLeft,
    ChevronRight,
    Loader2,
    ShieldCheck
} from 'lucide-react';
import Link from 'next/link';

interface Invoice {
    id: string;
    invoice_no: string;
    plan: string;
    amount: number;
    payment_id: string;
    pdf_url: string;
    created_at: string;
}

export default function BillingPage() {
    const { user } = useAuth();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        async function fetchInvoices() {
            if (!user) return;
            setLoading(true);
            const { data, error } = await supabase
                .from('invoices')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching invoices:', error);
            } else {
                setInvoices(data || []);
            }
            setLoading(false);
        }

        fetchInvoices();
    }, [user, supabase]);

    return (
        <div style={{ maxWidth: '900px', margin: '0 auto' }} className="animate-fade-in">
            {/* Header */}
            <div style={{ marginBottom: '32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '8px' }}>
                        Billing & <span className="gradient-text">Invoices</span>
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                        Manage your subscription, billing history, and download receipts.
                    </p>
                </div>
                <Link href="/settings" className="btn btn-secondary btn-sm" style={{ gap: '8px' }}>
                    <ArrowLeft size={16} /> Back to Settings
                </Link>
            </div>

            {/* Current Plan Card */}
            <div className="glass-card" style={{ padding: '24px', borderRadius: '20px', marginBottom: '32px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '16px',
                        background: 'rgba(99, 102, 241, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <ShieldCheck size={30} style={{ color: 'var(--accent-secondary)' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                            Current Plan
                        </div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, textTransform: 'capitalize' }}>
                            {user?.user_metadata?.plan || 'Free Trial'} Plan
                        </h3>
                    </div>
                    <div>
                        <Link href="/upgrade" className="btn btn-primary" style={{ borderRadius: '12px' }}>
                            Update Plan
                        </Link>
                    </div>
                </div>
            </div>

            {/* Invoice Table */}
            <div className="glass-card" style={{ borderRadius: '20px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Billing History</h3>
                </div>

                {loading ? (
                    <div style={{ padding: '60px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <Loader2 className="animate-spin" size={32} style={{ color: 'var(--accent-secondary)' }} />
                    </div>
                ) : invoices.length === 0 ? (
                    <div style={{ padding: '60px', textAlign: 'center' }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.03)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 16px'
                        }}>
                            <FileText size={24} style={{ color: 'var(--text-muted)' }} />
                        </div>
                        <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>No invoices found</h4>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '300px', margin: '0 auto' }}>
                            You haven't made any payments yet. Subscribe to a plan to see your invoices here.
                        </p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.01)' }}>
                                    <th style={{ padding: '16px 24px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Invoice No</th>
                                    <th style={{ padding: '16px 24px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Date</th>
                                    <th style={{ padding: '16px 24px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Plan</th>
                                    <th style={{ padding: '16px 24px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Amount</th>
                                    <th style={{ padding: '16px 24px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoices.map((inv) => (
                                    <tr key={inv.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                                        <td style={{ padding: '16px 24px', fontSize: '0.9rem', fontWeight: 600 }}>{inv.invoice_no}</td>
                                        <td style={{ padding: '16px 24px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
                                                {new Date(inv.created_at).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px 24px' }}>
                                            <span style={{
                                                fontSize: '0.75rem',
                                                fontWeight: 700,
                                                padding: '4px 10px',
                                                borderRadius: '50px',
                                                background: 'rgba(99, 102, 241, 0.12)',
                                                color: 'var(--accent-secondary)',
                                                textTransform: 'uppercase'
                                            }}>
                                                {inv.plan}
                                            </span>
                                        </td>
                                        <td style={{ padding: '16px 24px', fontSize: '0.95rem', fontWeight: 700 }}>
                                            ₹{(inv.amount / 100).toLocaleString()}
                                        </td>
                                        <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                                            <a
                                                href={inv.pdf_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="btn btn-secondary btn-sm"
                                                style={{ gap: '8px', borderRadius: '10px' }}
                                            >
                                                <Download size={14} /> Download
                                            </a>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 24px', background: 'rgba(99, 102, 241, 0.05)', borderRadius: '16px', border: '1px solid rgba(99, 102, 241, 0.1)' }}>
                <CreditCard size={20} style={{ color: 'var(--accent-secondary)' }} />
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Payment processing by <strong style={{ color: 'var(--text-primary)' }}>Razorpay</strong> secure checkout.
                </p>
            </div>
        </div>
    );
}
