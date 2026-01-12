import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/database/client';
import { useToast } from '@/hooks/use-toast';
import { config as appConfig } from '@/lib/config';
import { useAuth } from '@/contexts/AuthContext';

export interface AIProviderConfig {
  provider: 'lovable' | 'openai' | 'ollama';
  enabled: boolean;
  openai_model?: string;
  openai_base_url?: string;
  ollama_base_url?: string;
  ollama_model?: string;
  has_openai_key?: boolean;
}

export function useAISettings() {
  const { session: ctxSession } = useAuth();

  return useQuery({
    queryKey: ['ai-settings'],
    queryFn: async () => {
      let accessToken = (ctxSession as any)?.access_token as string | undefined;

      if (!accessToken) {
        const { data: { session } } = await supabase.auth.getSession();
        accessToken = (session as any)?.access_token as string | undefined;
      }

      if (!accessToken) {
        throw new Error('Not authenticated');
      }

      const baseUrl = appConfig.isSaas()
        ? import.meta.env.VITE_SUPABASE_URL
        : appConfig.apiBaseUrl;

      const response = await fetch(
        `${baseUrl}/functions/v1/ai-settings`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch AI settings');
      }

      return response.json() as Promise<AIProviderConfig>;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export interface UpdateAISettingsParams {
  provider: 'lovable' | 'openai' | 'ollama';
  openai_api_key?: string;
  openai_model?: string;
  openai_base_url?: string;
  ollama_base_url?: string;
  ollama_model?: string;
  enabled: boolean;
}

export function useUpdateAISettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { session: ctxSession } = useAuth();

  return useMutation({
    mutationFn: async (params: UpdateAISettingsParams) => {
      let accessToken = (ctxSession as any)?.access_token as string | undefined;

      if (!accessToken) {
        const { data: { session } } = await supabase.auth.getSession();
        accessToken = (session as any)?.access_token as string | undefined;
      }

      if (!accessToken) {
        throw new Error('Not authenticated');
      }

      const baseUrl = appConfig.isSaas()
        ? import.meta.env.VITE_SUPABASE_URL
        : appConfig.apiBaseUrl;

      console.log('[useAISettings] Sending POST to:', `${baseUrl}/functions/v1/ai-settings`);
      console.log('[useAISettings] Payload:', JSON.stringify(params));

      const response = await fetch(
        `${baseUrl}/functions/v1/ai-settings`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
          },
          body: JSON.stringify(params),
        }
      );

      const responseData = await response.json();
      console.log('[useAISettings] Response:', response.status, JSON.stringify(responseData));

      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to save AI settings');
      }

      return responseData;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ai-settings'] });
      toast({
        title: 'Settings saved',
        description: data.message || 'AI provider settings have been updated.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to save settings',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useTestAIConnection() {
  const { toast } = useToast();
  const { session: ctxSession } = useAuth();

  return useMutation({
    mutationFn: async (config: { provider: string; openai_api_key?: string; openai_base_url?: string; ollama_base_url?: string }) => {
      if (config.provider === 'lovable') {
        // For Lovable, just return success (it's pre-configured)
        await new Promise(resolve => setTimeout(resolve, 500));
        return { success: true, message: 'Lovable AI is active' };
      }

      if (config.provider === 'openai') {
        if (!config.openai_api_key) {
          throw new Error('OpenAI API key is required');
        }
        const response = await fetch(`${config.openai_base_url || 'https://api.openai.com/v1'}/models`, {
          headers: {
            'Authorization': `Bearer ${config.openai_api_key}`,
          },
        });
        if (!response.ok) throw new Error('OpenAI connection failed');
        return { success: true, message: 'OpenAI connection successful' };
      }

      if (config.provider === 'ollama') {
        // In self-hosted mode, test from the backend (browser may not be on the same host as Ollama)
        if (appConfig.isSelfHosted()) {
          let accessToken = (ctxSession as any)?.access_token as string | undefined;

          if (!accessToken) {
            const { data: { session } } = await supabase.auth.getSession();
            accessToken = (session as any)?.access_token as string | undefined;
          }

          if (!accessToken) throw new Error('Not authenticated');

          const baseUrl = appConfig.isSaas()
            ? import.meta.env.VITE_SUPABASE_URL
            : appConfig.apiBaseUrl;

          const response = await fetch(
            `${baseUrl}/functions/v1/ai-settings`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                action: 'test',
                provider: 'ollama',
                ollama_base_url: config.ollama_base_url || 'http://ollama:11434',
              }),
            }
          );

          const data = await response.json().catch(() => null);
          if (!response.ok) {
            const message = (data && (data.error || data.message)) || 'Ollama connection failed';
            throw new Error(message);
          }
          return data;
        }

        const response = await fetch(`${config.ollama_base_url || 'http://localhost:11434'}/api/tags`);
        if (!response.ok) throw new Error('Ollama connection failed');
        const data = await response.json();
        const models = data.models?.map((m: any) => m.name) || [];
        if (models.length === 0) {
          return { success: true, message: 'Ollama connected but no models found', warning: true };
        }
        return { success: true, message: `Ollama connected. Found ${models.length} model(s)` };
      }

      throw new Error('Unknown provider');
    },
    onSuccess: (data) => {
      if (data.warning) {
        toast({
          title: 'Connection Warning',
          description: data.message + '. Run: ollama pull llama3.2',
          variant: 'default',
        });
      } else {
        toast({
          title: 'Connection Successful',
          description: data.message,
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Connection Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
