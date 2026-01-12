import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Database, Server, AlertTriangle, List, GitBranch } from 'lucide-react';
import PrimaryAssetList from '@/components/assets/PrimaryAssetList';
import SecondaryAssetList from '@/components/assets/SecondaryAssetList';
import AssetDeviationDashboard from '@/components/assets/AssetDeviationDashboard';
import UnifiedAssetInventory from '@/components/assets/UnifiedAssetInventory';
import AssetRelationshipMap from '@/components/assets/AssetRelationshipMap';
import { usePrimaryAssets, useSecondaryAssets } from '@/hooks/useAssets';

const AssetManagement: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'inventory';

  const { data: primaryAssets = [], isLoading: primaryLoading } = usePrimaryAssets();
  const { data: secondaryAssets = [], isLoading: secondaryLoading } = useSecondaryAssets();

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  if (primaryLoading || secondaryLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
          <Database className="w-6 h-6 text-primary" />
          Asset Management
        </h1>
        <p className="text-muted-foreground">
          Manage primary and secondary assets, business processes, and data flows
        </p>
      </div>

      <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="flex-wrap">
          <TabsTrigger value="inventory" className="gap-2">
            <List className="w-4 h-4" />
            Inventory
          </TabsTrigger>
          <TabsTrigger value="map" className="gap-2">
            <GitBranch className="w-4 h-4" />
            Map
          </TabsTrigger>
          <TabsTrigger value="primary" className="gap-2">
            <Database className="w-4 h-4" />
            Primary Assets
          </TabsTrigger>
          <TabsTrigger value="secondary" className="gap-2">
            <Server className="w-4 h-4" />
            Secondary Assets
          </TabsTrigger>
          <TabsTrigger value="deviations" className="gap-2">
            <AlertTriangle className="w-4 h-4" />
            Deviations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inventory">
          <UnifiedAssetInventory />
        </TabsContent>

        <TabsContent value="map">
          <AssetRelationshipMap />
        </TabsContent>

        <TabsContent value="primary">
          <PrimaryAssetList assets={primaryAssets} />
        </TabsContent>

        <TabsContent value="secondary">
          <SecondaryAssetList 
            secondaryAssets={secondaryAssets} 
            primaryAssets={primaryAssets} 
          />
        </TabsContent>

        <TabsContent value="deviations">
          <AssetDeviationDashboard 
            secondaryAssets={secondaryAssets} 
            primaryAssets={primaryAssets} 
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AssetManagement;
