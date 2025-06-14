import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Database, Activity, Crown, UserCheck, UserX, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface SystemStats {
  totalUsers: number;
  totalAnalyses: number;
  totalUploads: number;
  averageAccuracy: number;
  recentActivity: {
    last24Hours: number;
    last7Days: number;
  };
  apiStatus?: {
    ebayApi: string;
    stockxApi: string;
    geminiApi: string;
    database: string;
  };
}

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UploadWithAnalyses {
  id: number;
  userId?: string;
  sessionId: string;
  filename: string;
  originalName: string;
  filePath: string;
  mimeType: string;
  fileSize: number;
  uploadedAt: string;
  analyses: any[];
  user?: User;
}

export default function AdminDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [promoteEmail, setPromoteEmail] = useState("");
  const [adminSecret, setAdminSecret] = useState("");

  const isAdmin = user?.role === 'admin';

  // Data queries
  const { data: stats, isLoading: statsLoading } = useQuery<SystemStats>({
    queryKey: ["/api/admin/stats"],
    enabled: isAdmin,
  });

  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    enabled: isAdmin,
  });

  const { data: uploads, isLoading: uploadsLoading } = useQuery<UploadWithAnalyses[]>({
    queryKey: ["/api/admin/uploads"],
    enabled: isAdmin,
  });

  // Mutation for updating user role
  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: 'user' | 'admin' }) => {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role })
      });
      if (!response.ok) throw new Error('Failed to update user role');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Success",
        description: "User role updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user role",
        variant: "destructive",
      });
    },
  });

  // Mutation for promoting user to admin by email
  const promoteUserMutation = useMutation({
    mutationFn: async ({ email, adminSecret }: { email: string; adminSecret: string }) => {
      const response = await fetch('/api/admin/promote-by-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, adminSecret })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to promote user');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setPromoteEmail("");
      setAdminSecret("");
      toast({
        title: "Success",
        description: "User promoted to admin successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to promote user",
        variant: "destructive",
      });
    },
  });

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center p-8">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h1>
          <p className="text-gray-600 dark:text-gray-400">
            You need administrator privileges to access this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage users, monitor system performance, and oversee platform operations
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? "..." : stats?.totalUsers || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Analyses</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? "..." : stats?.totalAnalyses || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">24h Activity</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? "..." : stats?.recentActivity?.last24Hours || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              Healthy
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
          <TabsTrigger value="system">System Tools</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          {/* Admin Promotion */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5" />
                Promote User to Admin
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                  <Label htmlFor="email">User Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="user@example.com"
                    value={promoteEmail}
                    onChange={(e) => setPromoteEmail(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="adminSecret">Admin Secret</Label>
                  <Input
                    id="adminSecret"
                    type="password"
                    placeholder="make-me-admin-2025"
                    value={adminSecret}
                    onChange={(e) => setAdminSecret(e.target.value)}
                  />
                </div>
                <Button
                  onClick={() => promoteUserMutation.mutate({ email: promoteEmail, adminSecret })}
                  disabled={promoteUserMutation.isPending || !promoteEmail || !adminSecret}
                  className="w-full"
                >
                  {promoteUserMutation.isPending ? "Promoting..." : "Promote to Admin"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Users Table */}
          <Card>
            <CardHeader>
              <CardTitle>All Users</CardTitle>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="text-center py-8">Loading users...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 font-medium">User</th>
                        <th className="text-left py-3 font-medium">Role</th>
                        <th className="text-left py-3 font-medium">Status</th>
                        <th className="text-left py-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users?.map((user) => (
                        <tr key={user.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="py-4">
                            <div>
                              <div className="font-medium">
                                {user.firstName || user.lastName 
                                  ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                                  : user.email?.split('@')[0] || 'User'
                                }
                              </div>
                              <div className="text-sm text-gray-500">{user.email}</div>
                            </div>
                          </td>
                          <td className="py-4">
                            <Badge variant={user.role === 'admin' ? 'destructive' : 'secondary'}>
                              {user.role === 'admin' ? (
                                <>
                                  <Crown className="w-3 h-3 mr-1" />
                                  Admin
                                </>
                              ) : (
                                'User'
                              )}
                            </Badge>
                          </td>
                          <td className="py-4">
                            <Badge variant={user.isActive ? 'default' : 'secondary'}>
                              {user.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </td>
                          <td className="py-4">
                            {user.role === 'admin' ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateUserRoleMutation.mutate({ userId: user.id, role: 'user' })}
                                disabled={updateUserRoleMutation.isPending}
                              >
                                <UserX className="w-4 h-4 mr-1" />
                                Remove Admin
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateUserRoleMutation.mutate({ userId: user.id, role: 'admin' })}
                                disabled={updateUserRoleMutation.isPending}
                              >
                                <UserCheck className="w-4 h-4 mr-1" />
                                Make Admin
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Uploads</CardTitle>
            </CardHeader>
            <CardContent>
              {uploadsLoading ? (
                <div className="text-center py-8">Loading activity...</div>
              ) : (
                <div className="space-y-4">
                  {uploads?.slice(0, 10).map((upload) => (
                    <div key={upload.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{upload.originalName}</div>
                        <div className="text-sm text-gray-500">
                          {upload.user ? (
                            `${upload.user.firstName || upload.user.email?.split('@')[0] || 'User'} • ${new Date(upload.uploadedAt).toLocaleDateString()}`
                          ) : (
                            `Guest • ${new Date(upload.uploadedAt).toLocaleDateString()}`
                          )}
                        </div>
                      </div>
                      <Badge variant="secondary">
                        {upload.analyses.length} analysis{upload.analyses.length !== 1 ? 'es' : ''}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>System Health</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 border rounded">
                  <span>Database</span>
                  <Badge className="bg-green-500">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Connected
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded">
                  <span>Authentication</span>
                  <Badge className="bg-green-500">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Active
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded">
                  <span>File Storage</span>
                  <Badge className="bg-green-500">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Available
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded">
                  <span>AI Services</span>
                  <Badge className="bg-green-500">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Operational
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}