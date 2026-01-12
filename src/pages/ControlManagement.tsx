import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InternalControlLibrary } from '@/components/controls/InternalControlLibrary';
import { FrameworkLibrary } from '@/components/controls/FrameworkLibrary';
import { ControlForge } from '@/components/controls/ControlForge';
import { Shield, FileSpreadsheet, Sparkles } from 'lucide-react';

const ControlManagement: React.FC = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Control Management</h1>
        <p className="text-muted-foreground">
          Manage internal controls and framework mappings
        </p>
      </div>

      <Tabs defaultValue="internal" className="space-y-6">
        <TabsList>
          <TabsTrigger value="internal" className="gap-2">
            <Shield className="h-4 w-4" />
            Internal Controls
          </TabsTrigger>
          <TabsTrigger value="frameworks" className="gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Frameworks
          </TabsTrigger>
          <TabsTrigger value="forge" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Control Forge
          </TabsTrigger>
        </TabsList>

        <TabsContent value="internal">
          <InternalControlLibrary />
        </TabsContent>

        <TabsContent value="frameworks">
          <FrameworkLibrary />
        </TabsContent>

        <TabsContent value="forge">
          <ControlForge />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ControlManagement;
