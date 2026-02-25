import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            plan,
            userId
        } = await req.json();

        const body = razorpay_order_id + "|" + razorpay_payment_id;

        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
            .update(body.toString())
            .digest('hex');

        const isSignatureValid = expectedSignature === razorpay_signature;

        if (isSignatureValid) {
            // Update Supabase user metadata
            const supabase = createAdminClient();

            const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId);
            if (userError || !user) {
                console.error('User Fetch Error:', userError);
                return NextResponse.json({ error: 'Failed to fetch user for invoice generation' }, { status: 500 });
            }

            // Update plan metadata
            const { error: updateError } = await supabase.auth.admin.updateUserById(
                userId,
                { user_metadata: { plan, trial_end: null } }
            );

            if (updateError) {
                console.error('Supabase User Update Error:', updateError);
                return NextResponse.json({ error: 'Payment verified but failed to update plan' }, { status: 500 });
            }

            // --- Invoice Generation ---
            try {
                const { generateInvoicePDF } = await import('@/lib/utils/pdf');

                // Get amount
                const amount = plan === 'business' ? 249900 : 999900;
                const date = new Date();
                const year = date.getFullYear();

                // Get latest invoice count for number (simplified, ideally use a sequence/DB counter)
                const { count } = await supabase.from('invoices').select('*', { count: 'exact', head: true });
                const invoiceNo = `INV-${year}-${String((count || 0) + 1).padStart(6, '0')}`;

                const pdfBuffer = await generateInvoicePDF({
                    invoiceNo,
                    date: date.toLocaleDateString('en-IN'),
                    customerName: user.user_metadata?.full_name || 'Customer',
                    customerEmail: user.email || '',
                    plan,
                    amount,
                    paymentId: razorpay_payment_id
                });

                // Upload to Supabase Storage
                const fileName = `${invoiceNo}.pdf`;
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('invoices')
                    .upload(`${userId}/${fileName}`, pdfBuffer, {
                        contentType: 'application/pdf',
                        upsert: true
                    });

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage.from('invoices').getPublicUrl(`${userId}/${fileName}`);

                // Insert into invoices table
                const { error: insertError } = await supabase.from('invoices').insert({
                    user_id: userId,
                    invoice_no: invoiceNo,
                    plan,
                    amount,
                    payment_id: razorpay_payment_id,
                    pdf_url: publicUrl
                });

                if (insertError) throw insertError;

                return NextResponse.json({ success: true, invoiceUrl: publicUrl });
            } catch (invoiceErr) {
                console.error('Invoice Generation Failed (handled):', invoiceErr);
                // We return success anyway because payment/plan update worked
                return NextResponse.json({ success: true, warning: 'Invoice generation failed. Please contact support.' });
            }
        } else {
            return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
        }
    } catch (error: any) {
        console.error('Razorpay Verification Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
