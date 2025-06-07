import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useLogin, useRegister } from "@/hooks/useAuth";
import { loginSchema, registerSchema, type LoginCredentials, type RegisterData } from "@shared/schema";

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthDialog({ open, onOpenChange }: AuthDialogProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const { toast } = useToast();
  
  const loginMutation = useLogin();
  const registerMutation = useRegister();

  const loginForm = useForm<LoginCredentials>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      username: "",
      password: "",
      firstName: "",
      lastName: "",
    },
    mode: "onChange"
  });

  const onLoginSubmit = async (data: LoginCredentials) => {
    try {
      await loginMutation.mutateAsync(data);
      toast({
        title: "Success",
        description: "Logged in successfully!",
      });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Login failed",
        variant: "destructive",
      });
    }
  };

  const onRegisterSubmit = async (data: RegisterData) => {
    try {
      await registerMutation.mutateAsync(data);
      toast({
        title: "Success",
        description: "Account created successfully!",
      });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Registration failed",
        variant: "destructive",
      });
    }
  };

  // Reset forms only when dialog opens, not when switching modes
  useEffect(() => {
    if (open) {
      loginForm.reset();
      registerForm.reset();
    }
  }, [open, loginForm, registerForm]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {mode === "login" ? "Sign In" : "Create Account"}
          </DialogTitle>
        </DialogHeader>

        {mode === "login" ? (
          <Form {...loginForm}>
            <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
              <FormField
                control={loginForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Enter your email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={loginForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Enter your password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-col space-y-3">
                <Button type="submit" disabled={loginMutation.isPending} className="w-full">
                  {loginMutation.isPending ? "Signing in..." : "Sign In"}
                </Button>
                
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => setMode("register")}
                  className="w-full"
                >
                  Don't have an account? Create one
                </Button>
              </div>
            </form>
          </Form>
        ) : (
          <Form {...registerForm}>
            <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={registerForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="John" 
                          {...field}
                          autoComplete="given-name"
                          disabled={registerMutation.isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={registerForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Doe" 
                          {...field}
                          autoComplete="family-name"
                          disabled={registerMutation.isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={registerForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="johndoe" 
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value)}
                        onBlur={field.onBlur}
                        name="username"
                        autoComplete="username"
                        disabled={registerMutation.isPending}
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck="false"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={registerForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder="john@example.com" 
                        {...field}
                        autoComplete="email"
                        disabled={registerMutation.isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={registerForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="At least 6 characters" 
                        {...field}
                        autoComplete="new-password"
                        disabled={registerMutation.isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-col space-y-3">
                <Button type="submit" disabled={registerMutation.isPending} className="w-full">
                  {registerMutation.isPending ? "Creating account..." : "Create Account"}
                </Button>
                
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => setMode("login")}
                  className="w-full"
                >
                  Already have an account? Sign in
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}