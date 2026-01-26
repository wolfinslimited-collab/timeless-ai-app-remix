import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { 
  Send, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Smartphone,
  Apple,
  Globe,
  RefreshCw,
  AlertCircle,
  Users,
  Mail,
  Bell
} from "lucide-react";

interface Campaign {
  id: string;
  title: string;
  body: string;
  image_url: string | null;
  target_device_type: string | null;
  status: string;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  current_batch: number;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  created_at: string;
  campaign_type: string;
  email_subject: string | null;
  email_from_name: string | null;
}

interface DeviceStats {
  total: number;
  ios: number;
  android: number;
  web: number;
}

// Push Campaign Form Component
function PushCampaignForm({ deviceStats, onSuccess }: { deviceStats: DeviceStats | undefined; onSuccess: () => void }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [targetDevice, setTargetDevice] = useState("all");

  const createCampaign = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: campaign, error: createError } = await supabase
        .from("marketing_campaigns")
        .insert({
          title,
          body,
          image_url: imageUrl || null,
          target_device_type: targetDevice,
          created_by: user.id,
          campaign_type: "push",
        })
        .select()
        .single();

      if (createError) throw createError;

      const { error: invokeError } = await supabase.functions.invoke("send-marketing-push", {
        body: { campaignId: campaign.id },
      });

      if (invokeError) {
        await supabase
          .from("marketing_campaigns")
          .update({ status: "failed", error_message: invokeError.message })
          .eq("id", campaign.id);
        throw invokeError;
      }

      return campaign;
    },
    onSuccess: () => {
      toast.success("Push campaign started!");
      setTitle("");
      setBody("");
      setImageUrl("");
      setTargetDevice("all");
      onSuccess();
    },
    onError: (error) => {
      toast.error(`Failed: ${error.message}`);
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          New Push Campaign
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="push-title">Title</Label>
          <Input
            id="push-title"
            placeholder="Notification title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={50}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="push-body">Message</Label>
          <Textarea
            id="push-body"
            placeholder="Notification message..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            maxLength={200}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="push-image">Image URL (Optional)</Label>
          <Input
            id="push-image"
            placeholder="https://..."
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Target Devices</Label>
          <Select value={targetDevice} onValueChange={setTargetDevice}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  All Devices ({deviceStats?.total || 0})
                </div>
              </SelectItem>
              <SelectItem value="ios">
                <div className="flex items-center gap-2">
                  <Apple className="h-4 w-4" />
                  iOS ({deviceStats?.ios || 0})
                </div>
              </SelectItem>
              <SelectItem value="android">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  Android ({deviceStats?.android || 0})
                </div>
              </SelectItem>
              <SelectItem value="web">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Web ({deviceStats?.web || 0})
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={() => createCampaign.mutate()}
          disabled={!title.trim() || !body.trim() || createCampaign.isPending}
          className="w-full"
        >
          {createCampaign.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Starting...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Send Push Notification
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

// Email Campaign Form Component
function EmailCampaignForm({ userCount, onSuccess }: { userCount: number; onSuccess: () => void }) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [fromName, setFromName] = useState("Timeless");
  const [imageUrl, setImageUrl] = useState("");

  const createCampaign = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: campaign, error: createError } = await supabase
        .from("marketing_campaigns")
        .insert({
          title: subject,
          body,
          image_url: imageUrl || null,
          email_subject: subject,
          email_from_name: fromName,
          created_by: user.id,
          campaign_type: "email",
        })
        .select()
        .single();

      if (createError) throw createError;

      const { error: invokeError } = await supabase.functions.invoke("send-marketing-email", {
        body: { campaignId: campaign.id },
      });

      if (invokeError) {
        await supabase
          .from("marketing_campaigns")
          .update({ status: "failed", error_message: invokeError.message })
          .eq("id", campaign.id);
        throw invokeError;
      }

      return campaign;
    },
    onSuccess: () => {
      toast.success("Email campaign started!");
      setSubject("");
      setBody("");
      setFromName("Timeless");
      setImageUrl("");
      onSuccess();
    },
    onError: (error) => {
      toast.error(`Failed: ${error.message}`);
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          New Email Campaign
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email-subject">Subject</Label>
          <Input
            id="email-subject"
            placeholder="Email subject line..."
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={100}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email-from">From Name</Label>
          <Input
            id="email-from"
            placeholder="Timeless"
            value={fromName}
            onChange={(e) => setFromName(e.target.value)}
            maxLength={50}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email-body">Message</Label>
          <Textarea
            id="email-body"
            placeholder="Email content..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
            maxLength={2000}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email-image">Image URL (Optional)</Label>
          <Input
            id="email-image"
            placeholder="https://..."
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
          />
        </div>

        <div className="p-3 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <Users className="h-4 w-4 inline mr-1" />
            Will be sent to <strong>{userCount}</strong> registered users
          </p>
        </div>

        <Button
          onClick={() => createCampaign.mutate()}
          disabled={!subject.trim() || !body.trim() || createCampaign.isPending}
          className="w-full"
        >
          {createCampaign.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Starting...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Send Email Campaign
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

// Campaign Card Component
function CampaignCard({ campaign, onCancel }: { campaign: Campaign; onCancel: (id: string) => void }) {
  const [isCancelling, setIsCancelling] = useState(false);

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      const { error } = await supabase
        .from("marketing_campaigns")
        .update({ status: "cancelled" })
        .eq("id", campaign.id);

      if (error) throw error;
      toast.success("Campaign cancelled");
      onCancel(campaign.id);
    } catch (error: any) {
      toast.error(`Failed to cancel: ${error.message}`);
    } finally {
      setIsCancelling(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "processing":
        return <Badge className="bg-blue-500"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Processing</Badge>;
      case "completed":
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      case "failed":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      case "cancelled":
        return <Badge variant="secondary"><AlertCircle className="h-3 w-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getCampaignTypeIcon = (type: string) => {
    return type === "email" ? <Mail className="h-4 w-4" /> : <Bell className="h-4 w-4" />;
  };

  const getProgress = () => {
    if (campaign.total_recipients === 0) return 0;
    return Math.round(((campaign.sent_count + campaign.failed_count) / campaign.total_recipients) * 100);
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              {getCampaignTypeIcon(campaign.campaign_type)}
              <h3 className="font-semibold">{campaign.email_subject || campaign.title}</h3>
              <Badge variant="outline" className="text-xs">
                {campaign.campaign_type === "email" ? "Email" : "Push"}
              </Badge>
              {getStatusBadge(campaign.status)}
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">{campaign.body}</p>
            
            {campaign.status === "processing" && (
              <div className="space-y-2">
                <Progress value={getProgress()} className="h-2" />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {campaign.sent_count + campaign.failed_count} / {campaign.total_recipients} processed
                    {campaign.failed_count > 0 && (
                      <span className="text-destructive ml-2">
                        ({campaign.failed_count} failed)
                      </span>
                    )}
                  </p>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleCancel}
                    disabled={isCancelling}
                  >
                    {isCancelling ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <XCircle className="h-3 w-3 mr-1" />
                    )}
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {campaign.status === "completed" && (
              <div className="flex gap-4 text-sm">
                <span className="text-green-500">
                  ✓ {campaign.sent_count} sent
                </span>
                {campaign.failed_count > 0 && (
                  <span className="text-destructive">
                    ✗ {campaign.failed_count} failed
                  </span>
                )}
              </div>
            )}

            {campaign.error_message && (
              <p className="text-xs text-destructive">{campaign.error_message}</p>
            )}
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <p>{format(new Date(campaign.created_at), "MMM d, yyyy")}</p>
            <p>{format(new Date(campaign.created_at), "HH:mm")}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminMarketing() {
  const queryClient = useQueryClient();
  const [campaignFilter, setCampaignFilter] = useState<"all" | "push" | "email">("all");

  // Fetch campaigns
  const { data: campaigns = [], isLoading: campaignsLoading, refetch: refetchCampaigns } = useQuery({
    queryKey: ["admin-marketing-campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketing_campaigns")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as Campaign[];
    },
    refetchInterval: (query) => {
      const data = query.state.data as Campaign[] | undefined;
      if (data?.some(c => c.status === "processing")) {
        return 2000;
      }
      return false;
    },
  });

  // Fetch device stats using count queries to avoid 1000 row limit
  const { data: deviceStats } = useQuery({
    queryKey: ["admin-device-stats"],
    queryFn: async () => {
      // Use separate count queries to get accurate totals
      const [totalResult, iosResult, androidResult, webResult] = await Promise.all([
        supabase.from("user_devices").select("*", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("user_devices").select("*", { count: "exact", head: true }).eq("is_active", true).eq("device_type", "ios"),
        supabase.from("user_devices").select("*", { count: "exact", head: true }).eq("is_active", true).eq("device_type", "android"),
        supabase.from("user_devices").select("*", { count: "exact", head: true }).eq("is_active", true).eq("device_type", "web"),
      ]);

      const stats: DeviceStats = {
        total: totalResult.count || 0,
        ios: iosResult.count || 0,
        android: androidResult.count || 0,
        web: webResult.count || 0,
      };

      return stats;
    },
  });

  // Fetch user count for email
  const { data: userCount = 0 } = useQuery({
    queryKey: ["admin-user-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      if (error) throw error;
      return count || 0;
    },
  });

  const handleCampaignSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-marketing-campaigns"] });
  };

  const filteredCampaigns = campaigns.filter(c => {
    if (campaignFilter === "all") return true;
    return c.campaign_type === campaignFilter;
  });

  return (
    <AdminLayout title="Marketing" description="Send push notifications and email campaigns to users">
      <Tabs defaultValue="create" className="space-y-6">
        <TabsList>
          <TabsTrigger value="create">Create Campaign</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Users className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">{userCount}</p>
                    <p className="text-xs text-muted-foreground">Total Users</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Bell className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">{deviceStats?.total || 0}</p>
                    <p className="text-xs text-muted-foreground">Push Devices</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Apple className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <p className="text-2xl font-bold">{deviceStats?.ios || 0}</p>
                    <p className="text-xs text-muted-foreground">iOS</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Smartphone className="h-8 w-8 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold">{deviceStats?.android || 0}</p>
                    <p className="text-xs text-muted-foreground">Android</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Globe className="h-8 w-8 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold">{deviceStats?.web || 0}</p>
                    <p className="text-xs text-muted-foreground">Web</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Campaign Forms */}
          <div className="grid md:grid-cols-2 gap-6">
            <PushCampaignForm deviceStats={deviceStats} onSuccess={handleCampaignSuccess} />
            <EmailCampaignForm userCount={userCount} onSuccess={handleCampaignSuccess} />
          </div>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <Button
                variant={campaignFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setCampaignFilter("all")}
              >
                All
              </Button>
              <Button
                variant={campaignFilter === "push" ? "default" : "outline"}
                size="sm"
                onClick={() => setCampaignFilter("push")}
              >
                <Bell className="h-4 w-4 mr-1" />
                Push
              </Button>
              <Button
                variant={campaignFilter === "email" ? "default" : "outline"}
                size="sm"
                onClick={() => setCampaignFilter("email")}
              >
                <Mail className="h-4 w-4 mr-1" />
                Email
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetchCampaigns()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {campaignsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredCampaigns.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No campaigns yet. Create your first one!
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredCampaigns.map((campaign) => (
                <CampaignCard key={campaign.id} campaign={campaign} onCancel={() => refetchCampaigns()} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
