import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download, Loader2 } from 'lucide-react';

export interface ExportSection {
  id: string;
  label: string;
  enabled: boolean;
}

interface ExportWizardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sections: ExportSection[];
  onExport: (selectedSections: string[]) => Promise<void>;
}

export function ExportWizardDialog({ 
  open, 
  onOpenChange, 
  sections,
  onExport 
}: ExportWizardDialogProps) {
  const [selectedSections, setSelectedSections] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);

  // Initialize with enabled sections
  useEffect(() => {
    const enabledIds = sections.filter(s => s.enabled).map(s => s.id);
    setSelectedSections(new Set(enabledIds));
  }, [sections, open]);

  const toggleSection = (id: string) => {
    const newSet = new Set(selectedSections);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedSections(newSet);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await onExport(Array.from(selectedSections));
      onOpenChange(false);
    } finally {
      setIsExporting(false);
    }
  };

  const selectAll = () => {
    setSelectedSections(new Set(sections.map(s => s.id)));
  };

  const selectNone = () => {
    setSelectedSections(new Set());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Dashboard to PDF
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <p className="text-sm text-muted-foreground mb-4">
            Select which sections to include in the export:
          </p>
          
          <div className="flex items-center gap-2 mb-3">
            <Button variant="outline" size="sm" onClick={selectAll}>
              Select All
            </Button>
            <Button variant="outline" size="sm" onClick={selectNone}>
              Clear All
            </Button>
          </div>

          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-3">
              {sections.map((section) => (
                <div
                  key={section.id}
                  className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors ${
                    selectedSections.has(section.id) 
                      ? 'bg-primary/5 border-primary/20' 
                      : 'bg-muted/30 border-transparent'
                  }`}
                >
                  <Checkbox
                    id={section.id}
                    checked={selectedSections.has(section.id)}
                    onCheckedChange={() => toggleSection(section.id)}
                  />
                  <Label 
                    htmlFor={section.id} 
                    className="flex-1 cursor-pointer text-sm font-medium"
                  >
                    {section.label}
                  </Label>
                  {section.enabled && (
                    <span className="text-xs text-muted-foreground">Currently visible</span>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleExport} 
            disabled={selectedSections.size === 0 || isExporting}
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Export ({selectedSections.size} sections)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
