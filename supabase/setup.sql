-- setup.sql
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)

-- 1. Create the gst_profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.gst_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    gstin TEXT NOT NULL,
    legal_name TEXT NOT NULL,
    trade_name TEXT,
    state_code TEXT,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id, gstin) -- Prevent duplicate GSTINs per user
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.gst_profiles ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies

-- Policy: Users can view their own profiles
CREATE POLICY "Users can view their own profiles"
ON public.gst_profiles
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can insert their own profiles
CREATE POLICY "Users can insert their own profiles"
ON public.gst_profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own profiles
CREATE POLICY "Users can update their own profiles"
ON public.gst_profiles
FOR UPDATE
USING (auth.uid() = user_id);

-- Policy: Users can delete their own profiles
CREATE POLICY "Users can delete their own profiles"
ON public.gst_profiles
FOR DELETE
USING (auth.uid() = user_id);

-- 4. Set up an index for faster lookups by user_id
CREATE INDEX IF NOT EXISTS idx_gst_profiles_user_id ON public.gst_profiles(user_id);

-- 5. Add a trigger to update updated_at automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_gst_profiles_updated_at
BEFORE UPDATE ON public.gst_profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 6. Create the gst_returns table (Replacing returns_history)
CREATE TABLE IF NOT EXISTS public.gst_returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    gst_profile_id UUID NOT NULL REFERENCES public.gst_profiles(id) ON DELETE CASCADE,
    period TEXT NOT NULL, -- "MMYYYY"
    return_type TEXT NOT NULL DEFAULT 'GSTR-1',
    total_invoices INTEGER DEFAULT 0,
    total_tax NUMERIC(15,2) DEFAULT 0,
    total_value NUMERIC(15,2) DEFAULT 0,
    file_json_url TEXT,
    file_excel_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Enable RLS for gst_returns
ALTER TABLE public.gst_returns ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS Policies for gst_returns
CREATE POLICY "Users can view their own returns"
ON public.gst_returns FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own returns"
ON public.gst_returns FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own returns"
ON public.gst_returns FOR DELETE
USING (auth.uid() = user_id);

-- 9. Add index for gst_returns
CREATE INDEX IF NOT EXISTS idx_gst_returns_user_id ON public.gst_returns(user_id);
CREATE INDEX IF NOT EXISTS idx_gst_returns_gst_profile_id ON public.gst_returns(gst_profile_id);
