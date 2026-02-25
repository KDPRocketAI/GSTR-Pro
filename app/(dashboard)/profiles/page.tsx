'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/use-auth';
import { validateGSTIN } from '@/lib/utils';
import { STATE_CODES } from '@/lib/types/gst';
import {
    getProfiles, addProfile, deleteProfile, setActiveProfile,
    canAddProfile, getUserRole, type GSTProfileLocal, type UserRole,
} from '@/lib/profiles';
import { Building, Plus, Trash2, Star, Save, X, ShieldCheck, AlertCircle, Sparkles, Loader2 } from 'lucide-react';
import { fetchGstDetails } from '@/lib/gst-lookup';

export default function ProfilesPage() {
    const router = useRouter();
    const { user, isTrialExpired } = useAuth();

    // Strict redirection for expired trials
    useEffect(() => {
        if (isTrialExpired) {
            router.push('/upgrade');
        }
    }, [isTrialExpired, router]);
    const userId = user?.id || '';

    const [profiles, setProfiles] = useState<GSTProfileLocal[]>([]);
    const [role, setRole] = useState<UserRole>('business');
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [gstin, setGstin] = useState('');
    const [legalName, setLegalName] = useState('');
    const [tradeName, setTradeName] = useState('');

    const [isFetching, setIsFetching] = useState(false);
    const [fetchStatus, setFetchStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [error, setError] = useState('');
    const [addCheck, setAddCheck] = useState<{ allowed: boolean; reason?: string }>({ allowed: false, reason: 'Checking status...' });

    // Stable loadData function accessible to handlers
    const loadData = async () => {
        console.log('[ProfilesPage] Loading data for userId:', userId);
        if (!userId) {
            console.warn('[ProfilesPage] No userId found yet.');
            setLoading(false);
            setAddCheck({ allowed: false, reason: 'Not signed in.' });
            return;
        }
        setLoading(true);
        try {
            const [p, r, check] = await Promise.all([
                getProfiles(userId),
                getUserRole(userId),
                canAddProfile(userId)
            ]);
            console.log('[ProfilesPage] Data loaded - Profiles:', p.length, 'Role:', r);
            setProfiles(p);
            setRole(r);
            setAddCheck(check);
        } catch (err) {
            console.error('[ProfilesPage] Failed to load profiles:', err);
            setError('Failed to load your GST profiles. Please check your connection.');
        } finally {
            setLoading(false);
        }
    };

    // Load profiles and role when user is available
    useEffect(() => {
        if (userId) {
            loadData();
        }
    }, [userId]);

    const handleAdd = async () => {
        setError('');
        if (!userId) return;

        const result = await addProfile(userId, gstin, legalName, tradeName);
        if (!result.success) {
            console.error('[ProfilesPage] Manual add failed:', result.error);
            setError(result.error || 'Failed to create profile.');
            return;
        }

        console.log('[ProfilesPage] Manual add success! Forcing refetch...');

        // Re-fetch everything to ensure UI is in sync with DB count/states
        await loadData();

        setGstin('');
        setLegalName('');
        setTradeName('');
        setShowForm(false);
    };

    const handleSetActive = async (profileId: string) => {
        if (!userId) return;
        const updated = await setActiveProfile(userId, profileId);
        setProfiles(updated);
    };

    const handleDelete = async (profileId: string) => {
        if (!userId) return;
        if (!confirm('Are you sure you want to delete this GST profile?')) return;
        const updated = await deleteProfile(userId, profileId);
        setProfiles(updated);
        const check = await canAddProfile(userId);
        setAddCheck(check);
    };

    const handleShowForm = () => {
        if (!addCheck.allowed) {
            setError(addCheck.reason || '');
            return;
        }
        setGstin('');
        setLegalName('');
        setTradeName('');
        setFetchStatus(null);
        setError('');
        setShowForm(true);
    };

    const handleFetchDetails = async () => {
        if (!gstin || gstin.length !== 15) {
            setFetchStatus({ type: 'error', message: 'Enter a valid 15-character GSTIN first.' });
            return;
        }

        setIsFetching(true);
        setFetchStatus(null);
        setError('');

        try {
            const details = await fetchGstDetails(gstin);
            setLegalName(details.legal_name);
            setTradeName(details.trade_name);
            setFetchStatus({ type: 'success', message: 'GST details fetched successfully!' });
            console.log('[ProfilesPage] Auto-fill success:', details);
        } catch (err: any) {
            console.error('[ProfilesPage] Fetch error:', err);
            setFetchStatus({ type: 'error', message: err.message || 'Could not auto-fetch. Please enter manually.' });
        } finally {
            setIsFetching(false);
        }
    };

    return (
        <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '4px' }}>
                        GST <span className="gradient-text">Profiles</span>
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        Manage your GSTIN registrations
                    </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* Role badge */}
                    <span
                        className={`badge ${role === 'ca' ? 'badge-info' : role === 'business' ? 'badge-success' : 'badge-warning'}`}
                        style={{
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            background: role === 'ca' ? 'rgba(139, 92, 246, 0.1)' : role === 'business' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                            color: role === 'ca' ? '#8b5cf6' : role === 'business' ? '#10b981' : '#f59e0b',
                            border: `1px solid ${role === 'ca' ? '#8b5cf633' : role === 'business' ? '#10b98133' : '#f59e0b33'}`
                        }}
                    >
                        <ShieldCheck size={12} style={{ marginRight: '4px' }} />
                        {role === 'ca' ? 'CA Plan' : role === 'business' ? 'Business Plan' : 'Trial Plan'}
                    </span>
                    <button
                        className="btn btn-primary"
                        onClick={handleShowForm}
                        disabled={!addCheck.allowed}
                        style={{ opacity: addCheck.allowed ? 1 : 0.6, cursor: addCheck.allowed ? 'pointer' : 'not-allowed' }}
                    >
                        <Plus size={18} /> Add Profile
                    </button>
                </div>
            </div>

            {/* Limit message for business users who already have a profile */}
            {!addCheck.allowed && (
                <div style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-secondary)', padding: '16px 20px', borderRadius: 'var(--radius-sm)', marginBottom: '24px', fontSize: '0.9rem', border: '1px solid rgba(99, 102, 241, 0.2)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <AlertCircle size={20} />
                    <div style={{ flex: 1 }}>
                        <span style={{ fontWeight: 600 }}>Plan Limit Reached:</span> {addCheck.reason}
                    </div>
                    <Link href="/upgrade" style={{ color: 'var(--accent-secondary)', fontWeight: 700, textDecoration: 'underline' }}>
                        Upgrade Now
                    </Link>
                </div>
            )}

            {/* Error display */}
            {error && (
                <div style={{ background: 'var(--error-bg)', color: 'var(--error)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', marginBottom: '16px', fontSize: '0.85rem' }}>
                    {error}
                </div>
            )}

            {/* Add Form */}
            {showForm && (
                <div className="glass-card animate-fade-in" style={{ padding: '28px', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ fontWeight: 700 }}>New GST Profile</h3>
                        <button onClick={() => { setShowForm(false); setError(''); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                            <X size={20} />
                        </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                        <div>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>GSTIN *</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <input
                                    type="text" value={gstin} onChange={(e) => {
                                        setGstin(e.target.value.toUpperCase());
                                        if (fetchStatus) setFetchStatus(null);
                                    }}
                                    placeholder="22AAAAA0000A1Z5" maxLength={15}
                                    style={{ flex: 1, padding: '10px 14px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '0.9rem', textTransform: 'uppercase' }}
                                />
                                <button
                                    onClick={handleFetchDetails}
                                    disabled={isFetching || gstin.length !== 15}
                                    type="button"
                                    className="btn btn-secondary"
                                    style={{ padding: '0 12px', height: '42px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                                    title="Fetch legal details from GST database"
                                >
                                    {isFetching ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} className="text-accent" />}
                                    Fetch
                                </button>
                            </div>
                            {fetchStatus && (
                                <div style={{
                                    fontSize: '0.75rem',
                                    marginTop: '6px',
                                    color: fetchStatus.type === 'success' ? '#10b981' : '#f59e0b',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}>
                                    <AlertCircle size={12} />
                                    {fetchStatus.message}
                                </div>
                            )}
                        </div>
                        <div>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Legal Name *</label>
                            <input
                                type="text" value={legalName} onChange={(e) => setLegalName(e.target.value)}
                                placeholder="Business legal name"
                                style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '0.9rem' }}
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Trade Name</label>
                            <input
                                type="text" value={tradeName} onChange={(e) => setTradeName(e.target.value)}
                                placeholder="Optional trade name"
                                style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '0.9rem' }}
                            />
                        </div>
                    </div>
                    <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
                        <button className="btn btn-primary" onClick={handleAdd}>
                            <Save size={16} /> Save Profile
                        </button>
                        <button className="btn btn-secondary" onClick={() => { setShowForm(false); setError(''); }}>
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Profiles Grid */}
            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
                    <div style={{ color: 'var(--accent-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                        <div className="animate-spin" style={{ width: '32px', height: '32px', border: '3px solid rgba(99, 102, 241, 0.1)', borderTopColor: 'var(--accent-secondary)', borderRadius: '50%' }} />
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Loading profiles...</span>
                    </div>
                </div>
            ) : profiles.length === 0 ? (
                <div className="glass-card" style={{ padding: '60px 32px', textAlign: 'center' }}>
                    <Building size={44} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
                    <h3 style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                        No GST profiles yet
                    </h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>
                        Add your first GSTIN profile to get started.
                    </p>
                    <button className="btn btn-primary" onClick={handleShowForm}>
                        <Plus size={16} /> Add Your First Profile
                    </button>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
                    {profiles.map((profile) => (
                        <div
                            key={profile.id}
                            className="glass-card"
                            style={{
                                padding: '24px',
                                borderColor: profile.is_active ? 'var(--accent-primary)' : undefined,
                                boxShadow: profile.is_active ? 'var(--shadow-glow)' : undefined,
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                <div>
                                    <div style={{ fontFamily: 'monospace', fontSize: '1rem', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '6px' }}>
                                        {profile.gstin}
                                    </div>
                                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{profile.legal_name}</div>
                                    {profile.trade_name !== profile.legal_name && (
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{profile.trade_name}</div>
                                    )}
                                </div>
                                {profile.is_active && (
                                    <span className="badge badge-success">
                                        <Star size={12} style={{ marginRight: '4px' }} /> Active
                                    </span>
                                )}
                            </div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '16px' }}>
                                State: {STATE_CODES[profile.state_code] || profile.state_code}
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {!profile.is_active && (
                                    <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '6px 12px' }} onClick={() => handleSetActive(profile.id)}>
                                        <Star size={14} /> Set Active
                                    </button>
                                )}
                                <button className="btn btn-danger" style={{ fontSize: '0.8rem', padding: '6px 12px' }} onClick={() => handleDelete(profile.id)}>
                                    <Trash2 size={14} /> Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
