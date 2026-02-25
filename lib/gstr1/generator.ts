import * as XLSX from 'xlsx';
import { InvoiceRow, GSTR1Data } from '@/lib/types/gst';
import { classifyB2B, classifyB2CS, classifyHSN } from './classifier';

// ——— Generate GSTR-1 JSON (GST Portal format) ———
export function generateGSTR1JSON(
    invoices: InvoiceRow[],
    gstin: string,
    filingPeriod: string,
    sellerStateCode: string
): GSTR1Data {
    const b2b = classifyB2B(invoices);
    const b2cs = classifyB2CS(invoices, sellerStateCode);
    const hsn = classifyHSN(invoices);

    // Build docs issued summary
    const invoiceNos = invoices.map((i) => i.invoice_no).filter(Boolean).sort();
    const docIssued = {
        doc_det: [
            {
                doc_num: 1,
                docs: [
                    {
                        num: 1,
                        from: invoiceNos[0] || '',
                        to: invoiceNos[invoiceNos.length - 1] || '',
                        totnum: invoiceNos.length,
                        cancel: 0,
                        net_issue: invoiceNos.length,
                    },
                ],
            },
        ],
    };

    return {
        gstin,
        fp: filingPeriod,
        b2b,
        b2cs,
        cdnr: [],
        hsn,
        doc_issue: docIssued,
    };
}

// ——— Download JSON ———
export function downloadJSON(data: GSTR1Data, filename: string) {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

// ——— Generate Excel Summary ———
export function downloadExcel(invoices: InvoiceRow[], gstr1Data: GSTR1Data, filename: string) {
    const workbook = XLSX.utils.book_new();

    // Sheet 1: All Invoices
    const invoiceData = invoices.map((inv) => ({
        'Invoice No': inv.invoice_no,
        'Invoice Date': inv.invoice_date,
        'Buyer GSTIN': inv.buyer_gstin || 'URP',
        'Buyer Name': inv.buyer_name,
        'Place of Supply': inv.place_of_supply,
        'HSN Code': inv.hsn_code,
        'Description': inv.description,
        'Qty': inv.quantity,
        'Taxable Value': inv.taxable_value,
        'Tax Rate': inv.tax_rate,
        'CGST': inv.cgst,
        'SGST': inv.sgst,
        'IGST': inv.igst,
        'Cess': inv.cess,
        'Total': inv.total,
        'Type': inv.buyer_gstin && inv.buyer_gstin.length === 15 && inv.buyer_gstin !== 'URP' ? 'B2B' : 'B2CS',
        'Errors': inv.errors.map((e) => e.message).join('; '),
    }));
    const ws1 = XLSX.utils.json_to_sheet(invoiceData);
    XLSX.utils.book_append_sheet(workbook, ws1, 'All Invoices');

    // Sheet 2: B2B Summary
    const b2bData = gstr1Data.b2b.flatMap((entry) =>
        entry.inv.map((inv) => ({
            'Buyer GSTIN': entry.ctin,
            'Invoice No': inv.inum,
            'Invoice Date': inv.idt,
            'Invoice Value': inv.val,
            'Place of Supply': inv.pos,
            'Reverse Charge': inv.rchrg,
            'Taxable Value': inv.itms[0]?.itm_det.txval || 0,
            'Tax Rate': inv.itms[0]?.itm_det.rt || 0,
            'CGST': inv.itms[0]?.itm_det.camt || 0,
            'SGST': inv.itms[0]?.itm_det.samt || 0,
            'IGST': inv.itms[0]?.itm_det.iamt || 0,
            'Cess': inv.itms[0]?.itm_det.csamt || 0,
        }))
    );
    if (b2bData.length > 0) {
        const ws2 = XLSX.utils.json_to_sheet(b2bData);
        XLSX.utils.book_append_sheet(workbook, ws2, 'B2B');
    }

    // Sheet 3: B2CS Summary
    const b2csData = gstr1Data.b2cs.map((entry) => ({
        'Type': entry.sply_ty,
        'Place of Supply': entry.pos,
        'Tax Rate': entry.rt,
        'Taxable Value': entry.txval,
        'CGST': entry.camt,
        'SGST': entry.samt,
        'IGST': entry.iamt,
        'Cess': entry.csamt,
    }));
    if (b2csData.length > 0) {
        const ws3 = XLSX.utils.json_to_sheet(b2csData);
        XLSX.utils.book_append_sheet(workbook, ws3, 'B2CS');
    }

    // Sheet 4: HSN Summary
    const hsnData = gstr1Data.hsn.map((entry) => ({
        'HSN/SAC Code': entry.hsn_sc,
        'Description': entry.desc,
        'UQC': entry.uqc,
        'Qty': entry.qty,
        'Total Taxable Value': entry.txval,
        'Total CGST': entry.camt,
        'Total SGST': entry.samt,
        'Total IGST': entry.iamt,
        'Total Cess': entry.csamt,
        'Total Tax': Math.round((entry.camt + entry.samt + entry.iamt + entry.csamt) * 100) / 100,
    }));
    if (hsnData.length > 0) {
        const ws4 = XLSX.utils.json_to_sheet(hsnData);
        XLSX.utils.book_append_sheet(workbook, ws4, 'HSN Summary');
    }

    // Download
    const excelBuf = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}
