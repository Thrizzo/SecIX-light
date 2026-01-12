import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Risk, useRiskCategories, useProfiles, calculateRiskScore, getRiskLevel } from '@/hooks/useRisks';
import { useTreatments } from '@/hooks/useTreatments';
import { RiskScoreBadge, SeverityBadge, LikelihoodBadge, StatusBadge } from './RiskBadges';
import { TreatmentList } from './TreatmentList';
import { Pencil, Calendar, User, Folder, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface RiskDetailSheetProps {
  risk: Risk | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (risk: Risk) => void;
}

export const RiskDetailSheet: React.FC<RiskDetailSheetProps> = ({
  risk,
  open,
  onOpenChange,
  onEdit,
}) => {
  const { data: categories } = useRiskCategories();
  const { data: profiles } = useProfiles();
  const { data: treatments } = useTreatments(risk?.id);

  if (!risk) return null;

  const category = categories?.find((c) => c.id === risk.category_id);
  const owner = profiles?.find((p) => p.user_id === risk.owner_id);

  const inherentScore = calculateRiskScore(risk.inherent_severity, risk.inherent_likelihood);
  const inherentLevel = getRiskLevel(inherentScore);

  // Net risk = after controls, before treatment (NIST SP 800-37)
  const netScore = risk.net_severity && risk.net_likelihood
    ? calculateRiskScore(risk.net_severity, risk.net_likelihood)
    : null;
  const netLevel = netScore ? getRiskLevel(netScore) : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <div className="flex items-start justify-between">
            <div>
              <SheetTitle className="font-display text-xl">{risk.title}</SheetTitle>
              <SheetDescription className="font-mono text-sm">
                {risk.risk_id}
              </SheetDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => onEdit(risk)}>
              <Pencil className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Status */}
          <div className="flex items-center gap-3">
            <StatusBadge status={risk.status} />
            <RiskScoreBadge
              severity={risk.inherent_severity}
              likelihood={risk.inherent_likelihood}
              showLabel
            />
          </div>

          {/* Description */}
          {risk.description && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Description</h4>
              <p className="text-sm">{risk.description}</p>
            </div>
          )}

          <Separator />

          {/* Meta Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Folder className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Category</p>
                <p className="text-sm flex items-center gap-2">
                  {category && (
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                  )}
                  {category?.name || '-'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Owner</p>
                <p className="text-sm">{owner?.full_name || owner?.email || '-'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Review Date</p>
                <p className="text-sm">
                  {risk.review_date ? format(new Date(risk.review_date), 'MMM d, yyyy') : '-'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Created</p>
                <p className="text-sm">{format(new Date(risk.created_at), 'MMM d, yyyy')}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Risk Scores */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Risk Assessment</h4>
            
            <div className="p-4 bg-muted/50 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Inherent Risk</span>
                <div className="flex items-center gap-2">
                  <span className={`font-mono font-bold text-severity-${inherentLevel}`}>
                    {inherentScore}
                  </span>
                  <span className={`text-xs capitalize text-severity-${inherentLevel}`}>
                    {inherentLevel}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <SeverityBadge severity={risk.inherent_severity} />
                <LikelihoodBadge likelihood={risk.inherent_likelihood} />
              </div>
            </div>

            {risk.net_severity && risk.net_likelihood && netScore && netLevel && (
              <div className="p-4 bg-accent/10 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm text-muted-foreground">Net Risk</span>
                    <p className="text-xs text-muted-foreground/70">After controls, before treatment</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-mono font-bold text-severity-${netLevel}`}>
                      {netScore}
                    </span>
                    <span className={`text-xs capitalize text-severity-${netLevel}`}>
                      {netLevel}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <SeverityBadge severity={risk.net_severity} />
                  <LikelihoodBadge likelihood={risk.net_likelihood} />
                </div>
              </div>
            )}
          </div>

          {/* Treatment Plan */}
          {risk.treatment_plan && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Treatment Plan</h4>
                <p className="text-sm">{risk.treatment_plan}</p>
              </div>
            </>
          )}

          {/* Treatments */}
          <Separator />
          <TreatmentList riskId={risk.id} treatments={treatments || []} />
        </div>
      </SheetContent>
    </Sheet>
  );
};
