import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';

const razorpay = new Razorpay({
    key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(req: NextRequest) {
    try {
        const { plan } = await req.json();

        let amount = 0;
        if (plan === 'business') {
            amount = 2499 * 100; // In paise
        } else if (plan === 'ca') {
            amount = 9999 * 100; // In paise
        } else {
            return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
        }

        const options = {
            amount,
            currency: 'INR',
            receipt: `receipt_${Date.now()}`,
        };

        const order = await razorpay.orders.create(options);

        return NextResponse.json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
        });
    } catch (error: any) {
        console.error('Razorpay Order Error:', error);
        return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
    }
}
