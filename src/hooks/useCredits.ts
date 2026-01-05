import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export function useCredits() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [credits, setCredits] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeducting, setIsDeducting] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Fetch current credits
  const fetchCredits = useCallback(async () => {
    if (!user) {
      setCredits(null);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("credits")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      setCredits(data?.credits ?? 0);
    } catch (error) {
      console.error("Error fetching credits:", error);
      setCredits(0);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Fetch credits on user change
  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  // Deduct a credit using the RPC function
  const deductCredit = async (): Promise<boolean> => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to plan your trip.",
        variant: "destructive",
      });
      return false;
    }

    setIsDeducting(true);
    try {
      const { data, error } = await supabase.rpc("deduct_credit", {
        user_uuid: user.id,
      });

      if (error) throw error;

      if (data === true) {
        // Refresh credits after successful deduction
        await fetchCredits();
        return true;
      } else {
        // No credits available
        return false;
      }
    } catch (error) {
      console.error("Error deducting credit:", error);
      toast({
        title: "Error",
        description: "Could not process your request. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsDeducting(false);
    }
  };

  // Redirect to Stripe checkout
  const redirectToCheckout = async () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to purchase credits.",
        variant: "destructive",
      });
      return;
    }

    setIsRedirecting(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout");

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, "_blank");
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (error) {
      console.error("Error creating checkout session:", error);
      toast({
        title: "Payment Error",
        description: "Could not start the payment process. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRedirecting(false);
    }
  };

  return {
    credits,
    isLoading,
    isDeducting,
    isRedirecting,
    fetchCredits,
    deductCredit,
    redirectToCheckout,
  };
}
