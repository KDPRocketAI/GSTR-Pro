import * as XLSX from 'xlsx';
import { InvoiceRow } from '@/lib/types/gst';
import { generateId } from '@/lib/utils';

// ——— Platform Detection & Scoring ———
type Platform = 'amazon' | 'flipkart' | 'custom' | 'other';

const PLATFORM_SIGNATURES: Record<Platform, string[]> = {
    amazon: ['asin', 'amazon', 'sku', 'order-id', 'fulfillment'],
    flipkart: ['flipkart', 'fsn', 'product title', 'order id'],
    custom: ['invoice no', 'invoice date', 'gstin', 'taxable value'],
    other: [],
};

export function detectPlatform(headers: string[]): Platform {
    const headerStr = headers.map((h) => h.toLowerCase()).join('|');

    let bestPlatform: Platform = 'other';
    let maxScore = 0;

    for (const [platform, keywords] of Object.entries(PLATFORM_SIGNATURES)) {
        if (platform === 'other') continue;
        const score = keywords.reduce((s, k) => s + (headerStr.includes(k) ? 1 : 0), 0);
        if (score > maxScore) {
            maxScore = score;
            bestPlatform = platform as Platform;
        }
    }

    // Secondary check for standard GST columns to qualify as 'custom'
    if (bestPlatform === 'other' && (headerStr.includes('gst') || headerStr.includes('tax'))) {
        return 'custom';
    }

    return bestPlatform;
}

// ——— Column Mapping Candidates ———
interface ColumnMap {
    invoice_no: string[];
    invoice_date: string[];
    buyer_gstin: string[];
    buyer_name: string[];
    place_of_supply: string[];
    hsn_code: string[];
    description: string[];
    quantity: string[];
    taxable_value: string[];
    tax_rate: string[];
    cgst: string[];
    sgst: string[];
    igst: string[];
    cess: string[];
    total: string[];
}

const AMAZON_MAP: ColumnMap = {
    invoice_no: ['invoice number', 'external invoice id'],
    invoice_date: ['invoice date', 'order date'],
    buyer_gstin: ['buyer gstin', 'customer gstin'],
    buyer_name: ['buyer name', 'customer name'],
    place_of_supply: ['ship-to state', 'place of supply'],
    hsn_code: ['hsn/sac', 'hsn code'],
    description: ['product description', 'title'],
    quantity: ['quantity', 'qty'],
    taxable_value: ['taxable value', 'net amount'],
    tax_rate: ['tax rate', 'gst rate'],
    cgst: ['cgst amount', 'central tax'],
    sgst: ['sgst amount', 'state tax'],
    igst: ['igst amount', 'integrated tax'],
    cess: ['cess amount', 'compensation cess'],
    total: ['invoice amount', 'total amount'],
};

const FLIPKART_MAP: ColumnMap = {
    invoice_no: ['seller invoice no', 'invoice no'],
    invoice_date: ['seller invoice date', 'invoice date'],
    buyer_gstin: ['buyer gstin', 'gstin'],
    buyer_name: ['buyer name', 'customer'],
    place_of_supply: ['delivery state', 'pos'],
    hsn_code: ['hsn code', 'hsn'],
    description: ['product title', 'description'],
    quantity: ['quantity', 'qty'],
    taxable_value: ['taxable value', 'item taxable amount'],
    tax_rate: ['tax rate', 'gst rate'],
    cgst: ['cgst'],
    sgst: ['sgst'],
    igst: ['igst'],
    cess: ['tcs/cess', 'cess'],
    total: ['total amount', 'invoice value'],
};

const GENERIC_MAP: ColumnMap = {
    invoice_no: ['invoice no', 'bill no', 'document number', 'invoice number'],
    invoice_date: ['invoice date', 'date', 'bill date'],
    buyer_gstin: ['gstin', 'buyer gstin', 'tax id', 'recipient gst'],
    buyer_name: ['buyer name', 'customer name', 'party name'],
    place_of_supply: ['place of supply', 'state', 'pos', 'supply state'],
    hsn_code: ['hsn', 'sac', 'commodity code'],
    description: ['description', 'item', 'particulars'],
    quantity: ['qty', 'quantity', 'units'],
    taxable_value: ['taxable value', 'taxable amt', 'assessable value'],
    tax_rate: ['rate', 'tax %', 'gst %'],
    cgst: ['cgst', 'central gst'],
    sgst: ['sgst', 'state gst'],
    igst: ['igst', 'integrated gst'],
    cess: ['cess'],
    total: ['total', 'net amount', 'grand total'],
};

function findColumn(headers: string[], candidates: string[]): number {
    const lower = headers.map((h) => h.toLowerCase().trim());
    for (const c of candidates) {
        const target = c.toLowerCase();
        // Try exact match first
        const exactIdx = lower.indexOf(target);
        if (exactIdx !== -1) return exactIdx;
        // Try partial match
        const partialIdx = lower.findIndex((h) => h.includes(target));
        if (partialIdx !== -1) return partialIdx;
    }
    return -1;
}

function getColumnIndex(headers: string[], map: ColumnMap, field: keyof ColumnMap): number {
    return findColumn(headers, map[field]);
}

function parseNum(val: unknown): number {
    if (val === null || val === undefined || val === '') return 0;
    if (typeof val === 'number') return val;
    const n = Number(String(val).replace(/[₹,\s]/g, ''));
    return isNaN(n) ? 0 : n;
}

function parseDate(val: unknown): string {
    if (!val) return '';
    if (val instanceof Date) {
        return val.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
    const str = String(val).trim();
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
    return str;
}

// ——— Main Parser ———
export function parseFile(file: ArrayBuffer, fileName: string): { invoices: InvoiceRow[]; platform: Platform } {
    const workbook = XLSX.read(file, { type: 'array', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const raw: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    if (raw.length < 2) {
        return { invoices: [], platform: 'other' };
    }

    // Find header row (first row with enough non-empty cells)
    let headerIdx = 0;
    for (let i = 0; i < Math.min(20, raw.length); i++) {
        const nonEmpty = raw[i].filter((c) => c !== null && c !== undefined && String(c).trim() !== '').length;
        if (nonEmpty >= 5) {
            headerIdx = i;
            break;
        }
    }

    const headers = raw[headerIdx].map((h) => String(h || '').trim());
    const platform = detectPlatform(headers);
    const map = platform === 'amazon' ? AMAZON_MAP : platform === 'flipkart' ? FLIPKART_MAP : GENERIC_MAP;

    const colIdx = {
        invoice_no: getColumnIndex(headers, map, 'invoice_no'),
        invoice_date: getColumnIndex(headers, map, 'invoice_date'),
        buyer_gstin: getColumnIndex(headers, map, 'buyer_gstin'),
        buyer_name: getColumnIndex(headers, map, 'buyer_name'),
        place_of_supply: getColumnIndex(headers, map, 'place_of_supply'),
        hsn_code: getColumnIndex(headers, map, 'hsn_code'),
        description: getColumnIndex(headers, map, 'description'),
        quantity: getColumnIndex(headers, map, 'quantity'),
        taxable_value: getColumnIndex(headers, map, 'taxable_value'),
        tax_rate: getColumnIndex(headers, map, 'tax_rate'),
        cgst: getColumnIndex(headers, map, 'cgst'),
        sgst: getColumnIndex(headers, map, 'sgst'),
        igst: getColumnIndex(headers, map, 'igst'),
        cess: getColumnIndex(headers, map, 'cess'),
        total: getColumnIndex(headers, map, 'total'),
    };

    const invoices: InvoiceRow[] = [];
    // Skip header and empty rows
    for (let i = headerIdx + 1; i < raw.length; i++) {
        const row = raw[i];
        if (!row || row.length < 3) continue;

        const invoiceNo = colIdx.invoice_no >= 0 ? String(row[colIdx.invoice_no] || '').trim() : '';
        if (!invoiceNo) continue;

        const taxableValue = parseNum(colIdx.taxable_value >= 0 ? row[colIdx.taxable_value] : 0);
        const cgst = parseNum(colIdx.cgst >= 0 ? row[colIdx.cgst] : 0);
        const sgst = parseNum(colIdx.sgst >= 0 ? row[colIdx.sgst] : 0);
        const igst = parseNum(colIdx.igst >= 0 ? row[colIdx.igst] : 0);
        const cess = parseNum(colIdx.cess >= 0 ? row[colIdx.cess] : 0);
        const total = parseNum(colIdx.total >= 0 ? row[colIdx.total] : 0) || (taxableValue + cgst + sgst + igst + cess);

        invoices.push({
            id: generateId(),
            invoice_no: invoiceNo,
            invoice_date: parseDate(colIdx.invoice_date >= 0 ? row[colIdx.invoice_date] : ''),
            buyer_gstin: colIdx.buyer_gstin >= 0 ? String(row[colIdx.buyer_gstin] || '').trim().toUpperCase() : '',
            buyer_name: colIdx.buyer_name >= 0 ? String(row[colIdx.buyer_name] || '').trim() : '',
            place_of_supply: colIdx.place_of_supply >= 0 ? String(row[colIdx.place_of_supply] || '').trim() : '',
            hsn_code: colIdx.hsn_code >= 0 ? String(row[colIdx.hsn_code] || '').trim() : '',
            description: colIdx.description >= 0 ? String(row[colIdx.description] || '').trim() : '',
            quantity: parseNum(colIdx.quantity >= 0 ? row[colIdx.quantity] : 1),
            taxable_value: taxableValue,
            tax_rate: parseNum(colIdx.tax_rate >= 0 ? row[colIdx.tax_rate] : 0),
            cgst,
            sgst,
            igst,
            cess,
            total,
            platform,
            errors: [],
        });
    }

    return { invoices, platform };
}
