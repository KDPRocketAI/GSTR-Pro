import PDFDocument from 'pdfkit';

interface InvoiceData {
    invoiceNo: string;
    date: string;
    customerName: string;
    customerEmail: string;
    plan: string;
    amount: number; // in paise
    paymentId: string;
}

export async function generateInvoicePDF(data: InvoiceData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
            const pdfBuffer = Buffer.concat(buffers);
            resolve(pdfBuffer);
        });
        doc.on('error', reject);

        // Header
        doc.fillColor('#6366f1').fontSize(24).text('GSTR Pro', { align: 'right' });
        doc.fillColor('#444').fontSize(10).text('Premium GST Compliance SaaS', { align: 'right' });
        doc.moveDown();

        // Title
        doc.fillColor('#000').fontSize(20).text('INVOICE / RECEIPT', 50, 100);
        doc.moveDown();

        // Info Grid
        const top = 140;
        doc.fontSize(10).fillColor('#666');
        doc.text('Invoice Number:', 50, top);
        doc.text('Date:', 50, top + 20);
        doc.text('Payment ID:', 50, top + 40);

        doc.fillColor('#000').font('Helvetica-Bold');
        doc.text(data.invoiceNo, 150, top);
        doc.text(data.date, 150, top + 20);
        doc.text(data.paymentId, 150, top + 40);

        // Customer Info
        doc.font('Helvetica').fillColor('#666');
        doc.text('Bill To:', 350, top);
        doc.fillColor('#000').font('Helvetica-Bold');
        doc.text(data.customerName, 350, top + 15);
        doc.font('Helvetica').text(data.customerEmail, 350, top + 30);

        // Divider
        doc.moveTo(50, 220).lineTo(550, 220).strokeColor('#eee').stroke();

        // Table Header
        const tableTop = 240;
        doc.font('Helvetica-Bold').fillColor('#000');
        doc.text('Description', 50, tableTop);
        doc.text('Qty', 350, tableTop, { width: 50, align: 'right' });
        doc.text('Price', 400, tableTop, { width: 70, align: 'right' });
        doc.text('Total', 480, tableTop, { width: 70, align: 'right' });

        // Table Divider
        doc.moveTo(50, 255).lineTo(550, 255).strokeColor('#eee').stroke();

        // Item
        const itemTop = 270;
        doc.font('Helvetica').text(`Subscription: ${data.plan.toUpperCase()}`, 50, itemTop);
        doc.text('1', 350, itemTop, { width: 50, align: 'right' });
        doc.text(`INR ${(data.amount / 100).toLocaleString()}`, 400, itemTop, { width: 70, align: 'right' });
        doc.text(`INR ${(data.amount / 100).toLocaleString()}`, 480, itemTop, { width: 70, align: 'right' });

        // Footer Divider
        doc.moveTo(50, 310).lineTo(550, 310).strokeColor('#eee').stroke();

        // Totals
        const totalTop = 330;
        doc.font('Helvetica-Bold').fontSize(12);
        doc.text('Grand Total:', 350, totalTop);
        doc.fillColor('#6366f1').text(`INR ${(data.amount / 100).toLocaleString()}`, 480, totalTop, { width: 70, align: 'right' });

        // Note
        doc.fontSize(10).fillColor('#666').font('Helvetica');
        doc.text('This is a computer-generated receipt and does not require a physical signature.', 50, 500, { align: 'center', width: 500 });
        doc.text('Thank you for choosing GSTR Pro!', 50, 515, { align: 'center', width: 500 });

        doc.end();
    });
}
