'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { useKnowledgeGraph } from '@/hooks/useKnowledgeGraph';
import { ContentPositionCard } from './ContentPositionCard';
import { RelatedContentList } from './RelatedContentList';
import { Button } from '@/components/ui/button';
import { Loader2, Maximize2, Minimize2, RefreshCw } from 'lucide-react';

interface Node {
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
  fx?: number | null;
  fy?: number | null;
  size?: number;
}

interface Edge {
  id: string;
  source: string;
  target: string;
  type: string;
  strength: number;
  isDirectional: boolean;
  width?: number;
}

interface KnowledgeGraphData {
  nodes: Node[];
  edges: Edge[];
}

interface KnowledgeGraphProps {
  centerContentId?: string;
  width?: number;
  height?: number;
  className?: string;
}

const relationColors: Record<string, string> = {
  SIMILAR_TOPIC: '#3b82f6',      // 蓝色
  CONTRADICTORY: '#ef4444',       // 红色
  SUPPORTIVE: '#22c55e',          // 绿色
  REFERENCED: '#f59e0b',          // 橙色
  SEQUEL: '#8b5cf6',              // 紫色
  SAME_AUTHOR: '#06b6d4',         // 青色
  SHARED_ENTITY: '#ec4899',       // 粉色
  TEMPORAL_CHAIN: '#6366f1',      // 靛蓝
  CAUSAL: '#84cc16',              //  lime
  BROADER_CONTEXT: '#14b8a6',     //  teal
  NARROWER_FOCUS: '#f97316',      //  orange
};

const stanceColors: Record<string, string> = {
  supportive: '#22c55e',
  critical: '#ef4444',
  neutral: '#6b7280',
  exploratory: '#3b82f6',
};

export function KnowledgeGraph({
  centerContentId,
  width = 800,
  height = 600,
  className = '',
}: KnowledgeGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [simulation, setSimulation] = useState<d3.Simulation<Node, Edge> | null>(null);
  
  const { data, loading, error, refetch } = useKnowledgeGraph(centerContentId);

  // 初始化 D3 力导向图
  const initGraph = useCallback((graphData: KnowledgeGraphData) => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // 清除之前的渲染

    const currentWidth = isFullscreen ? window.innerWidth - 40 : width;
    const currentHeight = isFullscreen ? window.innerHeight - 100 : height;

    svg.attr('width', currentWidth).attr('height', currentHeight);

    // 创建缩放行为
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // 主容器
    const g = svg.append('g');

    // 箭头标记（用于有方向的边）
    svg.append('defs')
      .selectAll('marker')
      .data(Object.keys(relationColors))
      .enter()
      .append('marker')
      .attr('id', (d) => `arrow-${d}`)
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 25)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', (d) => relationColors[d]);

    // 力导向模拟
    const sim = d3.forceSimulation<Node>(graphData.nodes)
      .force('link', d3.forceLink<Node, Edge>(graphData.edges)
        .id((d) => d.id)
        .distance((d) => 150 - (d.strength * 50))
        .strength((d) => d.strength)
      )
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(currentWidth / 2, currentHeight / 2))
      .force('collision', d3.forceCollide<Node>().radius((d) => (d.size || 20) + 10));

    // 绘制边
    const link = g.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(graphData.edges)
      .enter()
      .append('line')
      .attr('stroke', (d) => relationColors[d.type] || '#999')
      .attr('stroke-width', (d) => (d.width || 2))
      .attr('stroke-opacity', 0.6)
      .attr('marker-end', (d) => d.isDirectional ? `url(#arrow-${d.type})` : null);

    // 边标签
    const linkLabels = g.append('g')
      .attr('class', 'link-labels')
      .selectAll('text')
      .data(graphData.edges)
      .enter()
      .append('text')
      .attr('font-size', '10px')
      .attr('fill', '#666')
      .attr('text-anchor', 'middle')
      .text((d) => d.type.replace(/_/g, ' '));

    // 绘制节点
    const node = g.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(graphData.nodes)
      .enter()
      .append('g')
      .attr('cursor', 'pointer')
      .call(d3.drag<SVGGElement, Node>()
        .on('start', (event, d) => {
          if (!event.active) sim.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) sim.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
      );

    // 节点圆形
    node.append('circle')
      .attr('r', (d) => d.size || 15)
      .attr('fill', (d) => {
        if (d.stance && stanceColors[d.stance]) {
          return stanceColors[d.stance];
        }
        return d.qualityScore ? 
          d3.interpolateViridis(d.qualityScore) : 
          '#3b82f6';
      })
      .attr('stroke', (d) => d.id === centerContentId ? '#f59e0b' : '#fff')
      .attr('stroke-width', (d) => d.id === centerContentId ? 4 : 2)
      .on('click', (event, d) => {
        event.stopPropagation();
        setSelectedNode(d);
      });

    // 节点标签
    node.append('text')
      .attr('dy', (d) => (d.size || 15) + 15)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('fill', 'currentColor')
      .text((d) => d.title.length > 15 ? d.title.slice(0, 15) + '...' : d.title)
      .style('pointer-events', 'none');

    // 主题标签（小圆点）
    node.each(function(d) {
      if (d.topics && d.topics.length > 0) {
        const el = d3.select(this);
        d.topics.slice(0, 3).forEach((topic, i) => {
          el.append('circle')
            .attr('cx', (d.size || 15) + 8)
            .attr('cy', -((d.size || 15) - 5) + (i * 8))
            .attr('r', 3)
            .attr('fill', d3.interpolateTurbo(topic.confidence));
        });
      }
    });

    // 更新位置
    sim.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      linkLabels
        .attr('x', (d: any) => (d.source.x + d.target.x) / 2)
        .attr('y', (d: any) => (d.source.y + d.target.y) / 2);

      node.attr('transform', (d) => `translate(${d.x},${d.y})`);
    });

    setSimulation(sim);

    // 点击空白处取消选择
    svg.on('click', () => setSelectedNode(null));

    return () => {
      sim.stop();
    };
  }, [centerContentId, isFullscreen, width, height]);

  useEffect(() => {
    if (data && !loading) {
      initGraph(data);
    }
  }, [data, loading, initGraph]);

  // 全屏切换
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    // 重新渲染
    setTimeout(() => {
      if (data) initGraph(data);
    }, 100);
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ width, height }}>
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center gap-4 ${className}`} style={{ width, height }}>
        <p className="text-red-500">Failed to load knowledge graph</p>
        <Button onClick={() => { void refetch(); }} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`relative ${className} ${isFullscreen ? 'fixed inset-0 z-50 bg-background p-4' : ''}`}
    >
      {/* 工具栏 */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <Button
          variant="secondary"
          size="icon"
          onClick={() => { void refetch(); }}
          className="bg-background/80 backdrop-blur"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          onClick={toggleFullscreen}
          className="bg-background/80 backdrop-blur"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </Button>
      </div>

      {/* 图例 */}
      <div className="absolute bottom-4 left-4 z-10 bg-background/90 backdrop-blur rounded-lg p-3 text-xs border">
        <h4 className="font-semibold mb-2">Relation Types</h4>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {Object.entries(relationColors).slice(0, 6).map(([type, color]) => (
            <div key={type} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-muted-foreground">{type.replace(/_/g, ' ')}</span>
            </div>
          ))}
        </div>
        <div className="mt-2 pt-2 border-t">
          <h4 className="font-semibold mb-1">Stance</h4>
          <div className="flex gap-3">
            {Object.entries(stanceColors).map(([stance, color]) => (
              <div key={stance} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-muted-foreground capitalize">{stance}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* D3 SVG */}
      <svg
        ref={svgRef}
        className="w-full h-full border rounded-lg bg-background"
        style={{ 
          width: isFullscreen ? '100%' : width, 
          height: isFullscreen ? 'calc(100vh - 120px)' : height 
        }}
      />

      {/* 选中节点详情面板 */}
      {selectedNode && (
        <div className="absolute top-4 left-4 w-80 max-h-[calc(100%-2rem)] overflow-auto">
          <ContentPositionCard contentId={selectedNode.id} />
        </div>
      )}

      {/* 关联文章列表 */}
      {selectedNode && (
        <div className="absolute bottom-4 right-4 w-72 max-h-80 overflow-auto">
          <RelatedContentList contentId={selectedNode.id} />
        </div>
      )}
    </div>
  );
}
