export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <div
            style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--bg-primary)',
                padding: '20px',
            }}
        >
            <div
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background:
                        'radial-gradient(ellipse at 50% 0%, rgba(99, 102, 241, 0.08) 0%, transparent 60%)',
                    pointerEvents: 'none',
                }}
            />
            {children}
        </div>
    );
}
