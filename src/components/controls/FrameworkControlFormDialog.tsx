import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Save, X } from 'lucide-react';
import { SECURITY_FUNCTIONS, useFrameworkControl, useUpdateFrameworkControl } from '@/hooks/useControlFrameworks';

type FrameworkControlFormValues = {
  control_code: string;
  title: string;
  description: string;
  domain: string;
  subcategory: string;
  control_type: string;
  security_function: string;
  guidance: string;
  implementation_guidance: string;
  reference_links: string;
};

interface FrameworkControlFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  controlId?: string | null;
}

export function FrameworkControlFormDialog({ open, onOpenChange, controlId }: FrameworkControlFormDialogProps) {
  const { data: control } = useFrameworkControl(controlId || undefined);
  const updateControl = useUpdateFrameworkControl();

  const form = useForm<FrameworkControlFormValues>({
    defaultValues: {
      control_code: '',
      title: '',
      description: '',
      domain: '',
      subcategory: '',
      control_type: '',
      security_function: '',
      guidance: '',
      implementation_guidance: '',
      reference_links: '',
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      control_code: control?.control_code || '',
      title: control?.title || '',
      description: control?.description || '',
      domain: control?.domain || '',
      subcategory: control?.subcategory || '',
      control_type: control?.control_type || '',
      security_function: control?.security_function || '',
      guidance: control?.guidance || '',
      implementation_guidance: control?.implementation_guidance || '',
      reference_links: control?.reference_links || '',
    });
  }, [open, control, form]);

  const onSubmit = async (values: FrameworkControlFormValues) => {
    if (!controlId) return;
    await updateControl.mutateAsync({ id: controlId, ...values });
    onOpenChange(false);
  };

  const title = control?.title ? `Edit: ${control.title}` : 'Edit Framework Control';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl">{title}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 overflow-hidden flex flex-col">
            <Tabs defaultValue="details" className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="w-full justify-start mb-4">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="description">Description</TabsTrigger>
                <TabsTrigger value="guidance">Guidance</TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1 pr-4">
                <TabsContent value="details" className="space-y-6 mt-0">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="control_code"
                      rules={{ required: 'Control code is required' }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Control Code *</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., APP-01" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="security_function"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Security Function (NIST CSF)</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ''}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select function" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-popover">
                              <SelectItem value="">None</SelectItem>
                              {SECURITY_FUNCTIONS.map((fn) => (
                                <SelectItem key={fn} value={fn}>{fn}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="title"
                    rules={{ required: 'Title is required' }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title *</FormLabel>
                        <FormControl>
                          <Input placeholder="Control title" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="domain"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Domain</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Application Security" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="subcategory"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subcategory</FormLabel>
                          <FormControl>
                            <Input placeholder="Optional" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="control_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Control Type</FormLabel>
                        <FormControl>
                          <Input placeholder="Preventive / Detective / ..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                <TabsContent value="description" className="space-y-4 mt-0">
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea rows={8} placeholder="Describe the control..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                <TabsContent value="guidance" className="space-y-4 mt-0">
                  <FormField
                    control={form.control}
                    name="guidance"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Guidance</FormLabel>
                        <FormControl>
                          <Textarea rows={6} placeholder="Optional" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="implementation_guidance"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Implementation Guidance</FormLabel>
                        <FormControl>
                          <Textarea rows={6} placeholder="Optional" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Separator />

                  <FormField
                    control={form.control}
                    name="reference_links"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reference Links</FormLabel>
                        <FormControl>
                          <Input placeholder="https://..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
              </ScrollArea>

              <div className="pt-4 flex items-center justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button type="submit" disabled={updateControl.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
              </div>
            </Tabs>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
