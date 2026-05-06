"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function PaymentApprovalButton({ paymentId }: { paymentId: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function onApprove() {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/payments/${paymentId}/approve`, {
        method: "POST",
      });

      if (response.ok) {
        toast.success("Payment approved successfully");
        router.refresh();
      } else {
        toast.error("Failed to approve payment");
      }
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Button 
      size="sm" 
      onClick={onApprove} 
      disabled={isLoading}
      className="bg-emerald-600 hover:bg-emerald-700 text-white"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <>
          <Check className="mr-2 h-4 w-4" /> Approve
        </>
      )}
    </Button>
  );
}
