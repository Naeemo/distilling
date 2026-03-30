'use client';

import useSWR from 'swr';
import { apiClient } from '@/lib/api';

export interface KnowledgeGraphData {
  nodes: {
    id: string;
    title: string;
    url?: string;
    status: string;
    createdAt: string;
    topics: { name: string; confidence: number }[];
    entities: { name: string; type: string }[];
    qualityScore?: number;
    stance?: string;
    tags: string[];
    x?: number;
    y?: number;
    size?: number;
  }[];
  edges: {
    id: string;
    source: string;
    target: string;
    type: string;
    strength: number;
    isDirectional: boolean;
    width?: number;
  }[];
}

export interface ContentPosition {
  position: {
    domain: string;
    level: string;
    audience: string;
    informationDensity: number;
  };
  networkStats: {
    relatedCount: number;
    similarTopics: number;
    contradictoryCount: number;
    supportiveCount: number;
    entityConnections: number;
  };
  topicClusters: {
    name: string;
    relevance: number;
    articleCount: number;
  }[];
  role: {
    type: string;
    importance: number;
    uniqueness: number;
  };
}

export type RelationType = 
  | 'SIMILAR_TOPIC'
  | 'CONTRADICTORY'
  | 'SUPPORTIVE'
  | 'REFERENCED'
  | 'SEQUEL'
  | 'SAME_AUTHOR'
  | 'SHARED_ENTITY'
  | 'TEMPORAL_CHAIN'
  | 'CAUSAL'
  | 'BROADER_CONTEXT'
  | 'NARROWER_FOCUS';

export interface ContentRelation {
  relationId: string;
  relationType: RelationType;
  strength: number;
  description?: string;
  evidence?: string[];
  isDirectional: boolean;
  direction: 'outgoing' | 'incoming' | 'bidirectional';
  relatedContent: {
    id: string;
    title: string;
    url?: string;
    status: string;
  };
  createdAt: string;
}

// 获取知识图谱数据
export function useKnowledgeGraph(centerContentId?: string) {
  const { data, error, isLoading, mutate } = useSWR<KnowledgeGraphData>(
    '/knowledge-graph/graph' + (centerContentId ? `?centerContentId=${centerContentId}` : ''),
    async (url: string) => {
      const response = await apiClient.get(url);
      return response.data;
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
      shouldRetryOnError: false,
    }
  );

  return {
    data,
    loading: isLoading,
    error,
    refetch: mutate,
  };
}

// 获取文章信息位置
export function useContentPosition(contentId: string) {
  const { data, error, isLoading } = useSWR<ContentPosition>(
    contentId ? `/knowledge-graph/contents/${contentId}/position` : null,
    async (url: string) => {
      const response = await apiClient.get(url);
      return response.data;
    },
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  );

  return {
    data,
    loading: isLoading,
    error,
  };
}

// 获取文章关联列表
export function useContentRelations(contentId: string, options?: {
  relationType?: RelationType;
  minStrength?: number;
}) {
  const { data, error, isLoading, mutate } = useSWR<ContentRelation[]>(
    contentId ? `/knowledge-graph/contents/${contentId}/relations` : null,
    async (url: string) => {
      const params = new URLSearchParams();
      if (options?.relationType) params.append('relationType', options.relationType);
      if (options?.minStrength) params.append('minStrength', options.minStrength.toString());
      
      const response = await apiClient.get(url + (params.toString() ? `?${params.toString()}` : ''));
      return response.data;
    },
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  );

  return {
    data,
    loading: isLoading,
    error,
    refetch: mutate,
  };
}

// 获取内容洞察
export function useContentInsight(contentId: string) {
  const { data, error, isLoading } = useSWR(
    contentId ? `/knowledge-graph/contents/${contentId}/insight` : null,
    async (url: string) => {
      const response = await apiClient.get(url);
      return response.data;
    },
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  );

  return {
    data,
    loading: isLoading,
    error,
  };
}
