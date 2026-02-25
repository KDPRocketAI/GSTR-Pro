'use client';

import React, { useState } from 'react';
import {
    Check,
    Zap,
    ShieldCheck,
    ShieldAlert,
    MessageCircle,
    ArrowRight,
    Building,
    Briefcase,
    BadgeCheck
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, type UserPlan } from '@/lib/hooks/use-auth';

export default function UpgradePage() {
    const { plan, upgradePlan, user } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState<UserPlan | null>(null);
    const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);

    const loadScript = (src: string) => {
        return new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

    const handleUpgrade = async (newPlan: UserPlan) => {
        setLoading(newPlan);

        try {
            // 1. Create order
            console.log(`[Upgrade] Starting order creation for plan: ${newPlan}`);
            const orderRes = await fetch('/api/razorpay/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plan: newPlan }),
            });

            console.log(`[Upgrade] API Status: ${orderRes.status} ${orderRes.statusText}`);
            const rawText = await orderRes.text();
            console.log(`[Upgrade] Raw Response: ${rawText.substring(0, 200)}${rawText.length > 200 ? '...' : ''}`);

            let orderData;
            try {
                orderData = JSON.parse(rawText);
            } catch (jsonErr) {
                console.error('[Upgrade] Failed to parse JSON:', jsonErr);
                throw new Error('Received invalid response from server (non-JSON). Review console for details.');
            }

            if (!orderRes.ok || orderData.error) {
                throw new Error(orderData.error || `Server returned error ${orderRes.status}`);
            }

            // 2. Load Razorpay script
            console.log('[Upgrade] Loading Razorpay script...');
            const res = await loadScript('https://checkout.razorpay.com/v1/checkout.js');
            if (!res) {
                setToast({ type: 'error', message: 'Razorpay SDK failed to load. Are you online?' });
                setLoading(null);
                return;
            }

            // 3. Open Checkout
            const options = {
                key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                amount: orderData.amount,
                currency: orderData.currency,
                name: "GSTDesk",
                description: `Upgrade to ${newPlan.toUpperCase()} Plan`,
                order_id: orderData.orderId,
                handler: async function (response: any) {
                    setLoading(newPlan); // Keep loading during verification

                    const verifyRes = await fetch('/api/razorpay/verify', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            ...response,
                            plan: newPlan,
                            userId: user?.id
                        }),
                    });
                    const verifyData = await verifyRes.json();

                    if (verifyData.success) {
                        setToast({ type: 'success', message: `Payment successful! Upgraded to ${newPlan.toUpperCase()}.` });
                        if (verifyData.invoiceUrl) {
                            setInvoiceUrl(verifyData.invoiceUrl);
                        }
                        // Force refresh user data
                        await upgradePlan(newPlan);
                    } else {
                        setToast({ type: 'error', message: verifyData.error || 'Payment verification failed.' });
                    }
                    setLoading(null);
                },
                prefill: {
                    name: user?.user_metadata?.full_name || '',
                    email: user?.email || '',
                },
                theme: {
                    color: "#6366f1",
                },
            };

            const rzp = new (window as any).Razorpay(options);
            rzp.on('payment.failed', function (response: any) {
                setToast({ type: 'error', message: response.error.description || 'Payment failed' });
                setLoading(null);
            });
            rzp.open();
        } catch (err: any) {
            console.error('Upgrade Error:', err);
            setToast({ type: 'error', message: err.message || 'Failed to start upgrade process.' });
            setLoading(null);
        }
    };

    const PLANS = [
        {
            id: 'business' as UserPlan,
            name: 'Business',
            price: '₹2,499',
            period: '/ year',
            description: 'Perfect for individual sellers and small businesses.',
            features: [
                '1 GSTIN Profile',
                'Unlimited GSTR-1 Generation',
                'Excel & JSON Downloads',
                'Returns History (1 Year)',
                'Email Support'
            ]
        },
        {
            id: 'ca' as UserPlan,
            name: 'CA / Professional',
            price: '₹9,999',
            period: '/ year',
            description: 'Designed for CAs and Tax Professionals managing multiple clients.',
            features: [
                'Unlimited GSTIN Profiles',
                'Bulk GSTR-1 Generation',
                'Tally & SAP Integration',
                'Client Management Dashboard',
                'Priority 24/7 Support'
            ],
            highlighted: true
        }
    ];

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px 0' }} className="animate-fade-in">
            {toast && (
                <div
                    style={{
                        position: 'fixed',
                        top: '24px',
                        right: '24px',
                        background: toast.type === 'success' ? '#064e3b' : '#450a0a',
                        color: toast.type === 'success' ? '#10b981' : '#f87171',
                        padding: '12px 24px',
                        borderRadius: '12px',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
                        zIndex: 1000,
                        fontWeight: 600,
                        border: `1px solid ${toast.type === 'success' ? '#10b981' : '#ef4444'}`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                    }}
                >
                    {toast.type === 'success' ? <Check size={18} /> : <ShieldAlert size={18} />}
                    {toast.message}
                </div>
            )}

            <div style={{ textAlign: 'center', marginBottom: '48px' }}>
                <span className="badge badge-info" style={{ marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    Pricing Plans
                </span>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '16px' }}>
                    Choose the Right Plan for <span className="gradient-text">Your Growth</span>
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>
                    Simple, transparent pricing with no hidden fees. Upgrade your account today for advanced features.
                </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '32px', marginBottom: '64px' }}>
                {PLANS.map((p) => {
                    const isCurrent = plan === p.id;
                    return (
                        <div
                            key={p.name}
                            className="glass-card"
                            style={{
                                padding: '40px',
                                display: 'flex',
                                flexDirection: 'column',
                                borderRadius: '24px',
                                position: 'relative',
                                border: p.highlighted ? '2px solid var(--accent-primary)' : '1px solid var(--border)',
                                transform: p.highlighted ? 'scale(1.02)' : 'scale(1)',
                                boxShadow: p.highlighted ? '0 20px 25px -5px rgba(99, 102, 241, 0.2)' : 'none',
                                background: p.highlighted ? 'linear-gradient(135deg, var(--bg-card) 0%, rgba(99, 102, 241, 0.05) 100%)' : 'var(--bg-card)'
                            }}
                        >
                            {p.highlighted && (
                                <div style={{
                                    position: 'absolute',
                                    top: '-14px',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    background: 'var(--accent-gradient)',
                                    color: 'white',
                                    padding: '4px 16px',
                                    borderRadius: '50px',
                                    fontSize: '0.75rem',
                                    fontWeight: 800,
                                    textTransform: 'uppercase'
                                }}>
                                    Most Popular
                                </div>
                            )}

                            {isCurrent && invoiceUrl && (
                                <div style={{
                                    position: 'absolute',
                                    top: '60px',
                                    right: '20px',
                                    zIndex: 10
                                }} className="animate-slide-in-right">
                                    <a
                                        href={invoiceUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn btn-success btn-sm"
                                        style={{ gap: '8px', borderRadius: '10px', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)' }}
                                    >
                                        <BadgeCheck size={16} /> Download Invoice
                                    </a>
                                </div>
                            )}

                            <div style={{ marginBottom: '24px' }}>
                                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '8px' }}>{p.name}</h3>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>{p.description}</p>
                            </div>

                            <div style={{ marginBottom: '32px' }}>
                                <span style={{ fontSize: '2.5rem', fontWeight: 800 }}>{p.price}</span>
                                <span style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>{p.period}</span>
                            </div>

                            <div style={{ flex: 1, marginBottom: '40px' }}>
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    {p.features.map((feature) => (
                                        <li key={feature} style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.95rem' }}>
                                            <div style={{
                                                width: '20px',
                                                height: '20px',
                                                borderRadius: '50%',
                                                background: 'rgba(16, 185, 129, 0.1)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: '#10b981'
                                            }}>
                                                <Check size={12} strokeWidth={3} />
                                            </div>
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <button
                                onClick={() => handleUpgrade(p.id)}
                                disabled={isCurrent || loading !== null}
                                className={`btn ${p.highlighted ? 'btn-primary' : 'btn-secondary'} btn-lg`}
                                style={{ width: '100%', borderRadius: '14px' }}
                            >
                                {loading === p.id ? (
                                    <>Processing...</>
                                ) : isCurrent ? (
                                    <>Current Plan</>
                                ) : (
                                    <>Upgrade to {p.name}</>
                                )}
                            </button>
                        </div>
                    );
                })}
            </div>

            <div className="glass-card" style={{ padding: '40px', borderRadius: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <MessageCircle size={24} style={{ color: 'var(--accent-secondary)' }} />
                    </div>
                    <div style={{ textAlign: 'left' }}>
                        <h4 style={{ fontWeight: 700, fontSize: '1.1rem', margin: 0 }}>Need a custom plan?</h4>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>Contact our sales team for enterprise solutions or agency discounts.</p>
                    </div>
                </div>
                <button className="btn btn-secondary" onClick={() => window.location.href = 'mailto:support@gstrpro.com'}>
                    Contact Support <ArrowRight size={16} />
                </button>
            </div>
        </div>
    );
}
