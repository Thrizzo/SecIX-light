import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Folder, Plus, Trash2, Palette } from 'lucide-react';
import { WizardFormData, WizardRiskCategory } from './types';

interface RiskCategoriesProps {
  formData: WizardFormData;
  onChange: (data: Partial<WizardFormData>) => void;
  existingCategories: Array<{ id: string; name: string; description: string | null; color: string | null }>;
}

const defaultColors = [
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  '#f43f5e', '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4',
];

const RiskCategories: React.FC<RiskCategoriesProps> = ({ formData, onChange, existingCategories }) => {
  const [newCategory, setNewCategory] = useState({ name: '', description: '', color: '#6366f1' });

  const handleToggleCategory = (categoryId: string, enabled: boolean) => {
    const existing = formData.risk_categories.find(c => c.id === categoryId);
    if (existing) {
      onChange({
        risk_categories: formData.risk_categories.map(c =>
          c.id === categoryId ? { ...c, is_enabled: enabled } : c
        ),
      });
    } else {
      const dbCategory = existingCategories.find(c => c.id === categoryId);
      if (dbCategory) {
        onChange({
          risk_categories: [
            ...formData.risk_categories,
            {
              id: categoryId,
              name: dbCategory.name,
              description: dbCategory.description,
              color: dbCategory.color || '#6366f1',
              is_enabled: enabled,
              worst_case_description: null,
              thresholds_config: {},
            },
          ],
        });
      }
    }
  };

  const handleUpdateCategory = (categoryId: string, updates: Partial<WizardRiskCategory>) => {
    onChange({
      risk_categories: formData.risk_categories.map(c =>
        c.id === categoryId ? { ...c, ...updates } : c
      ),
    });
  };

  const handleAddCategory = () => {
    if (!newCategory.name.trim()) return;
    
    const newCat: WizardRiskCategory = {
      id: `new-${Date.now()}`,
      name: newCategory.name,
      description: newCategory.description || null,
      color: newCategory.color,
      is_enabled: true,
      worst_case_description: null,
      thresholds_config: {},
    };
    
    onChange({
      risk_categories: [...formData.risk_categories, newCat],
    });
    setNewCategory({ name: '', description: '', color: '#6366f1' });
  };

  const handleRemoveCategory = (categoryId: string) => {
    onChange({
      risk_categories: formData.risk_categories.filter(c => c.id !== categoryId),
    });
  };

  const isCategoryEnabled = (categoryId: string) => {
    return formData.risk_categories.find(c => c.id === categoryId)?.is_enabled || false;
  };

  const getCategoryData = (categoryId: string) => {
    return formData.risk_categories.find(c => c.id === categoryId);
  };

  const enabledCount = formData.risk_categories.filter(c => c.is_enabled).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-semibold text-foreground mb-2">Risk Categories</h2>
        <p className="text-muted-foreground">
          Select which risk categories to include in this appetite statement.
          <span className="ml-2 text-primary font-medium">{enabledCount} selected</span>
        </p>
      </div>

      {/* Existing Categories */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Folder className="w-5 h-5 text-primary" />
            Available Categories
          </CardTitle>
          <CardDescription>Toggle categories to include them in your appetite</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {existingCategories.map((category) => {
            const catData = getCategoryData(category.id);
            const isEnabled = isCategoryEnabled(category.id);
            
            return (
              <div
                key={category.id}
                className={`p-4 rounded-lg border transition-all ${
                  isEnabled 
                    ? 'border-primary/50 bg-primary/5' 
                    : 'border-border bg-muted/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: catData?.color || category.color || '#6366f1' }}
                    />
                    <div>
                      <span className="font-medium text-foreground">{category.name}</span>
                      {category.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{category.description}</p>
                      )}
                    </div>
                  </div>
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={(checked) => handleToggleCategory(category.id, checked)}
                  />
                </div>

                {isEnabled && catData && (
                  <div className="mt-4 pt-4 border-t border-border space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Display Name</Label>
                        <Input
                          value={catData.name}
                          onChange={(e) => handleUpdateCategory(category.id, { name: e.target.value })}
                          className="bg-input border-border h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Color</Label>
                        <div className="flex gap-1">
                          {defaultColors.slice(0, 8).map((color) => (
                            <button
                              key={color}
                              className={`w-6 h-6 rounded transition-transform ${
                                catData.color === color ? 'ring-2 ring-primary ring-offset-2 ring-offset-card scale-110' : ''
                              }`}
                              style={{ backgroundColor: color }}
                              onClick={() => handleUpdateCategory(category.id, { color })}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {existingCategories.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              No categories found. Add custom categories below.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Custom Categories */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Plus className="w-5 h-5 text-primary" />
            Custom Categories
          </CardTitle>
          <CardDescription>Add categories specific to this appetite</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Custom categories list */}
          {formData.risk_categories.filter(c => c.id.startsWith('new-')).map((category) => (
            <div
              key={category.id}
              className="p-4 rounded-lg border border-border bg-muted/20 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                <div>
                  <span className="font-medium text-foreground">{category.name}</span>
                  {category.description && (
                    <p className="text-xs text-muted-foreground">{category.description}</p>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveCategory(category.id)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}

          {/* Add new category form */}
          <div className="p-4 rounded-lg border border-dashed border-border bg-muted/10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Name</Label>
                <Input
                  placeholder="e.g., ESG Risk"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                  className="bg-input border-border h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Description</Label>
                <Input
                  placeholder="Optional description"
                  value={newCategory.description}
                  onChange={(e) => setNewCategory(prev => ({ ...prev, description: e.target.value }))}
                  className="bg-input border-border h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Color</Label>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1 flex-1">
                    {defaultColors.slice(0, 5).map((color) => (
                      <button
                        key={color}
                        className={`w-6 h-6 rounded ${
                          newCategory.color === color ? 'ring-2 ring-primary ring-offset-1 ring-offset-card' : ''
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => setNewCategory(prev => ({ ...prev, color }))}
                      />
                    ))}
                  </div>
                  <Button
                    size="sm"
                    onClick={handleAddCategory}
                    disabled={!newCategory.name.trim()}
                    className="gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RiskCategories;
