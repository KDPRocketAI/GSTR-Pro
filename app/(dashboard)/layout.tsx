'use client';

import Sidebar from '@/app/components/sidebar';
import { useEffect } from 'react';
import { TrialBanner, TrialExpirationOverlay, TrialBadge } from '@/app/components/trial-banner';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        const styleId = 'dashboard-responsive';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
        @media (max-width: 768px) {
          .dashboard-main {
            margin-left: 0 !important;
            padding: 20px 16px 80px !important;
          }
        }
      `;
            document.head.appendChild(style);
        }
    }, []);

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)', flexDirection: 'column' }}>
            <TrialExpirationOverlay />
            <div style={{ display: 'flex', flex: 1 }}>
                <Sidebar />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', maxWidth: '100%' }}>
                    <TrialBanner />
                    <main
                        style={{
                            flex: 1,
                            marginLeft: '260px',
                            padding: '32px',
                            minHeight: '100vh',
                            maxWidth: '100%',
                            overflow: 'auto',
                        }}
                        className="dashboard-main"
                    >
                        {children}
                    </main>
                </div>
            </div>
        </div>
    );
}
