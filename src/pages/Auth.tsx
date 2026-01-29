import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, Lock, AlertCircle, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import logo from "@/assets/logo.png";
import { cn } from "@/lib/utils";

const emailSchema = z.string().email("Please enter a valid email address");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");

type AuthView = "signin" | "signup" | "forgot-password" | "reset-sent";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isOAuthLoading, setIsOAuthLoading] = useState<string | null>(null);
  const [view, setView] = useState<AuthView>("signin");
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirmPassword?: string }>({});
  const [isAnimating, setIsAnimating] = useState(false);
  const { user, signUp, signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  const changeView = (newView: AuthView) => {
    setIsAnimating(true);
    setTimeout(() => {
      setView(newView);
      setErrors({});
      setTimeout(() => setIsAnimating(false), 50);
    }, 200);
  };

  const validateForm = () => {
    const newErrors: { email?: string; password?: string; confirmPassword?: string } = {};
    
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      newErrors.email = emailResult.error.errors[0].message;
    }
    
    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      newErrors.password = passwordResult.error.errors[0].message;
    }

    if (view === "signup" && password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateEmailOnly = () => {
    const newErrors: { email?: string } = {};
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      newErrors.email = emailResult.error.errors[0].message;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmailOnly()) return;
    
    setIsLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setIsLoading(false);
    
    if (error) {
      toast({
        variant: "destructive",
        title: "Failed to send reset email",
        description: error.message,
      });
    } else {
      changeView("reset-sent");
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setIsLoading(true);
    const { error } = await signIn(email, password);
    setIsLoading(false);
    
    if (error) {
      toast({
        variant: "destructive",
        title: "Sign in failed",
        description: error.message === "Invalid login credentials" 
          ? "Invalid email or password. Please try again."
          : error.message,
      });
    } else {
      toast({
        title: "Welcome back!",
        description: "You have signed in successfully.",
      });
      navigate("/");
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setIsLoading(true);
    const { error } = await signUp(email, password);
    setIsLoading(false);
    
    if (error) {
      const errorMessage = error.message.includes("already registered")
        ? "This email is already registered. Please sign in instead."
        : error.message;
      
      toast({
        variant: "destructive",
        title: "Sign up failed",
        description: errorMessage,
      });
    } else {
      toast({
        title: "Account created!",
        description: "Welcome to Timeless. Start creating!",
      });
      navigate("/");
    }
  };

  const handleOAuthSignIn = async (provider: "google" | "apple") => {
    if (provider !== "google") {
      toast({
        title: "Coming Soon",
        description: `${provider.charAt(0).toUpperCase() + provider.slice(1)} sign-in will be available soon.`,
      });
      return;
    }

    setIsOAuthLoading(provider);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Sign in failed",
        description: error.message,
      });
      setIsOAuthLoading(null);
    }
  };

  const renderOAuthButtons = () => (
    <div className="space-y-3">
      <Button
        type="button"
        variant="outline"
        className="w-full h-12 bg-background/50 border-border/50 hover:bg-muted/50 transition-all duration-200"
        onClick={() => handleOAuthSignIn("google")}
        disabled={isOAuthLoading !== null}
      >
        {isOAuthLoading === "google" ? (
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        ) : (
          <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
        )}
        Continue with Google
      </Button>

      <Button
        type="button"
        variant="outline"
        className="w-full h-12 bg-background/50 border-border/50 hover:bg-muted/50 transition-all duration-200"
        onClick={() => handleOAuthSignIn("apple")}
        disabled={isOAuthLoading !== null}
      >
        {isOAuthLoading === "apple" ? (
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        ) : (
          <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
          </svg>
        )}
        Continue with Apple
      </Button>
    </div>
  );

  const renderDivider = () => (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-border/50" />
      </div>
      <div className="relative flex justify-center text-xs uppercase">
        <span className="bg-card px-2 text-muted-foreground">Or continue with email</span>
      </div>
    </div>
  );

  const renderPasswordInput = (id: string, label: string, value: string, onChange: (v: string) => void, error?: string) => (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          type={showPassword ? "text" : "password"}
          placeholder="••••••••"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-10 pr-10 bg-secondary/50 border-border/50 h-12 transition-all duration-200 focus:ring-2 focus:ring-primary/20"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error && (
        <p className="text-sm text-destructive flex items-center gap-1 animate-fade-in">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  );

  const renderEmailInput = () => (
    <div className="space-y-2">
      <Label htmlFor="email">Email</Label>
      <div className="relative">
        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="pl-10 bg-secondary/50 border-border/50 h-12 transition-all duration-200 focus:ring-2 focus:ring-primary/20"
        />
      </div>
      {errors.email && (
        <p className="text-sm text-destructive flex items-center gap-1 animate-fade-in">
          <AlertCircle className="h-3 w-3" />
          {errors.email}
        </p>
      )}
    </div>
  );

  const renderSignIn = () => (
    <form onSubmit={handleSignIn} className="space-y-4">
      {renderEmailInput()}
      {renderPasswordInput("password", "Password", password, setPassword, errors.password)}
      
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => changeView("forgot-password")}
          className="text-sm text-primary hover:text-primary/80 transition-colors"
        >
          Forgot password?
        </button>
      </div>

      <Button 
        type="submit" 
        className="w-full h-12 gradient-primary text-primary-foreground font-medium transition-all duration-200 hover:opacity-90"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Signing in...
          </>
        ) : (
          "Sign In"
        )}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Don't have an account?{" "}
        <button
          type="button"
          onClick={() => changeView("signup")}
          className="text-primary hover:text-primary/80 font-medium transition-colors"
        >
          Sign up
        </button>
      </p>
    </form>
  );

  const renderSignUp = () => (
    <form onSubmit={handleSignUp} className="space-y-4">
      {renderEmailInput()}
      {renderPasswordInput("password", "Password", password, setPassword, errors.password)}
      {renderPasswordInput("confirm-password", "Confirm Password", confirmPassword, setConfirmPassword, errors.confirmPassword)}

      <Button 
        type="submit" 
        className="w-full h-12 gradient-primary text-primary-foreground font-medium transition-all duration-200 hover:opacity-90"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating account...
          </>
        ) : (
          "Create Account"
        )}
      </Button>

      <p className="text-xs text-center text-muted-foreground">
        By signing up, you agree to our{" "}
        <a href="#" className="text-primary hover:underline">Terms of Service</a>
        {" "}and{" "}
        <a href="#" className="text-primary hover:underline">Privacy Policy</a>
      </p>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <button
          type="button"
          onClick={() => changeView("signin")}
          className="text-primary hover:text-primary/80 font-medium transition-colors"
        >
          Sign in
        </button>
      </p>
    </form>
  );

  const renderForgotPassword = () => (
    <form onSubmit={handleForgotPassword} className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold">Reset Password</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Enter your email to receive a reset link
        </p>
      </div>

      {renderEmailInput()}

      <Button 
        type="submit" 
        className="w-full h-12 gradient-primary text-primary-foreground font-medium transition-all duration-200 hover:opacity-90"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Sending...
          </>
        ) : (
          "Send Reset Link"
        )}
      </Button>

      <Button 
        type="button"
        variant="ghost" 
        className="w-full text-muted-foreground"
        onClick={() => changeView("signin")}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Sign In
      </Button>
    </form>
  );

  const renderResetSent = () => (
    <div className="text-center space-y-4">
      <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
        <Mail className="h-8 w-8 text-primary" />
      </div>
      <div>
        <h2 className="text-xl font-semibold">Check Your Email</h2>
        <p className="text-sm text-muted-foreground mt-1">
          We've sent a password reset link to<br />
          <span className="text-foreground font-medium">{email}</span>
        </p>
      </div>

      <Button 
        className="w-full h-12 gradient-primary text-primary-foreground font-medium"
        onClick={() => changeView("signin")}
      >
        Back to Sign In
      </Button>

      <button
        type="button"
        onClick={() => changeView("forgot-password")}
        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        Didn't receive email? Try again
      </button>
    </div>
  );

  const renderContent = () => {
    switch (view) {
      case "signin":
        return (
          <>
            {renderOAuthButtons()}
            {renderDivider()}
            {renderSignIn()}
          </>
        );
      case "signup":
        return (
          <>
            {renderOAuthButtons()}
            {renderDivider()}
            {renderSignUp()}
          </>
        );
      case "forgot-password":
        return renderForgotPassword();
      case "reset-sent":
        return renderResetSent();
    }
  };

  const getTitle = () => {
    switch (view) {
      case "signin":
        return "Welcome back";
      case "signup":
        return "Create your account";
      case "forgot-password":
      case "reset-sent":
        return "";
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Animated background effects */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 h-[500px] w-[500px] rounded-full bg-primary/15 blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 h-[400px] w-[400px] rounded-full bg-accent/10 blur-[100px] animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[300px] w-[300px] rounded-full bg-secondary/20 blur-[80px]" />
      </div>

      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className={cn(
          "text-center mb-8 transition-all duration-300",
          isAnimating ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"
        )}>
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 backdrop-blur-xl mb-4 shadow-lg">
            <img src={logo} alt="Timeless" className="h-12 w-12 object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Timeless AI</h1>
          {getTitle() && (
            <p className="text-muted-foreground mt-1">{getTitle()}</p>
          )}
        </div>

        {/* Auth Card */}
        <div className={cn(
          "bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-6 shadow-xl transition-all duration-300",
          isAnimating ? "opacity-0 scale-95" : "opacity-100 scale-100"
        )}>
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default Auth;
