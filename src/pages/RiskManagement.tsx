import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RiskRegister } from '@/components/risk/RiskRegister';
import { RiskAppetite } from '@/components/risk/RiskAppetite';
import { TreatmentManagement } from '@/components/risk/TreatmentManagement';
import { RiskLogs } from '@/components/risk/RiskLogs';
import { RiskArchive } from '@/components/risk/RiskArchive';
import { RiskHeatmapDashboard } from '@/components/risk/RiskHeatmapDashboard';
import { FileText, Target, ClipboardList, History, Archive, LayoutDashboard } from 'lucide-react';

const RiskManagement: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const activeTab = searchParams.get('tab') || 'dashboard';

  const handleTabChange = (value: string) => {
    navigate(`?tab=${value}`, { replace: true });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">
          Risk Management
        </h1>
        <p className="text-muted-foreground">
          Identify, assess, and manage organizational risks
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="dashboard" className="gap-2">
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="register" className="gap-2">
            <FileText className="w-4 h-4" />
            Register
          </TabsTrigger>
          <TabsTrigger value="treatments" className="gap-2">
            <ClipboardList className="w-4 h-4" />
            Treatments
          </TabsTrigger>
          <TabsTrigger value="appetite" className="gap-2">
            <Target className="w-4 h-4" />
            Appetite
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2">
            <History className="w-4 h-4" />
            Logs
          </TabsTrigger>
          <TabsTrigger value="archive" className="gap-2">
            <Archive className="w-4 h-4" />
            Archive
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <RiskHeatmapDashboard />
        </TabsContent>
        <TabsContent value="register">
          <RiskRegister />
        </TabsContent>
        <TabsContent value="treatments">
          <TreatmentManagement />
        </TabsContent>
        <TabsContent value="appetite">
          <RiskAppetite />
        </TabsContent>
        <TabsContent value="logs">
          <RiskLogs />
        </TabsContent>
        <TabsContent value="archive">
          <RiskArchive />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RiskManagement;
