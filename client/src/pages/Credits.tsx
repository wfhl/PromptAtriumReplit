import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Coins, TrendingUp, Gift, Calendar, ArrowUp, ArrowDown, Clock, Trophy, MessageSquare, Share2, Users, Star } from "lucide-react";
import { format, differenceInHours } from "date-fns";
import { AchievementBadges } from "@/components/AchievementBadges";

interface CreditBalance {
  balance: number;
  totalEarned: number;
  totalSpent: number;
  lastDailyReward: string | null;
  dailyStreak: number;
}

interface CreditTransaction {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  balanceAfter: number;
  source: string;
  description: string | null;
  createdAt: string;
}

function formatCredits(amount: number): string {
  return amount.toLocaleString();
}

function getSourceIcon(source: string): React.ReactNode {
  switch (source) {
    case 'signup_bonus':
    case 'first_prompt':
    case 'profile_completion':
      return <Gift className="w-4 h-4" />;
    case 'daily_login':
      return <Calendar className="w-4 h-4" />;
    case 'prompt':
    case 'prompt_share':
      return <Share2 className="w-4 h-4" />;
    case 'review':
      return <MessageSquare className="w-4 h-4" />;
    case 'achievement':
      return <Trophy className="w-4 h-4" />;
    case 'streak':
      return <TrendingUp className="w-4 h-4" />;
    default:
      return <Coins className="w-4 h-4" />;
  }
}

function getSourceLabel(source: string): string {
  switch (source) {
    case 'signup_bonus':
      return 'Welcome Bonus';
    case 'daily_login':
      return 'Daily Reward';
    case 'prompt':
    case 'prompt_share':
      return 'Prompt Shared';
    case 'first_prompt':
      return 'First Prompt Bonus';
    case 'profile_completion':
      return 'Profile Completion';
    case 'review':
      return 'Review Reward';
    case 'achievement':
      return 'Achievement Unlocked';
    case 'streak':
      return 'Streak Bonus';
    default:
      return source.split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
  }
}

export default function Credits() {
  const { toast } = useToast();
  const [canClaimDaily, setCanClaimDaily] = useState(false);
  const [nextClaimTime, setNextClaimTime] = useState<Date | null>(null);

  // Fetch credit balance
  const { data: balance, isLoading: balanceLoading, error: balanceError } = useQuery<CreditBalance>({
    queryKey: ['/api/credits/balance'],
  });

  // Fetch transaction history
  const { data: transactions = [], isLoading: transactionsLoading } = useQuery<CreditTransaction[]>({
    queryKey: ['/api/credits/history'],
  });

  // Check if user can claim daily reward
  useEffect(() => {
    if (balance?.lastDailyReward) {
      const lastClaim = new Date(balance.lastDailyReward);
      const now = new Date();
      const hoursSinceLastClaim = differenceInHours(now, lastClaim);
      
      if (hoursSinceLastClaim >= 24) {
        setCanClaimDaily(true);
      } else {
        setCanClaimDaily(false);
        setNextClaimTime(new Date(lastClaim.getTime() + 24 * 60 * 60 * 1000));
      }
    } else {
      // Never claimed before
      setCanClaimDaily(true);
    }
  }, [balance]);

  // Claim daily reward mutation
  const claimDailyMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/credits/claim-daily');
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/credits/balance'] });
      queryClient.invalidateQueries({ queryKey: ['/api/credits/history'] });
      
      toast({
        title: "Daily Reward Claimed!",
        description: data.message || `You earned ${data.reward} credits!`,
      });

      // Update claim status
      setCanClaimDaily(false);
      setNextClaimTime(new Date(Date.now() + 24 * 60 * 60 * 1000));
    },
    onError: (error: any) => {
      toast({
        title: "Unable to Claim",
        description: error.message || "You've already claimed your daily reward.",
        variant: "destructive",
      });
    },
  });

  // Loading state
  if (balanceLoading) {
    return (
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <div className="space-y-6">
          <Skeleton className="h-12 w-48" />
          <div className="grid gap-6 md:grid-cols-3">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (balanceError) {
    return (
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Failed to load credits information. Please try again later.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hoursUntilClaim = nextClaimTime ? Math.max(0, Math.ceil(differenceInHours(nextClaimTime, new Date()))) : 0;

  return (
    <div className="container max-w-6xl mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Coins className="w-8 h-8 text-yellow-500" />
            Credits
          </h1>
          <p className="text-muted-foreground mt-2">
            Earn credits by being active and sharing your prompts with the community
          </p>
        </div>

        {/* Balance Cards */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Current Balance */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
              <Coins className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCredits(balance?.balance || 0)} credits</div>
              <p className="text-xs text-muted-foreground">Available to spend</p>
            </CardContent>
          </Card>

          {/* Total Earned */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
              <ArrowUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                +{formatCredits(balance?.totalEarned || 0)}
              </div>
              <p className="text-xs text-muted-foreground">Lifetime earnings</p>
            </CardContent>
          </Card>

          {/* Daily Streak */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Daily Streak</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{balance?.dailyStreak || 0} days</div>
              <p className="text-xs text-muted-foreground">
                {balance?.dailyStreak === 6 
                  ? "1 more day for 7-day bonus!" 
                  : balance?.dailyStreak === 29 
                  ? "1 more day for 30-day bonus!"
                  : "Keep it going!"
                }
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Daily Reward Claim */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5" />
              Daily Login Reward
            </CardTitle>
            <CardDescription>
              Login daily to earn free credits and build your streak
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex-1">
                {canClaimDaily ? (
                  <p className="text-sm text-green-600 font-medium">Daily reward available!</p>
                ) : (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Next reward in {hoursUntilClaim} hour{hoursUntilClaim !== 1 ? 's' : ''}
                    </p>
                  </div>
                )}
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground">
                    Streak bonuses: 7 days = +100 credits, 30 days = +500 credits
                  </p>
                </div>
              </div>
              <Button
                onClick={() => claimDailyMutation.mutate()}
                disabled={!canClaimDaily || claimDailyMutation.isPending}
                size="lg"
                data-testid="button-claim-daily"
              >
                {claimDailyMutation.isPending ? (
                  "Claiming..."
                ) : canClaimDaily ? (
                  "Claim Daily Reward"
                ) : (
                  `Claimed ✓`
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Transaction History */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>
              Your credit earning and spending history
            </CardDescription>
          </CardHeader>
          <CardContent>
            {transactionsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
            ) : transactions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No transactions yet. Start earning credits by sharing prompts!
              </p>
            ) : (
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {transactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between py-3 border-b last:border-0"
                      data-testid={`transaction-${transaction.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${
                          transaction.type === 'credit' 
                            ? 'bg-green-100 text-green-600 dark:bg-green-900/20' 
                            : 'bg-red-100 text-red-600 dark:bg-red-900/20'
                        }`}>
                          {transaction.type === 'credit' ? (
                            <ArrowUp className="w-4 h-4" />
                          ) : (
                            <ArrowDown className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            {getSourceIcon(transaction.source)}
                            <p className="font-medium">
                              {getSourceLabel(transaction.source)}
                            </p>
                          </div>
                          {transaction.description && (
                            <p className="text-sm text-muted-foreground">
                              {transaction.description}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(transaction.createdAt), 'MMM d, yyyy h:mm a')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${
                          transaction.type === 'credit' 
                            ? 'text-green-600' 
                            : 'text-red-600'
                        }`}>
                          {transaction.type === 'credit' ? '+' : '-'}
                          {formatCredits(transaction.amount)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Balance: {formatCredits(transaction.balanceAfter)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* How to Earn Credits */}
        <Card>
          <CardHeader>
            <CardTitle>How to Earn Credits</CardTitle>
            <CardDescription>
              Multiple ways to boost your credit balance - NO purchasing required!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex gap-3">
                <Calendar className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Daily Login</p>
                  <p className="text-sm text-muted-foreground">
                    Login every day to earn 10 credits base
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Share2 className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Share Prompts</p>
                  <p className="text-sm text-muted-foreground">
                    Make prompts public to earn 50 credits each
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <MessageSquare className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Write Reviews</p>
                  <p className="text-sm text-muted-foreground">
                    Earn 10 credits for each marketplace review
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Gift className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Streak Bonuses</p>
                  <p className="text-sm text-muted-foreground">
                    7-day streak: +100, 30-day streak: +500
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Trophy className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Achievements</p>
                  <p className="text-sm text-muted-foreground">
                    Complete achievements for 100-500 credits
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Coins className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Complete Profile</p>
                  <p className="text-sm text-muted-foreground">
                    One-time 100 credit bonus for completing your profile
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">
                <strong>Important:</strong> Credits are earned only through platform activities. 
                No purchasing required! Daily earning cap: 500 credits (excluding achievements).
                Credits expire after 12 months of inactivity.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Achievements Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Your Achievements
            </CardTitle>
            <CardDescription>
              Complete achievements to earn bonus credits and show off your accomplishments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AchievementBadges showProgress={true} showCompact={false} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}