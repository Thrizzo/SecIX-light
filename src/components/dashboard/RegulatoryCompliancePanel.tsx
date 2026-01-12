import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Sparkles, 
  RefreshCw, 
  ChevronDown, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  Clock,
  Shield
} from 'lucide-react';
import { 
  useAllRegulatoryComplianceCache, 
  useRunRegulatoryAnalysis,
  type Regulation,
  type RegulatoryAnalysis,
  type Gap,
  type CoveredArticle
} from '@/hooks/useRegulatoryCompliance';
import { format } from 'date-fns';

const REGULATION_INFO: Record<Regulation, { label: string; description: string }> = {
  NIS2: { label: 'NIS2', description: 'EU Network and Information Security Directive' },
  DORA: { label: 'DORA', description: 'Digital Operational Resilience Act' },
  HIPAA: { label: 'HIPAA', description: 'Health Insurance Portability and Accountability Act' },
  PCI_DSS: { label: 'PCI DSS', description: 'Payment Card Industry Data Security Standard' },
  SOX: { label: 'SOX', description: 'Sarbanes-Oxley Act' },
};

function CriticalityBadge({ criticality }: { criticality: Gap['criticality'] }) {
  const variants: Record<Gap['criticality'], { className: string; icon: React.ReactNode }> = {
    critical: { className: 'bg-destructive text-destructive-foreground', icon: <XCircle className="h-3 w-3" /> },
    high: { className: 'bg-orange-500 text-white', icon: <AlertTriangle className="h-3 w-3" /> },
    medium: { className: 'bg-yellow-500 text-black', icon: <AlertTriangle className="h-3 w-3" /> },
    low: { className: 'bg-muted text-muted-foreground', icon: <Clock className="h-3 w-3" /> },
  };
  const { className, icon } = variants[criticality];
  return (
    <Badge className={`${className} flex items-center gap-1`}>
      {icon}
      {criticality}
    </Badge>
  );
}

function CoverageGauge({ percentage }: { percentage: number }) {
  const getColor = (p: number) => {
    if (p >= 80) return 'text-green-500';
    if (p >= 60) return 'text-yellow-500';
    if (p >= 40) return 'text-orange-500';
    return 'text-destructive';
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`text-4xl font-bold ${getColor(percentage)}`}>
        {percentage}%
      </div>
      <Progress value={percentage} className="w-full h-2" />
      <span className="text-xs text-muted-foreground">Overall Coverage</span>
    </div>
  );
}

function CoveredArticlesList({ articles }: { articles: CoveredArticle[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const fullCoverage = articles.filter(a => a.coverage_level === 'full');
  const partialCoverage = articles.filter(a => a.coverage_level === 'partial');

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-between p-2 h-auto">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="font-medium">Covered Articles ({articles.length})</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-green-500/10 text-green-600">
              {fullCoverage.length} Full
            </Badge>
            <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600">
              {partialCoverage.length} Partial
            </Badge>
            <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ScrollArea className="h-48 mt-2">
          <div className="space-y-2 pr-4">
            {articles.map((article) => (
              <div key={article.article_id} className="p-2 rounded-md border bg-card text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-xs text-muted-foreground">{article.article_id}</span>
                    <p className="font-medium">{article.article_title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{article.evidence}</p>
                  </div>
                  <Badge variant={article.coverage_level === 'full' ? 'default' : 'secondary'} className="shrink-0">
                    {article.coverage_level}
                  </Badge>
                </div>
                {article.mapped_controls.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {article.mapped_controls.map((ctrl) => (
                      <Badge key={ctrl} variant="outline" className="text-xs">
                        {ctrl}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CollapsibleContent>
    </Collapsible>
  );
}

function GapsList({ gaps }: { gaps: Gap[] }) {
  const [isOpen, setIsOpen] = useState(true);
  const criticalCount = gaps.filter(g => g.criticality === 'critical' || g.criticality === 'high').length;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-between p-2 h-auto">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <span className="font-medium">Compliance Gaps ({gaps.length})</span>
          </div>
          <div className="flex items-center gap-2">
            {criticalCount > 0 && (
              <Badge variant="destructive">{criticalCount} Critical/High</Badge>
            )}
            <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ScrollArea className="h-64 mt-2">
          <div className="space-y-3 pr-4">
            {gaps.map((gap) => (
              <div key={gap.article_id} className="p-3 rounded-md border bg-card">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="font-mono text-xs text-muted-foreground">{gap.article_id}</span>
                    <p className="font-medium">{gap.article_title}</p>
                  </div>
                  <CriticalityBadge criticality={gap.criticality} />
                </div>
                <p className="text-sm text-muted-foreground mb-2">{gap.description}</p>
                <div className="bg-muted/50 p-2 rounded text-sm">
                  <p className="font-medium text-xs uppercase tracking-wide mb-1">Recommendation</p>
                  <p className="text-sm">{gap.recommendation}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Estimated effort: {gap.effort_estimate}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CollapsibleContent>
    </Collapsible>
  );
}

function AnalysisSummary({ analysis }: { analysis: RegulatoryAnalysis }) {
  return (
    <div className="space-y-4">
      <CoverageGauge percentage={analysis.overall_coverage} />
      
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="font-medium text-green-600 mb-1">Strengths</p>
          <ul className="space-y-1">
            {analysis.summary.strengths.map((s, i) => (
              <li key={i} className="text-muted-foreground flex items-start gap-1">
                <CheckCircle2 className="h-3 w-3 mt-1 shrink-0 text-green-500" />
                <span className="text-xs">{s}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-medium text-destructive mb-1">Weaknesses</p>
          <ul className="space-y-1">
            {analysis.summary.weaknesses.map((w, i) => (
              <li key={i} className="text-muted-foreground flex items-start gap-1">
                <XCircle className="h-3 w-3 mt-1 shrink-0 text-destructive" />
                <span className="text-xs">{w}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div>
        <p className="font-medium mb-2">Priority Actions</p>
        <ol className="space-y-1">
          {analysis.summary.priority_actions.map((action, i) => (
            <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
              <span className="font-mono text-xs bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center shrink-0">
                {i + 1}
              </span>
              <span>{action}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function RegulationTab({ 
  regulation, 
  cached, 
  onRunAnalysis, 
  isLoading 
}: { 
  regulation: Regulation; 
  cached: { analysis_data: RegulatoryAnalysis; generated_at: string } | null;
  onRunAnalysis: () => void;
  isLoading: boolean;
}) {
  const analysis = cached?.analysis_data;

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>AI is analyzing your compliance with {REGULATION_INFO[regulation].label}...</span>
        </div>
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Shield className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="font-medium mb-2">No Analysis Yet</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Run an AI analysis to check your compliance with {REGULATION_INFO[regulation].label}
        </p>
        <Button onClick={onRunAnalysis} className="gap-2">
          <Sparkles className="h-4 w-4" />
          Run Analysis
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Last analyzed: {format(new Date(cached.generated_at), 'PPp')}
        </p>
        <Button variant="outline" size="sm" onClick={onRunAnalysis} className="gap-2">
          <RefreshCw className="h-3 w-3" />
          Refresh
        </Button>
      </div>

      <AnalysisSummary analysis={analysis} />
      
      <div className="space-y-2">
        <CoveredArticlesList articles={analysis.covered_articles} />
        <GapsList gaps={analysis.gaps} />
      </div>
    </div>
  );
}

export function RegulatoryCompliancePanel() {
  const [selectedRegulation, setSelectedRegulation] = useState<Regulation>('NIS2');
  const { data: allCached, isLoading: isCacheLoading } = useAllRegulatoryComplianceCache();
  const runAnalysis = useRunRegulatoryAnalysis();

  const handleRunAnalysis = (regulation: Regulation, forceRefresh = false) => {
    runAnalysis.mutate({ regulation, forceRefresh });
  };

  const isAnalyzing = runAnalysis.isPending;
  const analyzingRegulation = runAnalysis.variables?.regulation;

  return (
    <Card className="col-span-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle>Regulatory Compliance Check</CardTitle>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleRunAnalysis(selectedRegulation, true)}
            disabled={isAnalyzing}
            className="gap-2"
          >
            {isAnalyzing ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Analyze {REGULATION_INFO[selectedRegulation].label}
          </Button>
        </div>
        <CardDescription>
          AI-powered analysis comparing your SecIX implementation against major regulatory frameworks
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isCacheLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <Tabs value={selectedRegulation} onValueChange={(v) => setSelectedRegulation(v as Regulation)}>
            <TabsList className="grid grid-cols-5 mb-4">
              {(Object.keys(REGULATION_INFO) as Regulation[]).map((reg) => {
                const cached = allCached?.[reg];
                return (
                  <TabsTrigger key={reg} value={reg} className="relative">
                    {REGULATION_INFO[reg].label}
                    {cached && (
                      <span className={`ml-1 text-xs ${
                        cached.coverage_percentage >= 80 ? 'text-green-500' :
                        cached.coverage_percentage >= 60 ? 'text-yellow-500' :
                        'text-destructive'
                      }`}>
                        {cached.coverage_percentage}%
                      </span>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {(Object.keys(REGULATION_INFO) as Regulation[]).map((reg) => (
              <TabsContent key={reg} value={reg}>
                <RegulationTab
                  regulation={reg}
                  cached={allCached?.[reg] || null}
                  onRunAnalysis={() => handleRunAnalysis(reg, true)}
                  isLoading={isAnalyzing && analyzingRegulation === reg}
                />
              </TabsContent>
            ))}
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
