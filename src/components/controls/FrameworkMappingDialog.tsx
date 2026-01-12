import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Search, Check } from 'lucide-react';
import { useControlFrameworks, useFrameworkControls } from '@/hooks/useControlFrameworks';
import { useCreateFrameworkMapping, MAPPING_TYPES } from '@/hooks/useControlMappings';

interface FrameworkMappingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  internalControlId: string;
}

export function FrameworkMappingDialog({ open, onOpenChange, internalControlId }: FrameworkMappingDialogProps) {
  const [selectedFramework, setSelectedFramework] = useState<string>('');
  const [selectedControl, setSelectedControl] = useState<string>('');
  const [mappingType, setMappingType] = useState<string>('Exact');
  const [notes, setNotes] = useState('');
  const [search, setSearch] = useState('');

  const { data: frameworks = [] } = useControlFrameworks();
  const { data: frameworkControls = [] } = useFrameworkControls(selectedFramework);
  const createMapping = useCreateFrameworkMapping();

  const filteredControls = frameworkControls.filter(ctrl =>
    !search ||
    ctrl.title.toLowerCase().includes(search.toLowerCase()) ||
    ctrl.control_code?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async () => {
    if (!selectedControl) return;

    await createMapping.mutateAsync({
      internal_control_id: internalControlId,
      framework_control_id: selectedControl,
      mapping_type: mappingType,
      notes: notes || undefined,
    });

    // Reset and close
    setSelectedFramework('');
    setSelectedControl('');
    setMappingType('Exact');
    setNotes('');
    setSearch('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Map to Framework Control</DialogTitle>
          <DialogDescription>
            Link this internal control to an external framework control for compliance tracking
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Framework Selection */}
          <div className="grid gap-2">
            <Label>Select Framework</Label>
            <Select value={selectedFramework} onValueChange={(v) => {
              setSelectedFramework(v);
              setSelectedControl('');
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a framework..." />
              </SelectTrigger>
              <SelectContent>
                {frameworks.map(fw => (
                  <SelectItem key={fw.id} value={fw.id}>
                    {fw.name} {fw.version && `(${fw.version})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Control Selection */}
          {selectedFramework && (
            <div className="grid gap-2">
              <Label>Select Control</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search controls..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <ScrollArea className="h-48 border rounded-md">
                <div className="p-2 space-y-1">
                  {filteredControls.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No controls found
                    </p>
                  ) : (
                    filteredControls.map(ctrl => (
                      <button
                        key={ctrl.id}
                        type="button"
                        onClick={() => setSelectedControl(ctrl.id)}
                        className={`w-full text-left p-2 rounded-md text-sm transition-colors ${
                          selectedControl === ctrl.id
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-muted'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={`font-mono text-xs ${
                              selectedControl === ctrl.id ? 'border-primary-foreground/50' : ''
                            }`}>
                              {ctrl.control_code || '-'}
                            </Badge>
                            <span className="truncate">{ctrl.title}</span>
                          </div>
                          {selectedControl === ctrl.id && (
                            <Check className="h-4 w-4 flex-shrink-0" />
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Mapping Type */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Mapping Type</Label>
              <Select value={mappingType} onValueChange={setMappingType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MAPPING_TYPES.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div className="grid gap-2">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add any notes about this mapping..."
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!selectedControl || createMapping.isPending}
            >
              {createMapping.isPending ? 'Adding...' : 'Add Mapping'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
