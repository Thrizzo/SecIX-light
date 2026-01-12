import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Bot, Cloud, Server, Check, AlertTriangle, Loader2, ExternalLink, Info } from 'lucide-react';
import { useAISettings, useUpdateAISettings, useTestAIConnection } from '@/hooks/useAISettings';
import { config } from '@/lib/config';

const OPENAI_MODELS = [
  { value: 'gpt-4o', label: 'GPT-4o (Recommended)' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Faster)' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (Budget)' },
];

const OLLAMA_MODELS = [
  { value: 'llama3.2', label: 'Llama 3.2 (Recommended)' },
  { value: 'llama3.1', label: 'Llama 3.1' },
  { value: 'llama3', label: 'Llama 3' },
  { value: 'mistral', label: 'Mistral 7B' },
  { value: 'mixtral', label: 'Mixtral 8x7B' },
  { value: 'codellama', label: 'Code Llama' },
  { value: 'phi3', label: 'Phi-3' },
  { value: 'gemma2', label: 'Gemma 2' },
  { value: 'qwen2.5', label: 'Qwen 2.5' },
  { value: 'deepseek-coder-v2', label: 'DeepSeek Coder v2' },
];

const DEFAULT_OLLAMA_BASE_URL = config.isSelfHosted()
  ? 'http://ollama:11434'
  : 'http://localhost:11434';

const AIProviderSettings: React.FC = () => {
  const { data: savedSettings, isLoading: isLoadingSettings } = useAISettings();
  const updateSettings = useUpdateAISettings();
  const testConnection = useTestAIConnection();

  const [provider, setProvider] = useState<'lovable' | 'openai' | 'ollama'>('lovable');
  const [enabled, setEnabled] = useState(true);
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [openaiModel, setOpenaiModel] = useState('gpt-4o');
  const [openaiBaseUrl, setOpenaiBaseUrl] = useState('https://api.openai.com/v1');
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState(DEFAULT_OLLAMA_BASE_URL);
  const [ollamaModel, setOllamaModel] = useState('llama3.2');
  const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Load saved settings
  useEffect(() => {
    if (savedSettings) {
      setProvider(savedSettings.provider || 'lovable');
      setEnabled(savedSettings.enabled !== false);
      setOpenaiModel(savedSettings.openai_model || 'gpt-4o');
      setOpenaiBaseUrl(savedSettings.openai_base_url || 'https://api.openai.com/v1');
      setOllamaBaseUrl(savedSettings.ollama_base_url || DEFAULT_OLLAMA_BASE_URL);
      setOllamaModel(savedSettings.ollama_model || 'llama3.2');
    }
  }, [savedSettings]);

  const handleSave = async () => {
    await updateSettings.mutateAsync({
      provider,
      enabled,
      openai_api_key: provider === 'openai' ? openaiApiKey : undefined,
      openai_model: openaiModel,
      openai_base_url: openaiBaseUrl,
      ollama_base_url: ollamaBaseUrl,
      ollama_model: ollamaModel,
    });
    // Clear the API key from local state after saving (security)
    setOpenaiApiKey('');
  };

  const handleTestConnection = async () => {
    setTestStatus('idle');
    try {
      await testConnection.mutateAsync({
        provider,
        openai_api_key: openaiApiKey,
        openai_base_url: openaiBaseUrl,
        ollama_base_url: ollamaBaseUrl,
      });
      setTestStatus('success');
    } catch {
      setTestStatus('error');
    }
  };

  if (isLoadingSettings) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading AI settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" />
            AI Provider Configuration
          </CardTitle>
          <CardDescription>
            Configure the AI provider for risk suggestions, policy generation, and other AI-powered features.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Provider Selection */}
          <div className="space-y-3">
            <Label>AI Provider</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Lovable AI */}
              <Card 
                className={`cursor-pointer transition-all ${provider === 'lovable' ? 'border-primary ring-2 ring-primary/20' : 'hover:border-primary/50'}`}
                onClick={() => setProvider('lovable')}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Cloud className="w-5 h-5 text-blue-500" />
                      <span className="font-medium">Lovable AI</span>
                    </div>
                    {provider === 'lovable' && <Check className="w-4 h-4 text-primary" />}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Cloud-hosted AI. No setup required. Uses Gemini & GPT models.
                  </p>
                  <Badge variant="secondary" className="mt-2">Recommended</Badge>
                </CardContent>
              </Card>

              {/* OpenAI */}
              <Card 
                className={`cursor-pointer transition-all ${provider === 'openai' ? 'border-primary ring-2 ring-primary/20' : 'hover:border-primary/50'}`}
                onClick={() => setProvider('openai')}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Bot className="w-5 h-5 text-green-500" />
                      <span className="font-medium">OpenAI</span>
                    </div>
                    {provider === 'openai' && <Check className="w-4 h-4 text-primary" />}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Use OpenAI API or any OpenAI-compatible endpoint.
                  </p>
                  <Badge variant="outline" className="mt-2">Self-Hosted Compatible</Badge>
                </CardContent>
              </Card>

              {/* Ollama */}
              <Card 
                className={`cursor-pointer transition-all ${provider === 'ollama' ? 'border-primary ring-2 ring-primary/20' : 'hover:border-primary/50'}`}
                onClick={() => setProvider('ollama')}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Server className="w-5 h-5 text-orange-500" />
                      <span className="font-medium">Ollama</span>
                    </div>
                    {provider === 'ollama' && <Check className="w-4 h-4 text-primary" />}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Run models locally. Fully air-gapped. No data leaves your network.
                  </p>
                  <Badge variant="outline" className="mt-2">On-Premise</Badge>
                </CardContent>
              </Card>
            </div>
          </div>

          <Separator />

          {/* Provider-specific Configuration */}
          {provider === 'lovable' && (
            <Alert>
              <Cloud className="h-4 w-4" />
              <AlertDescription>
                Lovable AI is pre-configured and ready to use. No additional configuration required.
                AI requests are processed through Lovable's secure gateway.
              </AlertDescription>
            </Alert>
          )}

          {provider === 'openai' && (
            <div className="space-y-4">
              {savedSettings?.has_openai_key && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    An OpenAI API key is already configured. Enter a new key below to replace it.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="openai-key">OpenAI API Key</Label>
                <Input
                  id="openai-key"
                  type="password"
                  placeholder={savedSettings?.has_openai_key ? "••••••••••••••••" : "sk-..."}
                  value={openaiApiKey}
                  onChange={(e) => setOpenaiApiKey(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Get your API key from{' '}
                  <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                    OpenAI Platform <ExternalLink className="w-3 h-3" />
                  </a>
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="openai-model">Model</Label>
                <Select value={openaiModel} onValueChange={setOpenaiModel}>
                  <SelectTrigger id="openai-model">
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    {OPENAI_MODELS.map((model) => (
                      <SelectItem key={model.value} value={model.value}>
                        {model.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="openai-base-url">Base URL (Optional)</Label>
                <Input
                  id="openai-base-url"
                  placeholder="https://api.openai.com/v1"
                  value={openaiBaseUrl}
                  onChange={(e) => setOpenaiBaseUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  For self-hosted or OpenAI-compatible APIs (e.g., Azure OpenAI, LocalAI, vLLM)
                </p>
              </div>
            </div>
          )}

          {provider === 'ollama' && (
            <div className="space-y-4">
              <Alert>
                <Server className="h-4 w-4" />
                <AlertDescription>
                  Ollama runs models locally on your server. 
                  <a href="https://ollama.ai/download" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline ml-1 inline-flex items-center gap-1">
                    Download Ollama <ExternalLink className="w-3 h-3" />
                  </a>
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="ollama-url">Ollama Server URL</Label>
                <Input
                  id="ollama-url"
                  placeholder="http://localhost:11434"
                  value={ollamaBaseUrl}
                  onChange={(e) => setOllamaBaseUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {config.isSelfHosted()
                    ? 'If you started via docker-compose, use: http://ollama:11434 (reachable from the API container).'
                    : 'Default: http://localhost:11434. For remote servers, use the server\'s IP/hostname.'}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ollama-model">Model</Label>
                <Select value={ollamaModel} onValueChange={setOllamaModel}>
                  <SelectTrigger id="ollama-model">
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    {OLLAMA_MODELS.map((model) => (
                      <SelectItem key={model.value} value={model.value}>
                        {model.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Pull models with: <code className="bg-muted px-1 py-0.5 rounded">ollama pull {ollamaModel}</code>
                </p>
              </div>
            </div>
          )}

          <Separator />

          {/* Enable/Disable */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable AI Features</Label>
              <p className="text-sm text-muted-foreground">
                Turn off to disable all AI-powered suggestions and automation
              </p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4">
            <Button onClick={handleSave} disabled={updateSettings.isPending}>
              {updateSettings.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Settings'
              )}
            </Button>
            <Button 
              variant="outline" 
              onClick={handleTestConnection}
              disabled={testConnection.isPending}
            >
              {testConnection.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                'Test Connection'
              )}
            </Button>
            {testStatus === 'success' && (
              <Badge variant="outline" className="text-green-600 border-green-600">
                <Check className="w-3 h-3 mr-1" />
                Connected
              </Badge>
            )}
            {testStatus === 'error' && (
              <Badge variant="outline" className="text-destructive border-destructive">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Failed
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AIProviderSettings;
