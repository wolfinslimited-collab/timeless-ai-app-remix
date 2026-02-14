import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/theme.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/oauth_icons.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen>
    with SingleTickerProviderStateMixin {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;
  bool _loginLoading = false;
  bool _googleLoading = false;
  bool _appleLoading = false;

  bool get _anyLoading => _loginLoading || _googleLoading || _appleLoading;
  late AnimationController _animationController;
  late Animation<double> _fadeAnimation;
  late Animation<Offset> _slideAnimation;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 300),
    );
    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.easeOut),
    );
    _slideAnimation = Tween<Offset>(
      begin: const Offset(0, 0.1),
      end: Offset.zero,
    ).animate(
        CurvedAnimation(parent: _animationController, curve: Curves.easeOut));
    _animationController.forward();
  }

  @override
  void dispose() {
    _animationController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _loginLoading = true);
    final authProvider = context.read<AuthProvider>();
    final success = await authProvider.signIn(
      email: _emailController.text.trim(),
      password: _passwordController.text,
    );
    if (mounted) setState(() => _loginLoading = false);

    if (success && mounted) {
      final hasSubscription = authProvider.hasActiveSubscription;
      if (hasSubscription) {
        context.go('/');
      } else {
        context.go('/upgrade-wizard', extra: true);
      }
    }
  }

  Future<void> _handleGoogleSignIn() async {
    setState(() => _googleLoading = true);
    final authProvider = context.read<AuthProvider>();
    final success = await authProvider.signInWithGoogle();
    if (mounted) setState(() => _googleLoading = false);

    if (success && mounted) {
      _navigateAfterAuth(authProvider);
    }
  }

  Future<void> _handleAppleSignIn() async {
    setState(() => _appleLoading = true);
    final authProvider = context.read<AuthProvider>();
    final success = await authProvider.signInWithApple();
    if (mounted) setState(() => _appleLoading = false);

    if (success && mounted) {
      _navigateAfterAuth(authProvider);
    }
  }

  void _navigateAfterAuth(AuthProvider authProvider) {
    // Check if user has active subscription
    final hasSubscription = authProvider.hasActiveSubscription;
    if (hasSubscription) {
      context.go('/');
    } else {
      // Show upgrade wizard for non-premium users
      context.go('/upgrade-wizard', extra: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
        body: Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            AppTheme.background,
            AppTheme.background,
            AppTheme.primary.withOpacity(0.05),
          ],
        ),
      ),
      child: GestureDetector(
        onTap: () => FocusScope.of(context).unfocus(),
        behavior: HitTestBehavior.opaque,
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: FadeTransition(
              opacity: _fadeAnimation,
              child: SlideTransition(
                position: _slideAnimation,
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const SizedBox(height: 48),

                      // Logo & Title
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          gradient: LinearGradient(
                            colors: [
                              AppTheme.primary.withOpacity(0.2),
                              AppTheme.primary.withOpacity(0.1),
                            ],
                          ),
                        ),
                        child: SizedBox(
                          width: MediaQuery.of(context).size.width * 0.2,
                          height: MediaQuery.of(context).size.width * 0.2,
                          child: Image.asset(
                            "assets/logos/logo.png",
                          ),
                        ),
                      ),
                      const SizedBox(height: 24),
                      const Text(
                        'Welcome Back',
                        style: TextStyle(
                          fontSize: 32,
                          fontWeight: FontWeight.bold,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'Sign in to continue creating',
                        style: TextStyle(
                          color: AppTheme.muted,
                          fontSize: 16,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 40),

                      // OAuth Buttons
                      _buildGoogleButton(),
                      const SizedBox(height: 12),
                      _buildAppleButton(),
                      const SizedBox(height: 24),

                      // Divider
                      Row(
                        children: [
                          Expanded(
                              child: Divider(
                                  color: AppTheme.muted.withOpacity(0.3))),
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            child: Text(
                              'Or continue with email',
                              style: TextStyle(
                                color: AppTheme.muted.withOpacity(0.7),
                                fontSize: 12,
                              ),
                            ),
                          ),
                          Expanded(
                              child: Divider(
                                  color: AppTheme.muted.withOpacity(0.3))),
                        ],
                      ),
                      const SizedBox(height: 24),

                      // Error message
                      Consumer<AuthProvider>(
                        builder: (context, auth, child) {
                          if (auth.error != null) {
                            return Container(
                              padding: const EdgeInsets.all(12),
                              margin: const EdgeInsets.only(bottom: 16),
                              decoration: BoxDecoration(
                                color: AppTheme.destructive.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(
                                    color:
                                        AppTheme.destructive.withOpacity(0.3)),
                              ),
                              child: Row(
                                children: [
                                  const Icon(Icons.error_outline,
                                      color: AppTheme.destructive, size: 20),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      auth.error!,
                                      style: const TextStyle(
                                          color: AppTheme.destructive,
                                          fontSize: 14),
                                    ),
                                  ),
                                  IconButton(
                                    icon: const Icon(Icons.close, size: 18),
                                    onPressed: () => auth.clearError(),
                                    padding: EdgeInsets.zero,
                                    constraints: const BoxConstraints(),
                                  ),
                                ],
                              ),
                            );
                          }
                          return const SizedBox.shrink();
                        },
                      ),

                      // Email field
                      TextFormField(
                        controller: _emailController,
                        keyboardType: TextInputType.emailAddress,
                        autocorrect: false,
                        decoration: InputDecoration(
                          labelText: 'Email',
                          hintText: 'Enter your email',
                          prefixIcon: const Icon(Icons.email_outlined),
                          filled: true,
                          fillColor: AppTheme.card,
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: BorderSide.none,
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: BorderSide(
                                color: AppTheme.muted.withOpacity(0.2)),
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide:
                                const BorderSide(color: AppTheme.primary),
                          ),
                        ),
                        validator: (value) {
                          if (value == null || value.isEmpty) {
                            return 'Please enter your email';
                          }
                          if (!value.contains('@')) {
                            return 'Please enter a valid email';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),

                      // Password field
                      TextFormField(
                        controller: _passwordController,
                        obscureText: _obscurePassword,
                        decoration: InputDecoration(
                          labelText: 'Password',
                          hintText: 'Enter your password',
                          prefixIcon: const Icon(Icons.lock_outline),
                          suffixIcon: IconButton(
                            icon: Icon(
                              _obscurePassword
                                  ? Icons.visibility_off
                                  : Icons.visibility,
                            ),
                            onPressed: () {
                              setState(() {
                                _obscurePassword = !_obscurePassword;
                              });
                            },
                          ),
                          filled: true,
                          fillColor: AppTheme.card,
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: BorderSide.none,
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: BorderSide(
                                color: AppTheme.muted.withOpacity(0.2)),
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide:
                                const BorderSide(color: AppTheme.primary),
                          ),
                        ),
                        validator: (value) {
                          if (value == null || value.isEmpty) {
                            return 'Please enter your password';
                          }
                          if (value.length < 6) {
                            return 'Password must be at least 6 characters';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 8),

                      // Forgot password
                      Align(
                        alignment: Alignment.centerRight,
                        child: TextButton(
                          onPressed: () => context.go('/forgot-password'),
                          child: const Text(
                            'Forgot password?',
                            style: TextStyle(fontSize: 14),
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Login button
                      Container(
                        height: 56,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(12),
                          gradient: LinearGradient(
                            colors: [
                              AppTheme.primary,
                              AppTheme.primary.withOpacity(0.8),
                            ],
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: AppTheme.primary.withOpacity(0.3),
                              blurRadius: 12,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: ElevatedButton(
                          onPressed: _anyLoading ? null : _handleLogin,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.transparent,
                            shadowColor: Colors.transparent,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                          child: _loginLoading
                              ? const SizedBox(
                                  height: 20,
                                  width: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: Colors.white,
                                  ),
                                )
                              : const Text(
                                  'Sign In',
                                  style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w600,
                                    color: Colors.white,
                                  ),
                                ),
                        ),
                      ),
                      const SizedBox(height: 24),

                      // Sign up link
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Text(
                            "Don't have an account? ",
                            style: TextStyle(color: AppTheme.muted),
                          ),
                          TextButton(
                            onPressed: () => context.go('/signup'),
                            style: TextButton.styleFrom(
                              padding: EdgeInsets.zero,
                              minimumSize: Size.zero,
                              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                            ),
                            child: const Text(
                              'Sign Up',
                              style: TextStyle(
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    ));
  }

  Widget _buildGoogleButton() {
    return Container(
      height: 52,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.muted.withOpacity(0.2)),
      ),
      child: Material(
        color: AppTheme.card,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          onTap: _anyLoading ? null : _handleGoogleSignIn,
          borderRadius: BorderRadius.circular(12),
          child: Opacity(
            opacity: _anyLoading ? 0.5 : 1.0,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  if (_googleLoading)
                    const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  else
                    const GoogleIcon(size: 20),
                  const SizedBox(width: 12),
                  Text(
                    _googleLoading ? 'Signing in...' : 'Continue with Google',
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildAppleButton() {
    return Container(
      height: 52,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.muted.withOpacity(0.2)),
      ),
      child: Material(
        color: AppTheme.card,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          onTap: _anyLoading ? null : _handleAppleSignIn,
          borderRadius: BorderRadius.circular(12),
          child: Opacity(
            opacity: _anyLoading ? 0.5 : 1.0,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  if (_appleLoading)
                    const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  else
                    const AppleIcon(size: 20, color: AppTheme.foreground),
                  const SizedBox(width: 12),
                  Text(
                    _appleLoading ? 'Signing in...' : 'Continue with Apple',
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
