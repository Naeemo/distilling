'use client';

import React, { useState } from 'react';
import { useContentRelations, RelationType } from '@/hooks/useKnowledgeGraph';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Link2, 
  ThumbsUp, 
  ThumbsDown, 
  GitCompare, 
  Clock,
  User,
  ArrowRight,
  Filter
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RelatedContentListProps {
  contentId: string;
  className?: string;
}

const relationConfig: Record<RelationType, { label: string; icon: React.ReactNode; color: string }> = {
  SIMILAR_TOPIC: { 
    label: 'Similar', 
    icon: <GitCompare className="w-3 h-3" />, 
    color: 'bg-blue-100 text-blue-700' 
  },
  CONTRADICTORY: { 
    label: 'Contradicts', 
    icon: <ThumbsDown className="w-3 h-3" />, 
    color: 'bg-red-100 text-red-700' 
  },
  SUPPORTIVE: { 
    label: 'Supports', 
    icon: <ThumbsUp className="w-3 h-3" />, 
    color: 'bg-green-100 text-green-700' 
  },
  REFERENCED: { 
    label: 'Referenced', 
    icon: <Link2 className="w-3 h-3" />, 
    color: 'bg-amber-100 text-amber-700' 
  },
  SEQUEL: { 
    label: 'Sequel', 
    icon: <ArrowRight className="w-3 h-3" />, 
    color: 'bg-purple-100 text-purple-700' 
  },
  SAME_AUTHOR: { 
    label: 'Same Author', 
    icon: <User className="w-3 h-3" />, 
    color: 'bg-cyan-100 text-cyan-700' 
  },
  SHARED_ENTITY: { 
    label: 'Shared Topic', 
    icon: <GitCompare className="w-3 h-3" />, 
    color: 'bg-pink-100 text-pink-700' 
  },
  TEMPORAL_CHAIN: { 
    label: 'Timeline', 
    icon: <Clock className="w-3 h-3" />, 
    color: 'bg-indigo-100 text-indigo-700' 
  },
  CAUSAL: { 
    label: 'Causal', 
    icon: <ArrowRight className="w-3 h-3" />, 
    color: 'bg-lime-100 text-lime-700' 
  },
  BROADER_CONTEXT: { 
    label: 'Broader', 
    icon: <GitCompare className="w-3 h-3" />, 
    color: 'bg-teal-100 text-teal-700' 
  },
  NARROWER_FOCUS: { 
    label: 'Narrower', 
    icon: <GitCompare className="w-3 h-3" />, 
    color: 'bg-orange-100 text-orange-700' 
  },
};

export function RelatedContentList({ contentId, className }: RelatedContentListProps) {
  const { data: relations, loading } = useContentRelations(contentId);
  const [filterType, setFilterType] = useState<RelationType | 'all'>('all');

  if (loading) {
    return (
      <Card className={cn('w-full', className)}>
        <CardHeader>
          <div className="h-5 bg-muted rounded w-1/2 animate-pulse" />
        </CardHeader>
        <CardContent className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-muted rounded animate-pulse" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!relations || relations.length === 0) {
    return (
      <Card className={cn('w-full', className)}>
        <CardHeader>
          <CardTitle className="text-sm">Related Content</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No related content found
          </p>
        </CardContent>
      </Card>
    );
  }

  // 按类型分组
  const groupedRelations = relations.reduce((acc, rel) => {
    if (!acc[rel.relationType]) acc[rel.relationType] = [];
    acc[rel.relationType].push(rel);
    return acc;
  }, {} as Record<RelationType, typeof relations>);

  // 过滤
  const filteredRelations = filterType === 'all' 
    ? relations 
    : relations.filter(r => r.relationType === filterType);

  // 按强度排序
  const sortedRelations = [...filteredRelations].sort((a, b) => b.strength - a.strength);

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Related Content</CardTitle>
          <Badge variant="secondary" className="text-xs">
            {relations.length}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="w-full grid grid-cols-4 h-8 mb-3">
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            <TabsTrigger value="similar" className="text-xs">Similar</TabsTrigger>
            <TabsTrigger value="contradicts" className="text-xs">Opposing</TabsTrigger>
            <TabsTrigger value="supports" className="text-xs">Supports</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-0">
            <div className="space-y-2 max-h-60 overflow-auto">
              {sortedRelations.map((relation) => (
                <RelationItem key={relation.relationId} relation={relation} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="similar" className="mt-0">
            <div className="space-y-2 max-h-60 overflow-auto">
              {sortedRelations
                .filter(r => r.relationType === 'SIMILAR_TOPIC' || r.relationType === 'SHARED_ENTITY')
                .map((relation) => (
                  <RelationItem key={relation.relationId} relation={relation} />
                ))}
            </div>
          </TabsContent>

          <TabsContent value="contradicts" className="mt-0">
            <div className="space-y-2 max-h-60 overflow-auto">
              {sortedRelations
                .filter(r => r.relationType === 'CONTRADICTORY')
                .map((relation) => (
                  <RelationItem key={relation.relationId} relation={relation} />
                ))}
            </div>
          </TabsContent>

          <TabsContent value="supports" className="mt-0">
            <div className="space-y-2 max-h-60 overflow-auto">
              {sortedRelations
                .filter(r => r.relationType === 'SUPPORTIVE' || r.relationType === 'REFERENCED')
                .map((relation) => (
                  <RelationItem key={relation.relationId} relation={relation} />
                ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* 统计 */}
        <div className="mt-3 pt-3 border-t">
          <div className="flex flex-wrap gap-1">
            {Object.entries(groupedRelations).slice(0, 4).map(([type, items]) => {
              const config = relationConfig[type as RelationType];
              return (
                <Badge 
                  key={type} 
                  variant="outline" 
                  className={cn('text-xs', config?.color)}
                >
                  {config?.icon}
                  <span className="ml-1">{items.length}</span>
                </Badge>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface RelationItemProps {
  relation: {
    relationId: string;
    relationType: RelationType;
    strength: number;
    description?: string;
    direction: string;
    relatedContent: {
      id: string;
      title: string;
      url?: string;
      status: string;
    };
  };
}

function RelationItem({ relation }: RelationItemProps) {
  const config = relationConfig[relation.relationType];

  return (
    <a
      href={`/reader/${relation.relatedContent.id}`}
      className="block p-2 rounded-lg border hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-start gap-2">
        <div className={cn('p-1 rounded shrink-0', config?.color)}>
          {config?.icon}
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium truncate">
            {relation.relatedContent.title}
          </h4>
          
          {relation.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
              {relation.description}
            </p>
          )}

          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary" className="text-[10px] h-4">
              {config?.label}
            </Badge>
            
            <div className="flex-1">
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all"
                  style={{ width: `${relation.strength * 100}%` }}
                />
              </div>
            </div>
            
            <span className="text-[10px] text-muted-foreground">
              {Math.round(relation.strength * 100)}%
            </span>
          </div>
        </div>
      </div>
    </a>
  );
}
