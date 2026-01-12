import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';
import AIAssistantDialog from './AIAssistantDialog';

const AIAssistantButton: React.FC = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-24 z-50 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105"
        size="icon"
      >
        <MessageCircle className="w-6 h-6" />
        <span className="sr-only">Open AI Assistant</span>
      </Button>
      <AIAssistantDialog open={open} onOpenChange={setOpen} />
    </>
  );
};

export default AIAssistantButton;
