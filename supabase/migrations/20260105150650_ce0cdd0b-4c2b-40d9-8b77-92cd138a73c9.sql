-- =============================================
-- Stripe Credit System Database Schema Changes
-- =============================================

-- 1. Add 'credits' column to the existing 'profiles' table
ALTER TABLE public.profiles
ADD COLUMN credits INTEGER NOT NULL DEFAULT 1;

-- 2. Create a new table to log credit transactions
CREATE TABLE public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Transaction details
  type TEXT NOT NULL CHECK (type IN ('purchase', 'initial_bonus', 'search_deduction')),
  amount INTEGER NOT NULL,
  description TEXT,
  
  -- Stripe reference (for purchases)
  stripe_checkout_session_id TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for credit_transactions
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

-- Policies for credit_transactions
CREATE POLICY "Users can view their own transactions"
  ON public.credit_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Service role needs insert for webhooks, users can see their own
CREATE POLICY "Service role can insert transactions"
  ON public.credit_transactions FOR INSERT
  WITH CHECK (true);

-- 3. Create a function to handle credit deduction (for search)
CREATE OR REPLACE FUNCTION public.deduct_credit(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  current_credits INTEGER;
BEGIN
  -- Check if caller is the user themselves
  IF auth.uid() != user_uuid THEN
    RETURN FALSE;
  END IF;

  -- Check current credits
  SELECT credits INTO current_credits FROM public.profiles WHERE id = user_uuid;

  IF current_credits > 0 THEN
    -- Deduct credit
    UPDATE public.profiles
    SET credits = credits - 1
    WHERE id = user_uuid;

    -- Log the deduction
    INSERT INTO public.credit_transactions (user_id, type, amount, description)
    VALUES (user_uuid, 'search_deduction', -1, 'Deducted 1 credit for trip search');

    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$;

-- 4. Update handle_new_user to grant initial credit and log it
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  new_profile_id UUID;
BEGIN
  -- Insert profile with initial credit
  INSERT INTO public.profiles (id, email, full_name, credits)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    1
  )
  RETURNING id INTO new_profile_id;

  -- Log initial bonus
  INSERT INTO public.credit_transactions (user_id, type, amount, description)
  VALUES (new_profile_id, 'initial_bonus', 1, 'Initial free search credit');

  RETURN NEW;
END;
$$;