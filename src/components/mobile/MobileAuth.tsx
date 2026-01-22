import { useState } from "react";
import { Mail, Lock, Loader2, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";

interface MobileAuthProps {
  onSuccess: () => void;
}

type AuthView = "signin" | "signup" | "forgot-password" | "reset-sent";

export function MobileAuth({ onSuccess }: MobileAuthProps) {
  const [view, setView] = useState<AuthView>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isOAuthLoading, setIsOAuthLoading] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();

  const changeView = (newView: AuthView) => {
    setIsAnimating(true);
    setTimeout(() => {
      setView(newView);
      setTimeout(() => setIsAnimating(false), 50);
    }, 200);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please fill in all fields",
      });
      return;
    }

    if (view === "signup" && password !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Passwords do not match",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = view === "signin"
        ? await signIn(email, password)
        : await signUp(email, password);

      if (error) {
        toast({
          variant: "destructive",
          title: view === "signin" ? "Login failed" : "Sign up failed",
          description: error.message,
        });
      } else {
        toast({
          title: view === "signin" ? "Welcome back!" : "Account created!",
          description: view === "signin" ? "You're now logged in" : "Welcome to Timeless!",
        });
        onSuccess();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter your email",
      });
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setIsLoading(false);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } else {
      changeView("reset-sent");
    }
  };

  const handleOAuthSignIn = async (provider: "google" | "facebook" | "apple") => {
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
      <button
        type="button"
        onClick={() => handleOAuthSignIn("google")}
        disabled={isOAuthLoading !== null}
        className="w-full flex items-center justify-center gap-3 bg-card/80 border border-border/30 rounded-xl py-3.5 text-foreground font-medium transition-all active:scale-[0.98]"
      >
        {isOAuthLoading === "google" ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
        )}
        Continue with Google
      </button>

      <button
        type="button"
        onClick={() => handleOAuthSignIn("apple")}
        disabled={isOAuthLoading !== null}
        className="w-full flex items-center justify-center gap-3 bg-card/80 border border-border/30 rounded-xl py-3.5 text-foreground font-medium transition-all active:scale-[0.98]"
      >
        {isOAuthLoading === "apple" ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
          </svg>
        )}
        Continue with Apple
      </button>

      <button
        type="button"
        onClick={() => handleOAuthSignIn("facebook")}
        disabled={isOAuthLoading !== null}
        className="w-full flex items-center justify-center gap-3 bg-card/80 border border-border/30 rounded-xl py-3.5 text-foreground font-medium transition-all active:scale-[0.98]"
      >
        {isOAuthLoading === "facebook" ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#1877F2">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
        )}
        Continue with Facebook
      </button>
    </div>
  );

  const renderDivider = () => (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-border/30" />
      </div>
      <div className="relative flex justify-center text-xs uppercase">
        <span className="bg-background px-3 text-muted-foreground">Or continue with email</span>
      </div>
    </div>
  );

  const renderSignIn = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="relative">
        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full bg-card/80 border border-border/30 rounded-xl px-12 py-3.5 text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
        />
      </div>

      <div className="relative">
        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full bg-card/80 border border-border/30 rounded-xl px-12 py-3.5 text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
        >
          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => changeView("forgot-password")}
          className="text-sm text-primary"
        >
          Forgot password?
        </button>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-[0.98]"
      >
        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign In"}
      </button>

      <p className="text-center text-sm text-muted-foreground">
        Don't have an account?{" "}
        <button type="button" onClick={() => changeView("signup")} className="text-primary font-medium">
          Sign up
        </button>
      </p>
    </form>
  );

  const renderSignUp = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="relative">
        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full bg-card/80 border border-border/30 rounded-xl px-12 py-3.5 text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
        />
      </div>

      <div className="relative">
        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full bg-card/80 border border-border/30 rounded-xl px-12 py-3.5 text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
        >
          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
      </div>

      <div className="relative">
        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type={showPassword ? "text" : "password"}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm Password"
          className="w-full bg-card/80 border border-border/30 rounded-xl px-12 py-3.5 text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-[0.98]"
      >
        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Account"}
      </button>

      <p className="text-xs text-center text-muted-foreground">
        By signing up, you agree to our Terms of Service
      </p>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <button type="button" onClick={() => changeView("signin")} className="text-primary font-medium">
          Sign in
        </button>
      </p>
    </form>
  );

  const renderForgotPassword = () => (
    <form onSubmit={handleForgotPassword} className="space-y-4">
      <div className="text-center mb-4">
        <h2 className="text-lg font-semibold text-foreground">Reset Password</h2>
        <p className="text-sm text-muted-foreground">Enter your email to receive a reset link</p>
      </div>

      <div className="relative">
        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full bg-card/80 border border-border/30 rounded-xl px-12 py-3.5 text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-[0.98]"
      >
        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send Reset Link"}
      </button>

      <button
        type="button"
        onClick={() => changeView("signin")}
        className="w-full flex items-center justify-center gap-2 text-muted-foreground py-2"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Sign In
      </button>
    </form>
  );

  const renderResetSent = () => (
    <div className="text-center space-y-4">
      <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
        <Mail className="h-8 w-8 text-primary" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-foreground">Check Your Email</h2>
        <p className="text-sm text-muted-foreground mt-1">
          We've sent a reset link to<br />
          <span className="text-foreground font-medium">{email}</span>
        </p>
      </div>

      <button
        type="button"
        onClick={() => changeView("signin")}
        className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold py-3.5 rounded-xl transition-all active:scale-[0.98]"
      >
        Back to Sign In
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
      default:
        return "";
    }
  };

  return (
    <div className="h-full flex flex-col px-6 py-6 overflow-y-auto">
      {/* Header */}
      <div className={cn(
        "text-center mb-6 transition-all duration-300",
        isAnimating ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"
      )}>
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 mb-3">
          <img src={logo} alt="Timeless" className="h-10 w-10 object-contain" />
        </div>
        <h1 className="text-xl font-bold text-foreground">Timeless AI</h1>
        {getTitle() && (
          <p className="text-muted-foreground text-sm mt-0.5">{getTitle()}</p>
        )}
      </div>

      {/* Content */}
      <div className={cn(
        "flex-1 transition-all duration-300",
        isAnimating ? "opacity-0 scale-95" : "opacity-100 scale-100"
      )}>
        {renderContent()}
      </div>
    </div>
  );
}
