-- Create invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    invoice_no TEXT UNIQUE NOT NULL,
    plan TEXT NOT NULL,
    amount INTEGER NOT NULL, -- in paise
    payment_id TEXT NOT NULL,
    pdf_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Create policy for users to see only their own invoices
CREATE POLICY "Users can view their own invoices." ON public.invoices
    FOR SELECT USING (auth.uid() = user_id);

-- Create policy for system/admin to insert invoices (if needed, but usually server-side bypasses RLS if using service role)
-- However, for clarity:
CREATE POLICY "System can insert invoices." ON public.invoices
    FOR INSERT WITH CHECK (true);
