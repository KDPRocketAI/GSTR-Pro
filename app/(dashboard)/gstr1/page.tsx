'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/use-auth';
import { useProfiles } from '@/lib/hooks/use-profiles';
import { saveReturn } from '@/lib/returns';
import { InvoiceRow, GSTR1Data } from '@/lib/types/gst';
import { parseFile } from '@/lib/gstr1/parser';
import {
    validateInvoices,
    getValidationSummary,
    autoFixRow,
    autoFixInvoices,
    undoFix
} from '@/lib/gstr1/validator';
import { getClassificationSummary } from '@/lib/gstr1/classifier';
import { generateGSTR1JSON, downloadJSON, downloadExcel } from '@/lib/gstr1/generator';
import { formatCurrency } from '@/lib/utils';
import {
    Upload, FileSpreadsheet, CheckCircle, AlertTriangle, AlertCircle,
    Download, ArrowRight, ArrowLeft, XCircle, Eye, BarChart3,
    Package, Loader2, Building, Wand2, History as HistoryIcon,
} from 'lucide-react';

type Step = 'upload' | 'preview' | 'validate' | 'summary' | 'download';
const STEPS: { id: Step; label: string; icon: React.ReactNode }[] = [
    { id: 'upload', label: 'Upload', icon: <Upload size={16} /> },
    { id: 'preview', label: 'Preview', icon: <Eye size={16} /> },
    { id: 'validate', label: 'Validate', icon: <CheckCircle size={16} /> },
    { id: 'summary', label: 'Summary', icon: <BarChart3 size={16} /> },
    { id: 'download', label: 'Download', icon: <Download size={16} /> },
];

export default function GSTR1WizardPage() {
    const router = useRouter();
    const { user, isTrialExpired } = useAuth();
    const { activeProfile } = useProfiles();

    // Strict redirection for expired trials
    useEffect(() => {
        if (isTrialExpired) {
            router.push('/upgrade');
        }
    }, [isTrialExpired, router]);
    const [step, setStep] = useState<Step>('upload');
    const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
    const [platform, setPlatform] = useState<'amazon' | 'flipkart' | 'custom' | 'other'>('other');
    const [fileName, setFileName] = useState<string>('');
    const [gstin, setGstin] = useState('');
    const [filingPeriod, setFilingPeriod] = useState('');

    // Auto-populate GSTIN from active profile
    useEffect(() => {
        if (activeProfile?.gstin) {
            setGstin(activeProfile.gstin);
        }
    }, [activeProfile]);
    const [gstr1Data, setGstr1Data] = useState<GSTR1Data | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterSeverity, setFilterSeverity] = useState<'all' | 'error' | 'warning' | 'info'>('all');
    const [validating, setValidating] = useState(false);
    const [validationProgress, setValidationProgress] = useState(0);
    const [showFixHistory, setShowFixHistory] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const PLATFORMS = [
        { id: 'amazon_b2c', name: 'Amazon B2C', icon: <Package size={24} /> },
        { id: 'amazon_b2b', name: 'Amazon B2B', icon: <Building size={24} /> },
        { id: 'flipkart_b2c', name: 'Flipkart B2C', icon: <Package size={24} /> },
        { id: 'flipkart_b2b', name: 'Flipkart B2B', icon: <Building size={24} /> },
        { id: 'meesho', name: 'Meesho', icon: <Package size={24} /> },
        { id: 'myntra', name: 'Myntra', icon: <Package size={24} /> },
        { id: 'snapdeal', name: 'Snapdeal', icon: <Package size={24} /> },
        { id: 'ajio', name: 'Ajio', icon: <Package size={24} /> },
        { id: 'tatacliq', name: 'TataCliq', icon: <Package size={24} /> },
        { id: 'shopify', name: 'Shopify', icon: <Package size={24} /> },
        { id: 'woocommerce', name: 'WooCommerce', icon: <Package size={24} /> },
        { id: 'nykaa', name: 'Nykaa', icon: <Package size={24} /> },
        { id: 'jiomart', name: 'Jiomart', icon: <Package size={24} /> },
        { id: 'blinkit', name: 'Blinkit', icon: <Package size={24} /> },
        { id: 'zepto', name: 'Zepto', icon: <Package size={24} /> },
        { id: 'bigbasket', name: 'BigBasket', icon: <Package size={24} /> },
        { id: 'other', name: 'Custom Excel / Other', icon: <FileSpreadsheet size={24} /> },
    ];

    const filteredPlatforms = PLATFORMS.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const stepIndex = STEPS.findIndex((s) => s.id === step);

    // ——— File handling ———
    const handleFile = useCallback(async (file: File) => {
        setProcessing(true);
        try {
            const buffer = await file.arrayBuffer();
            const { invoices: parsed, platform: detected } = parseFile(buffer, file.name);
            setInvoices(parsed);
            setPlatform(detected);
            setFileName(file.name);
            setStep('preview');
        } catch (err) {
            alert('Failed to parse file. Please make sure it is a valid Excel or CSV file.');
            console.error(err);
        } finally {
            setProcessing(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleFile(file);
    }, [handleFile]);

    const handleValidate = async () => {
        setValidating(true);
        setValidationProgress(0);

        // Processing in small batches to show progress
        const batchSize = 1000;
        let processed: InvoiceRow[] = [];

        for (let i = 0; i < invoices.length; i += batchSize) {
            const batch = invoices.slice(i, i + batchSize);
            const validatedBatch = validateInvoices(batch, filingPeriod);
            processed = [...processed, ...validatedBatch];
            setValidationProgress(Math.ceil(((i + batchSize) / invoices.length) * 100));
            // Tiny sleep to allow UI to breathe
            await new Promise(resolve => setTimeout(resolve, 10));
        }

        setInvoices(processed);
        setValidating(false);
        setStep('validate');
    };

    const handleSummary = () => {
        setStep('summary');
    };

    const validationSummary = invoices.length > 0 ? getValidationSummary(invoices) : null;
    const activeStateCode = gstin ? gstin.substring(0, 2) : '27';
    const classifySummary = invoices.length > 0 ? getClassificationSummary(invoices, activeStateCode) : null;

    const handleGenerate = async () => {
        const stateCode = gstin ? gstin.substring(0, 2) : '27';
        const data = generateGSTR1JSON(invoices, gstin, filingPeriod, stateCode);
        setGstr1Data(data);

        // Save to returns history
        if (activeProfile?.id && user?.id && classifySummary) {
            console.log('[GSTR1Wizard] Saving to history with totals:', classifySummary);
            await saveReturn({
                user_id: user.id,
                gst_profile_id: activeProfile.id,
                period: filingPeriod,
                return_type: 'GSTR-1',
                total_invoices: classifySummary.totalInvoices,
                total_tax: classifySummary.totalTax,
                total_value: classifySummary.totalValue,
                file_json_url: `#download-json-${filingPeriod}`, // Simulated Storage URLs
                file_excel_url: `#download-excel-${filingPeriod}`
            });
        }

        setStep('download');
    };

    const handleFixAll = () => {
        const fixedInvoices = autoFixInvoices(invoices, filingPeriod);
        const validated = validateInvoices(fixedInvoices, filingPeriod);
        setInvoices(validated);
    };

    const handleFixRow = (id: string) => {
        const newInvoices = invoices.map(inv => {
            if (inv.id === id) {
                const fixed = autoFixRow(inv, filingPeriod);
                return validateInvoices([fixed], filingPeriod)[0];
            }
            return inv;
        });
        setInvoices(newInvoices);
    };

    const handleUndoRow = (id: string) => {
        const newInvoices = invoices.map(inv => {
            if (inv.id === id) {
                const undone = undoFix(inv);
                return validateInvoices([undone], filingPeriod)[0];
            }
            return inv;
        });
        setInvoices(newInvoices);
    };

    const handleEditCell = (id: string, field: keyof InvoiceRow, value: any) => {
        const newInvoices = invoices.map(inv => {
            if (inv.id === id) {
                const updated = { ...inv, [field]: value };
                // Re-validate row if we are in validate step, or just update
                if (step === 'validate') {
                    return validateInvoices([updated], filingPeriod)[0];
                }
                return updated;
            }
            return inv;
        });
        setInvoices(newInvoices);
    };

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '4px' }}>
                    GSTR-1 <span className="gradient-text">Generator</span>
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    Generate GST portal-ready GSTR-1 JSON from your sales data
                </p>
            </div>

            {/* Step Indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '40px', flexWrap: 'wrap' }}>
                {STEPS.map((s, i) => (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                            className={`step-dot ${i < stepIndex ? 'completed' : i === stepIndex ? 'active' : 'pending'}`}
                            style={{ cursor: i < stepIndex ? 'pointer' : 'default' }}
                            onClick={() => i < stepIndex && setStep(s.id)}
                        >
                            {i < stepIndex ? <CheckCircle size={16} /> : s.icon}
                        </div>
                        <span
                            style={{
                                fontSize: '0.8rem',
                                fontWeight: i === stepIndex ? 700 : 500,
                                color: i === stepIndex ? 'var(--text-primary)' : 'var(--text-muted)',
                                marginRight: '8px',
                            }}
                        >
                            {s.label}
                        </span>
                        {i < STEPS.length - 1 && (
                            <div style={{ width: '24px', height: '2px', background: i < stepIndex ? 'var(--success)' : 'var(--border)', borderRadius: '1px', marginRight: '8px' }} />
                        )}
                    </div>
                ))}
            </div>

            {/* ——— Step 1: Upload ——— */}
            {step === 'upload' && (
                <div className="animate-fade-in">
                    {/* GSTIN & Filing Period */}
                    <div className="glass-card" style={{ padding: '28px', marginBottom: '24px' }}>
                        <h3 style={{ fontWeight: 700, marginBottom: '20px' }}>Filing Details</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                            <div>
                                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Your GSTIN</label>
                                <input
                                    type="text" value={gstin} onChange={(e) => setGstin(e.target.value.toUpperCase())}
                                    placeholder="22AAAAA0000A1Z5" maxLength={15}
                                    style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '0.9rem', textTransform: 'uppercase' }}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Filing Period (MMYYYY)</label>
                                <input
                                    type="text" value={filingPeriod} onChange={(e) => setFilingPeriod(e.target.value)}
                                    placeholder="012026" maxLength={6}
                                    style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '0.9rem' }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Platform Selector & Upload Zone */}
                    <div className="glass-card" style={{ padding: '28px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                            <h3 style={{ fontWeight: 700 }}>Select Platform</h3>
                            <div style={{ position: 'relative', width: '100%', maxWidth: '300px' }}>
                                <input
                                    type="text"
                                    placeholder="Search platforms..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '10px 14px',
                                        background: 'var(--bg-input)',
                                        border: '1px solid var(--border)',
                                        borderRadius: 'var(--radius-sm)',
                                        color: 'var(--text-primary)',
                                        fontSize: '0.85rem'
                                    }}
                                />
                            </div>
                        </div>

                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                                gap: '16px',
                                marginBottom: '24px'
                            }}
                        >
                            {filteredPlatforms.map((p) => (
                                <div
                                    key={p.id}
                                    className="platform-card"
                                    onClick={() => fileRef.current?.click()}
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.03)',
                                        border: '1px solid var(--border)',
                                        borderRadius: 'var(--radius-sm)',
                                        padding: '20px',
                                        textAlign: 'center',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                        e.currentTarget.style.borderColor = 'var(--accent-secondary)';
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                                        e.currentTarget.style.borderColor = 'var(--border)';
                                        e.currentTarget.style.transform = 'translateY(0)';
                                    }}
                                >
                                    <div style={{ color: 'var(--accent-secondary)', marginBottom: '12px', display: 'flex', justifyContent: 'center' }}>
                                        {p.icon}
                                    </div>
                                    <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '12px' }}>{p.name}</div>
                                    <button className="btn btn-secondary" style={{ width: '100%', fontSize: '0.75rem', padding: '6px' }}>
                                        Import Data
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div
                            className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
                            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={handleDrop}
                            onClick={() => fileRef.current?.click()}
                            style={{
                                border: '2px dashed var(--border)',
                                borderRadius: 'var(--radius-sm)',
                                padding: '40px',
                                textAlign: 'center',
                                background: dragOver ? 'rgba(99, 102, 241, 0.05)' : 'transparent',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <input
                                ref={fileRef}
                                type="file"
                                accept=".xlsx,.xls,.csv"
                                style={{ display: 'none' }}
                                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                            />
                            {processing ? (
                                <div>
                                    <Loader2 size={32} className="animate-spin" style={{ color: 'var(--accent-secondary)', marginBottom: '12px' }} />
                                    <p style={{ fontWeight: 600 }}>Processing file...</p>
                                </div>
                            ) : (
                                <>
                                    <Upload size={32} style={{ color: 'var(--accent-secondary)', marginBottom: '12px' }} />
                                    <p style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '4px' }}>
                                        Or drop your sales report here
                                    </p>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                        Supports Excel and CSV files
                                    </p>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ——— Step 2: Preview ——— */}
            {step === 'preview' && (
                <div className="animate-fade-in">
                    <div className="glass-card" style={{ padding: '20px', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <Package size={20} style={{ color: 'var(--accent-secondary)' }} />
                                <div>
                                    <div style={{ fontWeight: 700 }}>{fileName}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                        {invoices.length} invoices • Platform: <span className="badge badge-info" style={{ marginLeft: '4px' }}>{platform}</span>
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button className="btn btn-secondary" onClick={() => { setStep('upload'); setInvoices([]); setFileName(''); }}>
                                    <ArrowLeft size={16} /> Re-upload
                                </button>
                                <button className="btn btn-primary" onClick={handleValidate}>
                                    Validate <ArrowRight size={16} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Data Table */}
                    <div className="glass-card" style={{ overflow: 'auto', maxHeight: '500px' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Invoice No</th>
                                    <th>Date</th>
                                    <th>Buyer GSTIN</th>
                                    <th>Buyer Name</th>
                                    <th>HSN</th>
                                    <th>Taxable Value</th>
                                    <th>Rate</th>
                                    <th>CGST</th>
                                    <th>SGST</th>
                                    <th>IGST</th>
                                    <th>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoices.slice(0, 100).map((inv, i) => (
                                    <tr key={inv.id}>
                                        <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                                        <td>
                                            <input
                                                className="input-cell"
                                                value={inv.invoice_no}
                                                onChange={(e) => handleEditCell(inv.id, 'invoice_no', e.target.value)}
                                            />
                                        </td>
                                        <td>
                                            <input
                                                className="input-cell"
                                                value={inv.invoice_date}
                                                onChange={(e) => handleEditCell(inv.id, 'invoice_date', e.target.value)}
                                            />
                                        </td>
                                        <td>
                                            <input
                                                className="input-cell"
                                                value={inv.buyer_gstin}
                                                onChange={(e) => handleEditCell(inv.id, 'buyer_gstin', e.target.value)}
                                            />
                                        </td>
                                        <td>{inv.buyer_name}</td>
                                        <td>
                                            <input
                                                className="input-cell"
                                                value={inv.hsn_code}
                                                onChange={(e) => handleEditCell(inv.id, 'hsn_code', e.target.value)}
                                            />
                                        </td>
                                        <td>
                                            <input
                                                className="input-cell"
                                                type="number"
                                                value={inv.taxable_value}
                                                onChange={(e) => handleEditCell(inv.id, 'taxable_value', parseFloat(e.target.value) || 0)}
                                            />
                                        </td>
                                        <td style={{ textAlign: 'center' }}>{inv.tax_rate}%</td>
                                        <td>
                                            <input
                                                className="input-cell"
                                                type="number"
                                                value={inv.cgst}
                                                onChange={(e) => handleEditCell(inv.id, 'cgst', parseFloat(e.target.value) || 0)}
                                            />
                                        </td>
                                        <td>
                                            <input
                                                className="input-cell"
                                                type="number"
                                                value={inv.sgst}
                                                onChange={(e) => handleEditCell(inv.id, 'sgst', parseFloat(e.target.value) || 0)}
                                            />
                                        </td>
                                        <td>
                                            <input
                                                className="input-cell"
                                                type="number"
                                                value={inv.igst}
                                                onChange={(e) => handleEditCell(inv.id, 'igst', parseFloat(e.target.value) || 0)}
                                            />
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(inv.total)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {invoices.length > 100 && (
                            <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                Showing first 100 of {invoices.length} invoices
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ——— Step 3: Validate ——— */}
            {step === 'validate' && validationSummary && (
                <div className="animate-fade-in">
                    {/* Progress Bar (Visible during validation) */}
                    {validating && (
                        <div className="glass-card" style={{ padding: '24px', marginBottom: '24px', textAlign: 'center' }}>
                            <div style={{ fontWeight: 700, marginBottom: '12px' }}>Validating Invoices... {validationProgress}%</div>
                            <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ width: `${validationProgress}%`, height: '100%', background: 'var(--accent-gradient)', transition: 'width 0.2s' }} />
                            </div>
                        </div>
                    )}

                    {!validating && (
                        <>
                            {/* Summary Bar */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                                <div className="glass-card" style={{ padding: '16px', textAlign: 'center', borderBottom: '3px solid var(--success)' }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)' }}>{validationSummary.cleanRows}</div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Clean</div>
                                </div>
                                <div className="glass-card" style={{ padding: '16px', textAlign: 'center', borderBottom: '3px solid var(--warning)' }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--warning)' }}>{validationSummary.warningRows}</div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Warnings</div>
                                </div>
                                <div className="glass-card" style={{ padding: '16px', textAlign: 'center', borderBottom: '3px solid var(--error)' }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--error)' }}>{validationSummary.errorRows}</div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Errors</div>
                                </div>
                                <div className="glass-card" style={{ padding: '16px', textAlign: 'center', borderBottom: '3px solid #38bdf8' }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#38bdf8' }}>{validationSummary.infoRows}</div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Suggestions</div>
                                </div>
                            </div>

                            {/* Filters */}
                            <div className="glass-card" style={{ padding: '20px', marginBottom: '24px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 600, marginRight: '12px' }}>Filter Results:</span>
                                {(['all', 'error', 'warning', 'info'] as const).map(sev => (
                                    <button
                                        key={sev}
                                        className={`btn ${filterSeverity === sev ? 'btn-primary' : 'btn-secondary'}`}
                                        onClick={() => setFilterSeverity(sev)}
                                        style={{ fontSize: '0.75rem', padding: '6px 12px', textTransform: 'capitalize' }}
                                    >
                                        {sev} ({sev === 'all' ? validationSummary.total :
                                            sev === 'error' ? validationSummary.totalErrors :
                                                sev === 'warning' ? validationSummary.totalWarnings :
                                                    validationSummary.totalInfo})
                                    </button>
                                ))}
                                <div style={{ borderLeft: '1px solid var(--border)', height: '20px', margin: '0 8px' }} />
                                <button className="btn btn-primary" onClick={handleFixAll} style={{ fontSize: '0.75rem', padding: '6px 12px', background: 'var(--success)' }}>
                                    <Wand2 size={14} style={{ marginRight: '4px' }} /> Fix All Safe Issues
                                </button>
                                <button className="btn btn-secondary" onClick={() => setShowFixHistory(!showFixHistory)} style={{ fontSize: '0.75rem', padding: '6px 12px' }}>
                                    <HistoryIcon size={14} style={{ marginRight: '4px' }} /> {showFixHistory ? 'Hide History' : 'View Fix History'}
                                </button>
                            </div>

                            {/* Blocking Banner */}
                            {validationSummary.totalErrors > 0 && (
                                <div className="glass-card" style={{ padding: '16px', marginBottom: '24px', border: '1px solid var(--error)', background: 'rgba(239, 68, 68, 0.05)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <AlertCircle size={20} color="var(--error)" />
                                    <div>
                                        <div style={{ fontWeight: 700, color: 'var(--error)' }}>Generation Blocked</div>
                                        <div style={{ fontSize: '0.8rem' }}>Please fix the {validationSummary.totalErrors} errors highlighted below before generating GSTR-1.</div>
                                    </div>
                                </div>
                            )}

                            {/* Row-Level Details */}
                            <div className="glass-card" style={{ overflow: 'auto', maxHeight: '500px', marginBottom: '24px' }}>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Invoice</th>
                                            <th>Issues</th>
                                            <th>Fix Suggestion</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {invoices
                                            .filter(inv => {
                                                if (filterSeverity === 'all') return inv.errors.length > 0;
                                                return inv.errors.some(e => e.severity === filterSeverity);
                                            })
                                            .slice(0, 100)
                                            .map((inv) => (
                                                <tr key={inv.id} style={{
                                                    borderLeft: `4px solid ${inv.errors.some(e => e.severity === 'error') ? 'var(--error)' :
                                                        inv.errors.some(e => e.severity === 'warning') ? 'var(--warning)' :
                                                            '#38bdf8'
                                                        }`,
                                                    background: inv.isFixed ? 'rgba(34, 197, 94, 0.05)' : 'transparent'
                                                }}>
                                                    <td style={{ width: '150px' }}>
                                                        <div style={{ fontWeight: 700, color: inv.isFixed && inv.invoice_no !== inv.originalData?.invoice_no ? 'var(--success)' : 'inherit' }}>
                                                            {inv.invoice_no}
                                                        </div>
                                                        <div style={{ fontSize: '0.75rem', color: inv.isFixed && inv.invoice_date !== inv.originalData?.invoice_date ? 'var(--success)' : 'var(--text-muted)' }}>
                                                            {inv.invoice_date}
                                                        </div>
                                                        {inv.isFixed && (
                                                            <div className="badge badge-success" style={{ fontSize: '0.6rem', padding: '2px 4px', marginTop: '4px' }}>FIXED</div>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                            {inv.errors
                                                                .filter(e => filterSeverity === 'all' || e.severity === filterSeverity)
                                                                .map((err, i) => (
                                                                    <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                                                                        {err.severity === 'error' ? <XCircle size={14} color="var(--error)" style={{ marginTop: '2px' }} /> :
                                                                            err.severity === 'warning' ? <AlertTriangle size={14} color="var(--warning)" style={{ marginTop: '2px' }} /> :
                                                                                <AlertCircle size={14} color="#38bdf8" style={{ marginTop: '2px' }} />}
                                                                        <div style={{ fontSize: '0.85rem' }}>
                                                                            <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{err.field.replace('_', ' ')}: </span>
                                                                            {err.message}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                                                {inv.errors.find(e => e.suggestion)?.suggestion || 'Reload your file with corrected data.'}
                                                            </div>
                                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                                {inv.errors.some(e => e.severity === 'error' || e.severity === 'warning') && !inv.isFixed && (
                                                                    <button className="btn btn-sm btn-primary" onClick={() => handleFixRow(inv.id)} style={{ fontSize: '0.7rem', padding: '4px 8px' }}>
                                                                        <Wand2 size={12} style={{ marginRight: '4px' }} /> Apply Safe Fix
                                                                    </button>
                                                                )}
                                                                {inv.isFixed && (
                                                                    <button className="btn btn-sm btn-secondary" onClick={() => handleUndoRow(inv.id)} style={{ fontSize: '0.7rem', padding: '4px 8px' }}>
                                                                        <HistoryIcon size={12} style={{ marginRight: '4px' }} /> Undo Fix
                                                                    </button>
                                                                )}
                                                                <button className="btn btn-sm btn-secondary" style={{ fontSize: '0.7rem', padding: '4px 8px' }}>
                                                                    Edit Manually
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}

                    {/* ——— Fix History Side Panel ——— */}
                    {showFixHistory && (
                        <div className="glass-card animate-slide-in-right" style={{
                            position: 'fixed',
                            top: 0,
                            right: 0,
                            width: '350px',
                            height: '100vh',
                            zIndex: 100,
                            borderLeft: '1px solid var(--border)',
                            display: 'flex',
                            flexDirection: 'column',
                            borderRadius: 0
                        }}>
                            <div style={{ padding: '24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <HistoryIcon size={20} className="gradient-text" />
                                    <h3 style={{ fontWeight: 700 }}>Fix History</h3>
                                </div>
                                <button className="btn-icon" onClick={() => setShowFixHistory(false)}>
                                    <XCircle size={20} />
                                </button>
                            </div>
                            <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
                                {invoices.filter(inv => inv.isFixed).length === 0 ? (
                                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '40px' }}>
                                        No fixes applied yet.
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        {invoices.filter(inv => inv.isFixed).map(inv => (
                                            <div key={inv.id} className="glass-card" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)' }}>
                                                <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '8px' }}>Invoice: {inv.invoice_no}</div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    {inv.fixLog?.map((log, i) => (
                                                        <div key={i} style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', gap: '6px' }}>
                                                            <div style={{ color: 'var(--success)' }}>•</div> {log}
                                                        </div>
                                                    ))}
                                                </div>
                                                <button
                                                    className="btn btn-sm btn-secondary"
                                                    onClick={() => handleUndoRow(inv.id)}
                                                    style={{ width: '100%', marginTop: '12px', fontSize: '0.7rem' }}
                                                >
                                                    Undo this fix
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div style={{ padding: '24px', borderTop: '1px solid var(--border)' }}>
                                <button className="btn btn-primary w-full" onClick={() => setShowFixHistory(false)}>
                                    Close Panel
                                </button>
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                        <button className="btn btn-secondary" onClick={() => setStep('preview')} disabled={validating}>
                            <ArrowLeft size={16} /> Back
                        </button>
                        <button className="btn btn-primary" onClick={handleSummary} disabled={validating || (validationSummary?.totalErrors || 0) > 0}>
                            View Summary <ArrowRight size={16} />
                        </button>
                    </div>
                </div>
            )}

            {/* ——— Step 4: Summary ——— */}
            {step === 'summary' && classifySummary && (
                <div className="animate-fade-in">
                    {/* Totals */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '28px' }}>
                        <div className="glass-card" style={{ padding: '24px' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Total Invoices</div>
                            <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>{classifySummary.totalInvoices}</div>
                        </div>
                        <div className="glass-card" style={{ padding: '24px' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Total Taxable Value</div>
                            <div style={{ fontSize: '1.8rem', fontWeight: 800 }} className="gradient-text">{formatCurrency(classifySummary.totalTaxable)}</div>
                        </div>
                        <div className="glass-card" style={{ padding: '24px' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Total Tax</div>
                            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--warning)' }}>{formatCurrency(classifySummary.totalTax)}</div>
                        </div>
                        <div className="glass-card" style={{ padding: '24px' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Total Value</div>
                            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--success)' }}>{formatCurrency(classifySummary.totalValue)}</div>
                        </div>
                    </div>

                    {/* Section Breakdown */}
                    <h3 style={{ fontWeight: 700, marginBottom: '20px' }}>GSTR-1 Section Breakdown</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '28px' }}>
                        <div className="glass-card" style={{ padding: '28px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-secondary)' }}>
                                    <FileSpreadsheet size={20} />
                                </div>
                                <div>
                                    <div style={{ fontWeight: 700 }}>B2B Invoices</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Registered buyers</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{classifySummary.b2b.count}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>invoices</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-secondary)' }}>{formatCurrency(classifySummary.b2b.value)}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>value</div>
                                </div>
                            </div>
                        </div>

                        <div className="glass-card" style={{ padding: '28px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(34, 197, 94, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)' }}>
                                    <FileSpreadsheet size={20} />
                                </div>
                                <div>
                                    <div style={{ fontWeight: 700 }}>B2CS Sales</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Unregistered buyers</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{classifySummary.b2cs.count}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>entries</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--success)' }}>{formatCurrency(classifySummary.b2cs.value)}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>value</div>
                                </div>
                            </div>
                        </div>

                        <div className="glass-card" style={{ padding: '28px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--warning)' }}>
                                    <BarChart3 size={20} />
                                </div>
                                <div>
                                    <div style={{ fontWeight: 700 }}>HSN Summary</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Product categories</div>
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{classifySummary.hsn.count}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>unique HSN codes</div>
                            </div>
                        </div>
                    </div>

                    {/* HSN Summary Table */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                        <h3 style={{ fontWeight: 700, margin: 0 }}>HSN-wise Tax Summary</h3>
                        {classifySummary.hsn.data.some(h => (h.warnings?.length || 0) > 0) && (
                            <span className="badge badge-warning" style={{ fontSize: '0.75rem' }}>
                                <AlertTriangle size={12} /> HSN Inconsistencies Detected
                            </span>
                        )}
                    </div>

                    <div className="glass-card" style={{ overflow: 'auto', marginBottom: '28px' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>HSN/SAC</th>
                                    <th>Description</th>
                                    <th>Taxable Value</th>
                                    <th>CGST</th>
                                    <th>SGST</th>
                                    <th>IGST</th>
                                    <th>Details</th>
                                </tr>
                            </thead>
                            <tbody>
                                {classifySummary.hsn.data.map((hsn, i) => {
                                    const totalTax = hsn.camt + hsn.samt + hsn.iamt + hsn.csamt;
                                    const hasWarning = (hsn.warnings?.length || 0) > 0;

                                    return (
                                        <tr key={hsn.hsn_sc + i} style={{ background: hasWarning ? 'rgba(245, 158, 11, 0.03)' : 'transparent' }}>
                                            <td style={{ fontWeight: 600 }}>{hsn.hsn_sc}</td>
                                            <td>{hsn.desc}</td>
                                            <td>{formatCurrency(hsn.txval)}</td>
                                            <td>{formatCurrency(hsn.camt)}</td>
                                            <td>{formatCurrency(hsn.samt)}</td>
                                            <td>{formatCurrency(hsn.iamt)}</td>
                                            <td>
                                                {hasWarning ? (
                                                    <div style={{ color: 'var(--warning)', fontSize: '0.7rem', maxWidth: '180px' }}>
                                                        {hsn.warnings?.map((w, wi) => <div key={wi}>{w}</div>)}
                                                    </div>
                                                ) : (
                                                    <span style={{ fontSize: '0.7rem', color: 'var(--success)' }}>Balanced</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot style={{ background: 'rgba(99, 102, 241, 0.08)', fontWeight: 800 }}>
                                <tr>
                                    <td colSpan={2} style={{ textAlign: 'right', padding: '16px' }}>Grand Total</td>
                                    <td style={{ padding: '16px' }}>
                                        {formatCurrency(classifySummary.hsn.data.reduce((acc, curr) => acc + curr.txval, 0))}
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        {formatCurrency(classifySummary.hsn.data.reduce((acc, curr) => acc + curr.camt, 0))}
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        {formatCurrency(classifySummary.hsn.data.reduce((acc, curr) => acc + curr.samt, 0))}
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        {formatCurrency(classifySummary.hsn.data.reduce((acc, curr) => acc + curr.iamt, 0))}
                                    </td>
                                    <td style={{ padding: '16px', color: 'var(--warning)' }}>
                                        {formatCurrency(classifySummary.hsn.data.reduce((acc, curr) => acc + (curr.camt + curr.samt + curr.iamt + curr.csamt), 0))}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {/* Status Banner */}
                    <div className="glass-card" style={{ padding: '16px', marginBottom: '28px', border: '1px solid var(--success)', background: 'rgba(34, 197, 94, 0.05)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <CheckCircle size={20} color="var(--success)" />
                        <div>
                            <div style={{ fontWeight: 700, color: 'var(--success)' }}>Ready for GSTR-1 Generation</div>
                            <div style={{ fontSize: '0.8rem' }}>All {classifySummary.totalInvoices} invoices have passed critical validation.</div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                        <button className="btn btn-secondary" onClick={() => setStep('validate')}>
                            <ArrowLeft size={16} /> Back
                        </button>
                        <button
                            className="btn btn-success btn-lg"
                            onClick={handleGenerate}
                            disabled={isTrialExpired || (validationSummary?.totalErrors || 0) > 0}
                            title={isTrialExpired ? 'Trial expired. Please upgrade.' : (validationSummary?.totalErrors || 0) > 0 ? 'Critical errors must be fixed first.' : ''}
                        >
                            {isTrialExpired ? <AlertTriangle size={18} style={{ marginRight: '8px' }} /> : null}
                            Generate GSTR-1 Files <ArrowRight size={16} />
                        </button>
                    </div>
                </div>
            )}

            {/* ——— Step 5: Download ——— */}
            {step === 'download' && gstr1Data && (
                <div className="animate-fade-in">
                    <div className="glass-card" style={{ padding: '60px 40px', textAlign: 'center', marginBottom: '28px' }}>
                        <div
                            style={{
                                width: '80px', height: '80px', borderRadius: '20px',
                                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                marginBottom: '24px',
                                boxShadow: '0 0 40px rgba(34, 197, 94, 0.3)',
                            }}
                        >
                            <CheckCircle size={40} color="white" />
                        </div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '8px' }}>
                            GSTR-1 Generated Successfully!
                        </h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', maxWidth: '450px', margin: '0 auto 32px' }}>
                            Your GSTR-1 files are ready. Download the JSON for GST portal upload and the Excel for your records.
                        </p>

                        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <button
                                className="btn btn-primary btn-lg"
                                onClick={() => downloadJSON(gstr1Data, `GSTR1_${gstr1Data.gstin || 'export'}_${gstr1Data.fp}.json`)}
                                disabled={isTrialExpired}
                                title={isTrialExpired ? 'Trial expired. Please upgrade.' : ''}
                            >
                                <Download size={18} /> Download JSON
                            </button>
                            <button
                                className="btn btn-success btn-lg"
                                onClick={() => downloadExcel(invoices, gstr1Data, `GSTR1_Summary_${gstr1Data.gstin || 'export'}_${gstr1Data.fp}.xlsx`)}
                                disabled={isTrialExpired}
                                title={isTrialExpired ? 'Trial expired. Please upgrade.' : ''}
                            >
                                <FileSpreadsheet size={18} /> Download Excel
                            </button>
                        </div>
                    </div>

                    {/* JSON Preview */}
                    <div className="glass-card" style={{ padding: '24px' }}>
                        <h3 style={{ fontWeight: 700, marginBottom: '16px' }}>JSON Preview</h3>
                        <pre
                            style={{
                                background: 'rgba(0,0,0,0.3)',
                                padding: '20px',
                                borderRadius: 'var(--radius-sm)',
                                overflow: 'auto',
                                maxHeight: '300px',
                                fontSize: '0.8rem',
                                color: 'var(--accent-secondary)',
                                lineHeight: 1.6,
                            }}
                        >
                            {JSON.stringify(gstr1Data, null, 2)}
                        </pre>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                        <button className="btn btn-secondary" onClick={() => setStep('summary')}>
                            <ArrowLeft size={16} /> Back
                        </button>
                        <button className="btn btn-primary" onClick={() => { setStep('upload'); setInvoices([]); setFileName(''); setGstr1Data(null); }}>
                            New Upload <Upload size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
