import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Users, Edit2, Shield, MoreHorizontal, UserX, UserCheck, Trash2, Plus, CalendarIcon, KeyRound } from 'lucide-react';
import { supabase } from '@/integrations/database/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  useProfiles,
  useUpdateProfile,
  useUpdateUserRole,
  useToggleUserActive,
  useDeleteUser,
  useCreateProfile,
  UserProfileWithDetails,
} from '@/hooks/useProfiles';
import { useBusinessUnits } from '@/hooks/useBusinessUnits';

const ROLES: { value: 'admin' | 'user' | 'auditor'; label: string; description: string }[] = [
  { value: 'admin', label: 'Admin', description: 'Full system access, manage users and settings' },
  { value: 'user', label: 'User', description: 'Standard access within business unit' },
  { value: 'auditor', label: 'Auditor', description: 'Read-only access for audit purposes' },
];

const UsersList: React.FC = () => {
  const { data: profiles, isLoading } = useProfiles();
  const { data: businessUnits } = useBusinessUnits();
  const updateProfile = useUpdateProfile();
  const updateRole = useUpdateUserRole();
  const toggleActive = useToggleUserActive();
  const deleteUser = useDeleteUser();
  const createProfile = useCreateProfile();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfileWithDetails | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserProfileWithDetails | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    department: '',
    job_title: '',
    business_unit_id: '',
    role: 'user' as 'admin' | 'user' | 'auditor',
    expires_at: null as Date | null,
  });
  const [addFormData, setAddFormData] = useState({
    full_name: '',
    email: '',
    department: '',
    job_title: '',
    business_unit_id: '',
    role: 'user' as 'admin' | 'user' | 'auditor',
    expires_at: null as Date | null,
  });

  const openEditDialog = (user: UserProfileWithDetails) => {
    setEditingUser(user);
    setFormData({
      full_name: user.full_name || '',
      department: user.department || '',
      job_title: user.job_title || '',
      business_unit_id: user.business_unit_id || '',
      role: user.role || 'user',
      expires_at: user.expires_at ? new Date(user.expires_at) : null,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!editingUser) return;

    await updateProfile.mutateAsync({
      id: editingUser.id,
      full_name: formData.full_name || undefined,
      department: formData.department || undefined,
      job_title: formData.job_title || undefined,
      business_unit_id: formData.business_unit_id || undefined,
      expires_at: formData.expires_at?.toISOString() || null,
    });

    // Update role if changed
    if (formData.role !== editingUser.role) {
      await updateRole.mutateAsync({
        userId: editingUser.user_id,
        role: formData.role,
      });
    }

    setIsDialogOpen(false);
  };

  const handleAddUser = async () => {
    if (!addFormData.full_name || !addFormData.email) return;
    
    await createProfile.mutateAsync({
      full_name: addFormData.full_name,
      email: addFormData.email,
      department: addFormData.department || undefined,
      job_title: addFormData.job_title || undefined,
      business_unit_id: addFormData.business_unit_id || undefined,
      role: addFormData.role,
      expires_at: addFormData.expires_at?.toISOString() || undefined,
    });

    setAddFormData({
      full_name: '',
      email: '',
      department: '',
      job_title: '',
      business_unit_id: '',
      role: 'user',
      expires_at: null,
    });
    setIsAddDialogOpen(false);
  };

  const handleToggleActive = async (user: UserProfileWithDetails) => {
    await toggleActive.mutateAsync({
      id: user.id,
      is_active: !user.is_active,
    });
  };

  const handleDeleteClick = (user: UserProfileWithDetails) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;
    await deleteUser.mutateAsync({
      id: userToDelete.id,
      user_id: userToDelete.user_id,
    });
    setDeleteDialogOpen(false);
    setUserToDelete(null);
  };

  const handleResetPassword = async (user: UserProfileWithDetails) => {
    if (!user.email) {
      toast.error('User has no email address');
      return;
    }
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/auth?reset=true`,
      });
      
      if (error) throw error;
      
      toast.success(`Password reset email sent to ${user.email}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to send password reset email');
    }
  };

  const getRoleBadge = (role: string) => {
    const config: Record<string, string> = {
      admin: 'bg-red-500/20 text-red-600',
      user: 'bg-blue-500/20 text-blue-600',
      auditor: 'bg-amber-500/20 text-amber-600',
    };
    return <Badge className={config[role] || 'bg-muted'}>{role}</Badge>;
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">Active</Badge>
    ) : (
      <Badge variant="outline" className="bg-muted text-muted-foreground">Disabled</Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Users
            </CardTitle>
            <CardDescription>
              Manage user profiles, roles, and business unit assignments
            </CardDescription>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Add User
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Business Unit</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles?.map((user) => {
                const isExpired = user.expires_at && new Date(user.expires_at) < new Date();
                return (
                <TableRow key={user.id} className={!user.is_active || isExpired ? 'opacity-60' : ''}>
                  <TableCell className="font-medium">{user.full_name || '—'}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.department || '—'}</TableCell>
                  <TableCell>{getRoleBadge(user.role || 'user')}</TableCell>
                  <TableCell>{getStatusBadge(user.is_active ?? true)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {user.created_at ? format(new Date(user.created_at), 'MMM d, yyyy') : '—'}
                  </TableCell>
                  <TableCell>
                    {user.expires_at ? (
                      <span className={isExpired ? 'text-destructive' : 'text-muted-foreground'}>
                        {format(new Date(user.expires_at), 'MMM d, yyyy')}
                        {isExpired && <span className="ml-1 text-xs">(expired)</span>}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Never</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {user.business_units?.is_security_org && (
                        <Shield className="w-4 h-4 text-amber-500" />
                      )}
                      <span>{user.business_units?.name || '—'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(user)}>
                          <Edit2 className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleResetPassword(user)}>
                          <KeyRound className="w-4 h-4 mr-2" />
                          Reset Password
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleActive(user)}>
                          {user.is_active ? (
                            <>
                              <UserX className="w-4 h-4 mr-2" />
                              Disable
                            </>
                          ) : (
                            <>
                              <UserCheck className="w-4 h-4 mr-2" />
                              Enable
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleDeleteClick(user)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )})}
              {(!profiles || profiles.length === 0) && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    No users found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user profile, role, and business unit assignment.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData((prev) => ({ ...prev, full_name: e.target.value }))}
                className="bg-input border-border"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) => setFormData((prev) => ({ ...prev, department: e.target.value }))}
                  className="bg-input border-border"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="job_title">Job Title</Label>
                <Input
                  id="job_title"
                  value={formData.job_title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, job_title: e.target.value }))}
                  className="bg-input border-border"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={formData.role}
                onValueChange={(v) => setFormData((prev) => ({ ...prev, role: v as 'admin' | 'user' | 'auditor' }))}
              >
                <SelectTrigger className="bg-input border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      <div>
                        <span className="font-medium">{role.label}</span>
                        <p className="text-xs text-muted-foreground">{role.description}</p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Business Unit</Label>
              <Select
                value={formData.business_unit_id}
                onValueChange={(v) => setFormData((prev) => ({ ...prev, business_unit_id: v }))}
              >
                <SelectTrigger className="bg-input border-border">
                  <SelectValue placeholder="Select business unit" />
                </SelectTrigger>
                <SelectContent>
                  {businessUnits?.map((bu) => (
                    <SelectItem key={bu.id} value={bu.id}>
                      <div className="flex items-center gap-2">
                        {bu.is_security_org && <Shield className="w-4 h-4 text-amber-500" />}
                        <span>{bu.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Account Expiration</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal bg-input border-border"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.expires_at ? format(formData.expires_at, 'PPP') : 'Never expires'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.expires_at || undefined}
                    onSelect={(date) => setFormData((prev) => ({ ...prev, expires_at: date || null }))}
                    initialFocus
                  />
                  {formData.expires_at && (
                    <div className="p-2 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        onClick={() => setFormData((prev) => ({ ...prev, expires_at: null }))}
                      >
                        Clear expiration
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">
                Set an expiration date to automatically disable the account.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={updateProfile.isPending || updateRole.isPending}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add User Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Manually add a user to the system with a name and email.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="add_full_name">Full Name *</Label>
              <Input
                id="add_full_name"
                value={addFormData.full_name}
                onChange={(e) => setAddFormData((prev) => ({ ...prev, full_name: e.target.value }))}
                placeholder="John Doe"
                className="bg-input border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="add_email">Email *</Label>
              <Input
                id="add_email"
                type="email"
                value={addFormData.email}
                onChange={(e) => setAddFormData((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="john.doe@example.com"
                className="bg-input border-border"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="add_department">Department</Label>
                <Input
                  id="add_department"
                  value={addFormData.department}
                  onChange={(e) => setAddFormData((prev) => ({ ...prev, department: e.target.value }))}
                  className="bg-input border-border"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="add_job_title">Job Title</Label>
                <Input
                  id="add_job_title"
                  value={addFormData.job_title}
                  onChange={(e) => setAddFormData((prev) => ({ ...prev, job_title: e.target.value }))}
                  className="bg-input border-border"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={addFormData.role}
                onValueChange={(v) => setAddFormData((prev) => ({ ...prev, role: v as 'admin' | 'user' | 'auditor' }))}
              >
                <SelectTrigger className="bg-input border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      <div>
                        <span className="font-medium">{role.label}</span>
                        <p className="text-xs text-muted-foreground">{role.description}</p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Business Unit</Label>
              <Select
                value={addFormData.business_unit_id}
                onValueChange={(v) => setAddFormData((prev) => ({ ...prev, business_unit_id: v }))}
              >
                <SelectTrigger className="bg-input border-border">
                  <SelectValue placeholder="Select business unit" />
                </SelectTrigger>
                <SelectContent>
                  {businessUnits?.map((bu) => (
                    <SelectItem key={bu.id} value={bu.id}>
                      <div className="flex items-center gap-2">
                        {bu.is_security_org && <Shield className="w-4 h-4 text-amber-500" />}
                        <span>{bu.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Account Expiration</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal bg-input border-border"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {addFormData.expires_at ? format(addFormData.expires_at, 'PPP') : 'Never expires'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={addFormData.expires_at || undefined}
                    onSelect={(date) => setAddFormData((prev) => ({ ...prev, expires_at: date || null }))}
                    initialFocus
                  />
                  {addFormData.expires_at && (
                    <div className="p-2 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        onClick={() => setAddFormData((prev) => ({ ...prev, expires_at: null }))}
                      >
                        Clear expiration
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">
                Optional: Set an expiration date for this account.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddUser}
              disabled={createProfile.isPending || !addFormData.full_name || !addFormData.email}
            >
              Add User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate <strong>{userToDelete?.full_name || userToDelete?.email}</strong>?
              They will no longer be able to sign in.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UsersList;