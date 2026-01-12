import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/database/client';
import { useToast } from '@/hooks/use-toast';

export const useDeleteRiskAppetite = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      // First check if the appetite is active
      const { data: appetite, error: fetchError } = await supabase
        .from('risk_appetites')
        .select('is_active')
        .eq('id', id)
        .single();
      
      if (fetchError) throw fetchError;
      
      if ((appetite as { is_active: boolean } | null)?.is_active) {
        throw new Error('Cannot delete active risk appetite. Deactivate it first.');
      }

      // Check if any BIA assessments reference this appetite (future-proofing)
      // For now, we'll just delete the bands and then the appetite
      
      // Delete associated bands first (cascade should handle this, but being explicit)
      const { error: bandsError } = await supabase
        .from('risk_appetite_bands')
        .delete()
        .eq('appetite_id', id);
      
      if (bandsError) throw bandsError;

      // Delete the appetite
      const { error: deleteError } = await supabase
        .from('risk_appetites')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk-appetite'] });
      queryClient.invalidateQueries({ queryKey: ['risk-appetites'] });
      toast({ title: 'Risk appetite deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Failed to delete risk appetite', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });
};

export const useCheckAppetiteReferences = () => {
  return async (appetiteId: string): Promise<{ hasReferences: boolean; message?: string }> => {
    // Check if any BIA or other records reference this appetite
    // For now, we just return false since BIA tables aren't implemented yet
    return { hasReferences: false };
  };
};
