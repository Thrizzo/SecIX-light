import React, { useState } from 'react';
import { useAccessGroups, useAllUserAccessGroups, useAddUserToAccessGroup, useRemoveUserFromAccessGroup, AccessGroup } from '@/hooks/useAccessGroups';
import { useProfiles, UserProfileWithDetails } from '@/hooks/useProfiles';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Shield, Users, Plus, X, AlertTriangle, Globe } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const AccessGroupsList: React.FC = () => {
  const { isAdmin } = useAuth();
  const { data: accessGroups, isLoading: groupsLoading } = useAccessGroups();
  const { data: allMemberships } = useAllUserAccessGroups();
  const { data: profiles } = useProfiles();
  const addToGroup = useAddUserToAccessGroup();
  const removeFromGroup = useRemoveUserFromAccessGroup();

  const [selectedGroup, setSelectedGroup] = useState<AccessGroup | null>(null);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');

  const getMembersForGroup = (groupId: string) => {
    return allMemberships?.filter(m => m.access_group_id === groupId) || [];
  };

  const getProfile = (userId: string): UserProfileWithDetails | undefined => {
    return profiles?.find(p => p.user_id === userId);
  };

  const getNonMembers = (groupId: string) => {
    const memberUserIds = getMembersForGroup(groupId).map(m => m.user_id);
    return profiles?.filter(p => !memberUserIds.includes(p.user_id)) || [];
  };

  const handleAddMember = async () => {
    if (!selectedGroup || !selectedUserId) return;
    await addToGroup.mutateAsync({ userId: selectedUserId, accessGroupId: selectedGroup.id });
    setSelectedUserId('');
    setAddMemberOpen(false);
  };

  const handleRemoveMember = async (userId: string, groupId: string) => {
    await removeFromGroup.mutateAsync({ userId, accessGroupId: groupId });
  };

  const getGroupIcon = (name: string) => {
    if (name === 'Security Org') return <Shield className="w-5 h-5 text-primary" />;
    if (name === 'EB') return <Globe className="w-5 h-5 text-amber-500" />;
    return <Users className="w-5 h-5 text-muted-foreground" />;
  };

  const getGroupBadgeColor = (name: string) => {
    if (name === 'Security Org') return 'bg-primary/10 text-primary border-primary/20';
    if (name === 'EB') return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
    return 'bg-muted text-muted-foreground';
  };

  if (groupsLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Access Groups</h2>
          <p className="text-sm text-muted-foreground">
            Manage special permission groups that provide global access across modules
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        {accessGroups?.map(group => {
          const members = getMembersForGroup(group.id);
          return (
            <Card key={group.id} className="bg-card border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getGroupIcon(group.name)}
                    <div>
                      <CardTitle className="text-lg">{group.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{group.description}</p>
                    </div>
                  </div>
                  <Badge className={getGroupBadgeColor(group.name)}>
                    {members.length} member{members.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {/* Permissions indicator */}
                <div className="mb-4 p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2 text-sm">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span className="font-medium">Permissions:</span>
                    {group.name === 'Security Org' && (
                      <span className="text-muted-foreground">Global view & edit across ALL modules</span>
                    )}
                    {group.name === 'EB' && (
                      <span className="text-muted-foreground">Global view & edit for Risks and Risk Appetite only</span>
                    )}
                  </div>
                </div>

                {/* Members list */}
                {members.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        {isAdmin && <TableHead className="w-20">Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {members.map(membership => {
                        const profile = getProfile(membership.user_id);
                        return (
                          <TableRow key={membership.id}>
                            <TableCell className="font-medium">
                              {profile?.full_name || 'Unknown'}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {profile?.email || '-'}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">
                                {profile?.role || 'user'}
                              </Badge>
                            </TableCell>
                            {isAdmin && (
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveMember(membership.user_id, group.id)}
                                  disabled={removeFromGroup.isPending}
                                >
                                  <X className="w-4 h-4 text-destructive" />
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No members in this group
                  </p>
                )}

                {/* Add member button */}
                {isAdmin && (
                  <div className="mt-4">
                    <Dialog open={addMemberOpen && selectedGroup?.id === group.id} onOpenChange={(open) => {
                      setAddMemberOpen(open);
                      if (open) setSelectedGroup(group);
                    }}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2">
                          <Plus className="w-4 h-4" />
                          Add Member
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Member to {group.name}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Select User</Label>
                            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                              <SelectTrigger>
                                <SelectValue placeholder="Choose a user..." />
                              </SelectTrigger>
                              <SelectContent>
                                {getNonMembers(group.id).map(profile => (
                                  <SelectItem key={profile.user_id} value={profile.user_id}>
                                    {profile.full_name || profile.email}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex justify-end gap-3">
                            <Button variant="outline" onClick={() => setAddMemberOpen(false)}>
                              Cancel
                            </Button>
                            <Button 
                              onClick={handleAddMember}
                              disabled={!selectedUserId || addToGroup.isPending}
                            >
                              Add to Group
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default AccessGroupsList;
