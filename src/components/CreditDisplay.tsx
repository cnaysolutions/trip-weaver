import { Coins, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCredits } from "@/hooks/useCredits";
import { useAuth } from "@/hooks/useAuth";

export function CreditDisplay() {
  const { user } = useAuth();
  const { credits, isLoading, isRedirecting, redirectToCheckout } = useCredits();

  if (!user) return null;

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20">
        <Coins className="h-4 w-4 text-accent" />
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <span className="font-medium text-sm text-foreground">
            {credits ?? 0} {credits === 1 ? "credit" : "credits"}
          </span>
        )}
      </div>
      
      {credits === 0 && (
        <Button
          variant="outline"
          size="sm"
          onClick={redirectToCheckout}
          disabled={isRedirecting}
          className="text-xs"
        >
          {isRedirecting ? (
            <>
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              Loading...
            </>
          ) : (
            "Buy Credits"
          )}
        </Button>
      )}
    </div>
  );
}
