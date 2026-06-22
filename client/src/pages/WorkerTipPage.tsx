import { useParams } from "wouter";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, AlertCircle } from "lucide-react";

const TipPaymentSchema = z.object({
  tipAmount: z.number().positive("Tip amount must be greater than 0"),
  customerEmail: z.string().email("Valid email is required"),
  customerMessage: z.string().optional(),
});

type TipPaymentFormValues = z.infer<typeof TipPaymentSchema>;

// Preset tip amounts (in ZAR)
const PRESET_AMOUNTS = [10, 20, 50, 100, 200];

export default function WorkerTipPage() {
  const { uniqueUrl } = useParams<{ uniqueUrl: string }>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);

  // Fetch worker data
  const { data: worker, isLoading, error } = trpc.workers.getByUrl.useQuery(uniqueUrl || "");

  // Initialize payment mutation
  const initializePaymentMutation = trpc.payments.initialize.useMutation({
    onSuccess: (data) => {
      if (data.authorizationUrl) {
        // Redirect to Paystack checkout
        window.location.href = data.authorizationUrl;
      }
    },
    onError: (error) => {
      toast.error(error.message || "Failed to initialize payment");
      setIsSubmitting(false);
    },
  });

  const form = useForm<TipPaymentFormValues>({
    resolver: zodResolver(TipPaymentSchema),
    defaultValues: {
      tipAmount: selectedAmount || undefined,
      customerEmail: "",
      customerMessage: "",
    },
  });

  // Update form when selected amount changes
  useEffect(() => {
    if (selectedAmount) {
      form.setValue("tipAmount", selectedAmount);
    }
  }, [selectedAmount, form]);

  async function onSubmit(values: TipPaymentFormValues) {
    if (!worker?.uniqueUrl) {
      toast.error("Worker information not found");
      return;
    }

    setIsSubmitting(true);
    try {
      await initializePaymentMutation.mutateAsync({
        workerUniqueUrl: worker.uniqueUrl,
        tipAmount: values.tipAmount,
        customerEmail: values.customerEmail,
        customerMessage: values.customerMessage,
      });
    } catch (error) {
      console.error("Error submitting payment:", error);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading worker information...</p>
        </div>
      </div>
    );
  }

  if (error || !worker) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-4">
        <Card className="max-w-md w-full border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900">Worker Not Found</h3>
                <p className="text-sm text-red-800 mt-1">
                  The worker profile you're looking for doesn't exist or has been deactivated.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Worker Info Card */}
        <Card className="shadow-lg mb-6">
          <CardHeader className="bg-gradient-to-r from-green-600 to-green-700 text-white rounded-t-lg">
            <CardTitle className="text-3xl">{worker.fullName}</CardTitle>
            <CardDescription className="text-green-100">
              {worker.role} at {(worker as any).employer?.name || "Centre"}
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-sm text-gray-600">Position</p>
                <p className="font-semibold text-gray-900">{worker.role}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Centre</p>
                <p className="font-semibold text-gray-900">{(worker as any).employer?.name || "Centre"}</p>
              </div>
            </div>

            {worker.notes && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-900">{worker.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tip Payment Card */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Send a Tip</CardTitle>
            <CardDescription>
              Support {worker.fullName} with a digital tip. All transactions are secure and processed through Paystack.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Preset Amounts */}
                <div>
                  <FormLabel className="mb-3 block">Quick Select Amount (ZAR)</FormLabel>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
                    {PRESET_AMOUNTS.map((amount) => (
                      <Button
                        key={amount}
                        type="button"
                        variant={selectedAmount === amount ? "default" : "outline"}
                        className={selectedAmount === amount ? "bg-blue-600 hover:bg-blue-700" : ""}
                        onClick={() => setSelectedAmount(amount)}
                      >
                        R{amount}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Custom Tip Amount */}
                <FormField
                  control={form.control}
                  name="tipAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Custom Tip Amount (ZAR)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Enter custom amount"
                          min="1"
                          step="0.01"
                          {...field}
                          onChange={(e) => {
                            field.onChange(parseFloat(e.target.value) || 0);
                            setSelectedAmount(null);
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        Minimum: R1 | A 2% platform fee will be deducted
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Email */}
                <FormField
                  control={form.control}
                  name="customerEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="your@email.com" {...field} />
                      </FormControl>
                      <FormDescription>
                        For payment confirmation and receipt
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Optional Message */}
                <FormField
                  control={form.control}
                  name="customerMessage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Message (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Add a personal message with your tip..."
                          className="resize-none"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full bg-green-600 hover:bg-green-700 text-white text-lg py-6"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    `Tip R${form.watch("tipAmount") || "0"}`
                  )}
                </Button>
              </form>
            </Form>

            {/* Security Info */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-600">
                🔒 <strong>Secure Payment:</strong> Your payment information is processed securely through Paystack. We never store your card details.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
