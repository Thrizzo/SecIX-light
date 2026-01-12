/**
 * SecIX Light Edition - Settings Page
 * 
 * Simplified settings with only Light edition tabs:
 * - My Account
 * - Security Journey
 * - Users
 * - Business Units
 * - Roles
 * - Access Groups
 * - AI Provider
 * - Audit Logs
 * - Invitations
 */

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Building2, ShieldCheck, Settings as SettingsIcon, Shield, Bot, ScrollText, Link, UserCircle, Compass } from 'lucide-react';
import UsersList from '@/components/settings/UsersList';
import BusinessUnitsList from '@/components/settings/BusinessUnitsList';
import RolesList from '@/components/settings/RolesList';
import AccessGroupsList from '@/components/settings/AccessGroupsList';
import AIProviderSettings from '@/components/settings/AIProviderSettings';
import AuditLogsList from '@/components/settings/AuditLogsList';
import InvitationsList from '@/components/settings/InvitationsList';
import MyAccountSettings from '@/components/settings/MyAccountSettings';
import JourneySettings from '@/components/settings/JourneySettings';

const Settings: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
          <SettingsIcon className="w-8 h-8 text-primary" />
          Settings
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage users, roles, and organizational structure
        </p>
      </div>

      <Tabs defaultValue="my-account" className="space-y-6">
        <TabsList className="bg-muted/30 border border-border flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="my-account" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <UserCircle className="w-4 h-4" />
            My Account
          </TabsTrigger>
          <TabsTrigger value="journey" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Compass className="w-4 h-4" />
            Security Journey
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Users className="w-4 h-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="groups" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Building2 className="w-4 h-4" />
            Business Units
          </TabsTrigger>
          <TabsTrigger value="roles" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <ShieldCheck className="w-4 h-4" />
            Roles
          </TabsTrigger>
          <TabsTrigger value="access-groups" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Shield className="w-4 h-4" />
            Access Groups
          </TabsTrigger>
          <TabsTrigger value="ai-provider" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Bot className="w-4 h-4" />
            AI Provider
          </TabsTrigger>
          <TabsTrigger value="audit-logs" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <ScrollText className="w-4 h-4" />
            Audit Logs
          </TabsTrigger>
          <TabsTrigger value="invitations" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Link className="w-4 h-4" />
            Invitations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my-account" className="mt-0">
          <MyAccountSettings />
        </TabsContent>

        <TabsContent value="journey" className="mt-0">
          <JourneySettings />
        </TabsContent>

        <TabsContent value="users" className="mt-0">
          <UsersList />
        </TabsContent>

        <TabsContent value="groups" className="mt-0">
          <BusinessUnitsList />
        </TabsContent>

        <TabsContent value="roles" className="mt-0">
          <RolesList />
        </TabsContent>

        <TabsContent value="access-groups" className="mt-0">
          <AccessGroupsList />
        </TabsContent>

        <TabsContent value="ai-provider" className="mt-0">
          <AIProviderSettings />
        </TabsContent>

        <TabsContent value="audit-logs" className="mt-0">
          <AuditLogsList />
        </TabsContent>

        <TabsContent value="invitations" className="mt-0">
          <InvitationsList />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
