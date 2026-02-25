'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/use-auth';
import { FileSpreadsheet, Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { signIn } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const { error } = await signIn(email, password);
        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
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
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Welcome back</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '6px' }}>
                    Sign in to your GSTDesk account
                </p>
            </div>

            {error && (
                <div style={{ background: 'var(--error-bg)', color: 'var(--error)', padding: '12px 16px', borderRadius: 'var(--radius-sm)', marginBottom: '20px', fontSize: '0.85rem' }}>
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                        Email Address
                    </label>
                    <div style={{ position: 'relative' }}>
                        <Mail size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@company.com"
                            required
                            style={{
                                width: '100%', padding: '12px 14px 12px 44px',
                                background: 'var(--bg-input)', border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)',
                                fontSize: '0.9rem',
                            }}
                        />
                    </div>
                </div>

                <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                        Password
                    </label>
                    <div style={{ position: 'relative' }}>
                        <Lock size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            style={{
                                width: '100%', padding: '12px 14px 12px 44px',
                                background: 'var(--bg-input)', border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)',
                                fontSize: '0.9rem',
                            }}
                        />
                    </div>
                </div>

                <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: '8px' }} disabled={loading}>
                    {loading ? <Loader2 size={18} className="animate-spin" /> : <>Sign In <ArrowRight size={16} /></>}
                </button>
            </form>

            <p style={{ textAlign: 'center', marginTop: '28px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Don&apos;t have an account?{' '}
                <Link href="/signup" style={{ color: 'var(--accent-secondary)', fontWeight: 600, textDecoration: 'none' }}>
                    Sign up free
                </Link>
            </p>
        </div>
    );
}
