/**
 * GST Lookup Service
 * Provides functionality to fetch legal and trade details for a given GSTIN.
 * For now, this uses a mock implementation.
 */

export interface GstDetails {
    gstin: string;
    legal_name: string;
    trade_name: string;
    state_code: string;
    state_name: string;
    status: 'Active' | 'Inactive' | 'Pending';
}

const MOCK_DATA: Record<string, Partial<GstDetails>> = {
    '27AAAAA0000A1Z5': {
        legal_name: 'MAHARASHTRA TRADING CO',
        trade_name: 'MTC SOLUTIONS',
        state_code: '27',
        state_name: 'Maharashtra',
        status: 'Active'
    },
    '07AAAAA0000A1Z5': {
        legal_name: 'DELHI LOGISTICS LTD',
        trade_name: 'DELHI EXPRESS',
        state_code: '07',
        state_name: 'Delhi',
        status: 'Active'
    },
    '29AAAAA0000A1Z5': {
        legal_name: 'KARNATAKA SOFTWARE PARK',
        trade_name: 'KSP TECH',
        state_code: '29',
        state_name: 'Karnataka',
        status: 'Active'
    }
};

/**
 * Fetches GST details for a given GSTIN.
 * In a real-world scenario, this would call a GST lookup API (like Razorpay, Setu, or Govt Portal).
 */
export async function fetchGstDetails(gstin: string): Promise<GstDetails> {
    console.log('[gst-lookup] Fetching details for GSTIN:', gstin);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));

    const normalizedGstin = gstin.toUpperCase().trim();

    // Validate GSTIN format basic check
    if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(normalizedGstin)) {
        console.warn('[gst-lookup] Invalid GSTIN format:', normalizedGstin);
        // We still allow a mock hit for some test cases that might not be 100% valid but are in our map
    }

    const mockHit = MOCK_DATA[normalizedGstin];

    if (mockHit) {
        console.log('[gst-lookup] Success - Mock data found:', mockHit);
        return {
            gstin: normalizedGstin,
            legal_name: mockHit.legal_name || '',
            trade_name: mockHit.trade_name || mockHit.legal_name || '',
            state_code: mockHit.state_code || normalizedGstin.substring(0, 2),
            state_name: mockHit.state_name || 'India',
            status: mockHit.status || 'Active'
        };
    }

    // Default Fallback for any "valid-looking" GSTIN during testing
    // This allows the user to test with any string that matches the format
    if (normalizedGstin.length === 15) {
        console.log('[gst-lookup] Partial Success - Generating fallback data for unknown GSTIN');
        return {
            gstin: normalizedGstin,
            legal_name: `LEGAL NAME FOR ${normalizedGstin}`,
            trade_name: `TRADE NAME FOR ${normalizedGstin}`,
            state_code: normalizedGstin.substring(0, 2),
            state_name: 'Unknown State',
            status: 'Active'
        };
    }

    console.error('[gst-lookup] Failed to fetch details for GSTIN:', normalizedGstin);
    throw new Error('Could not fetch GST details. Please check the GSTIN or enter manually.');
}
