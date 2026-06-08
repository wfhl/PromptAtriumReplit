import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  Trophy, 
  Star, 
  Rocket, 
  MessageSquare,
  ThumbsUp,
  ShoppingBag,
  Users,
  Award,
  TrendingUp,
  Target,
  Zap,
  CheckCircle
} from "lucide-react";

interface Achievement {
  id: string;
  code: string;
  name: string;
  description: string;
  creditReward: number;
  iconName: string;
  category: string;
  requiredCount: number;
  isActive: boolean;
}

interface UserAchievement {
  id: string;
  userId: string;
  achievementId: string;
  progress: number;
  isCompleted: boolean;
  completedAt: string | null;
  creditsClaimed: boolean;
  claimedAt: string | null;
  achievement?: Achievement;
}

const iconMap: Record<string, React.ComponentType<any>> = {
  trophy: Trophy,
  star: Star,
  rocket: Rocket,
  "message-square": MessageSquare,
  "thumbs-up": ThumbsUp,
  "shopping-bag": ShoppingBag,
  users: Users,
  award: Award,
  "trending-up": TrendingUp,
  target: Target,
  zap: Zap,
};

const categoryColors: Record<string, string> = {
  content: "bg-blue-500",
  social: "bg-purple-500",
  commerce: "bg-green-500",
  streak: "bg-orange-500",
  special: "bg-pink-500",
  general: "bg-gray-500",
};

interface AchievementBadgesProps {
  userId?: string;
  showProgress?: boolean;
  showCompact?: boolean;
}

export function AchievementBadges({ 
  userId, 
  showProgress = true,
  showCompact = false 
}: AchievementBadgesProps) {
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Fetch all achievements with user progress
  const { data: achievementData, isLoading } = useQuery<{ achievements: Achievement[]; userProgress: UserAchievement[] }>({
    queryKey: ["/api/achievements", userId],
    enabled: true,
  });

  // Claim achievement reward mutation
  const claimRewardMutation = useMutation({
    mutationFn: async (achievementId: string) => {
      return apiRequest("POST", `/api/achievements/claim/${achievementId}`, {});
    },
    onSuccess: (data: any) => {
      toast({
        title: "Reward Claimed!",
        description: `You've earned ${data.creditsEarned} credits!`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/achievements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/credits/balance"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const achievements = achievementData?.achievements || [];
  const userProgress = achievementData?.userProgress || [];

  // Create a map for easier lookup
  const progressMap = new Map(
    userProgress.map((up: UserAchievement) => [up.achievementId, up])
  );

  // Filter achievements by category
  const filteredAchievements = selectedCategory === "all" 
    ? achievements 
    : achievements.filter((a: Achievement) => a.category === selectedCategory);

  // Get unique categories
  const categories = ["all", ...new Set(achievements.map((a: Achievement) => a.category))];

  // Calculate stats
  const totalAchievements = achievements.length;
  const completedAchievements = userProgress.filter((up: UserAchievement) => up.isCompleted).length;
  const totalCreditsEarned = userProgress
    .filter((up: UserAchievement) => up.creditsClaimed)
    .reduce((sum: number, up: UserAchievement) => {
      const achievement = achievements.find((a: Achievement) => a.id === up.achievementId);
      return sum + (achievement?.creditReward || 0);
    }, 0);

  if (showCompact) {
    // Compact view for profile pages
    return (
      <div className="flex flex-wrap gap-2">
        {userProgress
          .filter((up: UserAchievement) => up.isCompleted)
          .map((up: UserAchievement) => {
            const achievement = achievements.find((a: Achievement) => a.id === up.achievementId);
            if (!achievement) return null;
            
            const Icon = iconMap[achievement.iconName] || Award;
            
            return (
              <div
                key={achievement.id}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-full",
                  categoryColors[achievement.category] || "bg-gray-500",
                  "bg-opacity-10 border"
                )}
                data-testid={`badge-achievement-${achievement.id}`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{achievement.name}</span>
              </div>
            );
          })}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold" data-testid="text-completed-achievements">
                  {completedAchievements}/{totalAchievements}
                </p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold" data-testid="text-total-credits-earned">
                  {totalCreditsEarned}
                </p>
                <p className="text-sm text-muted-foreground">Credits Earned</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold" data-testid="text-completion-rate">
                  {totalAchievements > 0 ? Math.round((completedAchievements / totalAchievements) * 100) : 0}%
                </p>
                <p className="text-sm text-muted-foreground">Completion</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Tabs */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="grid grid-cols-auto gap-2 w-full">
          {categories.map(category => (
            <TabsTrigger 
              key={category} 
              value={category}
              className="capitalize"
              data-testid={`tab-category-${category}`}
            >
              {category}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={selectedCategory} className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredAchievements.map((achievement: Achievement) => {
              const userAchievement = progressMap.get(achievement.id);
              const progress = userAchievement?.progress || 0;
              const progressPercent = Math.min((progress / achievement.requiredCount) * 100, 100);
              const isCompleted = userAchievement?.isCompleted || false;
              const isClaimed = userAchievement?.creditsClaimed || false;
              const Icon = iconMap[achievement.iconName] || Award;

              return (
                <Card 
                  key={achievement.id}
                  className={cn(
                    "relative overflow-hidden transition-all",
                    isCompleted && "border-green-500 bg-green-50 dark:bg-green-950"
                  )}
                  data-testid={`card-achievement-${achievement.id}`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div 
                        className={cn(
                          "p-2 rounded-lg",
                          isCompleted ? "bg-green-100 dark:bg-green-900" : "bg-gray-100 dark:bg-gray-800"
                        )}
                      >
                        <Icon 
                          className={cn(
                            "w-6 h-6",
                            isCompleted ? "text-green-600 dark:text-green-400" : "text-gray-600 dark:text-gray-400"
                          )} 
                        />
                      </div>
                      <Badge 
                        variant={isCompleted ? "default" : "secondary"}
                        className={cn(
                          "text-xs",
                          categoryColors[achievement.category]
                        )}
                        data-testid={`badge-reward-${achievement.id}`}
                      >
                        +{achievement.creditReward} credits
                      </Badge>
                    </div>
                    <CardTitle className="mt-2">{achievement.name}</CardTitle>
                    <CardDescription>{achievement.description}</CardDescription>
                  </CardHeader>
                  
                  <CardContent>
                    {showProgress && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium" data-testid={`text-progress-${achievement.id}`}>
                            {progress}/{achievement.requiredCount}
                          </span>
                        </div>
                        <Progress value={progressPercent} className="h-2" />
                      </div>
                    )}

                    {isCompleted && (
                      <div className="mt-4">
                        {isClaimed ? (
                          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                            <CheckCircle className="w-4 h-4" />
                            <span>Reward claimed!</span>
                          </div>
                        ) : (
                          <Button
                            onClick={() => claimRewardMutation.mutate(achievement.id)}
                            disabled={claimRewardMutation.isPending}
                            size="sm"
                            className="w-full"
                            data-testid={`button-claim-${achievement.id}`}
                          >
                            {claimRewardMutation.isPending ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Claiming...
                              </>
                            ) : (
                              <>
                                <Zap className="w-4 h-4 mr-2" />
                                Claim {achievement.creditReward} Credits
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}