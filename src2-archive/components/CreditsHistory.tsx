import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpRight, ArrowDownRight, CreditCard, Sparkles, Gift, RotateCcw, Image, Video, Mic, MessageSquare } from "lucide-react";
import { format } from "date-fns";

interface CreditTransaction {
  id: string;
  amount: number;
  type: string;
  description: string | null;
  reference_id: string | null;
  created_at: string;
}

interface Generation {
  id: string;
  credits_used: number;
  type: string;
  model: string;
  created_at: string;
  prompt: string;
}

interface HistoryItem {
  id: string;
  amount: number;
  type: 'purchase' | 'subscription' | 'usage' | 'refund' | 'bonus';
  description: string;
  created_at: string;
  icon: React.ReactNode;
  usageType?: string;
}

const CreditsHistory = () => {
  const { user } = useAuth();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchHistory = async () => {
      setLoading(true);
      
      // Fetch credit transactions (purchases, subscriptions, refunds, bonuses)
      const { data: transactions } = await supabase
        .from("credit_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      // Fetch recent generations (usage)
      const { data: generations } = await supabase
        .from("generations")
        .select("id, credits_used, type, model, created_at, prompt")
        .eq("user_id", user.id)
        .gt("credits_used", 0)
        .order("created_at", { ascending: false })
        .limit(50);

      // Convert transactions to history items
      const transactionItems: HistoryItem[] = (transactions || []).map((t: CreditTransaction) => ({
        id: t.id,
        amount: t.amount,
        type: t.type as HistoryItem['type'],
        description: t.description || getDefaultDescription(t.type, t.amount),
        created_at: t.created_at,
        icon: getIcon(t.type),
      }));

      // Convert generations to usage history items
      const usageItems: HistoryItem[] = (generations || []).map((g: Generation) => ({
        id: g.id,
        amount: -g.credits_used,
        type: 'usage' as const,
        description: g.prompt.length > 40 ? g.prompt.substring(0, 40) + '...' : g.prompt,
        created_at: g.created_at,
        icon: getGenerationIcon(g.type),
        usageType: g.type,
      }));

      // Combine and sort by date
      const combined = [...transactionItems, ...usageItems].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setHistory(combined.slice(0, 20)); // Show last 20 items
      setLoading(false);
    };

    fetchHistory();
  }, [user]);

  const getDefaultDescription = (type: string, amount: number): string => {
    switch (type) {
      case 'purchase':
        return `Purchased ${amount} credits`;
      case 'subscription':
        return `Subscription credits`;
      case 'refund':
        return `Refunded ${Math.abs(amount)} credits`;
      case 'bonus':
        return `Bonus credits`;
      default:
        return `${amount > 0 ? '+' : ''}${amount} credits`;
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'purchase':
        return <CreditCard className="h-4 w-4" />;
      case 'subscription':
        return <Sparkles className="h-4 w-4" />;
      case 'refund':
        return <RotateCcw className="h-4 w-4" />;
      case 'bonus':
        return <Gift className="h-4 w-4" />;
      default:
        return <CreditCard className="h-4 w-4" />;
    }
  };

  const getGenerationIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <Image className="h-4 w-4" />;
      case 'video':
      case 'cinema':
        return <Video className="h-4 w-4" />;
      case 'music':
        return <Mic className="h-4 w-4" />;
      case 'chat':
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <Sparkles className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string, amount: number) => {
    if (amount > 0) return "text-emerald-500";
    return "text-muted-foreground";
  };

  const getBadgeVariant = (type: string): "default" | "secondary" | "outline" => {
    switch (type) {
      case 'purchase':
      case 'subscription':
        return "default";
      case 'refund':
      case 'bonus':
        return "secondary";
      default:
        return "outline";
    }
  };

  if (!user) {
    return (
      <Card className="border-border/50 bg-card">
        <CardHeader>
          <CardTitle className="text-lg">Credits History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Sign in to view your credits history
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 bg-card">
      <CardHeader>
        <CardTitle className="text-lg">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-5 w-16" />
              </div>
            ))}
          </div>
        ) : history.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No activity yet. Your purchases and usage will appear here.
          </p>
        ) : (
          <div className="space-y-3">
            {history.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 py-2 border-b border-border/30 last:border-0"
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                  item.amount > 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-secondary text-muted-foreground'
                }`}>
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{item.description}</p>
                    {item.type !== 'usage' && (
                      <Badge variant={getBadgeVariant(item.type)} className="text-xs capitalize shrink-0">
                        {item.type}
                      </Badge>
                    )}
                    {item.usageType && (
                      <Badge variant="outline" className="text-xs capitalize shrink-0">
                        {item.usageType}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(item.created_at), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>
                <div className={`flex items-center gap-1 font-semibold ${getTypeColor(item.type, item.amount)}`}>
                  {item.amount > 0 ? (
                    <ArrowUpRight className="h-4 w-4" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4" />
                  )}
                  <span>{item.amount > 0 ? '+' : ''}{item.amount}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CreditsHistory;
