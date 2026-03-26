'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Compass,
  Route,
  Zap,
  Filter,
  Search,
  Play,
  Pause,
  RotateCcw,
  ChevronRight,
  Sparkles,
  Target,
  Layers,
  Clock,
  BookOpen,
  Hash,
  X,
  Expand,
  Minimize2,
  Share2,
  Download,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// ==================== 类型定义 ====================

interface GraphNode {
  id: string;
  title: string;
  url?: string;
  status: string;
  createdAt: string;
  topics: { name: string; confidence: number }[];
  entities: { name: string; type: string }[];
  qualityScore?: number;
  stance?: 'supportive' | 'critical' | 'neutral' | 'exploratory';
  tags: string[];
  x?: number;
  y?: number;
  size?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

interface GraphEdge {
  id: string;
  source: string | GraphNode;
  target: string | GraphNode;
  type: RelationType;
  strength: number;
  isDirectional: boolean;
  width?: number;
}

type RelationType =
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

interface ExplorationPath {
  id: string;
  name: string;
  description: string;
  nodeIds: string[];
  theme: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: number;
}

interface PathStep {
  node: GraphNode;
  index: number;
  description: string;
}

// ==================== 常量配置 ====================

const RELATION_COLORS: Record<RelationType, string> = {
  SIMILAR_TOPIC: '#3b82f6',
  CONTRADICTORY: '#ef4444',
  SUPPORTIVE: '#22c55e',
  REFERENCED: '#f59e0b',
  SEQUEL: '#8b5cf6',
  SAME_AUTHOR: '#06b6d4',
  SHARED_ENTITY: '#ec4899',
  TEMPORAL_CHAIN: '#6366f1',
  CAUSAL: '#84cc16',
  BROADER_CONTEXT: '#14b8a6',
  NARROWER_FOCUS: '#f97316',
};

const STANCE_COLORS: Record<string, string> = {
  supportive: '#22c55e',
  critical: '#ef4444',
  neutral: '#6b7280',
  exploratory: '#3b82f6',
};

const EXPLORATION_PATHS: ExplorationPath[] = [
  {
    id: 'deep-dive',
    name: '深度探索',
    description: '从表层概念逐步深入到核心主题',
    nodeIds: [],
    theme: '渐进式学习',
    difficulty: 'intermediate',
    estimatedTime: 15,
  },
  {
    id: 'conflict-resolution',
    name: '观点碰撞',
    description: '探索不同观点之间的冲突与协调',
    nodeIds: [],
    theme: '批判性思维',
    difficulty: 'advanced',
    estimatedTime: 20,
  },
  {
    id: 'temporal-journey',
    name: '时间之旅',
    description: '按时间线追踪主题的发展演变',
    nodeIds: [],
    theme: '历史脉络',
    difficulty: 'beginner',
    estimatedTime: 10,
  },
  {
    id: 'entity-network',
    name: '实体网络',
    description: '围绕关键人物、组织展开关联探索',
    nodeIds: [],
    theme: '关系映射',
    difficulty: 'intermediate',
    estimatedTime: 12,
  },
];

// ==================== 模拟数据生成器 ====================

function generateMockData(): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = [
    {
      id: '1',
      title: '人工智能的未来发展',
      status: 'active',
      createdAt: '2024-01-15',
      topics: [{ name: 'AI', confidence: 0.95 }, { name: 'Technology', confidence: 0.9 }],
      entities: [{ name: 'OpenAI', type: 'organization' }, { name: 'GPT', type: 'technology' }],
      qualityScore: 0.92,
      stance: 'exploratory',
      tags: ['AI', 'Future', 'Tech'],
      size: 25,
    },
    {
      id: '2',
      title: '机器学习基础原理',
      status: 'active',
      createdAt: '2024-01-10',
      topics: [{ name: 'ML', confidence: 0.98 }, { name: 'AI', confidence: 0.85 }],
      entities: [{ name: 'Neural Networks', type: 'technology' }],
      qualityScore: 0.88,
      stance: 'supportive',
      tags: ['ML', 'Basics', 'Education'],
      size: 20,
    },
    {
      id: '3',
      title: 'AI伦理与安全挑战',
      status: 'active',
      createdAt: '2024-01-20',
      topics: [{ name: 'AI Ethics', confidence: 0.92 }, { name: 'Safety', confidence: 0.88 }],
      entities: [{ name: 'AI Alignment', type: 'concept' }],
      qualityScore: 0.85,
      stance: 'critical',
      tags: ['Ethics', 'Safety', 'AI'],
      size: 22,
    },
    {
      id: '4',
      title: '深度学习革命',
      status: 'active',
      createdAt: '2024-01-12',
      topics: [{ name: 'Deep Learning', confidence: 0.95 }],
      entities: [{ name: 'DeepMind', type: 'organization' }],
      qualityScore: 0.9,
      stance: 'supportive',
      tags: ['Deep Learning', 'Revolution'],
      size: 24,
    },
    {
      id: '5',
      title: '自然语言处理进展',
      status: 'active',
      createdAt: '2024-01-18',
      topics: [{ name: 'NLP', confidence: 0.93 }],
      entities: [{ name: 'Transformer', type: 'technology' }],
      qualityScore: 0.87,
      stance: 'exploratory',
      tags: ['NLP', 'Language', 'AI'],
      size: 21,
    },
    {
      id: '6',
      title: '计算机视觉应用',
      status: 'active',
      createdAt: '2024-01-14',
      topics: [{ name: 'Computer Vision', confidence: 0.9 }],
      entities: [{ name: 'CNN', type: 'technology' }],
      qualityScore: 0.84,
      stance: 'supportive',
      tags: ['Vision', 'AI', 'Applications'],
      size: 19,
    },
    {
      id: '7',
      title: '强化学习突破',
      status: 'active',
      createdAt: '2024-01-22',
      topics: [{ name: 'Reinforcement Learning', confidence: 0.91 }],
      entities: [{ name: 'AlphaGo', type: 'technology' }],
      qualityScore: 0.89,
      stance: 'exploratory',
      tags: ['RL', 'Games', 'AI'],
      size: 20,
    },
    {
      id: '8',
      title: 'AI芯片技术发展',
      status: 'active',
      createdAt: '2024-01-16',
      topics: [{ name: 'Hardware', confidence: 0.88 }, { name: 'AI', confidence: 0.82 }],
      entities: [{ name: 'NVIDIA', type: 'organization' }],
      qualityScore: 0.86,
      stance: 'neutral',
      tags: ['Hardware', 'Chips', 'AI'],
      size: 18,
    },
    {
      id: '9',
      title: '边缘计算与AI',
      status: 'active',
      createdAt: '2024-01-25',
      topics: [{ name: 'Edge Computing', confidence: 0.87 }],
      entities: [{ name: 'IoT', type: 'technology' }],
      qualityScore: 0.83,
      stance: 'exploratory',
      tags: ['Edge', 'IoT', 'AI'],
      size: 17,
    },
    {
      id: '10',
      title: 'AI在医疗领域的应用',
      status: 'active',
      createdAt: '2024-01-28',
      topics: [{ name: 'Healthcare', confidence: 0.92 }],
      entities: [{ name: 'Diagnostics', type: 'application' }],
      qualityScore: 0.91,
      stance: 'supportive',
      tags: ['Healthcare', 'AI', 'Applications'],
      size: 23,
    },
    {
      id: '11',
      title: '自动驾驶技术现状',
      status: 'active',
      createdAt: '2024-01-30',
      topics: [{ name: 'Autonomous Driving', confidence: 0.9 }],
      entities: [{ name: 'Tesla', type: 'organization' }],
      qualityScore: 0.85,
      stance: 'critical',
      tags: ['Auto', 'Driving', 'AI'],
      size: 21,
    },
    {
      id: '12',
      title: '生成式AI的兴起',
      status: 'active',
      createdAt: '2024-02-01',
      topics: [{ name: 'Generative AI', confidence: 0.96 }],
      entities: [{ name: 'Midjourney', type: 'technology' }],
      qualityScore: 0.93,
      stance: 'exploratory',
      tags: ['GenAI', 'Creative', 'AI'],
      size: 26,
    },
  ];

  const edges: GraphEdge[] = [
    { id: 'e1', source: '1', target: '2', type: 'SIMILAR_TOPIC', strength: 0.8, isDirectional: false },
    { id: 'e2', source: '1', target: '3', type: 'CONTRADICTORY', strength: 0.6, isDirectional: true },
    { id: 'e3', source: '2', target: '4', type: 'SUPPORTIVE', strength: 0.9, isDirectional: false },
    { id: 'e4', source: '2', target: '5', type: 'SIMILAR_TOPIC', strength: 0.75, isDirectional: false },
    { id: 'e5', source: '4', target: '6', type: 'SIMILAR_TOPIC', strength: 0.7, isDirectional: false },
    { id: 'e6', source: '4', target: '7', type: 'REFERENCED', strength: 0.65, isDirectional: true },
    { id: 'e7', source: '1', target: '8', type: 'SHARED_ENTITY', strength: 0.5, isDirectional: false },
    { id: 'e8', source: '8', target: '9', type: 'TEMPORAL_CHAIN', strength: 0.6, isDirectional: true },
    { id: 'e9', source: '10', target: '4', type: 'NARROWER_FOCUS', strength: 0.7, isDirectional: true },
    { id: 'e10', source: '11', target: '7', type: 'SUPPORTIVE', strength: 0.55, isDirectional: false },
    { id: 'e11', source: '12', target: '1', type: 'BROADER_CONTEXT', strength: 0.8, isDirectional: true },
    { id: 'e12', source: '5', target: '12', type: 'CAUSAL', strength: 0.7, isDirectional: true },
    { id: 'e13', source: '6', target: '10', type: 'SIMILAR_TOPIC', strength: 0.6, isDirectional: false },
    { id: 'e14', source: '3', target: '11', type: 'CONTRADICTORY', strength: 0.45, isDirectional: false },
    { id: 'e15', source: '9', target: '11', type: 'SHARED_ENTITY', strength: 0.5, isDirectional: false },
  ];

  return { nodes, edges };
}

// ==================== 主组件 ====================

export default function InteractiveExplorer() {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  // 数据状态
  const [data, setData] = useState<{ nodes: GraphNode[]; edges: GraphEdge[] } | null>(null);
  const [loading, setLoading] = useState(true);
  
  // 交互状态
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [activePath, setActivePath] = useState<ExplorationPath | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // 过滤和搜索
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRelationTypes, setSelectedRelationTypes] = useState<RelationType[]>([]);
  const [minStrength, setMinStrength] = useState(0);
  const [showOnlySelectedPath, setShowOnlySelectedPath] = useState(false);
  
  // 视觉配置
  const [showLabels, setShowLabels] = useState(true);
  const [showParticles, setShowParticles] = useState(true);
  const [layoutMode, setLayoutMode] = useState<'force' | 'circular' | 'hierarchical'>('force');
  
  // 模拟数据加载
  useEffect(() => {
    setTimeout(() => {
      const mockData = generateMockData();
      setData(mockData);
      setLoading(false);
    }, 1000);
  }, []);

  // 过滤数据
  const filteredData = useMemo(() => {
    if (!data) return null;
    
    let filteredNodes = data.nodes;
    let filteredEdges = data.edges;
    
    // 搜索过滤
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filteredNodes = filteredNodes.filter(
        n =>
          n.title.toLowerCase().includes(query) ||
          n.tags.some(t => t.toLowerCase().includes(query)) ||
          n.topics.some(t => t.name.toLowerCase().includes(query))
      );
    }
    
    // 关系类型过滤
    if (selectedRelationTypes.length > 0) {
      filteredEdges = filteredEdges.filter(e => selectedRelationTypes.includes(e.type));
    }
    
    // 连接强度过滤
    filteredEdges = filteredEdges.filter(e => e.strength >= minStrength / 100);
    
    // 路径过滤
    if (showOnlySelectedPath && activePath) {
      const pathNodeIds = new Set(activePath.nodeIds);
      filteredNodes = filteredNodes.filter(n => pathNodeIds.has(n.id));
      filteredEdges = filteredEdges.filter(
        e =>
          pathNodeIds.has(typeof e.source === 'string' ? e.source : e.source.id) &&
          pathNodeIds.has(typeof e.target === 'string' ? e.target : e.target.id)
      );
    }
    
    return { nodes: filteredNodes, edges: filteredEdges };
  }, [data, searchQuery, selectedRelationTypes, minStrength, showOnlySelectedPath, activePath]);

  // 初始化 D3 图谱
  useEffect(() => {
    if (!filteredData || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // 创建渐变和滤镜
    const defs = svg.append('defs');
    
    // 发光滤镜
    const glowFilter = defs.append('filter')
      .attr('id', 'glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');
    
    glowFilter.append('feGaussianBlur')
      .attr('stdDeviation', '3')
      .attr('result', 'coloredBlur');
    
    const feMerge = glowFilter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // 缩放行为
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    const g = svg.append('g');

    // 箭头标记
    Object.entries(RELATION_COLORS).forEach(([type, color]) => {
      defs.append('marker')
        .attr('id', `arrow-${type}`)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 28)
        .attr('refY', 0)
        .attr('markerWidth', 8)
        .attr('markerHeight', 8)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', color);
    });

    // 力导向模拟
    const simulation = d3.forceSimulation<GraphNode>(filteredData.nodes)
      .force('link', d3.forceLink<GraphNode, GraphEdge>(filteredData.edges)
        .id(d => d.id)
        .distance(d => 200 - d.strength * 100)
        .strength(d => d.strength * 0.5)
      )
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide<GraphNode>().radius(d => (d.size || 20) + 10));

    // 绘制连线
    const link = g.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(filteredData.edges)
      .enter()
      .append('line')
      .attr('stroke', d => RELATION_COLORS[d.type])
      .attr('stroke-width', d => (d.width || 2) * d.strength)
      .attr('stroke-opacity', 0.5)
      .attr('marker-end', d => d.isDirectional ? `url(#arrow-${d.type})` : null)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        d3.select(this).attr('stroke-width', (d.width || 2) * d.strength * 2).attr('stroke-opacity', 1);
      })
      .on('mouseout', function(event, d) {
        d3.select(this).attr('stroke-width', (d.width || 2) * d.strength).attr('stroke-opacity', 0.5);
      });

    // 绘制节点组
    const node = g.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(filteredData.nodes)
      .enter()
      .append('g')
      .attr('cursor', 'pointer')
      .call(d3.drag<SVGGElement, GraphNode>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
      );

    // 节点圆形
    node.append('circle')
      .attr('r', d => d.size || 15)
      .attr('fill', d => {
        if (d.stance && STANCE_COLORS[d.stance]) {
          return STANCE_COLORS[d.stance];
        }
        return d.qualityScore ? d3.interpolateViridis(d.qualityScore) : '#3b82f6';
      })
      .attr('stroke', d => {
        if (selectedNode?.id === d.id) return '#f59e0b';
        if (hoveredNode?.id === d.id) return '#fff';
        return 'rgba(255,255,255,0.3)';
      })
      .attr('stroke-width', d => {
        if (selectedNode?.id === d.id) return 4;
        if (hoveredNode?.id === d.id) return 3;
        return 2;
      })
      .style('filter', d => selectedNode?.id === d.id ? 'url(#glow)' : null)
      .on('click', (event, d) => {
        event.stopPropagation();
        setSelectedNode(d);
      })
      .on('mouseover', (event, d) => setHoveredNode(d))
      .on('mouseout', () => setHoveredNode(null));

    // 节点标签
    if (showLabels) {
      node.append('text')
        .attr('dy', d => (d.size || 15) + 18)
        .attr('text-anchor', 'middle')
        .attr('font-size', '11px')
        .attr('fill', 'currentColor')
        .attr('font-weight', d => selectedNode?.id === d.id ? '600' : '400')
        .text(d => d.title.length > 12 ? d.title.slice(0, 12) + '...' : d.title)
        .style('pointer-events', 'none');
    }

    // 主题指示器小圆点
    node.each(function(d) {
      if (d.topics && d.topics.length > 0) {
        const el = d3.select(this);
        d.topics.slice(0, 3).forEach((topic, i) => {
          el.append('circle')
            .attr('cx', (d.size || 15) + 10)
            .attr('cy', -((d.size || 15) - 8) + (i * 10))
            .attr('r', 4)
            .attr('fill', d3.interpolateViridis(topic.confidence))
            .style('pointer-events', 'none');
        });
      }
    });

    // 动画粒子效果
    if (showParticles && filteredData) {
      const particleGroup = g.append('g').attr('class', 'particles');
      const currentData = filteredData; // 保存局部引用
      
      filteredData.edges.forEach((edge, i) => {
        const particle = particleGroup.append('circle')
          .attr('r', 3)
          .attr('fill', RELATION_COLORS[edge.type])
          .attr('opacity', 0.8);

        function animateParticle() {
          particle
            .transition()
            .duration(2000 / edge.strength)
            .ease(d3.easeLinear)
            .attrTween('transform', function() {
              return function(t) {
                const sourceNode = typeof edge.source === 'string' 
                  ? currentData.nodes.find(n => n.id === edge.source)
                  : edge.source;
                const targetNode = typeof edge.target === 'string'
                  ? currentData.nodes.find(n => n.id === edge.target)
                  : edge.target;
                
                if (!sourceNode?.x || !sourceNode?.y || !targetNode?.x || !targetNode?.y) {
                  return '';
                }
                
                const x = sourceNode.x + (targetNode.x - sourceNode.x) * t;
                const y = sourceNode.y + (targetNode.y - sourceNode.y) * t;
                return `translate(${x},${y})`;
              };
            })
            .on('end', animateParticle);
        }
        
        setTimeout(() => animateParticle(), i * 200);
      });
    }

    // 更新位置
    simulation.on('tick', () => {
      link
        .attr('x1', d => (typeof d.source !== 'string' ? d.source.x || 0 : 0))
        .attr('y1', d => (typeof d.source !== 'string' ? d.source.y || 0 : 0))
        .attr('x2', d => (typeof d.target !== 'string' ? d.target.x || 0 : 0))
        .attr('y2', d => (typeof d.target !== 'string' ? d.target.y || 0 : 0));

      node.attr('transform', d => `translate(${d.x || 0},${d.y || 0})`);
    });

    // 点击空白处取消选择
    svg.on('click', () => setSelectedNode(null));

    return () => {
      simulation.stop();
    };
  }, [filteredData, selectedNode, hoveredNode, showLabels, showParticles]);

  // 播放路径动画
  useEffect(() => {
    if (!isPlaying || !activePath) return;
    
    const interval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev >= activePath.nodeIds.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [isPlaying, activePath]);

  // 开始路径探索
  const startPathExploration = (path: ExplorationPath) => {
    setActivePath(path);
    setCurrentStep(0);
    setShowOnlySelectedPath(true);
    setIsPlaying(true);
    
    toast({
      title: `开始探索: ${path.name}`,
      description: path.description,
    });
  };

  // 重置视图
  const resetView = () => {
    setSelectedNode(null);
    setActivePath(null);
    setCurrentStep(0);
    setIsPlaying(false);
    setShowOnlySelectedPath(false);
    setSearchQuery('');
    setSelectedRelationTypes([]);
    setMinStrength(0);
  };

  // 导出图谱
  const exportGraph = () => {
    if (!svgRef.current) return;
    
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `knowledge-graph-${Date.now()}.svg`;
    link.click();
    
    URL.revokeObjectURL(url);
    
    toast({
      title: '导出成功',
      description: '知识图谱已保存为SVG文件',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">加载知识图谱...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className={cn("flex h-screen bg-background overflow-hidden", isFullscreen && "fixed inset-0 z-50")}>
        {/* 左侧边栏 - 探索路径 */}
        <motion.aside
          initial={{ x: -300 }}
          animate={{ x: 0 }}
          className="w-80 border-r bg-card/50 backdrop-blur flex flex-col"
        >
          <div className="p-4 border-b">
            <div className="flex items-center gap-2 mb-1">
              <Compass className="w-5 h-5 text-primary" />
              <h2 className="font-semibold">探索路径</h2>
            </div>
            <p className="text-xs text-muted-foreground">选择一条引导路径开始探索</p>
          </div>

          <ScrollArea className="flex-1 p-4">
            <div className="space-y-3">
              {EXPLORATION_PATHS.map((path, index) => (
                <motion.div
                  key={path.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card
                    className={cn(
                      "cursor-pointer transition-all hover:shadow-md",
                      activePath?.id === path.id && "ring-2 ring-primary"
                    )}
                    onClick={() => startPathExploration(path)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Route className="w-4 h-4 text-primary" />
                          <h3 className="font-medium text-sm">{path.name}</h3>
                        </div>
                        <Badge variant={path.difficulty === 'beginner' ? 'default' : path.difficulty === 'intermediate' ? 'secondary' : 'outline'} className="text-xs">
                          {path.difficulty === 'beginner' ? '入门' : path.difficulty === 'intermediate' ? '进阶' : '高级'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">{path.description}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
                          {path.estimatedTime}分钟
                        </span>
                        <span className="flex items-center gap-1">
                          <Target className="w-3 h-3" />
                          {path.theme}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {activePath && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-6"
              >
                <Separator className="mb-4" />
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-sm flex items-center gap-2">
                    <Play className="w-4 h-4" />
                    当前进度
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {currentStep + 1} / {activePath.nodeIds.length || 5}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 mb-4">
                  <motion.div
                    className="bg-primary h-2 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${((currentStep + 1) / (activePath.nodeIds.length || 5)) * 100}%` }}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setIsPlaying(!isPlaying)}
                  >
                    {isPlaying ? <Pause className="w-4 h-4 mr-1" /> : <Play className="w-4 h-4 mr-1" />}
                    {isPlaying ? '暂停' : '播放'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setActivePath(null);
                      setIsPlaying(false);
                      setShowOnlySelectedPath(false);
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            )}
          </ScrollArea>
        </motion.aside>

        {/* 中间 - 图谱画布 */}
        <main className="flex-1 relative">
          {/* 顶部工具栏 */}
          <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Card className="bg-card/80 backdrop-blur">
                <CardContent className="p-2 flex items-center gap-2">
                  <Search className="w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="搜索节点..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-48 h-8 border-0 bg-transparent focus-visible:ring-0"
                  />
                  {searchQuery && (
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setSearchQuery('')}>
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </CardContent>
              </Card>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="secondary" size="icon" className="bg-card/80 backdrop-blur" onClick={resetView}>
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>重置视图</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="secondary" size="icon" className="bg-card/80 backdrop-blur" onClick={exportGraph}>
                    <Download className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>导出图谱</TooltipContent>
              </Tooltip>
            </div>

            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="bg-card/80 backdrop-blur"
                    onClick={() => setIsFullscreen(!isFullscreen)}
                  >
                    {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Expand className="w-4 h-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isFullscreen ? '退出全屏' : '全屏模式'}</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* SVG 画布 */}
          <svg
            ref={svgRef}
            className="w-full h-full bg-gradient-to-br from-background to-muted/30"
          />

          {/* 底部图例 */}
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            className="absolute bottom-4 left-4 z-10"
          >
            <Card className="bg-card/90 backdrop-blur">
              <CardContent className="p-3">
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">立场:</span>
                    {Object.entries(STANCE_COLORS).map(([stance, color]) => (
                      <div key={stance} className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                        <span className="capitalize">{stance === 'supportive' ? '支持' : stance === 'critical' ? '批判' : stance === 'exploratory' ? '探索' : '中立'}</span>
                      </div>
                    ))}
                  </div>
                  <Separator orientation="vertical" className="h-4" />
                  <div className="text-muted-foreground">
                    {filteredData?.nodes.length || 0} 节点 · {filteredData?.edges.length || 0} 连接
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* 节点详情面板 */}
          <AnimatePresence>
            {selectedNode && (
              <motion.div
                initial={{ opacity: 0, x: 300 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 300 }}
                className="absolute top-4 right-4 w-80 z-20"
              >
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base leading-tight mb-1">{selectedNode.title}</CardTitle>
                        <CardDescription className="text-xs">
                          {new Date(selectedNode.createdAt).toLocaleDateString('zh-CN')}
                        </CardDescription>
                      </div>
                      <Button size="icon" variant="ghost" className="h-6 w-6 -mt-1 -mr-2" onClick={() => setSelectedNode(null)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* 质量分数 */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">质量评分</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${(selectedNode.qualityScore || 0) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{Math.round((selectedNode.qualityScore || 0) * 100)}</span>
                      </div>
                    </div>

                    {/* 立场 */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">立场</span>
                      <Badge
                        style={{
                          backgroundColor: selectedNode.stance ? STANCE_COLORS[selectedNode.stance] : undefined,
                        }}
                      >
                        {selectedNode.stance === 'supportive' ? '支持' : selectedNode.stance === 'critical' ? '批判' : selectedNode.stance === 'exploratory' ? '探索' : '中立'}
                      </Badge>
                    </div>

                    {/* 主题 */}
                    <div>
                      <span className="text-sm text-muted-foreground block mb-2">主题</span>
                      <div className="flex flex-wrap gap-1">
                        {selectedNode.topics.map((topic, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {topic.name} ({Math.round(topic.confidence * 100)}%)
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* 标签 */}
                    <div>
                      <span className="text-sm text-muted-foreground block mb-2">标签</span>
                      <div className="flex flex-wrap gap-1">
                        {selectedNode.tags.map((tag, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            <Hash className="w-3 h-3 mr-1" />
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* 实体 */}
                    <div>
                      <span className="text-sm text-muted-foreground block mb-2">提及实体</span>
                      <div className="flex flex-wrap gap-1">
                        {selectedNode.entities.map((entity, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {entity.name}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    {/* 操作按钮 */}
                    <div className="flex gap-2">
                      <Button className="flex-1" size="sm">
                        <BookOpen className="w-4 h-4 mr-1" />
                        阅读
                      </Button>
                      <Button variant="outline" size="icon" className="shrink-0">
                        <Share2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* 右侧边栏 - 过滤和控制 */}
        <motion.aside
          initial={{ x: 300 }}
          animate={{ x: 0 }}
          className="w-72 border-l bg-card/50 backdrop-blur flex flex-col"
        >
          <div className="p-4 border-b">
            <div className="flex items-center gap-2 mb-1">
              <Filter className="w-5 h-5 text-primary" />
              <h2 className="font-semibold">过滤器</h2>
            </div>
            <p className="text-xs text-muted-foreground">自定义视图显示</p>
          </div>

          <ScrollArea className="flex-1 p-4">
            {/* 关系类型过滤 */}
            <div className="mb-6">
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Layers className="w-4 h-4" />
                关系类型
              </h3>
              <div className="space-y-2">
                {Object.entries(RELATION_COLORS).map(([type, color]) => (
                  <label key={type} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedRelationTypes.includes(type as RelationType)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedRelationTypes([...selectedRelationTypes, type as RelationType]);
                        } else {
                          setSelectedRelationTypes(selectedRelationTypes.filter(t => t !== type));
                        }
                      }}
                      className="rounded border-muted"
                    />
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-xs">{type.replace(/_/g, ' ')}</span>
                  </label>
                ))}
              </div>
            </div>

            <Separator className="my-4" />

            {/* 连接强度 */}
            <div className="mb-6">
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                最小连接强度
              </h3>
              <Slider
                value={[minStrength]}
                onValueChange={([value]) => setMinStrength(value)}
                max={100}
                step={10}
                className="mb-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0%</span>
                <span>{minStrength}%</span>
                <span>100%</span>
              </div>
            </div>

            <Separator className="my-4" />

            {/* 显示选项 */}
            <div className="mb-6">
              <h3 className="text-sm font-medium mb-3">显示选项</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">显示标签</span>
                  <Switch checked={showLabels} onCheckedChange={setShowLabels} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">流动粒子</span>
                  <Switch checked={showParticles} onCheckedChange={setShowParticles} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">仅显示路径</span>
                  <Switch checked={showOnlySelectedPath} onCheckedChange={setShowOnlySelectedPath} />
                </div>
              </div>
            </div>

            <Separator className="my-4" />

            {/* 统计信息 */}
            <div>
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Info className="w-4 h-4" />
                统计信息
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">节点总数</span>
                  <span className="font-medium">{data?.nodes.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">连接总数</span>
                  <span className="font-medium">{data?.edges.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">平均连接度</span>
                  <span className="font-medium">
                    {data ? (data.edges.length * 2 / data.nodes.length).toFixed(2) : 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">平均质量分</span>
                  <span className="font-medium">
                    {data
                      ? (data.nodes.reduce((acc, n) => acc + (n.qualityScore || 0), 0) / data.nodes.length * 100).toFixed(1)
                      : 0}%
                  </span>
                </div>
              </div>
            </div>
          </ScrollArea>
        </motion.aside>
      </div>
    </TooltipProvider>
  );
}
