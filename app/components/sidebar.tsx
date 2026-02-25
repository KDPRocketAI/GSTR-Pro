'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/use-auth';
import { useProfiles } from '@/lib/hooks/use-profiles';
import {
    LayoutDashboard,
    FileSpreadsheet,
    Upload,
    Building,
    History,
    Settings,
    LogOut,
    Menu,
    X,
    ChevronRight,
    ChevronDown,
    CreditCard
} from 'lucide-react';
import { TrialBadge } from './trial-banner';

const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/gstr1', label: 'GSTR-1 Generator', icon: FileSpreadsheet },
    { href: '/history', label: 'Returns History', icon: History },
    { href: '/profiles', label: 'GST Profiles', icon: Building },
    { href: '/settings/billing', label: 'Billing & Invoices', icon: CreditCard },
    { href: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { user, signOut } = useAuth();
    const { profiles, activeProfile, loading: profileLoading, switchProfile } = useProfiles();
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        const styleId = 'sidebar-responsive';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                @media (max-width: 768px) {
                    .mobile-menu-btn {
                        display: flex !important;
                    }
                    .sidebar-desktop {
                        transform: translateX(-100%);
                    }
                    .mobile-sidebar-open {
                        transform: translateX(0) !important;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }, []);

    const handleSignOut = async () => {
        await signOut();
        router.push('/login');
    };

    const sidebarContent = (
        <>
            {/* Logo */}
            <div
                style={{
                    padding: '24px 20px 20px',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                }}
            >
                <div
                    style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: 'var(--accent-gradient)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                    }}
                >
                    <FileSpreadsheet size={20} color="white" />
                </div>
                <div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, lineHeight: 1.2 }}>
                        GST<span className="gradient-text">Desk</span>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>GST Compliance</div>
                </div>
            </div>

            {/* Profile Selector */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                    Active GST Profile
                </div>
                {profileLoading ? (
                    <div style={{ height: '38px', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)', animation: 'pulse 2s infinite' }} />
                ) : (
                    <div style={{ position: 'relative' }}>
                        <select
                            value={activeProfile?.id || ''}
                            onChange={(e) => switchProfile(e.target.value)}
                            style={{
                                width: '100%',
                                background: 'rgba(99, 102, 241, 0.05)',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-sm)',
                                padding: '8px 12px',
                                color: 'var(--text-primary)',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                appearance: 'none',
                                cursor: 'pointer',
                                outline: 'none',
                                transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-secondary)'}
                            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                        >
                            {profiles.length === 0 ? (
                                <option value="">No profiles found</option>
                            ) : (
                                profiles.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.gstin} ({p.trade_name || p.legal_name})
                                    </option>
                                ))
                            )}
                        </select>
                        <ChevronDown
                            size={14}
                            style={{
                                position: 'absolute',
                                right: '12px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: 'var(--text-muted)',
                                pointerEvents: 'none'
                            }}
                        />
                    </div>
                )}
            </div>

            {/* Nav Items */}
            <div style={{ padding: '16px 12px', flex: 1 }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0 10px', marginBottom: '8px' }}>
                    Menu
                </div>
                <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setMobileOpen(false)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    padding: '10px 14px',
                                    borderRadius: 'var(--radius-sm)',
                                    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                                    background: isActive ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                                    fontWeight: isActive ? 600 : 500,
                                    fontSize: '0.9rem',
                                    textDecoration: 'none',
                                    transition: 'all 0.2s ease',
                                    position: 'relative',
                                }}
                            >
                                {isActive && (
                                    <div
                                        style={{
                                            position: 'absolute',
                                            left: 0,
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            width: '3px',
                                            height: '20px',
                                            borderRadius: '0 3px 3px 0',
                                            background: 'var(--accent-gradient)',
                                        }}
                                    />
                                )}
                                <Icon size={20} style={{ color: isActive ? 'var(--accent-secondary)' : 'var(--text-muted)' }} />
                                {item.label}
                                {isActive && <ChevronRight size={14} style={{ marginLeft: 'auto', color: 'var(--accent-secondary)' }} />}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            {/* User & Logout */}
            <div style={{ padding: '16px 12px', borderTop: '1px solid var(--border)' }}>
                <div style={{ marginBottom: '12px', padding: '0 14px' }}>
                    <TrialBadge />
                </div>
                <div
                    style={{
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-surface)',
                        marginBottom: '8px',
                    }}
                >
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {user?.user_metadata?.full_name || 'User'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {user?.email || ''}
                    </div>
                </div>
                <button
                    onClick={handleSignOut}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--text-secondary)',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        width: '100%',
                        fontSize: '0.85rem',
                        fontWeight: 500,
                        transition: 'all 0.2s',
                    }}
                >
                    <LogOut size={18} />
                    Sign Out
                </button>
            </div>
        </>
    );

    return (
        <>
            {/* Mobile hamburger */}
            <button
                onClick={() => setMobileOpen(true)}
                style={{
                    position: 'fixed',
                    top: '14px',
                    left: '14px',
                    zIndex: 200,
                    display: 'none',
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                }}
                className="mobile-menu-btn"
            >
                <Menu size={20} />
            </button>

            {/* Mobile overlay */}
            {mobileOpen && (
                <div
                    onClick={() => setMobileOpen(false)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.6)',
                        zIndex: 299,
                    }}
                />
            )}

            {/* Sidebar */}
            <aside
                style={{
                    width: '260px',
                    minHeight: '100vh',
                    background: 'var(--bg-secondary)',
                    borderRight: '1px solid var(--border)',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'fixed',
                    top: 0,
                    left: mobileOpen ? 0 : undefined,
                    zIndex: 300,
                    transition: 'transform 0.3s ease',
                }}
                className={mobileOpen ? 'mobile-sidebar-open' : 'sidebar-desktop'}
            >
                {mobileOpen && (
                    <button
                        onClick={() => setMobileOpen(false)}
                        style={{
                            position: 'absolute',
                            top: '14px',
                            right: '14px',
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                        }}
                    >
                        <X size={20} />
                    </button>
                )}
                {sidebarContent}
            </aside>
        </>
    );
}
