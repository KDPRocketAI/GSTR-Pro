'use client';

import { useAuth } from '@/lib/hooks/use-auth';
import { Settings, User, Shield } from 'lucide-react';

export default function SettingsPage() {
    const { user } = useAuth();

    return (
        <div className="animate-fade-in">
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '4px' }}>
                    <span className="gradient-text">Settings</span>
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    Manage your account preferences
                </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '600px' }}>
                {/* Account Info */}
                <div className="glass-card" style={{ padding: '28px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-secondary)' }}>
                            <User size={20} />
                        </div>
                        <h2 style={{ fontWeight: 700 }}>Account Information</h2>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Full Name</label>
                            <input
                                type="text"
                                defaultValue={user?.user_metadata?.full_name || ''}
                                readOnly
                                style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '0.9rem' }}
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Email</label>
                            <input
                                type="email"
                                defaultValue={user?.email || ''}
                                readOnly
                                style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '0.9rem' }}
                            />
                        </div>
                    </div>
                </div>

                {/* Security */}
                <div className="glass-card" style={{ padding: '28px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(34, 197, 94, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)' }}>
                            <Shield size={20} />
                        </div>
                        <h2 style={{ fontWeight: 700 }}>Security</h2>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '16px' }}>
                        Manage your password and security settings through Supabase&apos;s built-in auth management.
                    </p>
                    <div className="badge badge-success">
                        <Shield size={12} style={{ marginRight: '4px' }} /> Account Secured
                    </div>
                </div>

                {/* App Info */}
                <div className="glass-card" style={{ padding: '28px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--warning)' }}>
                            <Settings size={20} />
                        </div>
                        <h2 style={{ fontWeight: 700 }}>About</h2>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        <div>Version: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>1.0.0 MVP</span></div>
                        <div>Focus: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>GSTR-1 for E-Commerce</span></div>
                        <div>Platforms: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Amazon, Flipkart</span></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
