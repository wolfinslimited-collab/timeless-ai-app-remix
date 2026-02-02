import { useState, useEffect } from "react";
import { Mail, Lock, Loader2, Eye, EyeOff, ArrowLeft, User, Gift } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { CountryPickerField } from "./CountryPicker";
import logo from "@/assets/logo.png";

interface MobileAuthProps {
  onSuccess: (hasActiveSubscription: boolean) => void;
}

type AuthView = "welcome" | "signin" | "signup" | "verification" | "forgot-password" | "reset-sent";

export function MobileAuth({ onSuccess }: MobileAuthProps) {
  const [view, setView] = useState<AuthView>("welcome");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [country, setCountry] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [isOAuthLoading, setIsOAuthLoading] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const { signIn } = useAuth();
  const { toast } = useToast();

  // Resend countdown
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  const changeView = (newView: AuthView) => {
    setIsAnimating(true);
    setTimeout(() => {
      setView(newView);
      setTimeout(() => setIsAnimating(false), 50);
    }, 200);
  };

  const checkSubscriptionStatus = async (): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      
      const { data: profile } = await supabase
        .from("profiles")
        .select("subscription_status")
        .eq("user_id", user.id)
        .maybeSingle();
      
      return profile?.subscription_status === 'active';
    } catch (error) {
      console.error("Error checking subscription:", error);
      return false;
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please fill in all fields",
      });
      return;
    }

    setIsLoading(true);
    setLoadingText("Signing in...");
    try {
      const { error } = await signIn(email, password);

      if (error) {
        toast({
          variant: "destructive",
          title: "Login failed",
          description: error.message,
        });
      } else {
        toast({
          title: "Welcome back!",
          description: "You're now logged in",
        });
        const hasSubscription = await checkSubscriptionStatus();
        onSuccess(hasSubscription);
      }
    } finally {
      setIsLoading(false);
      setLoadingText("");
    }
  };

  const handleSendVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !fullName) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please fill in all required fields",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Password must be at least 6 characters",
      });
      return;
    }

    setIsLoading(true);
    setLoadingText("Sending verification code...");

    try {
      // Call the send-verification edge function on the primary backend
      const response = await fetch(
        "https://ifesxveahsbjhmrhkhhy.supabase.co/functions/v1/send-verification",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            fullName,
            country: country || null,
            referralCode: referralCode || null,
            password,
          }),
        }
      );

      const data = await response.json();

      // Handle non-OK responses
      if (!response.ok) {
        const errorMessage = data?.error || data?.message || "Failed to send verification code.";
        throw new Error(errorMessage);
      }
      
      // Handle API-level errors returned in the response
      if (data?.error) {
        throw new Error(data.error);
      }

      changeView("verification");
      setResendCountdown(30);
      toast({
        title: "Verification code sent",
        description: "Please check your email for the 4-digit code.",
      });
    } catch (error: any) {
      console.error("Sign up error:", error);
      toast({
        variant: "destructive",
        title: "Sign up failed",
        description: error.message || "Failed to send verification code. Please try again.",
      });
    } finally {
      setIsLoading(false);
      setLoadingText("");
    }
  };

  const handleVerifyCode = async () => {
    if (verificationCode.length !== 4) {
      toast({
        variant: "destructive",
        title: "Invalid code",
        description: "Please enter the complete 4-digit code.",
      });
      return;
    }

    setIsLoading(true);
    setLoadingText("Verifying...");

    try {
      // Call verify-code with direct fetch
      const response = await fetch(
        "https://ifesxveahsbjhmrhkhhy.supabase.co/functions/v1/verify-code",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            code: verificationCode,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Verification failed");
      }
      if (data?.error) throw new Error(data.error);

      // Sign in after verification
      const { error: signInError } = await signIn(email, password);
      
      if (signInError) {
        toast({
          title: "Account created!",
          description: "Please sign in with your credentials.",
        });
        changeView("signin");
      } else {
        toast({
          title: "Welcome to Timeless!",
          description: referralCode 
            ? "You were referred by a friend - make your first creation to unlock bonus credits!"
            : "Your account is ready. Start creating!",
        });
        // New users don't have subscription yet
        onSuccess(false);
      }
    } catch (error: any) {
      setVerificationCode("");
      toast({
        variant: "destructive",
        title: "Verification failed",
        description: error.message || "The code you entered is incorrect",
      });
    } finally {
      setIsLoading(false);
      setLoadingText("");
    }
  };

  const handleResendCode = async () => {
    if (resendCountdown > 0) return;

    setIsLoading(true);
    setLoadingText("Resending code...");

    try {
      // Call send-verification with direct fetch
      const response = await fetch(
        "https://ifesxveahsbjhmrhkhhy.supabase.co/functions/v1/send-verification",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            fullName,
            country: country || null,
            referralCode: referralCode || null,
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Failed to resend code");
      }
      if (data?.error) throw new Error(data.error);

      setVerificationCode("");
      setResendCountdown(30);
      toast({
        title: "Code resent",
        description: "Please check your email for the new verification code.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to resend",
        description: error.message || "Please try again in a moment.",
      });
    } finally {
      setIsLoading(false);
      setLoadingText("");
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
    setLoadingText("Sending reset link...");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setIsLoading(false);
    setLoadingText("");

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
      <button
        type="button"
        onClick={() => handleOAuthSignIn("google")}
        disabled={isOAuthLoading !== null || isLoading}
        className="w-full flex items-center justify-center gap-3 bg-card/80 border border-border/30 rounded-xl py-3.5 text-foreground font-medium transition-all active:scale-[0.98] disabled:opacity-50"
      >
        {isOAuthLoading === "google" ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Signing in...
          </>
        ) : (
          <>
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </>
        )}
      </button>

      <button
        type="button"
        onClick={() => handleOAuthSignIn("apple")}
        disabled={isOAuthLoading !== null || isLoading}
        className="w-full flex items-center justify-center gap-3 bg-card/80 border border-border/30 rounded-xl py-3.5 text-foreground font-medium transition-all active:scale-[0.98] disabled:opacity-50"
      >
        {isOAuthLoading === "apple" ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Signing in...
          </>
        ) : (
          <>
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
            Continue with Apple
          </>
        )}
      </button>
    </div>
  );

  const renderDivider = () => (
    <div className="relative my-5">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-border/30" />
      </div>
      <div className="relative flex justify-center text-xs uppercase">
        <span className="bg-background px-3 text-muted-foreground">Or continue with email</span>
      </div>
    </div>
  );

  const renderSignIn = () => (
    <form onSubmit={handleSignIn} className="space-y-4">
      <div className="relative">
        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          disabled={isLoading}
          className="w-full bg-card/80 border border-border/30 rounded-xl px-12 py-3 text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50"
        />
      </div>

      <div className="relative">
        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          disabled={isLoading}
          className="w-full bg-card/80 border border-border/30 rounded-xl px-12 py-3 text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50"
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
        className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-[0.98]"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            {loadingText}
          </>
        ) : "Sign In"}
      </button>

      <button
        type="button"
        onClick={() => changeView("welcome")}
        className="w-full flex items-center justify-center gap-2 text-muted-foreground py-2"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
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
    <form onSubmit={handleSendVerification} className="space-y-3">
      {/* Full Name */}
      <div className="relative">
        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Full Name"
          disabled={isLoading}
          className="w-full bg-card/80 border border-border/30 rounded-xl px-12 py-3 text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50"
        />
      </div>

      {/* Email */}
      <div className="relative">
        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          disabled={isLoading}
          className="w-full bg-card/80 border border-border/30 rounded-xl px-12 py-3 text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50"
        />
      </div>

      {/* Password */}
      <div className="relative">
        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          disabled={isLoading}
          className="w-full bg-card/80 border border-border/30 rounded-xl px-12 py-3 text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
        >
          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
      </div>

      {/* Country */}
      <CountryPickerField
        value={country}
        onChange={setCountry}
        disabled={isLoading}
      />

      {/* Referral Code */}
      <div className="relative">
        <Gift className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          value={referralCode}
          onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
          placeholder="Referral Code (optional)"
          disabled={isLoading}
          className="w-full bg-card/80 border border-border/30 rounded-xl px-12 py-3 text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50"
        />
      </div>

      <p className="text-xs text-center text-muted-foreground">
        By signing up, you agree to our Terms of Service and Privacy Policy.
      </p>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-[0.98]"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            {loadingText}
          </>
        ) : "Create Account"}
      </button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <button type="button" onClick={() => changeView("signin")} className="text-primary font-medium">
          Sign in
        </button>
      </p>
    </form>
  );

  const renderVerification = () => (
    <div className="space-y-5">
      <div className="text-center">
        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <Mail className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">Verify Your Email</h2>
        <p className="text-sm text-muted-foreground mt-1">
          We sent a 4-digit code to<br />
          <span className="text-foreground font-medium">{email}</span>
        </p>
      </div>

      {/* OTP Input */}
      <div className="flex justify-center gap-3">
        {[0, 1, 2, 3].map((index) => (
          <input
            key={index}
            type="text"
            maxLength={1}
            value={verificationCode[index] || ""}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, "");
              if (value) {
                const newCode = verificationCode.split("");
                newCode[index] = value;
                setVerificationCode(newCode.join(""));
                // Focus next input
                const nextInput = document.getElementById(`otp-${index + 1}`);
                if (nextInput) nextInput.focus();
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Backspace" && !verificationCode[index]) {
                const prevInput = document.getElementById(`otp-${index - 1}`);
                if (prevInput) prevInput.focus();
              }
            }}
            id={`otp-${index}`}
            disabled={isLoading}
            className="w-14 h-16 text-center text-2xl font-bold bg-card/80 border border-border/30 rounded-xl text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50"
          />
        ))}
      </div>

      {/* Resend */}
      <div className="text-center text-sm text-muted-foreground">
        Didn't receive the code?{" "}
        {resendCountdown > 0 ? (
          <span>Resend in {resendCountdown}s</span>
        ) : (
          <button
            type="button"
            onClick={handleResendCode}
            disabled={isLoading}
            className="text-primary font-medium"
          >
            Resend
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={handleVerifyCode}
        disabled={isLoading || verificationCode.length !== 4}
        className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-[0.98]"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            {loadingText}
          </>
        ) : "Verify & Create Account"}
      </button>

      <button
        type="button"
        onClick={() => {
          changeView("signup");
          setVerificationCode("");
        }}
        className="w-full flex items-center justify-center gap-2 text-muted-foreground py-2"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Sign Up
      </button>
    </div>
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
          disabled={isLoading}
          className="w-full bg-card/80 border border-border/30 rounded-xl px-12 py-3 text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50"
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-[0.98]"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            {loadingText}
          </>
        ) : "Send Reset Link"}
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
        className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold py-3 rounded-xl transition-all active:scale-[0.98]"
      >
        Back to Sign In
      </button>
    </div>
  );

  const renderWelcome = () => (
    <div className="space-y-4">
      {renderOAuthButtons()}
      
      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border/30" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-3 text-muted-foreground">Or</span>
        </div>
      </div>
      
      <button
        type="button"
        onClick={() => changeView("signin")}
        className="w-full flex items-center justify-center gap-3 bg-card/80 border border-border/30 rounded-xl py-3.5 text-foreground font-medium transition-all active:scale-[0.98]"
      >
        <Mail className="h-5 w-5 text-muted-foreground" />
        Continue with Email
      </button>
      
      <p className="text-center text-sm text-muted-foreground pt-4">
        Don't have an account?{" "}
        <button type="button" onClick={() => changeView("signup")} className="text-primary font-medium">
          Sign up
        </button>
      </p>
    </div>
  );

  const renderContent = () => {
    switch (view) {
      case "welcome":
        return renderWelcome();
      case "signin":
        return renderSignIn();
      case "signup":
        return (
          <>
            {renderOAuthButtons()}
            {renderDivider()}
            {renderSignUp()}
          </>
        );
      case "verification":
        return renderVerification();
      case "forgot-password":
        return renderForgotPassword();
      case "reset-sent":
        return renderResetSent();
    }
  };

  const getTitle = () => {
    switch (view) {
      case "welcome":
        return "Welcome";
      case "signin":
        return "Sign in with email";
      case "signup":
        return "Create your account";
      case "verification":
        return "";
      default:
        return "";
    }
  };

  return (
    <div className="h-full flex flex-col px-6 py-4 overflow-y-auto">
      {/* Header */}
      <div className={cn(
        "text-center mb-4 transition-all duration-300",
        isAnimating ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"
      )}>
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 mb-2">
          <img src={logo} alt="Timeless" className="h-9 w-9 object-contain" />
        </div>
        <h1 className="text-lg font-bold text-foreground">Timeless AI</h1>
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
