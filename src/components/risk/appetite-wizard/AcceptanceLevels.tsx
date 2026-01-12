import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, GripVertical, Layers } from 'lucide-react';
import { WizardFormData, WizardBand, defaultBandColors, defaultActions } from './types';

interface AcceptanceLevelsProps {
  formData: WizardFormData;
  onChange: (data: Partial<WizardFormData>) => void;
  profiles: Array<{ id: string; full_name: string | null; email: string | null }>;
}

const AcceptanceLevels: React.FC<AcceptanceLevelsProps> = ({ formData, onChange, profiles }) => {
  const [newAction, setNewAction] = useState('');

  const maxScore = formData.matrix_size * formData.matrix_size;

  const handleUpdateBand = (index: number, updates: Partial<WizardBand>) => {
    onChange({
      bands: formData.bands.map((b, i) => (i === index ? { ...b, ...updates } : b)),
    });
  };

  const handleAddBand = () => {
    const lastBand = formData.bands[formData.bands.length - 1];
    const newBand: WizardBand = {
      label: `Band ${formData.bands.length + 1}`,
      color: defaultBandColors[formData.bands.length % defaultBandColors.length],
      min_score: lastBand ? lastBand.max_score + 1 : 1,
      max_score: maxScore,
      acceptance_role: '',
      acceptance_owner_id: null,
      authorized_actions: [],
      description: '',
    };
    onChange({ bands: [...formData.bands, newBand] });
  };

  const handleRemoveBand = (index: number) => {
    if (formData.bands.length <= 1) return;
    onChange({ bands: formData.bands.filter((_, i) => i !== index) });
  };

  const handleToggleAction = (bandIndex: number, action: string) => {
    const band = formData.bands[bandIndex];
    const hasAction = band.authorized_actions.includes(action);
    handleUpdateBand(bandIndex, {
      authorized_actions: hasAction
        ? band.authorized_actions.filter(a => a !== action)
        : [...band.authorized_actions, action],
    });
  };

  const handleAddCustomAction = (bandIndex: number) => {
    if (!newAction.trim()) return;
    const band = formData.bands[bandIndex];
    if (!band.authorized_actions.includes(newAction)) {
      handleUpdateBand(bandIndex, {
        authorized_actions: [...band.authorized_actions, newAction],
      });
    }
    setNewAction('');
  };

  const allActions = [...new Set([...defaultActions, ...formData.bands.flatMap(b => b.authorized_actions)])];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-semibold text-foreground mb-2">Risk Bands & Acceptance</h2>
        <p className="text-muted-foreground">
          Define score ranges, who can accept risks at each level, and what actions are allowed.
          <span className="ml-2 text-xs opacity-70">(Max score: {maxScore})</span>
        </p>
      </div>

      <div className="space-y-4">
        {formData.bands.map((band, index) => (
          <Card key={index} className="bg-card border-border overflow-hidden">
            <div
              className="h-1"
              style={{ backgroundColor: band.color }}
            />
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <GripVertical className="w-5 h-5 text-muted-foreground cursor-move" />
                  <div
                    className="w-6 h-6 rounded cursor-pointer"
                    style={{ backgroundColor: band.color }}
                  />
                  <Input
                    value={band.label}
                    onChange={(e) => handleUpdateBand(index, { label: e.target.value })}
                    className="w-40 bg-transparent border-0 text-lg font-semibold p-0 h-auto focus-visible:ring-0"
                    placeholder="Band Label"
                  />
                </div>
                {formData.bands.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveBand(index)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Score Range */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Score Range</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={maxScore}
                      value={band.min_score}
                      onChange={(e) => handleUpdateBand(index, { min_score: parseInt(e.target.value) || 1 })}
                      className="bg-input border-border w-20"
                    />
                    <span className="text-muted-foreground">–</span>
                    <Input
                      type="number"
                      min={band.min_score}
                      max={maxScore}
                      value={band.max_score}
                      onChange={(e) => handleUpdateBand(index, { max_score: parseInt(e.target.value) || maxScore })}
                      className="bg-input border-border w-20"
                    />
                  </div>
                </div>

                {/* Color */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Color</Label>
                  <div className="flex gap-1">
                    {defaultBandColors.map((color) => (
                      <button
                        key={color}
                        className={`w-7 h-7 rounded transition-transform ${
                          band.color === color ? 'ring-2 ring-primary ring-offset-2 ring-offset-card scale-110' : ''
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => handleUpdateBand(index, { color })}
                      />
                    ))}
                  </div>
                </div>

                {/* Acceptance Role */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Acceptance Authority</Label>
                  <Input
                    placeholder="e.g., Department Head"
                    value={band.acceptance_role}
                    onChange={(e) => handleUpdateBand(index, { acceptance_role: e.target.value })}
                    className="bg-input border-border"
                  />
                </div>

                {/* Owner */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Specific Owner (Optional)</Label>
                  <Select
                    value={band.acceptance_owner_id || 'none'}
                    onValueChange={(v) => handleUpdateBand(index, { acceptance_owner_id: v === 'none' ? null : v })}
                  >
                    <SelectTrigger className="bg-input border-border">
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Any</SelectItem>
                      {profiles.map((profile) => (
                        <SelectItem key={profile.id} value={profile.id}>
                          {profile.full_name || profile.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Authorized Actions */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Authorized Actions</Label>
                <div className="flex flex-wrap gap-2">
                  {allActions.map((action) => (
                    <Badge
                      key={action}
                      variant={band.authorized_actions.includes(action) ? 'default' : 'outline'}
                      className="cursor-pointer transition-all"
                      onClick={() => handleToggleAction(index, action)}
                    >
                      {action}
                    </Badge>
                  ))}
                  <div className="flex items-center gap-1">
                    <Input
                      placeholder="Custom..."
                      value={newAction}
                      onChange={(e) => setNewAction(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddCustomAction(index)}
                      className="w-28 h-6 text-xs bg-input border-border"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAddCustomAction(index)}
                      className="h-6 px-2"
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Band Description</Label>
                <Textarea
                  placeholder="Describe what this risk band means and how risks at this level should be handled..."
                  value={band.description}
                  onChange={(e) => handleUpdateBand(index, { description: e.target.value })}
                  rows={2}
                  className="bg-input border-border resize-none"
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button variant="outline" onClick={handleAddBand} className="w-full gap-2">
        <Plus className="w-4 h-4" />
        Add Risk Band
      </Button>

      <Card className="bg-muted/30 border-border">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Layers className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <h4 className="font-medium text-foreground">Score Coverage</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Ensure bands cover all scores from 1 to {maxScore} without gaps or overlaps.
                Current coverage: {formData.bands.map(b => `${b.min_score}-${b.max_score}`).join(', ')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AcceptanceLevels;
