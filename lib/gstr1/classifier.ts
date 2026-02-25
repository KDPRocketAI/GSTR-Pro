import { InvoiceRow, B2BInvoice, B2CSEntry, HSNEntry } from '@/lib/types/gst';

// Classify invoices into GSTR-1 sections

export function classifyB2B(invoices: InvoiceRow[]): B2BInvoice[] {
    // B2B = invoices with valid buyer GSTIN and value > ₹2.5 lakh threshold not required for e-commerce
    const b2bInvoices = invoices.filter(
        (inv) => inv.buyer_gstin && inv.buyer_gstin.length === 15 && inv.buyer_gstin !== 'URP'
    );

    // Group by buyer GSTIN
    const grouped = new Map<string, InvoiceRow[]>();
    for (const inv of b2bInvoices) {
        const existing = grouped.get(inv.buyer_gstin) || [];
        existing.push(inv);
        grouped.set(inv.buyer_gstin, existing);
    }

    return Array.from(grouped.entries()).map(([ctin, invs]) => ({
        ctin,
        inv: invs.map((inv) => ({
            inum: inv.invoice_no,
            idt: inv.invoice_date,
            val: Math.round((inv.taxable_value + inv.cgst + inv.sgst + inv.igst + inv.cess) * 100) / 100,
            pos: inv.place_of_supply.substring(0, 2) || getStateFromGSTIN(ctin),
            rchrg: 'N' as const,
            itms: [
                {
                    num: 1,
                    itm_det: {
                        txval: round(inv.taxable_value),
                        rt: inv.tax_rate,
                        camt: round(inv.cgst),
                        samt: round(inv.sgst),
                        iamt: round(inv.igst),
                        csamt: round(inv.cess),
                    },
                },
            ],
        })),
    }));
}

export function classifyB2CS(invoices: InvoiceRow[], sellerStateCode: string): B2CSEntry[] {
    // B2CS = invoices without buyer GSTIN (unregistered parties) or marked URP
    const b2csInvoices = invoices.filter(
        (inv) => !inv.buyer_gstin || inv.buyer_gstin === 'URP' || inv.buyer_gstin.length < 15
    );

    // Group by POS + Tax Rate + Supply Type
    const grouped = new Map<string, { txval: number; camt: number; samt: number; iamt: number; csamt: number; pos: string; rt: number; sply_ty: 'INTRA' | 'INTER' }>();

    for (const inv of b2csInvoices) {
        const posCode = inv.place_of_supply.substring(0, 2) || sellerStateCode;
        const splyType: 'INTRA' | 'INTER' = posCode === sellerStateCode ? 'INTRA' : 'INTER';
        const key = `${posCode}_${inv.tax_rate}_${splyType}`;

        const existing = grouped.get(key) || {
            txval: 0, camt: 0, samt: 0, iamt: 0, csamt: 0,
            pos: posCode, rt: inv.tax_rate, sply_ty: splyType,
        };

        existing.txval += inv.taxable_value;
        existing.camt += inv.cgst;
        existing.samt += inv.sgst;
        existing.iamt += inv.igst;
        existing.csamt += inv.cess;
        grouped.set(key, existing);
    }

    return Array.from(grouped.values()).map((entry) => ({
        sply_ty: entry.sply_ty,
        pos: entry.pos,
        typ: 'OE' as const,
        txval: round(entry.txval),
        rt: entry.rt,
        camt: round(entry.camt),
        samt: round(entry.samt),
        iamt: round(entry.iamt),
        csamt: round(entry.csamt),
    }));
}

export function classifyHSN(invoices: InvoiceRow[]): HSNEntry[] {
    const grouped = new Map<string, HSNEntry & { rates: Set<number> }>();

    for (const inv of invoices) {
        const hsn = inv.hsn_code || 'UNKNOWN';
        const existing = grouped.get(hsn);

        if (existing) {
            existing.qty += inv.quantity;
            existing.txval += inv.taxable_value;
            existing.camt += inv.cgst;
            existing.samt += inv.sgst;
            existing.iamt += inv.igst;
            existing.csamt += inv.cess;
            existing.rates.add(inv.tax_rate);
        } else {
            grouped.set(hsn, {
                num: grouped.size + 1,
                hsn_sc: hsn,
                desc: inv.description || 'Goods',
                uqc: 'NOS',
                qty: inv.quantity,
                txval: inv.taxable_value,
                camt: inv.cgst,
                samt: inv.sgst,
                iamt: inv.igst,
                csamt: inv.cess,
                rates: new Set([inv.tax_rate]),
                warnings: [],
            });
        }
    }

    return Array.from(grouped.values()).map((entry) => {
        const warnings: string[] = [];
        if (entry.rates.size > 1) {
            warnings.push(`Inconsistent tax rates found: ${Array.from(entry.rates).join('%, ')}%`);
        }

        return {
            num: entry.num,
            hsn_sc: entry.hsn_sc,
            desc: entry.desc,
            uqc: entry.uqc,
            qty: entry.qty,
            txval: round(entry.txval),
            camt: round(entry.camt),
            samt: round(entry.samt),
            iamt: round(entry.iamt),
            csamt: round(entry.csamt),
            warnings: warnings.length > 0 ? warnings : undefined,
        };
    });
}

export function getClassificationSummary(invoices: InvoiceRow[], sellerStateCode: string) {
    const b2b = classifyB2B(invoices);
    const b2cs = classifyB2CS(invoices, sellerStateCode);
    const hsn = classifyHSN(invoices);

    const b2bCount = b2b.reduce((s, g) => s + g.inv.length, 0);
    const b2csCount = invoices.filter((i) => !i.buyer_gstin || i.buyer_gstin === 'URP' || i.buyer_gstin.length < 15).length;
    const b2bValue = b2b.reduce((s, g) => s + g.inv.reduce((s2, i) => s2 + i.val, 0), 0);
    const b2csValue = b2cs.reduce((s, e) => s + e.txval, 0);

    return {
        b2b: { count: b2bCount, value: round(b2bValue), data: b2b },
        b2cs: { count: b2csCount, value: round(b2csValue), data: b2cs },
        hsn: { count: hsn.length, data: hsn },
        totalInvoices: invoices.length,
        totalValue: round(invoices.reduce((s, i) => s + i.total, 0)),
        totalTaxable: round(invoices.reduce((s, i) => s + i.taxable_value, 0)),
        totalTax: round(invoices.reduce((s, i) => s + i.cgst + i.sgst + i.igst + i.cess, 0)),
    };
}

function getStateFromGSTIN(gstin: string): string {
    return gstin.substring(0, 2);
}

function round(val: number): number {
    return Math.round(val * 100) / 100;
}
