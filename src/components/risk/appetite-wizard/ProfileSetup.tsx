import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, User, Grid3X3 } from 'lucide-react';
import { WizardFormData } from './types';

interface ProfileSetupProps {
  formData: WizardFormData;
  onChange: (data: Partial<WizardFormData>) => void;
  profiles: Array<{ id: string; full_name: string | null; email: string | null }>;
  matrices: Array<{ id: string; name: string; size: number; is_active: boolean }>;
}

const ProfileSetup: React.FC<ProfileSetupProps> = ({ formData, onChange, profiles, matrices }) => {
  // Filter to only show 3x3 and 5x5 matrices
  const availableMatrices = matrices.filter(m => m.size === 3 || m.size === 5);
  
  const handleMatrixSizeChange = (size: string) => {
    const targetSize = parseInt(size);
    const matchingMatrix = matrices.find(m => m.size === targetSize);
    if (matchingMatrix) {
      onChange({
        matrix_id: matchingMatrix.id,
        matrix_size: matchingMatrix.size,
      });
    }
  };

  // Get current size from selected matrix
  const currentSize = formData.matrix_size || 
    (formData.matrix_id ? matrices.find(m => m.id === formData.matrix_id)?.size : undefined);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-semibold text-foreground mb-2">Setup Risk Appetite</h2>
        <p className="text-muted-foreground">
          Define the basic parameters for your risk appetite statement.
        </p>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings className="w-5 h-5 text-primary" />
            Basic Information
          </CardTitle>
          <CardDescription>Name and ownership details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Appetite Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Enterprise Risk Appetite 2024"
              value={formData.name}
              onChange={(e) => onChange({ name: e.target.value })}
              className="bg-input border-border"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="owner">Owner *</Label>
            <Select value={formData.owner_id} onValueChange={(v) => onChange({ owner_id: v })}>
              <SelectTrigger className="bg-input border-border">
                <SelectValue placeholder="Select an owner" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                {profiles.map((profile) => (
                  <SelectItem key={profile.id} value={profile.id}>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      {profile.full_name || profile.email}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-4">
            <div>
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">Version</Label>
              <Badge variant="outline" className="ml-2">{formData.version}</Badge>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">Status</Label>
              <Badge 
                variant={formData.status === 'Approved' ? 'default' : 'secondary'} 
                className="ml-2"
              >
                {formData.status}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Grid3X3 className="w-5 h-5 text-primary" />
            Risk Matrix
          </CardTitle>
          <CardDescription>Select the scoring matrix size</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="matrix">Matrix Size *</Label>
            <Select 
              value={currentSize?.toString() || ''} 
              onValueChange={handleMatrixSizeChange}
            >
              <SelectTrigger className="bg-input border-border">
                <SelectValue placeholder="Select matrix size" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="3">
                  <div className="flex items-center gap-2">
                    <Grid3X3 className="w-4 h-4 text-muted-foreground" />
                    3×3 Matrix (Simplified)
                  </div>
                </SelectItem>
                <SelectItem value="5">
                  <div className="flex items-center gap-2">
                    <Grid3X3 className="w-4 h-4 text-muted-foreground" />
                    5×5 Matrix (Standard)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Choose between a simplified 3×3 or standard 5×5 risk matrix.
            </p>
          </div>

          {currentSize && (
            <div className="p-4 rounded-lg bg-muted/30 border border-border">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Matrix Size</span>
                <span className="font-mono text-foreground">{currentSize}×{currentSize}</span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm text-muted-foreground">Max Score</span>
                <span className="font-mono text-foreground">{currentSize * currentSize}</span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm text-muted-foreground">Likelihood Levels</span>
                <span className="font-mono text-foreground">{currentSize}</span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm text-muted-foreground">Impact Levels</span>
                <span className="font-mono text-foreground">{currentSize}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfileSetup;
