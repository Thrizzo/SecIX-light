import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useInvitations, useCreateInvitation, useDeleteInvitation, Invitation } from '@/hooks/useInvitations';
import { Mail, Plus, Copy, Trash2, Clock, CheckCircle, XCircle, Link } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, isPast, formatDistanceToNow } from 'date-fns';

const InvitationsList: React.FC = () => {
  const { data: invitations, isLoading } = useInvitations();
  const createInvitation = useCreateInvitation();
  const deleteInvitation = useDeleteInvitation();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [expiryDays, setExpiryDays] = useState(3);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  const getInvitationStatus = (invitation: Invitation): { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } => {
    if (invitation.used_at) {
      return { label: 'Used', variant: 'secondary' };
    }
    if (isPast(new Date(invitation.expires_at))) {
      return { label: 'Expired', variant: 'destructive' };
    }
    return { label: 'Pending', variant: 'default' };
  };

  const handleCreateInvitation = async () => {
    try {
      const result = await createInvitation.mutateAsync({
        email: email || undefined,
        notes: notes || undefined,
        expiryDays,
      });
      
      const link = `${window.location.origin}/invite/${result.token}`;
      setGeneratedLink(link);
    } catch (error) {
      // Error handled in mutation
    }
  };

  const handleCopyLink = (token: string) => {
    const link = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(link);
    toast({
      title: 'Link copied',
      description: 'Invitation link copied to clipboard.',
    });
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEmail('');
    setNotes('');
    setExpiryDays(3);
    setGeneratedLink(null);
  };

  return (
    <Card className="glass border-border/50">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Link className="w-5 h-5 text-primary" />
            Demo Invitations
          </CardTitle>
          <CardDescription>
            Generate time-limited invitation links for demo users
          </CardDescription>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Generate Invite
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Generate Invitation Link</DialogTitle>
              <DialogDescription>
                Create a time-limited invitation for demo access with user role.
              </DialogDescription>
            </DialogHeader>
            
            {!generatedLink ? (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email (optional)</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="demo@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    If specified, only this email can use the invitation.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (optional)</Label>
                  <Input
                    id="notes"
                    placeholder="Demo for Company X"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="expiry">Expiry (days)</Label>
                  <Input
                    id="expiry"
                    type="number"
                    min={1}
                    max={30}
                    value={expiryDays}
                    onChange={(e) => setExpiryDays(parseInt(e.target.value) || 3)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Link will expire after {expiryDays} day{expiryDays !== 1 ? 's' : ''}.
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-4">
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <Input
                    value={generatedLink}
                    readOnly
                    className="flex-1 bg-transparent border-none focus-visible:ring-0"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedLink);
                      toast({
                        title: 'Link copied',
                        description: 'Invitation link copied to clipboard.',
                      });
                    }}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Share this link with the demo user. It will expire in {expiryDays} day{expiryDays !== 1 ? 's' : ''}.
                </p>
              </div>
            )}

            <DialogFooter>
              {!generatedLink ? (
                <>
                  <Button variant="outline" onClick={handleCloseDialog}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateInvitation}
                    disabled={createInvitation.isPending}
                  >
                    {createInvitation.isPending ? 'Creating...' : 'Generate Link'}
                  </Button>
                </>
              ) : (
                <Button onClick={handleCloseDialog}>Done</Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !invitations?.length ? (
          <div className="text-center py-8 text-muted-foreground">
            <Link className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No invitations yet</p>
            <p className="text-sm">Generate an invitation link to get started.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invitations.map((invitation) => {
                const status = getInvitationStatus(invitation);
                return (
                  <TableRow key={invitation.id}>
                    <TableCell>
                      <Badge variant={status.variant} className="gap-1">
                        {status.label === 'Pending' && <Clock className="w-3 h-3" />}
                        {status.label === 'Used' && <CheckCircle className="w-3 h-3" />}
                        {status.label === 'Expired' && <XCircle className="w-3 h-3" />}
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {invitation.email || <span className="text-muted-foreground">Any</span>}
                    </TableCell>
                    <TableCell>
                      {invitation.notes || <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      {isPast(new Date(invitation.expires_at)) ? (
                        <span className="text-muted-foreground">
                          {format(new Date(invitation.expires_at), 'MMM d, yyyy')}
                        </span>
                      ) : (
                        <span>
                          {formatDistanceToNow(new Date(invitation.expires_at), { addSuffix: true })}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {format(new Date(invitation.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {status.label === 'Pending' && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleCopyLink(invitation.token)}
                            title="Copy link"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              title="Delete invitation"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Invitation</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this invitation? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteInvitation.mutate(invitation.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default InvitationsList;
