// ——— GST Profile ———
export interface GSTProfile {
    id: string;
    user_id: string;
    gstin: string;
    legal_name: string;
    trade_name: string;
    state_code: string;
    is_active: boolean;
    created_at: string;
}

// ——— Parsed Invoice Row ———
export interface InvoiceRow {
    id: string;
    invoice_no: string;
    invoice_date: string;
    buyer_gstin: string;
    buyer_name: string;
    place_of_supply: string;
    hsn_code: string;
    description: string;
    quantity: number;
    taxable_value: number;
    tax_rate: number;
    cgst: number;
    sgst: number;
    igst: number;
    cess: number;
    total: number;
    platform: 'amazon' | 'flipkart' | 'custom' | 'other';
    errors: ValidationError[];
    originalData?: Partial<InvoiceRow>;
    fixLog?: string[];
    isFixed?: boolean;
}

// ——— Validation ———
export interface ValidationError {
    field: string;
    message: string;
    severity: 'error' | 'warning' | 'info';
    suggestion?: string;
}

// ——— GSTR-1 Sections ———
export interface GSTR1Data {
    gstin: string;
    fp: string; // Filing period MMYYYY
    b2b: B2BInvoice[];
    b2cs: B2CSEntry[];
    cdnr: CDNRNote[];
    hsn: HSNEntry[];
    doc_issue: DocIssued;
}

export interface B2BInvoice {
    ctin: string; // Counter-party GSTIN
    inv: {
        inum: string;
        idt: string;
        val: number;
        pos: string;
        rchrg: 'Y' | 'N';
        itms: TaxItem[];
    }[];
}

export interface B2CSEntry {
    sply_ty: 'INTRA' | 'INTER';
    pos: string;
    typ: 'OE' | 'E';
    txval: number;
    rt: number;
    camt: number;
    samt: number;
    iamt: number;
    csamt: number;
}

export interface CDNRNote {
    ctin: string;
    nt: {
        ntty: 'C' | 'D';
        nt_num: string;
        nt_dt: string;
        val: number;
        pos: string;
        itms: TaxItem[];
    }[];
}

export interface TaxItem {
    num: number;
    itm_det: {
        txval: number;
        rt: number;
        camt: number;
        samt: number;
        iamt: number;
        csamt: number;
    };
}

export interface HSNEntry {
    num: number;
    hsn_sc: string;
    desc: string;
    uqc: string;
    qty: number;
    txval: number;
    camt: number;
    samt: number;
    iamt: number;
    csamt: number;
    warnings?: string[];
}

export interface DocIssued {
    doc_det: {
        doc_num: number;
        docs: {
            num: number;
            from: string;
            to: string;
            totnum: number;
            cancel: number;
            net_issue: number;
        }[];
    }[];
}

// ——— Wizard State ———
export type WizardStep = 'upload' | 'preview' | 'validate' | 'summary' | 'download';

export interface WizardState {
    currentStep: WizardStep;
    fileName: string | null;
    platform: 'amazon' | 'flipkart' | 'custom' | 'other' | null;
    invoices: InvoiceRow[];
    filingPeriod: string;
    gstr1Data: GSTR1Data | null;
    validationComplete: boolean;
    hasErrors: boolean;
}

// ——— State Codes ———
export const STATE_CODES: Record<string, string> = {
    '01': 'Jammu & Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab',
    '04': 'Chandigarh', '05': 'Uttarakhand', '06': 'Haryana',
    '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh',
    '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh',
    '13': 'Nagaland', '14': 'Manipur', '15': 'Mizoram',
    '16': 'Tripura', '17': 'Meghalaya', '18': 'Assam',
    '19': 'West Bengal', '20': 'Jharkhand', '21': 'Odisha',
    '22': 'Chhattisgarh', '23': 'Madhya Pradesh', '24': 'Gujarat',
    '26': 'Dadra & Nagar Haveli and Daman & Diu', '27': 'Maharashtra',
    '28': 'Andhra Pradesh (Old)', '29': 'Karnataka', '30': 'Goa',
    '31': 'Lakshadweep', '32': 'Kerala', '33': 'Tamil Nadu',
    '34': 'Puducherry', '35': 'Andaman & Nicobar Islands',
    '36': 'Telangana', '37': 'Andhra Pradesh',
};
