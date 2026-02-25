import { createClient } from '@/lib/supabase/client';

export interface ReturnRecord {
    id: string;
    user_id: string;
    gst_profile_id: string;
    period: string; // "MMYYYY"
    return_type: string;
    total_invoices: number;
    total_tax: number;
    total_value: number;
    file_json_url: string | null;
    file_excel_url: string | null;
    created_at: string;
}

export async function saveReturn(record: Omit<ReturnRecord, 'id' | 'created_at'>) {
    const supabase = createClient();
    console.log('[returns] Saving return to gst_returns:', record);

    const { data, error } = await supabase
        .from('gst_returns')
        .insert(record)
        .select()
        .single();

    if (error) {
        console.error('[returns] Error saving return:', error);
        return { success: false, error: error.message };
    }

    return { success: true, data };
}

export async function getReturns(profileId?: string): Promise<ReturnRecord[]> {
    const supabase = createClient();
    console.log('[returns] Fetching returns history...');

    let query = supabase.from('gst_returns').select('*');

    if (profileId) {
        query = query.eq('gst_profile_id', profileId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
        console.error('[returns] Error fetching returns:', error);
        return [];
    }

    return data || [];
}

export async function deleteReturn(recordId: string) {
    const supabase = createClient();
    const { error } = await supabase
        .from('gst_returns')
        .delete()
        .eq('id', recordId);

    if (error) {
        console.error('[returns] Error deleting return:', error);
        return false;
    }

    return true;
}

export async function getDashboardStats() {
    const supabase = createClient();
    console.log('[returns] Fetching dashboard stats...');

    const { data, error } = await supabase
        .from('gst_returns')
        .select('total_value, total_tax, total_invoices');

    if (error) {
        console.error('[returns] Error fetching stats:', error);
        return { totalReturns: 0, totalSales: 0, totalTax: 0, totalInvoices: 0 };
    }

    const stats = (data || []).reduce((acc, curr) => {
        acc.totalReturns += 1;
        acc.totalSales += Number(curr.total_value || 0);
        acc.totalTax += Number(curr.total_tax || 0);
        acc.totalInvoices += Number(curr.total_invoices || 0);
        return acc;
    }, { totalReturns: 0, totalSales: 0, totalTax: 0, totalInvoices: 0 });

    return stats;
}
