'use client';

import React from 'react';
import Link from 'next/link';
import { KnowledgeGraph } from '@/components/knowledge-graph';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brain, Network, Lightbulb, Compass } from 'lucide-react';

export default function KnowledgeGraphPage() {
  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="knowledge-graph-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="w-8 h-8 text-primary" />
            Knowledge Graph
          </h1>
          <p className="text-muted-foreground mt-1">
            Visualize connections between your content and understand information context
          </p>
        </div>
        <Link href="/knowledge-graph/explore">
          <Button className="flex items-center gap-2">
            <Compass className="w-4 h-4" />
            互动探索
          </Button>
        </Link>
      </div>

      <Tabs defaultValue="graph" className="space-y-4">
        <TabsList>
          <TabsTrigger value="graph" className="flex items-center gap-2">
            <Network className="w-4 h-4" />
            Graph View
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            Insights
          </TabsTrigger>
        </TabsList>

        <TabsContent value="graph" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Content Network</CardTitle>
              <CardDescription>
                Explore relationships between your collected content. 
                Drag nodes to rearrange, click to see details.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <KnowledgeGraph width={1200} height={700} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">How It Works</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>
                  The knowledge graph analyzes your content to find:
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Similar topics and themes</li>
                  <li>Contradictory viewpoints</li>
                  <li>Supporting evidence</li>
                  <li>Shared entities (people, organizations)</li>
                  <li>Temporal connections</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Information Position</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="text-muted-foreground">
                  Each article is analyzed to determine:
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li><strong>Domain:</strong> Tech, Politics, Science, etc.</li>
                  <li><strong>Depth:</strong> Surface, Intermediate, or Deep</li>
                  <li><strong>Audience:</strong> General, Professional, Academic</li>
                  <li><strong>Role:</strong> Source, Synthesis, Commentary</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Visual Guide</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span>Supportive stance</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span>Critical stance</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <span>Exploratory stance</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full border-2 border-amber-500" />
                    <span>Selected node</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground pt-2 border-t">
                  Node size represents content quality. Line thickness shows connection strength.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
