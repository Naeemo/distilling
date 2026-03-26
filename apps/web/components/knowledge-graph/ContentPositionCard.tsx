'use client';

import React from 'react';
import { useContentPosition } from '@/hooks/useKnowledgeGraph';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  MapPin, 
  Network, 
  Target, 
  Sparkles,
  Globe,
  BookOpen,
  Users,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ContentPositionCardProps {
  contentId: string;
  className?: string;
}

const domainIcons: Record<string, React.ReactNode> = {
  tech: <Zap className="w-4 h-4" />,
  politics: <Globe className="w-4 h-4" />,
  science: <BookOpen className="w-4 h-4" />,
  business: <Target className="w-4 h-4" />,
  culture: <Users className="w-4 h-4" />,
  general: <MapPin className="w-4 h-4" />,
};

const domainLabels: Record<string, string> = {
  tech: 'Technology',
  politics: 'Politics',
  science: 'Science',
  business: 'Business',
  culture: 'Culture',
  general: 'General',
};

const levelLabels: Record<string, string> = {
  surface: 'Surface Level',
  intermediate: 'Intermediate',
  deep: 'Deep Analysis',
};

const audienceLabels: Record<string, string> = {
  general: 'General Public',
  professional: 'Professionals',
  academic: 'Academics',
};

const roleLabels: Record<string, { label: string; description: string }> = {
  source: { 
    label: 'Source', 
    description: 'Original reporting or primary information' 
  },
  synthesis: { 
    label: 'Synthesis', 
    description: 'Comprehensive analysis combining multiple sources' 
  },
  commentary: { 
    label: 'Commentary', 
    description: 'Opinion and interpretation' 
  },
  breaking: { 
    label: 'Breaking News', 
    description: 'Timely report on recent events' 
  },
};

export function ContentPositionCard({ contentId, className }: ContentPositionCardProps) {
  const { data, loading } = useContentPosition(contentId);

  if (loading) {
    return (
      <Card className={cn('w-full animate-pulse', className)}>
        <CardHeader>
          <div className="h-6 bg-muted rounded w-2/3" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-4 bg-muted rounded" />
          <div className="h-4 bg-muted rounded" />
          <div className="h-4 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const { position, networkStats, topicClusters, role } = data;

  return (
    <Card className={cn('w-full shadow-lg', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg">Information Position</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 领域和受众 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Domain</label>
            <div className="flex items-center gap-2">
              {domainIcons[position.domain] || domainIcons.general}
              <span className="text-sm font-medium">
                {domainLabels[position.domain] || position.domain}
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Audience</label>
            <div className="text-sm font-medium">
              {audienceLabels[position.audience] || position.audience}
            </div>
          </div>
        </div>

        {/* 深度和信息密度 */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-xs text-muted-foreground">Depth Level</label>
            <Badge variant="secondary" size="sm">
              {levelLabels[position.level] || position.level}
            </Badge>
          </div>
          <Progress 
            value={position.level === 'deep' ? 100 : position.level === 'intermediate' ? 60 : 30} 
            className="h-2"
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-xs text-muted-foreground">Information Density</label>
            <span className="text-xs font-medium">
              {Math.round(position.informationDensity * 100)}%
            </span>
          </div>
          <Progress 
            value={position.informationDensity * 100} 
            className="h-2"
          />
        </div>

        {/* 网络统计 */}
        <div className="pt-3 border-t">
          <div className="flex items-center gap-2 mb-3">
            <Network className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Network Connections</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-muted rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-primary">{networkStats.relatedCount}</div>
              <div className="text-xs text-muted-foreground">Related</div>
            </div>
            <div className="bg-muted rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-blue-500">{networkStats.similarTopics}</div>
              <div className="text-xs text-muted-foreground">Similar</div>
            </div>
            <div className="bg-muted rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-red-500">{networkStats.contradictoryCount}</div>
              <div className="text-xs text-muted-foreground">Contradict</div>
            </div>
            <div className="bg-muted rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-green-500">{networkStats.supportiveCount}</div>
              <div className="text-xs text-muted-foreground">Support</div>
            </div>
          </div>
        </div>

        {/* 角色 */}
        <div className="pt-3 border-t">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Role in Network</span>
          </div>

          <div className="bg-primary/5 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <Badge variant="default" className="capitalize">
                {roleLabels[role.type]?.label || role.type}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {roleLabels[role.type]?.description || 'Unknown role'}
            </p>
          </div>

          <div className="mt-3 space-y-2">
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Importance</span>
                <span className="font-medium">{Math.round(role.importance * 100)}%</span>
              </div>
              <Progress value={role.importance * 100} className="h-1.5" />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Uniqueness</span>
                <span className="font-medium">{Math.round(role.uniqueness * 100)}%</span>
              </div>
              <Progress value={role.uniqueness * 100} className="h-1.5" />
            </div>
          </div>
        </div>

        {/* 主题簇 */}
        {topicClusters.length > 0 && (
          <div className="pt-3 border-t">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Topic Clusters</span>
            </div>

            <div className="flex flex-wrap gap-1">
              {topicClusters.slice(0, 5).map((cluster) => (
                <Badge 
                  key={cluster.name} 
                  variant="outline" 
                  className="text-xs"
                  style={{ opacity: 0.5 + cluster.relevance * 0.5 }}
                >
                  {cluster.name}
                  <span className="ml-1 text-muted-foreground">
                    ({cluster.articleCount})
                  </span>
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
