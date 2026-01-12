import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, AlertTriangle, FileText, Building2, Shield } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface OverdueItem {
  id: string;
  name?: string;
  title?: string;
  next_review_date?: string;
  review_by_date?: string;
  next_assessment_date?: string;
}

interface OverdueItemsListProps {
  title: string;
  icon: 'control' | 'policy' | 'vendor';
  items: OverdueItem[];
  emptyMessage?: string;
}

export const OverdueItemsList: React.FC<OverdueItemsListProps> = ({
  title,
  icon,
  items,
  emptyMessage = 'No overdue items',
}) => {
  const getIcon = () => {
    switch (icon) {
      case 'control':
        return <Shield className="w-5 h-5 text-primary" />;
      case 'policy':
        return <FileText className="w-5 h-5 text-primary" />;
      case 'vendor':
        return <Building2 className="w-5 h-5 text-primary" />;
    }
  };

  const getOverdueDays = (item: OverdueItem) => {
    const dateStr = item.next_review_date || item.review_by_date || item.next_assessment_date;
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return formatDistanceToNow(date, { addSuffix: true });
  };

  const getSeverityBadge = (item: OverdueItem) => {
    const dateStr = item.next_review_date || item.review_by_date || item.next_assessment_date;
    if (!dateStr) return 'secondary';
    const date = new Date(dateStr);
    const now = new Date();
    const daysOverdue = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysOverdue > 30) return 'destructive';
    if (daysOverdue > 14) return 'default';
    return 'secondary';
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            {getIcon()}
            {title}
          </span>
          {items.length > 0 && (
            <Badge variant="destructive" className="text-xs">
              {items.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-muted-foreground text-center py-4 text-sm">
            {emptyMessage}
          </p>
        ) : (
          <ScrollArea className="h-[200px]">
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    <span className="text-sm font-medium truncate">
                      {item.name || item.title}
                    </span>
                  </div>
                  <Badge variant={getSeverityBadge(item)} className="text-xs flex-shrink-0 ml-2">
                    <Clock className="w-3 h-3 mr-1" />
                    {getOverdueDays(item)}
                  </Badge>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
