'use client';

import { useAuth } from '@/lib/hooks/use-auth';
import { AlertCircle, Clock, ArrowRight, ShieldAlert, ShieldCheck, Briefcase } from 'lucide-react';
import Link from 'next/link';

export function TrialBanner() {
    const { isTrialExpired, trialDaysRemaining, plan, loading, user } = useAuth();

    if (loading || !user || plan !== 'trial') return null;

    if (isTrialExpired) {
        return (
            <div
                style={{
                    background: 'var(--error-bg)',
                    borderBottom: '1px solid var(--error)',
                    padding: '12px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    color: 'var(--error)',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    zIndex: 1000,
                }}
            >
                <ShieldAlert size={18} />
                <span>Trial period expired. Please upgrade to continue using core features.</span>
                <Link
                    href="/upgrade"
                    className="btn btn-primary"
                    style={{
                        padding: '6px 16px',
                        fontSize: '0.8rem',
                        marginLeft: '12px',
                        background: 'var(--error)',
                        borderColor: 'var(--error)'
                    }}
                >
                    Upgrade Now <ArrowRight size={14} style={{ marginLeft: '4px' }} />
                </Link>
            </div>
        );
    }

    if (trialDaysRemaining <= 7) {
        return (
            <div
                style={{
                    background: 'rgba(245, 158, 11, 0.1)',
                    borderBottom: '1px solid #f59e0b',
                    padding: '10px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    color: '#f59e0b',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                }}
            >
                <Clock size={16} />
                <span>Your free trial ends in {trialDaysRemaining} days. Upgrade today to avoid service interruption!</span>
                <Link
                    href="/upgrade"
                    style={{
                        color: '#f59e0b',
                        fontWeight: 700,
                        textDecoration: 'underline',
                        marginLeft: '8px'
                    }}
                >
                    Manage Billing
                </Link>
            </div>
        );
    }

    return null;
}

export function TrialExpirationOverlay() {
    const { isTrialExpired, plan, loading, user } = useAuth();

    if (loading || !user || plan !== 'trial' || !isTrialExpired) return null;

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(2, 6, 23, 0.95)',
                backdropFilter: 'blur(8px)',
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px',
                textAlign: 'center'
            }}
        >
            <div style={{ maxWidth: '480px' }} className="animate-fade-in">
                <div
                    style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '24px',
                        background: 'var(--error-bg)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 24px',
                        color: 'var(--error)',
                        border: '1px solid var(--error)'
                    }}
                >
                    <ShieldAlert size={40} />
                </div>
                <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'white', marginBottom: '12px' }}>
                    Trial Expired
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: '32px', lineHeight: 1.6 }}>
                    Your 30-day free trial of EcomGST Pro has come to an end. Upgrade your plan now to regain access to GSTR-1 generation, profile management, and more.
                </p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                    <Link href="/upgrade" className="btn btn-primary btn-lg">
                        Upgrade to Pro <ArrowRight size={18} style={{ marginLeft: '8px' }} />
                    </Link>
                </div>
                <p style={{ marginTop: '24px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    Questions? Contact <a href="mailto:support@ecomgst.pro" style={{ color: 'var(--accent-secondary)' }}>support@ecomgst.pro</a>
                </p>
            </div>
        </div>
    );
}

export function TrialBadge() {
    const { isTrialExpired, trialDaysRemaining, plan, loading, user } = useAuth();

    if (loading || !user) return null;

    const isTrial = plan === 'trial';
    const isPro = plan === 'ca';

    let label = '';
    let icon = <Clock size={12} />;
    let bgColor = 'rgba(99, 102, 241, 0.1)';
    let textColor = 'var(--accent-secondary)';
    let borderColor = 'rgba(99, 102, 241, 0.2)';

    if (isTrial) {
        label = isTrialExpired ? 'Trial Expired' : `Trial: ${trialDaysRemaining} days left`;
        if (isTrialExpired) {
            bgColor = 'var(--error-bg)';
            textColor = 'var(--error)';
            borderColor = 'var(--error)';
            icon = <ShieldAlert size={12} />;
        }
    } else if (plan === 'business') {
        label = 'Business Plan';
        icon = <Briefcase size={12} />;
        bgColor = 'rgba(16, 185, 129, 0.1)';
        textColor = '#10b981';
        borderColor = 'rgba(16, 185, 129, 0.2)';
    } else if (plan === 'ca') {
        label = 'CA / Pro Plan';
        icon = <ShieldCheck size={12} />;
        bgColor = 'rgba(139, 92, 246, 0.1)';
        textColor = '#8b5cf6';
        borderColor = 'rgba(139, 92, 246, 0.2)';
    }

    return (
        <Link
            href="/upgrade"
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 12px',
                borderRadius: '8px',
                background: bgColor,
                color: textColor,
                fontSize: '0.75rem',
                fontWeight: 700,
                textDecoration: 'none',
                border: `1px solid ${borderColor}`,
                transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
            {icon}
            {label}
        </Link>
    );
}
