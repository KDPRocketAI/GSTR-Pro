'use client';

import Link from 'next/link';
import { ArrowRight, FileSpreadsheet, Shield, Zap, Upload, CheckCircle, Download } from 'lucide-react';

export default function LandingPage() {
  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh' }}>
      {/* Navbar */}
      <nav
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px 40px',
          borderBottom: '1px solid var(--border)',
          backdropFilter: 'blur(20px)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: 'rgba(15, 15, 35, 0.85)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'var(--accent-gradient)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FileSpreadsheet size={20} color="white" />
          </div>
          <span style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            GSTR <span className="gradient-text">Pro</span>
          </span>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Link href="/login" className="btn btn-secondary">
            Log In
          </Link>
          <Link href="/signup" className="btn btn-primary">
            Start Free <ArrowRight size={16} />
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section
        style={{
          textAlign: 'center',
          padding: '100px 20px 60px',
          maxWidth: '800px',
          margin: '0 auto',
        }}
        className="animate-fade-in"
      >
        <div className="badge badge-info" style={{ marginBottom: '24px', fontSize: '0.8rem' }}>
          ✨ Built for Amazon & Flipkart Sellers
        </div>
        <h1
          style={{
            fontSize: 'clamp(2.2rem, 5vw, 3.5rem)',
            fontWeight: 800,
            lineHeight: 1.1,
            marginBottom: '24px',
          }}
        >
          GST Compliance{' '}
          <span className="gradient-text">Made Simple</span>
        </h1>
        <p
          style={{
            fontSize: '1.15rem',
            color: 'var(--text-secondary)',
            maxWidth: '560px',
            margin: '0 auto 40px',
            lineHeight: 1.7,
          }}
        >
          Upload your e-commerce sales reports, validate GST data instantly, and generate
          portal-ready GSTR-1 files in minutes — not hours.
        </p>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/signup" className="btn btn-primary btn-lg">
            Get Started Free <ArrowRight size={18} />
          </Link>
          <Link href="#features" className="btn btn-secondary btn-lg">
            See How It Works
          </Link>
        </div>
      </section>

      {/* Stats bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '48px',
          padding: '30px 20px',
          flexWrap: 'wrap',
        }}
      >
        {[
          { value: '5 Steps', label: 'Simple wizard flow' },
          { value: '< 2 min', label: 'Average processing time' },
          { value: '100%', label: 'Portal compatible JSON' },
        ].map((s) => (
          <div key={s.label} style={{ textAlign: 'center' }}>
            <div className="gradient-text" style={{ fontSize: '1.5rem', fontWeight: 800 }}>
              {s.value}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Features */}
      <section
        id="features"
        style={{
          padding: '80px 20px',
          maxWidth: '1100px',
          margin: '0 auto',
        }}
      >
        <h2
          style={{
            textAlign: 'center',
            fontSize: '2rem',
            fontWeight: 700,
            marginBottom: '16px',
          }}
        >
          Everything You Need for <span className="gradient-text">GSTR-1</span>
        </h2>
        <p
          style={{
            textAlign: 'center',
            color: 'var(--text-secondary)',
            marginBottom: '60px',
            maxWidth: '500px',
            margin: '0 auto 60px',
          }}
        >
          A streamlined workflow designed specifically for e-commerce sellers.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '24px',
          }}
        >
          {[
            {
              icon: <Upload size={28} />,
              title: 'Smart Upload',
              desc: 'Drag & drop your Amazon or Flipkart sales reports. We auto-detect the format and parse your data.',
            },
            {
              icon: <Shield size={28} />,
              title: 'Smart Validation',
              desc: 'GSTIN checksums, HSN codes, tax rate verification — catch every error before filing.',
            },
            {
              icon: <Zap size={28} />,
              title: 'Auto Classification',
              desc: 'Invoices are automatically sorted into B2B, B2CS, CDNR, and HSN summary sections.',
            },
            {
              icon: <CheckCircle size={28} />,
              title: 'Error Highlighting',
              desc: 'Problematic rows are highlighted with clear error messages so you can fix them quickly.',
            },
            {
              icon: <Download size={28} />,
              title: 'Portal-Ready Output',
              desc: 'Download GSTR-1 JSON ready for direct upload to the GST portal. Excel summary included.',
            },
            {
              icon: <FileSpreadsheet size={28} />,
              title: 'E-commerce Optimized',
              desc: 'Built specifically for Amazon and Flipkart sellers with platform-aware parsing logic.',
            },
          ].map((f) => (
            <div key={f.title} className="glass-card" style={{ padding: '32px' }}>
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '12px',
                  background: 'rgba(99, 102, 241, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-secondary)',
                  marginBottom: '20px',
                }}
              >
                {f.icon}
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px' }}>
                {f.title}
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding: '80px 20px', maxWidth: '900px', margin: '0 auto' }}>
        <h2
          style={{ textAlign: 'center', fontSize: '2rem', fontWeight: 700, marginBottom: '60px' }}
        >
          How It Works
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {[
            { step: '01', title: 'Upload Sales Report', desc: 'Drop your Amazon/Flipkart Excel or CSV file' },
            { step: '02', title: 'Preview & Edit', desc: 'Review parsed data in a clean table view' },
            { step: '03', title: 'Validate', desc: 'Auto-check GSTIN, HSN, tax rates and fix errors' },
            { step: '04', title: 'Review Summary', desc: 'See B2B, B2CS, CDNR breakdown at a glance' },
            { step: '05', title: 'Download', desc: 'Get your GSTR-1 JSON and Excel summary files' },
          ].map((item, i) => (
            <div
              key={item.step}
              className="glass-card animate-fade-in"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '24px',
                padding: '24px 32px',
                animationDelay: `${i * 0.1}s`,
              }}
            >
              <div className="gradient-text" style={{ fontSize: '2rem', fontWeight: 800, minWidth: '60px' }}>
                {item.step}
              </div>
              <div>
                <h3 style={{ fontWeight: 700, marginBottom: '4px' }}>{item.title}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section
        style={{
          textAlign: 'center',
          padding: '80px 20px',
          maxWidth: '600px',
          margin: '0 auto',
        }}
      >
        <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '16px' }}>
          Ready to Simplify Your GST Filing?
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
          Join thousands of e-commerce sellers who save hours every month.
        </p>
        <Link href="/signup" className="btn btn-primary btn-lg">
          Start For Free <ArrowRight size={18} />
        </Link>
      </section>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--border)',
          padding: '24px 40px',
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontSize: '0.85rem',
        }}
      >
        © {new Date().getFullYear()} GSTR Pro. Built for Indian e-commerce sellers.
      </footer>
    </div>
  );
}
