import { useState } from "react";
import { Mail, Lock, Loader2, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface MobileAuthProps {
  onSuccess: () => void;
}

export function MobileAuth({ onSuccess }: MobileAuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();

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

    setIsLoading(true);
    try {
      const { error } = isLogin 
        ? await signIn(email, password)
        : await signUp(email, password);

      if (error) {
        toast({
          variant: "destructive",
          title: isLogin ? "Login failed" : "Sign up failed",
          description: error.message,
        });
      } else {
        toast({
          title: isLogin ? "Welcome back!" : "Account created!",
          description: isLogin ? "You're now logged in" : "Please check your email to verify your account",
        });
        if (isLogin) {
          onSuccess();
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col px-6 py-8">
      <div className="text-center mb-8">
        <h1 className="text-white text-2xl font-bold mb-2">Timeless AI</h1>
        <p className="text-gray-400 text-sm">
          {isLogin ? "Welcome back" : "Create your account"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 flex-1">
        <div className="relative">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full bg-white/10 border border-white/10 rounded-xl px-12 py-3.5 text-white placeholder:text-gray-500 outline-none focus:border-purple-500 transition-colors"
          />
        </div>

        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full bg-white/10 border border-white/10 rounded-xl px-12 py-3.5 text-white placeholder:text-gray-500 outline-none focus:border-purple-500 transition-colors"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            isLogin ? "Sign In" : "Create Account"
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <button
          onClick={() => setIsLogin(!isLogin)}
          className="text-purple-400 text-sm"
        >
          {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
