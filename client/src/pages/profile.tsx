
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from "@/hooks/useAuth";
// import { useUserSettings } from "@/hooks/useUserSettings";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface UpdateProfileData {
  email?: string;
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

export default function Profile() {
  const { user, isAuthenticated } = useAuth();
  const [apiProvider, setApiProvider] = useState<"gemini" | "searchapi" | "serpapi">(
    (user?.apiProvider as "gemini" | "searchapi" | "serpapi") || "gemini"
  );
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [emailForm, setEmailForm] = useState({
    email: user?.email || "",
    currentPassword: ""
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const updateEmailMutation = useMutation({
    mutationFn: async (data: { email: string; currentPassword: string }) => {
      const response = await fetch("/api/auth/update-email", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include"
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update email");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Email updated successfully"
      });
      setEmailForm(prev => ({ ...prev, currentPassword: "" }));
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const updatePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const response = await fetch("/api/auth/update-password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include"
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update password");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Password updated successfully"
      });
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const updateApiProviderMutation = useMutation({
    mutationFn: async (provider: "gemini" | "searchapi" | "serpapi") => {
      const response = await fetch("/api/auth/update-api-provider", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiProvider: provider }),
        credentials: "include"
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update API provider");
      }
      return response.json();
    },
    onSuccess: (_, provider) => {
      setApiProvider(provider);
      toast({
        title: "Success",
        description: `API provider updated to ${provider.charAt(0).toUpperCase() + provider.slice(1)}`
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update API provider",
        variant: "destructive"
      });
    }
  });

  const handleApiProviderChange = (provider: "gemini" | "searchapi" | "serpapi") => {
    updateApiProviderMutation.mutate(provider);
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailForm.email || !emailForm.currentPassword) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }
    updateEmailMutation.mutate(emailForm);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive"
      });
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long",
        variant: "destructive"
      });
      return;
    }
    updatePasswordMutation.mutate({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-green-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Please log in to access your profile settings.
            </p>
            <Button onClick={() => window.location.href = "/"}>
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-green-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mx-auto flex items-center justify-center mb-6 shadow-2xl">
            <i className="fas fa-user-cog text-white text-2xl"></i>
          </div>
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 via-purple-600 to-green-600 bg-clip-text text-transparent">
            Profile Settings
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
            Manage your account settings and preferences
          </p>
        </div>

        {/* Profile Info */}
        <Card className="mb-8 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-white/20 dark:border-gray-700/50">
          <CardHeader>
            <CardTitle className="flex items-center">
              <i className="fas fa-user mr-3 text-blue-600"></i>
              Account Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">Username</Label>
                <p className="text-lg font-semibold">{user?.username}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">Role</Label>
                <p className="text-lg font-semibold capitalize">{user?.role}</p>
              </div>
              {(user?.firstName || user?.lastName) && (
                <div>
                  <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">Full Name</Label>
                  <p className="text-lg font-semibold">
                    {`${user?.firstName || ''} ${user?.lastName || ''}`.trim()}
                  </p>
                </div>
              )}
              <div>
                <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">Current Email</Label>
                <p className="text-lg font-semibold">{user?.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Update Email */}
          <Card className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-white/20 dark:border-gray-700/50">
            <CardHeader>
              <CardTitle className="flex items-center">
                <i className="fas fa-envelope mr-3 text-green-600"></i>
                Update Email
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="email">New Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={emailForm.email}
                    onChange={(e) => setEmailForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Enter new email address"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="emailPassword">Current Password</Label>
                  <Input
                    id="emailPassword"
                    type="password"
                    value={emailForm.currentPassword}
                    onChange={(e) => setEmailForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                    placeholder="Enter current password to confirm"
                    className="mt-1"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={updateEmailMutation.isPending}
                  className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                >
                  {updateEmailMutation.isPending ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                      Updating...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-save mr-2"></i>
                      Update Email
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Update Password */}
          <Card className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-white/20 dark:border-gray-700/50">
            <CardHeader>
              <CardTitle className="flex items-center">
                <i className="fas fa-lock mr-3 text-orange-600"></i>
                Update Password
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                    placeholder="Enter current password"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                    placeholder="Enter new password (min 6 characters)"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="Confirm new password"
                    className="mt-1"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={updatePasswordMutation.isPending}
                  className="w-full bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800"
                >
                  {updatePasswordMutation.isPending ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                      Updating...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-key mr-2"></i>
                      Update Password
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* API Provider Selection */}
        <Card className="mt-8 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-white/20 dark:border-gray-700/50">
          <CardHeader>
            <CardTitle className="flex items-center">
              <i className="fas fa-cogs mr-3 text-purple-600"></i>
              Image Analysis API
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Choose which AI service to use for analyzing your product images. Each service has different strengths and capabilities.
              </p>
              <RadioGroup
                value={apiProvider}
                onValueChange={handleApiProviderChange}
                disabled={updateApiProviderMutation.isPending}
                className="space-y-4"
              >
                <div className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <RadioGroupItem value="gemini" id="gemini" />
                  <div className="flex-1">
                    <Label htmlFor="gemini" className="font-medium">Google Gemini (Recommended)</Label>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Advanced AI with comprehensive product analysis and pricing data
                    </p>
                  </div>
                  <div className="flex items-center">
                    <i className="fas fa-robot text-blue-600 text-lg"></i>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <RadioGroupItem value="searchapi" id="searchapi" />
                  <div className="flex-1">
                    <Label htmlFor="searchapi" className="font-medium">SearchAPI</Label>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Google Lens integration for visual product searches and identification
                    </p>
                  </div>
                  <div className="flex items-center">
                    <i className="fas fa-search text-green-600 text-lg"></i>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <RadioGroupItem value="serpapi" id="serpapi" />
                  <div className="flex-1">
                    <Label htmlFor="serpapi" className="font-medium">SerpAPI</Label>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Google Lens API with extensive search result parsing and data extraction
                    </p>
                  </div>
                  <div className="flex items-center">
                    <i className="fas fa-eye text-orange-600 text-lg"></i>
                  </div>
                </div>
              </RadioGroup>
              {updateApiProviderMutation.isPending && (
                <div className="flex items-center justify-center py-2">
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Updating API provider...</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Security Tips */}
        <Card className="mt-8 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-white/20 dark:border-gray-700/50">
          <CardHeader>
            <CardTitle className="flex items-center">
              <i className="fas fa-shield-alt mr-3 text-blue-600"></i>
              Security Tips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start space-x-3">
                <i className="fas fa-check-circle text-green-500 mt-1"></i>
                <div>
                  <h4 className="font-semibold">Strong Passwords</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Use at least 8 characters with a mix of letters, numbers, and symbols.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <i className="fas fa-check-circle text-green-500 mt-1"></i>
                <div>
                  <h4 className="font-semibold">Regular Updates</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Change your password regularly and avoid reusing old passwords.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <i className="fas fa-check-circle text-green-500 mt-1"></i>
                <div>
                  <h4 className="font-semibold">Email Security</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Keep your email address up to date for important security notifications.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <i className="fas fa-check-circle text-green-500 mt-1"></i>
                <div>
                  <h4 className="font-semibold">Account Monitoring</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Monitor your account activity and report any suspicious behavior.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
