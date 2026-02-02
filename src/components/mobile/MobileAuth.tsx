import { useState, useEffect } from "react";
import { Mail, Lock, Loader2, Eye, EyeOff, ArrowLeft, User, Gift, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { CountryPickerField } from "./CountryPicker";
import logo from "@/assets/logo.png";

interface MobileAuthProps {
  onSuccess: (hasActiveSubscription: boolean) => void;
}

type AuthView = "signin" | "signup" | "verification" | "forgot-password" | "reset-sent";

export function MobileAuth({ onSuccess }: MobileAuthProps) {
  const [view, setView] = useState<AuthView>("signin");
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
  const [error, setError] = useState<string | null>(null);
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
    setError(null);
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
      setError("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    setLoadingText("Signing in...");
    setError(null);
    try {
      const { error } = await signIn(email, password);

      if (error) {
        setError(error.message);
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
      setError("Please fill in all required fields");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);
    setLoadingText("Sending verification code...");
    setError(null);

    try {
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
        const errorMessage = data?.error || data?.message || "Failed to send verification code.";
        throw new Error(errorMessage);
      }
      
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
      setError(error.message || "Failed to send verification code. Please try again.");
    } finally {
      setIsLoading(false);
      setLoadingText("");
    }
  };

  const handleVerifyCode = async () => {
    if (verificationCode.length !== 4) {
      setError("Please enter the complete 4-digit code");
      return;
    }

    setIsLoading(true);
    setLoadingText("Verifying...");
    setError(null);

    try {
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
        onSuccess(false);
      }
    } catch (error: any) {
      setVerificationCode("");
      setError(error.message || "The code you entered is incorrect");
    } finally {
      setIsLoading(false);
      setLoadingText("");
    }
  };

  const handleResendCode = async () => {
    if (resendCountdown > 0) return;

    setIsLoading(true);
    setLoadingText("Resending code...");
    setError(null);

    try {
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
      setError(error.message || "Please try again in a moment.");
    } finally {
      setIsLoading(false);
      setLoadingText("");
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email");
      return;
    }

    setIsLoading(true);
    setLoadingText("Sending reset link...");
    setError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setIsLoading(false);
    setLoadingText("");

    if (error) {
      setError(error.message);
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

  // Error display component matching Flutter
  const renderError = () => {
    if (!error) return null;
    return (
      <div className="flex items-start gap-2 p-3 mb-4 rounded-xl bg-destructive/10 border border-destructive/30">
        <div className="flex-shrink-0 mt-0.5">
          <svg className="w-5 h-5 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <p className="flex-1 text-sm text-destructive">{error}</p>
        <button 
          onClick={() => setError(null)}
          className="flex-shrink-0 text-destructive/70 hover:text-destructive"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    );
  };

  // OAuth buttons matching Flutter style
  const renderOAuthButtons = () => (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => handleOAuthSignIn("google")}
        disabled={isOAuthLoading !== null || isLoading}
        className="w-full h-[52px] flex items-center justify-center gap-3 bg-card border border-border/20 rounded-xl text-foreground font-medium transition-all hover:bg-card/80 active:scale-[0.98] disabled:opacity-50"
      >
        {isOAuthLoading === "google" ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Signing in...</span>
          </>
        ) : (
          <>
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>Continue with Google</span>
          </>
        )}
      </button>

      <button
        type="button"
        onClick={() => handleOAuthSignIn("apple")}
        disabled={isOAuthLoading !== null || isLoading}
        className="w-full h-[52px] flex items-center justify-center gap-3 bg-card border border-border/20 rounded-xl text-foreground font-medium transition-all hover:bg-card/80 active:scale-[0.98] disabled:opacity-50"
      >
        {isOAuthLoading === "apple" ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Signing in...</span>
          </>
        ) : (
          <>
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
            <span>Continue with Apple</span>
          </>
        )}
      </button>
    </div>
  );

  // Divider matching Flutter
  const renderDivider = () => (
    <div className="flex items-center gap-4 my-6">
      <div className="flex-1 h-px bg-muted-foreground/30" />
      <span className="text-xs text-muted-foreground/70">Or continue with email</span>
      <div className="flex-1 h-px bg-muted-foreground/30" />
    </div>
  );

  // Input field styling matching Flutter
  const inputClassName = "w-full h-12 bg-card border border-border/20 rounded-xl px-4 pl-12 text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary transition-all disabled:opacity-50";

  const renderSignIn = () => (
    <div className="flex flex-col min-h-full">
      {/* Logo & Title - Matching Flutter */}
      <div className="text-center pt-8 pb-6">
        <div className="inline-flex items-center justify-center p-4 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 mb-6">
          <img src={logo} alt="Timeless" className="h-16 w-16 object-contain" />
        </div>
        <h1 className="text-[32px] font-bold text-foreground">Welcome Back</h1>
        <p className="text-base text-muted-foreground mt-2">Sign in to continue creating</p>
      </div>

      {/* OAuth Buttons */}
      {renderOAuthButtons()}
      
      {/* Divider */}
      {renderDivider()}

      {/* Error */}
      {renderError()}

      {/* Form */}
      <form onSubmit={handleSignIn} className="space-y-4">
        {/* Email */}
        <div className="relative">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            disabled={isLoading}
            className={inputClassName}
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
            className={inputClassName}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>

        {/* Forgot password */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => changeView("forgot-password")}
            className="text-sm text-primary font-medium"
          >
            Forgot password?
          </button>
        </div>

        {/* Sign In Button - Gradient with shadow like Flutter */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-14 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-[0.98] shadow-lg shadow-primary/30"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {loadingText}
            </>
          ) : "Sign In"}
        </button>

        {/* Sign up link */}
        <div className="text-center pt-4">
          <span className="text-muted-foreground">Don't have an account? </span>
          <button 
            type="button" 
            onClick={() => changeView("signup")} 
            className="text-primary font-semibold"
          >
            Sign Up
          </button>
        </div>
      </form>
    </div>
  );

  const renderSignUp = () => (
    <div className="flex flex-col min-h-full">
      {/* Logo & Title - Matching Flutter Signup */}
      <div className="text-center pt-4 pb-4">
        <div className="inline-flex items-center justify-center p-4 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 mb-4">
          <Sparkles className="h-12 w-12 text-primary" />
        </div>
        <h1 className="text-[32px] font-bold text-foreground">Create Account</h1>
        <p className="text-base text-muted-foreground mt-2">Start creating with AI</p>
      </div>

      {/* Referral Banner */}
      {referralCode && (
        <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-primary/10 border border-primary/30">
          <Gift className="w-5 h-5 text-primary flex-shrink-0" />
          <span className="text-sm text-primary">You were invited! Sign up to get bonus credits</span>
        </div>
      )}

      {/* OAuth Buttons */}
      {renderOAuthButtons()}
      
      {/* Divider */}
      {renderDivider()}

      {/* Error */}
      {renderError()}

      {/* Form */}
      <form onSubmit={handleSendVerification} className="space-y-4">
        {/* Full Name */}
        <div className="relative">
          <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Full Name"
            disabled={isLoading}
            className={inputClassName}
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
            className={inputClassName}
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
            className={inputClassName}
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
            className={inputClassName}
          />
        </div>

        {/* Create Account Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-14 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-[0.98] shadow-lg shadow-primary/30"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {loadingText}
            </>
          ) : "Create Account"}
        </button>

        {/* Sign in link */}
        <div className="text-center pt-2">
          <span className="text-muted-foreground">Already have an account? </span>
          <button 
            type="button" 
            onClick={() => changeView("signin")} 
            className="text-primary font-semibold"
          >
            Sign In
          </button>
        </div>
      </form>
    </div>
  );

  const renderVerification = () => (
    <div className="flex flex-col min-h-full pt-8">
      {/* Icon */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center p-5 rounded-full bg-primary/10 mb-6">
          <Mail className="h-12 w-12 text-primary" />
        </div>
        <h1 className="text-[28px] font-bold text-foreground">Verify Your Email</h1>
        <p className="text-base text-muted-foreground mt-3">We sent a 4-digit code to</p>
        <p className="text-base font-semibold text-foreground mt-1">{email}</p>
      </div>

      {/* Error */}
      {renderError()}

      {/* OTP Input - matching Flutter style */}
      <div className="flex justify-center gap-3 mb-6">
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
            className="w-14 h-16 text-center text-2xl font-bold bg-card border border-border/20 rounded-xl text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50"
          />
        ))}
      </div>

      {/* Resend */}
      <div className="text-center text-sm text-muted-foreground mb-6">
        <span>Didn't receive the code? </span>
        {resendCountdown > 0 ? (
          <span className="text-muted-foreground">Resend in {resendCountdown}s</span>
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

      <div className="flex-1" />

      {/* Verify Button */}
      <button
        type="button"
        onClick={handleVerifyCode}
        disabled={isLoading || verificationCode.length !== 4}
        className="w-full h-14 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-[0.98] shadow-lg shadow-primary/30"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            {loadingText}
          </>
        ) : "Verify & Create Account"}
      </button>

      {/* Back button */}
      <button
        type="button"
        onClick={() => {
          changeView("signup");
          setVerificationCode("");
        }}
        className="w-full flex items-center justify-center gap-2 text-muted-foreground py-4 mt-3"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Sign Up</span>
      </button>
    </div>
  );

  const renderForgotPassword = () => (
    <div className="flex flex-col min-h-full pt-8">
      {/* Icon */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center p-5 rounded-full bg-primary/10 mb-6">
          <Lock className="h-12 w-12 text-primary" />
        </div>
        <h1 className="text-[28px] font-bold text-foreground">Reset Password</h1>
        <p className="text-base text-muted-foreground mt-3">Enter your email to receive a reset link</p>
      </div>

      {/* Error */}
      {renderError()}

      <form onSubmit={handleForgotPassword} className="space-y-4">
        <div className="relative">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            disabled={isLoading}
            className={inputClassName}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-14 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-[0.98] shadow-lg shadow-primary/30"
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
          className="w-full flex items-center justify-center gap-2 text-muted-foreground py-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Sign In</span>
        </button>
      </form>
    </div>
  );

  const renderResetSent = () => (
    <div className="flex flex-col min-h-full pt-8">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center p-5 rounded-full bg-primary/10 mb-6">
          <Mail className="h-12 w-12 text-primary" />
        </div>
        <h1 className="text-[28px] font-bold text-foreground">Check Your Email</h1>
        <p className="text-base text-muted-foreground mt-3">
          We've sent a reset link to
        </p>
        <p className="text-base font-semibold text-foreground mt-1">{email}</p>
      </div>

      <div className="flex-1" />

      <button
        type="button"
        onClick={() => changeView("signin")}
        className="w-full h-14 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-semibold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-primary/30"
      >
        Back to Sign In
      </button>
    </div>
  );

  const renderContent = () => {
    switch (view) {
      case "signin":
        return renderSignIn();
      case "signup":
        return renderSignUp();
      case "verification":
        return renderVerification();
      case "forgot-password":
        return renderForgotPassword();
      case "reset-sent":
        return renderResetSent();
    }
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
      {/* Content with animation */}
      <div className={cn(
        "flex-1 px-6 pb-6 overflow-y-auto transition-all duration-300",
        isAnimating ? "opacity-0 scale-95" : "opacity-100 scale-100"
      )}>
        {renderContent()}
      </div>
    </div>
  );
}
