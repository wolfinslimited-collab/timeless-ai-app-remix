import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  AlertTriangle,
  Users,
  Shield,
  RefreshCw,
  XCircle as XCircleIcon,
  StopCircle,
  UserPlus,
  UserCheck,
  Crown,
  Calendar,
  Coins,
  Smartphone,
  Bell
} from "lucide-react";
import Papa from "papaparse";

interface MigrateRow {
  email: string;
  password_hash?: string;
  display_name?: string;
  credits?: number;
  subscription_status?: string;
  plan?: string;
  subscription_period?: string;
  subscription_end_date?: string;
  created_at?: string;
  source?: string;
  fcm_token?: string;
  device_name?: string;
}

interface MigrateResult {
  email: string;
  status: "created" | "updated" | "skipped" | "error";
  message: string;
}

const BATCH_SIZE = 50; // Reduced to prevent worker limit errors
const PARALLEL_BATCHES = 2; // Process 2 batches in parallel

// New subscription plan mapping
const SUBSCRIPTION_PLANS = {
  "premium-monthly": { name: "Premium", period: "monthly", credits: 400 },
  "premium-yearly": { name: "Premium", period: "yearly", credits: 6000 },
  "premium-plus-monthly": { name: "Premium Plus", period: "monthly", credits: 1000 },
  "premium-plus-yearly": { name: "Premium Plus", period: "yearly", credits: 8000 },
};

export default function AdminMigration() {
  const [files, setFiles] = useState<File[]>([]);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<MigrateResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [mode, setMode] = useState<"create" | "update" | "upsert">("upsert");
  const [wasCancelled, setWasCancelled] = useState(false);
  const cancelRef = useRef(false);

  // Column mapping
  const [emailColumn, setEmailColumn] = useState<string>("");
  const [passwordColumn, setPasswordColumn] = useState<string>("");
  const [displayNameColumn, setDisplayNameColumn] = useState<string>("");
  const [creditsColumn, setCreditsColumn] = useState<string>("");
  const [subscriptionStatusColumn, setSubscriptionStatusColumn] = useState<string>("");
  const [planColumn, setPlanColumn] = useState<string>("");
  const [subscriptionPeriodColumn, setSubscriptionPeriodColumn] = useState<string>("");
  const [subscriptionEndDateColumn, setSubscriptionEndDateColumn] = useState<string>("");
  const [createdAtColumn, setCreatedAtColumn] = useState<string>("");
  const [sourceColumn, setSourceColumn] = useState<string>("");
  const [fcmTokenColumn, setFcmTokenColumn] = useState<string>("");
  const [deviceNameColumn, setDeviceNameColumn] = useState<string>("");

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const parseAllFiles = async () => {
    const allData: any[] = [];
    let allHeaders: string[] = [];

    for (const file of files) {
      const text = await file.text();
      const result = Papa.parse(text, { header: true, skipEmptyLines: true });
      
      if (result.meta.fields && allHeaders.length === 0) {
        allHeaders = result.meta.fields;
      }
      
      allData.push(...(result.data as any[]));
    }

    setHeaders(allHeaders);
    setParsedData(allData);
    
    // Auto-detect columns
    const lowerHeaders = allHeaders.map(h => h.toLowerCase());
    
    const emailIdx = lowerHeaders.findIndex(h => h.includes("email"));
    const passIdx = lowerHeaders.findIndex(h => h.includes("password") || h.includes("hash"));
    const nameIdx = lowerHeaders.findIndex(h => h.includes("name") || h.includes("username") || h.includes("display"));
    const creditsIdx = lowerHeaders.findIndex(h => h.includes("credit") || h.includes("balance") || h.includes("token"));
    const subStatusIdx = lowerHeaders.findIndex(h => h.includes("subscription_status") || h.includes("sub_status") || h === "status");
    const planIdx = lowerHeaders.findIndex(h => h.includes("plan") || h.includes("tier") || h.includes("subscription_plan"));
    const periodIdx = lowerHeaders.findIndex(h => h.includes("period") || h.includes("interval") || h.includes("billing"));
    const endDateIdx = lowerHeaders.findIndex(h => h.includes("end_date") || h.includes("expires") || h.includes("expiry") || h.includes("subscription_end"));
    const createdAtIdx = lowerHeaders.findIndex(h => h.includes("created") || h.includes("registered") || h.includes("joined") || h.includes("signup") || h === "date");
    const sourceIdx = lowerHeaders.findIndex(h => h.includes("source") || h.includes("platform") || h.includes("device_type") || h.includes("origin"));
    const fcmIdx = lowerHeaders.findIndex(h => h.includes("fcm") || h.includes("token") || h.includes("push_token") || h.includes("device_token"));
    const deviceNameIdx = lowerHeaders.findIndex(h => h.includes("device_name") || h.includes("device_model") || h.includes("device_info"));
    
    if (emailIdx >= 0) setEmailColumn(allHeaders[emailIdx]);
    if (passIdx >= 0) setPasswordColumn(allHeaders[passIdx]);
    if (nameIdx >= 0) setDisplayNameColumn(allHeaders[nameIdx]);
    if (creditsIdx >= 0) setCreditsColumn(allHeaders[creditsIdx]);
    if (subStatusIdx >= 0) setSubscriptionStatusColumn(allHeaders[subStatusIdx]);
    if (planIdx >= 0) setPlanColumn(allHeaders[planIdx]);
    if (periodIdx >= 0) setSubscriptionPeriodColumn(allHeaders[periodIdx]);
    if (endDateIdx >= 0) setSubscriptionEndDateColumn(allHeaders[endDateIdx]);
    if (createdAtIdx >= 0) setCreatedAtColumn(allHeaders[createdAtIdx]);
    if (sourceIdx >= 0) setSourceColumn(allHeaders[sourceIdx]);
    if (fcmIdx >= 0) setFcmTokenColumn(allHeaders[fcmIdx]);
    if (deviceNameIdx >= 0) setDeviceNameColumn(allHeaders[deviceNameIdx]);

    toast({
      title: "Files parsed",
      description: `Found ${allData.length} users across ${files.length} files.`,
    });
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setParsedData([]);
    setHeaders([]);
  };

  const cancelMigration = () => {
    cancelRef.current = true;
    setWasCancelled(true);
    toast({
      title: "Cancelling migration...",
      description: "Waiting for current batch to complete.",
    });
  };

  const processMigration = async () => {
    if (!emailColumn) {
      toast({
        variant: "destructive",
        title: "Email column required",
        description: "Please select the email column.",
      });
      return;
    }

    // Reset cancel state
    cancelRef.current = false;
    setWasCancelled(false);
    setIsProcessing(true);
    setProgress(0);
    setResults([]);
    setShowResults(false);

    const allResults: MigrateResult[] = [];
    const totalRows = parsedData.length;

    // Create all batches upfront
    const batches: MigrateRow[][] = [];
    for (let i = 0; i < totalRows; i += BATCH_SIZE) {
      const batch = parsedData.slice(i, i + BATCH_SIZE);
      const users: MigrateRow[] = batch.map((row: any) => ({
        email: row[emailColumn]?.toString().trim().toLowerCase(),
        password_hash: passwordColumn ? row[passwordColumn] : undefined,
        display_name: displayNameColumn ? row[displayNameColumn] : undefined,
        credits: creditsColumn ? parseInt(row[creditsColumn]) || 0 : undefined,
        subscription_status: subscriptionStatusColumn ? row[subscriptionStatusColumn] : undefined,
        plan: planColumn ? row[planColumn] : undefined,
        subscription_period: subscriptionPeriodColumn ? row[subscriptionPeriodColumn] : undefined,
        subscription_end_date: subscriptionEndDateColumn ? row[subscriptionEndDateColumn] : undefined,
        created_at: createdAtColumn ? row[createdAtColumn] : undefined,
        source: sourceColumn ? row[sourceColumn] : undefined,
        fcm_token: fcmTokenColumn ? row[fcmTokenColumn] : undefined,
        device_name: deviceNameColumn ? row[deviceNameColumn] : undefined,
      })).filter(u => u.email && u.email !== "null" && u.email.includes("@"));
      
      if (users.length > 0) batches.push(users);
    }

    let processedCount = 0;

    // Process batches in parallel groups
    for (let i = 0; i < batches.length; i += PARALLEL_BATCHES) {
      // Check for cancellation before starting new batch group
      if (cancelRef.current) {
        break;
      }

      const parallelBatches = batches.slice(i, i + PARALLEL_BATCHES);
      
      const batchPromises = parallelBatches.map(async (users) => {
        try {
          const { data, error } = await supabase.functions.invoke("migrate-users", {
            body: { users, mode },
          });

          if (error) {
            return users.map(u => ({ email: u.email, status: "error" as const, message: error.message }));
          } else if (data?.details) {
            return data.details as MigrateResult[];
          }
          return [];
        } catch (err: any) {
          return users.map(u => ({ email: u.email, status: "error" as const, message: err.message }));
        }
      });

      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach(results => allResults.push(...results));
      
      processedCount += parallelBatches.reduce((acc, batch) => acc + batch.length, 0);
      setProgress(Math.round((processedCount / totalRows) * 100));
      setResults([...allResults]); // Update results in real-time for partial view
    }

    setResults(allResults);
    setShowResults(true);
    setIsProcessing(false);

    const createdCount = allResults.filter(r => r.status === "created").length;
    const updatedCount = allResults.filter(r => r.status === "updated").length;
    const skippedCount = allResults.filter(r => r.status === "skipped").length;
    const errorCount = allResults.filter(r => r.status === "error").length;

    const wasCancelledNow = cancelRef.current;
    toast({
      title: wasCancelledNow ? "Migration cancelled" : "Migration complete",
      description: `Created: ${createdCount}, Updated: ${updatedCount}, Skipped: ${skippedCount}, Errors: ${errorCount}${wasCancelledNow ? " (partial)" : ""}`,
      variant: wasCancelledNow ? "default" : undefined,
    });
  };

  const ColumnSelect = ({ 
    label, 
    value, 
    onChange, 
    required = false,
    icon: Icon
  }: { 
    label: string; 
    value: string; 
    onChange: (v: string) => void; 
    required?: boolean;
    icon?: React.ElementType;
  }) => (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full p-2 rounded-md border border-input bg-background text-sm"
      >
        <option value="">{required ? "Select column" : "Skip"}</option>
        {headers.map((h) => (
          <option key={h} value={h}>{h}</option>
        ))}
      </select>
    </div>
  );

  return (
    <AdminLayout title="User Migration" description="Migrate users from your old system with passwords and subscription data">
      <div className="space-y-6">
        {/* Warning Banner */}
        <Alert className="border-yellow-500/50 bg-yellow-500/10">
          <Shield className="h-4 w-4 text-yellow-500" />
          <AlertTitle className="text-yellow-500">Important: Password Migration</AlertTitle>
          <AlertDescription className="text-muted-foreground">
            Your CSV should contain <strong>bcrypt hashed passwords</strong> (starting with $2a$, $2b$, or $2y$). 
            Users with valid bcrypt hashes will be able to log in with their existing passwords. 
            Users without valid hashes will need to use "Forgot Password" to set a new one.
          </AlertDescription>
        </Alert>

        {/* Subscription Plans Reference */}
        <Alert className="border-primary/50 bg-primary/10">
          <Crown className="h-4 w-4 text-primary" />
          <AlertTitle className="text-primary">Subscription Plan Values</AlertTitle>
          <AlertDescription className="text-muted-foreground">
            <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              {Object.entries(SUBSCRIPTION_PLANS).map(([key, plan]) => (
                <div key={key} className="p-2 rounded bg-background/50 border border-border/50">
                  <div className="font-medium">{plan.name} ({plan.period})</div>
                  <div className="text-muted-foreground">Plan: <code className="bg-muted px-1 rounded">{key}</code></div>
                  <div className="text-muted-foreground">{plan.credits} credits</div>
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>

        {/* File Upload */}
        <Card className="border-0 shadow-sm bg-card/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload User Export
            </CardTitle>
            <CardDescription>
              Upload your CSV export from the old system. Supports multi-part uploads.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Label htmlFor="csv-upload" className="cursor-pointer">
                <div className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-border rounded-lg hover:border-primary transition-colors">
                  <FileSpreadsheet className="h-5 w-5" />
                  <span>Select CSV Files</span>
                </div>
                <Input
                  id="csv-upload"
                  type="file"
                  accept=".csv"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </Label>
              {files.length > 0 && (
                <Button onClick={parseAllFiles} variant="secondary">
                  Parse {files.length} file{files.length > 1 ? "s" : ""}
                </Button>
              )}
            </div>

            {files.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {files.map((file, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-2 py-1.5">
                    <FileSpreadsheet className="h-3 w-3" />
                    {file.name}
                    <button onClick={() => removeFile(index)} className="ml-1 hover:text-destructive">
                      <XCircle className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Column Mapping & Mode */}
        {headers.length > 0 && (
          <Card className="border-0 shadow-sm bg-card/80">
            <CardHeader>
              <CardTitle>Migration Settings</CardTitle>
              <CardDescription>
                Map columns and choose how to handle existing users.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Migration Mode */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Migration Mode</Label>
                <RadioGroup value={mode} onValueChange={(v) => setMode(v as any)} className="flex flex-wrap gap-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="upsert" id="upsert" />
                    <Label htmlFor="upsert" className="flex items-center gap-2 cursor-pointer">
                      <RefreshCw className="h-4 w-4" />
                      Create & Update (Recommended)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="create" id="create" />
                    <Label htmlFor="create" className="flex items-center gap-2 cursor-pointer">
                      <UserPlus className="h-4 w-4" />
                      Create Only (Skip existing)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="update" id="update" />
                    <Label htmlFor="update" className="flex items-center gap-2 cursor-pointer">
                      <UserCheck className="h-4 w-4" />
                      Update Only (Skip new)
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Core Fields */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Core Fields</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <ColumnSelect label="Email Column" value={emailColumn} onChange={setEmailColumn} required />
                  <ColumnSelect label="Password/Hash" value={passwordColumn} onChange={setPasswordColumn} icon={Shield} />
                  <ColumnSelect label="Display Name" value={displayNameColumn} onChange={setDisplayNameColumn} icon={Users} />
                  <ColumnSelect label="Credits / Balance" value={creditsColumn} onChange={setCreditsColumn} icon={Coins} />
                </div>
              </div>

              {/* Subscription Fields */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Subscription & Meta Data</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <ColumnSelect label="Subscription Plan" value={planColumn} onChange={setPlanColumn} icon={Crown} />
                  <ColumnSelect label="Subscription Status" value={subscriptionStatusColumn} onChange={setSubscriptionStatusColumn} />
                  <ColumnSelect label="Billing Period" value={subscriptionPeriodColumn} onChange={setSubscriptionPeriodColumn} icon={Calendar} />
                  <ColumnSelect label="End Date / Expires" value={subscriptionEndDateColumn} onChange={setSubscriptionEndDateColumn} icon={Calendar} />
                  <ColumnSelect label="Registered Date" value={createdAtColumn} onChange={setCreatedAtColumn} icon={Calendar} />
                  <ColumnSelect label="Source (web/android/ios)" value={sourceColumn} onChange={setSourceColumn} icon={Smartphone} />
                </div>
              </div>

              {/* Device & Push Notification Fields */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Device & Push Notifications</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ColumnSelect label="FCM Token" value={fcmTokenColumn} onChange={setFcmTokenColumn} icon={Bell} />
                  <ColumnSelect label="Device Name" value={deviceNameColumn} onChange={setDeviceNameColumn} icon={Smartphone} />
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  {parsedData.length.toLocaleString()} users ready to migrate
                </div>
                <div className="flex items-center gap-2">
                  {isProcessing && (
                    <Button 
                      onClick={cancelMigration} 
                      variant="destructive" 
                      size="lg"
                      disabled={wasCancelled}
                    >
                      <StopCircle className="h-4 w-4 mr-2" />
                      {wasCancelled ? "Cancelling..." : "Cancel"}
                    </Button>
                  )}
                  <Button onClick={processMigration} disabled={isProcessing || !emailColumn} size="lg">
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Migrating...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Start Migration
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {isProcessing && (
                <div className="space-y-2">
                  <Progress value={progress} />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{progress}% complete</span>
                    <span>{results.length.toLocaleString()} processed</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Preview Data */}
        {parsedData.length > 0 && !showResults && (
          <Card>
            <CardHeader>
              <CardTitle>Data Preview</CardTitle>
              <CardDescription>First 10 rows of your data</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {headers.slice(0, 8).map((h) => (
                        <TableHead key={h} className="whitespace-nowrap">{h}</TableHead>
                      ))}
                      {headers.length > 8 && <TableHead>...</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.slice(0, 10).map((row: any, i) => (
                      <TableRow key={i}>
                        {headers.slice(0, 8).map((h) => (
                          <TableCell key={h} className="max-w-[200px] truncate font-mono text-xs">
                            {h.toLowerCase().includes("password") 
                              ? (row[h]?.substring(0, 20) + "...") 
                              : row[h]
                            }
                          </TableCell>
                        ))}
                        {headers.length > 8 && <TableCell>...</TableCell>}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {showResults && (
          <Card>
            <CardHeader>
              <CardTitle>Migration Results</CardTitle>
              <CardDescription>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge className="bg-green-500">
                    <UserPlus className="h-3 w-3 mr-1" />
                    Created: {results.filter(r => r.status === "created").length}
                  </Badge>
                  <Badge className="bg-blue-500">
                    <UserCheck className="h-3 w-3 mr-1" />
                    Updated: {results.filter(r => r.status === "updated").length}
                  </Badge>
                  <Badge variant="secondary">
                    Skipped: {results.filter(r => r.status === "skipped").length}
                  </Badge>
                  <Badge variant="destructive">
                    <XCircle className="h-3 w-3 mr-1" />
                    Errors: {results.filter(r => r.status === "error").length}
                  </Badge>
                </div>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Message</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((result, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-sm">{result.email}</TableCell>
                        <TableCell>
                          {result.status === "created" && (
                            <Badge className="bg-green-500">
                              <UserPlus className="h-3 w-3 mr-1" />
                              Created
                            </Badge>
                          )}
                          {result.status === "updated" && (
                            <Badge className="bg-blue-500">
                              <UserCheck className="h-3 w-3 mr-1" />
                              Updated
                            </Badge>
                          )}
                          {result.status === "skipped" && (
                            <Badge variant="secondary">Skipped</Badge>
                          )}
                          {result.status === "error" && (
                            <Badge variant="destructive">
                              <XCircle className="h-3 w-3 mr-1" />
                              Error
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-md truncate">
                          {result.message}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
