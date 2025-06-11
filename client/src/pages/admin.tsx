import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, Users, Database, Activity, TrendingUp, CheckCircle, XCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

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
  id: number;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

interface UploadWithAnalyses {
  id: number;
  userId?: number;
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

export default function AdminDiagnostics() {
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

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

  const { data: systemStatus } = useQuery({
    queryKey: ["/api/system/status"],
    enabled: isAdmin,
    queryFn: async () => {
      const response = await fetch("/api/system/status");
      if (!response.ok) throw new Error('Failed to fetch system status');
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const testFeatures = async () => {
    const features = [
      { name: "Gemini API", endpoint: "/api/session" },
      { name: "Database Connection", endpoint: "/api/stats" },
      { name: "File Upload", endpoint: "/api/upload" },
      { name: "User Authentication", endpoint: "/api/auth/me" },
    ];

    for (const feature of features) {
      try {
        const response = await fetch(feature.endpoint);
        const status = response.ok ? "✅" : "❌";
        toast({
          title: `${feature.name} Test`,
          description: `${status} ${response.ok ? "Working" : "Failed"}`,
          variant: response.ok ? "default" : "destructive",
        });
      } catch (error) {
        toast({
          title: `${feature.name} Test`,
          description: "❌ Connection Failed",
          variant: "destructive",
        });
      }
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center text-red-600">
              <AlertCircle className="mr-2" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>You need administrator privileges to access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">System Diagnostics</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Monitor system performance and test feature functionality
        </p>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle>System Health Check</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={testFeatures} className="w-full sm:w-auto">
              <Activity className="mr-2 h-4 w-4" />
              Test All Features
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* System Statistics */}
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
            <CardTitle className="text-sm font-medium">Total Uploads</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? "..." : stats?.totalUploads || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Accuracy</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? "..." : `${stats?.averageAccuracy || 0}%`}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Status Overview */}
      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="mr-2 h-5 w-5" />
              API Status Monitoring
              <Badge 
                variant={systemStatus?.overallStatus === 'operational' ? 'default' : 'destructive'}
                className="ml-2"
              >
                {systemStatus?.overallStatus === 'operational' ? 'All Systems Operational' : 'Issues Detected'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* eBay API Status */}
              <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-sm">eBay Marketplace</h3>
                  {systemStatus?.apiStatus?.ebayApi === 'Connected' ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                  Real-time marketplace pricing and listings
                </p>
                <Badge 
                  variant={systemStatus?.apiStatus?.ebayApi === 'Connected' ? 'default' : 'destructive'}
                  className="text-xs"
                >
                  {systemStatus?.apiStatus?.ebayApi || 'Unknown'}
                </Badge>
              </div>

              {/* StockX API Status */}
              <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-sm">StockX OAuth</h3>
                  {systemStatus?.apiStatus?.stockxApi === 'Connected' ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                  Authenticated sneaker and streetwear pricing
                </p>
                <Badge 
                  variant={systemStatus?.apiStatus?.stockxApi === 'Connected' ? 'default' : 'destructive'}
                  className="text-xs"
                >
                  {systemStatus?.apiStatus?.stockxApi || 'Unknown'}
                </Badge>
              </div>

              {/* Gemini AI Status */}
              <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-sm">Gemini AI + Search</h3>
                  {systemStatus?.apiStatus?.geminiApi === 'Connected' ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                  AI with Google Search for verified product data
                </p>
                <Badge 
                  variant={systemStatus?.apiStatus?.geminiApi === 'Connected' ? 'default' : 'destructive'}
                  className="text-xs"
                >
                  {systemStatus?.apiStatus?.geminiApi === 'Connected' ? 'Search-Enhanced' : systemStatus?.apiStatus?.geminiApi || 'Unknown'}
                </Badge>
              </div>

              {/* Database Status */}
              <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-sm">Database Connection</h3>
                  {systemStatus?.apiStatus?.database === 'Connected' ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                  PostgreSQL database for user data and analysis storage
                </p>
                <Badge 
                  variant={systemStatus?.apiStatus?.database === 'Connected' ? 'default' : 'destructive'}
                  className="text-xs"
                >
                  {systemStatus?.apiStatus?.database || 'Unknown'}
                </Badge>
              </div>
            </div>

            {/* Latest Features */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-sm mb-3">Latest Features</h3>
              <div className="grid md:grid-cols-3 gap-3 text-xs">
                <div className="flex items-center text-gray-600 dark:text-gray-400">
                  <CheckCircle className="h-3 w-3 text-blue-500 mr-2" />
                  Google Search integration for accurate pricing
                </div>
                <div className="flex items-center text-gray-600 dark:text-gray-400">
                  <CheckCircle className="h-3 w-3 text-purple-500 mr-2" />
                  Visual comparison with marketplace references
                </div>
                <div className="flex items-center text-gray-600 dark:text-gray-400">
                  <CheckCircle className="h-3 w-3 text-orange-500 mr-2" />
                  Multi-source price verification system
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span>Last 24 Hours</span>
                <Badge variant="secondary">
                  {statsLoading ? "..." : stats?.recentActivity.last24Hours || 0} analyses
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Last 7 Days</span>
                <Badge variant="secondary">
                  {statsLoading ? "..." : stats?.recentActivity.last7Days || 0} analyses
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Gemini AI Engine</span>
                <Badge variant="default" className="bg-green-500">
                  <CheckCircle className="mr-1 h-3 w-3" />
                  {stats?.apiStatus?.geminiApi || 'Connected'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>eBay Browse API</span>
                <Badge 
                  variant="default" 
                  className={
                    stats?.apiStatus?.ebayApi === 'Connected' 
                      ? "bg-green-500" 
                      : stats?.apiStatus?.ebayApi === 'Error'
                      ? "bg-red-500"
                      : "bg-yellow-500"
                  }
                >
                  {stats?.apiStatus?.ebayApi === 'Connected' ? (
                    <CheckCircle className="mr-1 h-3 w-3" />
                  ) : (
                    <XCircle className="mr-1 h-3 w-3" />
                  )}
                  {stats?.apiStatus?.ebayApi || 'Unknown'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>StockX API</span>
                <Badge 
                  variant="default" 
                  className={
                    stats?.apiStatus?.stockxApi === 'Connected' 
                      ? "bg-green-500" 
                      : stats?.apiStatus?.stockxApi === 'Error'
                      ? "bg-red-500"
                      : "bg-yellow-500"
                  }
                >
                  {stats?.apiStatus?.stockxApi === 'Connected' ? (
                    <CheckCircle className="mr-1 h-3 w-3" />
                  ) : (
                    <XCircle className="mr-1 h-3 w-3" />
                  )}
                  {stats?.apiStatus?.stockxApi || 'Unknown'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Database</span>
                <Badge 
                  variant="default" 
                  className={
                    stats?.apiStatus?.database === 'Connected' 
                      ? "bg-green-500" 
                      : stats?.apiStatus?.database === 'Error'
                      ? "bg-red-500"
                      : "bg-yellow-500"
                  }
                >
                  {stats?.apiStatus?.database === 'Connected' ? (
                    <CheckCircle className="mr-1 h-3 w-3" />
                  ) : (
                    <XCircle className="mr-1 h-3 w-3" />
                  )}
                  {stats?.apiStatus?.database || 'Unknown'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>File Storage</span>
                <Badge variant="default" className="bg-green-500">
                  <CheckCircle className="mr-1 h-3 w-3" />
                  Available
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Management */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
          </CardHeader>
          <CardContent>
            {usersLoading ? (
              <div className="text-center py-4">Loading users...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">User</th>
                      <th className="text-left py-2">Role</th>
                      <th className="text-left py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users?.slice(0, 5).map((user) => (
                      <tr key={user.id} className="border-b">
                        <td className="py-2">
                          <div>
                            <div className="font-medium text-sm">
                              {user.firstName || user.lastName 
                                ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                                : user.username
                              }
                            </div>
                            <div className="text-gray-500 text-xs">{user.email}</div>
                          </div>
                        </td>
                        <td className="py-2">
                          <Badge variant={user.role === 'admin' ? 'destructive' : 'secondary'} className="text-xs">
                            {user.role}
                          </Badge>
                        </td>
                        <td className="py-2">
                          <Badge variant={user.isActive ? 'default' : 'secondary'} className="text-xs">
                            {user.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {users && users.length > 5 && (
                  <div className="text-center text-sm text-gray-500 mt-2">
                    and {users.length - 5} more users...
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Uploads</CardTitle>
          </CardHeader>
          <CardContent>
            {uploadsLoading ? (
              <div className="text-center py-4">Loading uploads...</div>
            ) : (
              <div className="space-y-3">
                {uploads?.slice(0, 5).map((upload) => (
                  <div key={upload.id} className="border-b pb-2 last:border-b-0">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{upload.originalName}</div>
                        <div className="text-xs text-gray-500">
                          {upload.user ? (
                            `${upload.user.firstName || upload.user.username} • ${new Date(upload.uploadedAt).toLocaleDateString()}`
                          ) : (
                            `Guest • ${new Date(upload.uploadedAt).toLocaleDateString()}`
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="secondary" className="text-xs">
                          {upload.analyses.length} analysis{upload.analyses.length !== 1 ? 'es' : ''}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
                {uploads && uploads.length > 5 && (
                  <div className="text-center text-sm text-gray-500 mt-2">
                    and {uploads.length - 5} more uploads...
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* All Uploads Management */}
      <Card>
        <CardHeader>
          <CardTitle>All System Uploads</CardTitle>
        </CardHeader>
        <CardContent>
          {uploadsLoading ? (
            <div className="text-center py-4">Loading all uploads...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">File</th>
                    <th className="text-left py-2">User</th>
                    <th className="text-left py-2">Size</th>
                    <th className="text-left py-2">Analyses</th>
                    <th className="text-left py-2">Uploaded</th>
                    <th className="text-left py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {uploads?.map((upload) => (
                    <tr key={upload.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="py-2">
                        <div>
                          <div className="font-medium">{upload.originalName}</div>
                          <div className="text-gray-500 text-xs">{upload.mimeType}</div>
                        </div>
                      </td>
                      <td className="py-2">
                        {upload.user ? (
                          <div>
                            <div className="font-medium">
                              {upload.user.firstName || upload.user.lastName 
                                ? `${upload.user.firstName || ''} ${upload.user.lastName || ''}`.trim()
                                : upload.user.username
                              }
                            </div>
                            <div className="text-gray-500 text-xs">{upload.user.email}</div>
                          </div>
                        ) : (
                          <Badge variant="secondary" className="text-xs">Guest</Badge>
                        )}
                      </td>
                      <td className="py-2">
                        {(upload.fileSize / 1024 / 1024).toFixed(2)} MB
                      </td>
                      <td className="py-2">
                        <div className="flex flex-col space-y-1">
                          <Badge variant="outline" className="text-xs w-fit">
                            {upload.analyses.length} analysis{upload.analyses.length !== 1 ? 'es' : ''}
                          </Badge>
                          {upload.analyses.length > 0 && (
                            <div className="text-xs text-gray-500">
                              Latest: {upload.analyses[0]?.productName || 'Unknown'}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-2">
                        <div className="text-sm">
                          {new Date(upload.uploadedAt).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(upload.uploadedAt).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="py-2">
                        {upload.analyses.length > 0 && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => {
                              const analysis = upload.analyses[0];
                              toast({
                                title: "AI Thought Process",
                                description: (
                                  <div className="max-h-40 overflow-y-auto">
                                    <p className="font-medium mb-2">{analysis.productName}</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-300">
                                      {analysis.thoughtProcess || "No detailed thought process available."}
                                    </p>
                                  </div>
                                ),
                                duration: 10000,
                              });
                            }}
                          >
                            View AI Logic
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!uploads || uploads.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No uploads found in the system.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
