'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/use-auth';
import { validateGSTIN } from '@/lib/utils';
import { autoCreateProfileFromSignup } from '@/lib/profiles';
import { FileSpreadsheet, Mail, Lock, User, Building, ArrowRight, Loader2, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import { fetchGstDetails } from '@/lib/gst-lookup';

export default function SignupPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [gstin, setGstin] = useState('');
    const [error, setError] = useState('');
    const [gstinWarning, setGstinWarning] = useState('');
    const [loading, setLoading] = useState(false);
    const [isFetchingGst, setIsFetchingGst] = useState(false);
    const [fetchedDetails, setFetchedDetails] = useState<{ legal: string, trade: string } | null>(null);
    const [fetchError, setFetchError] = useState('');

    const { signUp } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setGstinWarning('');

        if (password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }

        // GSTIN is optional — show warning only, never block signup
        if (gstin && !validateGSTIN(gstin)) {
            setGstinWarning('GSTIN format looks invalid. You can fix this later in GST Profiles.');
        }

        setLoading(true);
        console.log('[SignupPage] Attempting signup for:', email);
        const { error, userId } = await signUp(email, password, {
            full_name: name,
            gstin: gstin || '',
        });

        if (error) {
            console.error('[SignupPage] Signup failed:', error.message);
            setError(error.message);
            setLoading(false);
        } else {
            console.log('[SignupPage] Signup success! userId:', userId);

            // Auto-create GST profile if valid GSTIN was provided
            if (userId && gstin && validateGSTIN(gstin)) {
                console.log('[SignupPage] Triggering auto-create for GSTIN:', gstin);
                // Use fetched names if available, otherwise fallback to user name
                const success = await autoCreateProfileFromSignup(
                    userId,
                    gstin,
                    name,
                    fetchedDetails?.legal,
                    fetchedDetails?.trade
                );

                if (!success) {
                    console.error('[SignupPage] Auto-create failed. Redirecting to dashboard anyway.');
                }
            } else if (gstin) {
                console.warn('[SignupPage] Skipping auto-create: userId missing or GSTIN invalid.');
            }

            console.log('[SignupPage] Redirecting to dashboard...');
            router.push('/dashboard');
        }
    };

    return (
        <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '440px', padding: '48px 40px', position: 'relative', zIndex: 1 }}>
            {/* Logo */}
            <div style={{ textAlign: 'center', marginBottom: '36px' }}>
                <div
                    style={{
                        width: '52px', height: '52px', borderRadius: '14px',
                        background: 'var(--accent-gradient)',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        marginBottom: '16px',
                    }}
                >
                    <FileSpreadsheet size={26} color="white" />
                </div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Create account</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '6px' }}>
                    Start simplifying your GST compliance
                </p>
            </div>

            {error && (
                <div style={{ background: 'var(--error-bg)', color: 'var(--error)', padding: '12px 16px', borderRadius: 'var(--radius-sm)', marginBottom: '20px', fontSize: '0.85rem' }}>
                    {error}
                </div>
            )}

            {gstinWarning && (
                <div style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', padding: '12px 16px', borderRadius: 'var(--radius-sm)', marginBottom: '20px', fontSize: '0.85rem', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                    ⚠️ {gstinWarning}
                </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Full Name</label>
                    <div style={{ position: 'relative' }}>
                        <User size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="text" value={name} onChange={(e) => setName(e.target.value)}
                            placeholder="Your full name" required
                            style={{ width: '100%', padding: '12px 14px 12px 44px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '0.9rem' }}
                        />
                    </div>
                </div>

                <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Email Address</label>
                    <div style={{ position: 'relative' }}>
                        <Mail size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@company.com" required
                            style={{ width: '100%', padding: '12px 14px 12px 44px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '0.9rem' }}
                        />
                    </div>
                </div>

                <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Password</label>
                    <div style={{ position: 'relative' }}>
                        <Lock size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                            placeholder="Min 6 characters" required
                            style={{ width: '100%', padding: '12px 14px 12px 44px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '0.9rem' }}
                        />
                    </div>
                </div>

                <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                        GSTIN <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional — add later)</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                        <Building size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="text" value={gstin}
                            onChange={async (e) => {
                                const val = e.target.value.toUpperCase();
                                setGstin(val);
                                setFetchError('');

                                if (val.length === 15) {
                                    setIsFetchingGst(true);
                                    try {
                                        const details = await fetchGstDetails(val);
                                        setFetchedDetails({ legal: details.legal_name, trade: details.trade_name });
                                        // Auto-fill full name if still empty
                                        if (!name) setName(details.legal_name);
                                    } catch (err: any) {
                                        setFetchError(err.message || 'Could not auto-fetch');
                                    } finally {
                                        setIsFetchingGst(false);
                                    }
                                } else {
                                    setFetchedDetails(null);
                                }
                            }}
                            placeholder="22AAAAA0000A1Z5" maxLength={15}
                            style={{ width: '100%', padding: '12px 14px 12px 44px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '0.9rem', textTransform: 'uppercase' }}
                        />
                        {isFetchingGst && (
                            <Loader2 size={16} className="animate-spin" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--accent-secondary)' }} />
                        )}
                        {!isFetchingGst && fetchedDetails && (
                            <CheckCircle2 size={16} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: '#10b981' }} />
                        )}
                    </div>
                    {fetchError && (
                        <div style={{ fontSize: '0.75rem', color: '#f59e0b', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <AlertCircle size={12} /> {fetchError}
                        </div>
                    )}
                    {fetchedDetails && (
                        <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '4px', fontWeight: 500 }}>
                            Found: {fetchedDetails.legal}
                        </div>
                    )}
                </div>

                <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: '8px' }} disabled={loading}>
                    {loading ? <Loader2 size={18} className="animate-spin" /> : <>Create Account <ArrowRight size={16} /></>}
                </button>
            </form>

            <p style={{ textAlign: 'center', marginTop: '28px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Already have an account?{' '}
                <Link href="/login" style={{ color: 'var(--accent-secondary)', fontWeight: 600, textDecoration: 'none' }}>
                    Sign in
                </Link>
            </p>
        </div>
    );
}
