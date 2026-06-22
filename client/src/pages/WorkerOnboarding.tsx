import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, Download } from "lucide-react";

// South African banks with universal branch codes
const SA_BANKS = [
  { name: "FNB", code: "250655" },
  { name: "ABSA", code: "632005" },
  { name: "Standard Bank", code: "051001" },
  { name: "Nedbank", code: "198765" },
  { name: "Capitec", code: "470010" },
  { name: "Investec", code: "580105" },
  { name: "TymeBank", code: "989765" },
  { name: "African Bank", code: "430000" },
  { name: "Bidvest Bank", code: "462005" },
  { name: "Discovery Bank", code: "679000" },
];

// Helper to get branch code from bank name
const getBranchCode = (bankName: string): string => {
  const bank = SA_BANKS.find(b => b.name === bankName);
  return bank?.code || "";
};

// Supported South African banks - must match server-side bankValidation.ts
const SUPPORTED_BANKS = ["FNB", "ABSA", "Standard Bank", "Nedbank", "Capitec", "Investec", "TymeBank", "African Bank", "Bidvest Bank", "Discovery Bank"] as const;

const WorkerOnboardingSchema = z.object({
  employerId: z.number().int().positive("Please select an employer"),
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  role: z.string().min(1, "Role is required"),
  phoneNumber: z.string().optional(),
  idNumber: z.string().optional(),
  bankName: z.enum(SUPPORTED_BANKS),
  accountHolder: z.string().min(2, "Account holder name is required"),
  accountNumber: z.string().min(1, "Account number is required"),
  branchCode: z.string().min(1, "Branch code is required"),
  notes: z.string().optional(),
});

type WorkerOnboardingFormValues = z.infer<typeof WorkerOnboardingSchema>;

export default function WorkerOnboarding() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [workerUniqueUrl, setWorkerUniqueUrl] = useState<string | null>(null);
  const [tipUrlForQR, setTipUrlForQR] = useState<string | null>(null);

  // Generate QR code when tip URL is set
  const { data: qrData } = trpc.qrcode.generate.useQuery(
    { url: tipUrlForQR || "" },
    { enabled: !!tipUrlForQR }
  );

  // Update QR code URL when data is available
  useEffect(() => {
    if (qrData?.data) {
      setQrCodeUrl(qrData.data);
    }
  }, [qrData]);

  // Fetch employers
  const { data: employers, isLoading: employersLoading } = trpc.employers.list.useQuery();

  // Create worker mutation
  const createWorkerMutation = trpc.workers.create.useMutation({
    onSuccess: async (worker) => {
      const tipUrl = `${window.location.origin}/tip/${worker.uniqueUrl}`;
      setSuccessMessage(`Worker "${worker.fullName}" onboarded successfully! Tip URL: ${tipUrl}`);
      setWorkerUniqueUrl(worker.uniqueUrl);
      
      // Trigger QR code generation by setting the tip URL
      setTipUrlForQR(tipUrl);
      
      form.reset();
      setIsSubmitting(false);
      toast.success("Worker onboarded successfully!");
    },
    onError: (error) => {
      console.error("Error creating worker:", error);
      toast.error(error.message || "Failed to onboard worker");
      setIsSubmitting(false);
    },
  });

  const form = useForm<WorkerOnboardingFormValues>({
    resolver: zodResolver(WorkerOnboardingSchema),
    defaultValues: {
      employerId: undefined,
      fullName: "",
      role: "",
      phoneNumber: "",
      idNumber: "",
      bankName: "FNB",
      accountHolder: "",
      accountNumber: "",
      branchCode: getBranchCode("FNB"),
      notes: "",
    },
  });

  const handleBankChange = (bankName: string) => {
    const branchCode = getBranchCode(bankName);
    form.setValue("bankName", bankName as typeof SUPPORTED_BANKS[number]);
    form.setValue("branchCode", branchCode);
  };

  const onSubmit = async (values: WorkerOnboardingFormValues) => {
    setIsSubmitting(true);
    try {
      await createWorkerMutation.mutateAsync(values);
    } catch (error) {
      console.error("Error submitting form:", error);
    }
  }

  const handleDownloadTipCard = async () => {
    if (!workerUniqueUrl) return;
    try {
      // Call the REST endpoint for PDF generation
      const response = await fetch(`/api/pdf/generate-tip-card?workerUrl=${encodeURIComponent(workerUniqueUrl)}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate PDF");
      }
      
      // Get the blob from the response
      const blob = await response.blob();
      
      // Extract filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `tip-card-${workerUniqueUrl}.pdf`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+?)"/);  
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Tip card downloaded!");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download tip card");
    }
  };

  if (successMessage) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="bg-green-50 border-b border-green-200">
            <CardTitle className="text-green-700">Success!</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <p className="text-gray-700 mb-6">{successMessage}</p>
            
            {qrCodeUrl && (
              <div className="mb-6 text-center">
                <p className="text-sm text-gray-600 mb-3">Scan this QR code to start receiving tips</p>
                <img 
                  src={qrCodeUrl} 
                  alt="QR Code for tipping"
                  className="w-48 h-48 mx-auto border-2 border-gray-200 rounded"
                />
              </div>
            )}
            
            <Button 
              onClick={handleDownloadTipCard}
              className="w-full mb-3 bg-blue-600 hover:bg-blue-700"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Tip Card (PDF)
            </Button>
            
            <Button 
              onClick={() => {
                setSuccessMessage(null);
                setQrCodeUrl(null);
                setWorkerUniqueUrl(null);
                setTipUrlForQR(null);
              }}
              variant="outline"
              className="w-full border-yellow-300 text-yellow-600 hover:bg-yellow-50"
            >
              Onboard Another Worker
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
            <CardTitle>Worker Onboarding</CardTitle>
            <CardDescription className="text-blue-100">Register a new worker to start receiving tips</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Employer Selection */}
                <FormField
                  control={form.control}
                  name="employerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Employer / Centre</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        value={field.value ? field.value.toString() : ""}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select an employer" />
                        </SelectTrigger>
                        <SelectContent>
                          {employers?.map((employer) => (
                            <SelectItem key={employer.id} value={employer.id.toString()}>
                              {employer.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Worker Details */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-700">Worker Details</h3>
                  
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Car Guard, Cleaner, Security" {...field} />
                        </FormControl>
                        <FormDescription>The worker's job title or position</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="+27 123 456 7890" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="idNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SA ID or Work Permit (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="ID or permit number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Bank Details */}
                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-semibold text-gray-700">Bank Details</h3>
                  
                  <FormField
                    control={form.control}
                    name="bankName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bank Name</FormLabel>
                        <Select 
                          onValueChange={handleBankChange}
                          value={field.value}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select your South African bank" />
                          </SelectTrigger>
                          <SelectContent>
                            {SUPPORTED_BANKS.map((bank) => (
                              <SelectItem key={bank} value={bank}>
                                {bank}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="accountHolder"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account Holder Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Name on bank account" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="accountNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account Number</FormLabel>
                        <FormControl>
                          <Input placeholder="Bank account number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="branchCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Branch Code</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Auto-populated from bank selection" 
                            {...field}
                            readOnly
                          />
                        </FormControl>
                        <FormDescription>Automatically populated based on your bank selection</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Notes */}
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Any additional information..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Submit Button */}
                <Button 
                  type="submit" 
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={isSubmitting}
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {isSubmitting ? "Onboarding..." : "Onboard Worker"}
                </Button>
              </form>
            </Form>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-gray-700">
                <strong>Note:</strong> Once a worker is onboarded, they will receive a unique tip URL and QR code that can be shared with customers. Tips are processed through Paystack with automatic commission splitting.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
