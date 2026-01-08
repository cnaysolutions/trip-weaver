-- Add immutability policies for credit_transactions to prevent modification/deletion
-- This ensures the financial audit trail cannot be tampered with

-- Deny all updates to credit transactions
CREATE POLICY "Credit transactions are immutable"
  ON public.credit_transactions FOR UPDATE
  USING (false);

-- Deny all deletes of credit transactions
CREATE POLICY "Credit transactions cannot be deleted"
  ON public.credit_transactions FOR DELETE
  USING (false);