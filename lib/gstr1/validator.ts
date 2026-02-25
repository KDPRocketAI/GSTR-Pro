import { InvoiceRow, ValidationError } from '@/lib/types/gst';
import { validateGSTIN } from '@/lib/utils';

export function validateInvoices(invoices: InvoiceRow[], filingPeriod: string): InvoiceRow[] {
    // filingPeriod is MMYYYY
    const selectedMonth = parseInt(filingPeriod.substring(0, 2)) - 1;
    const selectedYear = parseInt(filingPeriod.substring(2));

    return invoices.map((inv) => {
        const errors: ValidationError[] = [];

        // 1. Invoice number
        if (!inv.invoice_no || inv.invoice_no.trim() === '') {
            errors.push({
                field: 'invoice_no',
                message: 'Invoice number is required',
                severity: 'error',
                suggestion: 'Ensure the "Invoice No" column is correctly mapped or populated.'
            });
        } else if (inv.invoice_no.length > 16) {
            errors.push({
                field: 'invoice_no',
                message: 'Invoice number is too long (max 16 chars)',
                severity: 'warning',
                suggestion: 'GSTR-1 only allows 16 characters for invoice numbers.'
            });
        }

        // 2. Invoice Date vs Period
        if (!inv.invoice_date || inv.invoice_date.trim() === '') {
            errors.push({
                field: 'invoice_date',
                message: 'Invoice date is missing',
                severity: 'error'
            });
        } else {
            // Check if date is within filingPeriod
            const [d, m, y] = inv.invoice_date.split('/').map(n => parseInt(n));
            if (m !== (selectedMonth + 1) || y !== selectedYear) {
                errors.push({
                    field: 'invoice_date',
                    message: `Invoice date (${inv.invoice_date}) is outside selected period (${filingPeriod})`,
                    severity: 'error',
                    suggestion: `Did you mean ${String(selectedMonth + 1).padStart(2, '0')}/${selectedYear}?`
                });
            }
        }

        // 3. Buyer GSTIN
        if (inv.buyer_gstin && inv.buyer_gstin.length > 0 && inv.buyer_gstin !== 'URP') {
            if (!validateGSTIN(inv.buyer_gstin)) {
                errors.push({
                    field: 'buyer_gstin',
                    message: 'Invalid GSTIN format or checksum',
                    severity: 'error',
                    suggestion: 'Check for typos or verify the GSTIN on the portal.'
                });
            }
        }

        // 4. Taxable value
        if (inv.taxable_value <= 0) {
            errors.push({
                field: 'taxable_value',
                message: 'Taxable value must be greater than 0',
                severity: 'error'
            });
        }

        // 5. Tax Rules (IGST vs CGST/SGST)
        const hasIgst = inv.igst > 0.01;
        const hasCgst = inv.cgst > 0.01;
        const hasSgst = inv.sgst > 0.01;

        if (hasIgst && (hasCgst || hasSgst)) {
            errors.push({
                field: 'igst',
                message: 'Both IGST and CGST/SGST present',
                severity: 'error',
                suggestion: 'Choose only one tax type: IGST for interstate, CGST+SGST for local.'
            });
        }

        // 6. Tax Calculation & Rounding (₹1 tolerance)
        const totalTaxCalculated = Math.round((inv.cgst + inv.sgst + inv.igst) * 100) / 100;
        const expectedTax = Math.round(inv.taxable_value * inv.tax_rate) / 100;

        if (inv.tax_rate > 0) {
            const taxDiff = Math.abs(totalTaxCalculated - expectedTax);
            if (taxDiff > 1) {
                errors.push({
                    field: 'tax_rate',
                    message: `Tax mismatch: expected ₹${expectedTax.toFixed(2)}, got ₹${totalTaxCalculated.toFixed(2)}`,
                    severity: 'warning',
                    suggestion: 'Verify if the tax rate or taxable value is correctly calculated.'
                });
            }
        }

        // 7. Total match check
        const computedTotal = Math.round((inv.taxable_value + totalTaxCalculated + inv.cess) * 100) / 100;
        const invoiceTotal = Math.round(inv.total * 100) / 100;
        if (Math.abs(computedTotal - invoiceTotal) > 1) {
            errors.push({
                field: 'total',
                message: `Invoice total mismatch: computed ₹${computedTotal}, but file says ₹${invoiceTotal}`,
                severity: 'warning',
                suggestion: 'Check if there are other charges or discounts missing from the mapping.'
            });
        }

        // 8. HSN code
        const hsnRegex = /^\d+$/;
        if (!inv.hsn_code || inv.hsn_code.trim() === '') {
            errors.push({
                field: 'hsn_code',
                message: 'HSN/SAC code is missing',
                severity: 'warning',
                suggestion: 'HSN is mandatory for GSTR-1 filings.'
            });
        } else if (!hsnRegex.test(inv.hsn_code)) {
            errors.push({
                field: 'hsn_code',
                message: 'HSN must be numeric',
                severity: 'error',
                suggestion: 'Remove any non-numeric characters from the HSN code.'
            });
        } else if (inv.hsn_code.length < 4 || inv.hsn_code.length > 8) {
            errors.push({
                field: 'hsn_code',
                message: 'HSN code should be 4-8 digits',
                severity: 'warning'
            });
        }

        // 9. Info / Best Practices
        if (inv.taxable_value > 250000 && !inv.buyer_gstin) {
            errors.push({
                field: 'buyer_gstin',
                message: 'High value B2C invoice',
                severity: 'info',
                suggestion: 'Ensure this is not a B2B transaction that requires a GSTIN.'
            });
        }

        return { ...inv, errors };
    });
}

export function getValidationSummary(invoices: InvoiceRow[]) {
    const totalErrors = invoices.reduce((sum, inv) => sum + inv.errors.filter((e) => e.severity === 'error').length, 0);
    const totalWarnings = invoices.reduce((sum, inv) => sum + inv.errors.filter((e) => e.severity === 'warning').length, 0);
    const totalInfo = invoices.reduce((sum, inv) => sum + inv.errors.filter((e) => e.severity === 'info').length, 0);

    const errorRows = invoices.filter((inv) => inv.errors.some((e) => e.severity === 'error')).length;
    const warningRows = invoices.filter((inv) => inv.errors.some((e) => e.severity === 'warning') && !inv.errors.some((e) => e.severity === 'error')).length;
    const infoRows = invoices.filter((inv) => inv.errors.some((e) => e.severity === 'info') && !inv.errors.some((e) => e.severity === 'error' || e.severity === 'warning')).length;
    const cleanRows = invoices.length - errorRows - warningRows - infoRows;

    return {
        totalErrors,
        totalWarnings,
        totalInfo,
        errorRows,
        warningRows,
        infoRows,
        cleanRows,
        total: invoices.length
    };
}
export function autoFixRow(row: InvoiceRow, filingPeriod: string): InvoiceRow {
    const fixed: any = { ...row };
    const logs: string[] = [];
    const original: any = {};

    // Helper to log changes and store original value
    const update = (field: string, newValue: any, message: string) => {
        if (fixed[field] !== newValue) {
            if (original[field] === undefined) {
                original[field] = fixed[field];
            }
            fixed[field] = newValue;
            logs.push(message);
        }
    };

    // 1. Trimming (Safe)
    if (fixed.invoice_no) update('invoice_no', fixed.invoice_no.trim(), `Trimmed invoice number.`);
    if (fixed.buyer_gstin) update('buyer_gstin', fixed.buyer_gstin.trim(), `Trimmed buyer GSTIN.`);
    if (fixed.hsn_code) update('hsn_code', fixed.hsn_code.trim(), `Trimmed HSN code.`);

    // 2. Date Formatting (Safe if parseable)
    if (fixed.invoice_date && !fixed.invoice_date.includes('/')) {
        // Try to handle YYYY-MM-DD or other dash formats
        const dashMatch = fixed.invoice_date.match(/(\d{4})-(\d{2})-(\d{2})/);
        if (dashMatch) {
            const [_, y, m, d] = dashMatch;
            update('invoice_date', `${d}/${m}/${y}`, `Formatted date to DD/MM/YYYY.`);
        }
    }

    // 3. Tax Exclusivity (Safe logical conflict)
    // If CGST+SGST > 0.01, IGST must be 0
    if ((fixed.cgst > 0.01 || fixed.sgst > 0.01) && fixed.igst > 0.01) {
        update('igst', 0, `Detected CGST/SGST. Set IGST to ₹0.`);
    }
    // If IGST > 0.01, CGST and SGST must be 0
    else if (fixed.igst > 0.01 && (fixed.cgst > 0.01 || fixed.sgst > 0.01)) {
        update('cgst', 0, `Detected IGST. Set CGST to ₹0.`);
        update('sgst', 0, `Detected IGST. Set SGST to ₹0.`);
    }

    // 4. Rounding & Totals (Safe precision)
    update('cgst', Math.round(fixed.cgst * 100) / 100, `Rounded CGST.`);
    update('sgst', Math.round(fixed.sgst * 100) / 100, `Rounded SGST.`);
    update('igst', Math.round(fixed.igst * 100) / 100, `Rounded IGST.`);
    update('taxable_value', Math.round(fixed.taxable_value * 100) / 100, `Rounded taxable value.`);

    const totalTax = Math.round((fixed.cgst + fixed.sgst + fixed.igst) * 100) / 100;
    const computedTotal = Math.round((fixed.taxable_value + totalTax + fixed.cess) * 100) / 100;

    if (fixed.total !== computedTotal) {
        update('total', computedTotal, `Recalculated total from ₹${fixed.total} to ₹${computedTotal}.`);
    }

    if (logs.length > 0) {
        fixed.isFixed = true;
        fixed.fixLog = [...(fixed.fixLog || []), ...logs];
        fixed.originalData = { ...(fixed.originalData || {}), ...original };
    }

    return fixed;
}

export function autoFixInvoices(invoices: InvoiceRow[], filingPeriod: string): InvoiceRow[] {
    return invoices.map(inv => autoFixRow(inv, filingPeriod));
}

export function undoFix(row: InvoiceRow): InvoiceRow {
    if (!row.isFixed || !row.originalData) return row;

    return {
        ...row,
        ...row.originalData,
        isFixed: false,
        originalData: undefined,
        fixLog: undefined
    };
}
