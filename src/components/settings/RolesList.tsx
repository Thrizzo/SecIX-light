import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ShieldCheck } from 'lucide-react';

const ROLES = [
  {
    name: 'Admin',
    value: 'admin',
    description: 'Full system access with ability to manage users, settings, and all organizational data.',
    permissions: ['Manage users & roles', 'Manage business units', 'Full CRUD on all modules', 'System configuration'],
    color: 'bg-red-500/20 text-red-600',
  },
  {
    name: 'User',
    value: 'user',
    description: 'Standard access within their assigned business unit. Can view and edit their unit\'s data.',
    permissions: ['View own BU data', 'Edit own BU data', 'Create records', 'Cannot manage users'],
    color: 'bg-blue-500/20 text-blue-600',
  },
  {
    name: 'Auditor',
    value: 'auditor',
    description: 'Read-only access for audit and compliance purposes. Can view logs and records.',
    permissions: ['View all logs', 'View records', 'Generate reports', 'No edit access'],
    color: 'bg-amber-500/20 text-amber-600',
  },
];

const RolesList: React.FC = () => {
  return (
    <div className="space-y-6">
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            System Roles
          </CardTitle>
          <CardDescription>
            Predefined roles that determine user capabilities within the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Key Permissions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ROLES.map((role) => (
                <TableRow key={role.value}>
                  <TableCell>
                    <Badge className={role.color}>{role.name}</Badge>
                  </TableCell>
                  <TableCell className="max-w-md">
                    <p className="text-sm text-muted-foreground">{role.description}</p>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {role.permissions.map((perm) => (
                        <Badge key={perm} variant="outline" className="text-xs">
                          {perm}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="bg-muted/30 border-border">
        <CardHeader>
          <CardTitle className="text-sm">Security Organization Override</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Users assigned to the <strong>Security Organization</strong> business unit have cross-unit access,
            allowing them to view and edit records from all business units regardless of their role.
            This is designed for security teams that need enterprise-wide visibility.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default RolesList;
