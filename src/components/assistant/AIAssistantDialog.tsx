import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, User, Loader2 } from 'lucide-react';
import fragobertAvatar from '@/assets/fragobert-avatar.gif';
import { invokeBackendFunction } from '@/lib/backend-functions';
import { useLocation } from 'react-router-dom';
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}
interface AIAssistantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
const SUGGESTED_QUESTIONS = ['How do I create my first risk assessment?', 'What is the difference between primary and secondary assets?', 'How do I map controls to frameworks?', 'What is a Business Impact Assessment?'];
const AIAssistantDialog: React.FC<AIAssistantDialogProps> = ({
  open,
  onOpenChange
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const location = useLocation();
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);
  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: content.trim()
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    try {
      const data = await invokeBackendFunction<{
        response: string;
      }>('journey-assistant', {
        messages: [...messages, userMessage].map(m => ({
          role: m.role,
          content: m.content
        })),
        currentRoute: location.pathname
      });
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.response || 'I apologize, but I could not generate a response.'
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      console.error('AI Assistant error:', err);
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };
  return <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] h-[600px] flex flex-col p-0">
        <DialogHeader className="p-4 pb-2 border-b">
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              
            </div>
            Fragobert
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {messages.length === 0 ? <div className="space-y-4">
              <div className="text-center py-6">
                <img src={fragobertAvatar} alt="Fragobert" className="w-20 h-20 mx-auto mb-3" />
                <h3 className="font-medium">How can I help you?</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Ask me anything about SecIX features, GRC best practices, or security frameworks.
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Suggested Questions
                </p>
                {SUGGESTED_QUESTIONS.map((question, index) => <button key={index} onClick={() => sendMessage(question)} className="w-full text-left p-3 text-sm rounded-lg border hover:bg-muted/50 transition-colors">
                    {question}
                  </button>)}
              </div>
            </div> : <div className="space-y-4">
              {messages.map(message => <div key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}>
                  {message.role === 'assistant' && <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0 overflow-hidden">
                      <img src={fragobertAvatar} alt="Fragobert" className="w-full h-full object-cover" />
                    </div>}
                  <div className={`max-w-[80%] rounded-lg p-3 text-sm ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                  {message.role === 'user' && <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-muted-foreground" />
                    </div>}
                </div>)}
              {isLoading && <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0 overflow-hidden">
                    <img src={fragobertAvatar} alt="Fragobert" className="w-full h-full object-cover" />
                  </div>
                  <div className="bg-muted rounded-lg p-3">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                </div>}
            </div>}
        </ScrollArea>

        <form onSubmit={handleSubmit} className="p-4 border-t flex gap-2">
          <Input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} placeholder="Ask about SecIX features..." disabled={isLoading} className="flex-1" />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </DialogContent>
    </Dialog>;
};
export default AIAssistantDialog;