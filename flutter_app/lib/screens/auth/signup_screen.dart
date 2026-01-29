import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/theme.dart';
import '../../providers/auth_provider.dart';

class SignupScreen extends StatefulWidget {
  const SignupScreen({super.key});

  @override
  State<SignupScreen> createState() => _SignupScreenState();
}

class _SignupScreenState extends State<SignupScreen>
    with SingleTickerProviderStateMixin {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;
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
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _handleSignup() async {
    if (!_formKey.currentState!.validate()) return;

    final authProvider = context.read<AuthProvider>();
    final success = await authProvider.signUp(
      email: _emailController.text.trim(),
      password: _passwordController.text,
      displayName: _nameController.text.trim(),
    );

    if (success && mounted) {
      // New users are always non-premium, show the upgrade wizard
      context.go('/upgrade-wizard', extra: true);
    }
  }

  Future<void> _handleGoogleSignIn() async {
    final authProvider = context.read<AuthProvider>();
    await authProvider.signInWithGoogle();
  }

  Future<void> _handleAppleSignIn() async {
    final authProvider = context.read<AuthProvider>();
    await authProvider.signInWithApple();
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
                        const SizedBox(height: 32),

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
                          child: const Icon(
                            Icons.auto_awesome,
                            size: 48,
                            color: AppTheme.primary,
                          ),
                        ),
                        const SizedBox(height: 24),
                        const Text(
                          'Create Account',
                          style: TextStyle(
                            fontSize: 32,
                            fontWeight: FontWeight.bold,
                          ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          'Start creating with AI',
                          style: TextStyle(
                            color: AppTheme.muted,
                            fontSize: 16,
                          ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 32),

                        // OAuth Buttons
                        _buildOAuthButton(
                          icon: Icons.g_mobiledata_rounded,
                          label: 'Continue with Google',
                          onPressed: _handleGoogleSignIn,
                        ),
                        const SizedBox(height: 12),
                        _buildOAuthButton(
                          icon: Icons.apple,
                          label: 'Continue with Apple',
                          onPressed: _handleAppleSignIn,
                        ),
                        const SizedBox(height: 24),

                        // Divider
                        Row(
                          children: [
                            Expanded(
                                child: Divider(
                                    color: AppTheme.muted.withOpacity(0.3))),
                            Padding(
                              padding:
                                  const EdgeInsets.symmetric(horizontal: 16),
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
                                      color: AppTheme.destructive
                                          .withOpacity(0.3)),
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

                        // Name field
                        TextFormField(
                          controller: _nameController,
                          textCapitalization: TextCapitalization.words,
                          decoration: InputDecoration(
                            labelText: 'Display Name',
                            hintText: 'Enter your name',
                            prefixIcon: const Icon(Icons.person_outline),
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
                              return 'Please enter your name';
                            }
                            return null;
                          },
                        ),
                        const SizedBox(height: 16),

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
                            hintText: 'Create a password',
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
                              return 'Please enter a password';
                            }
                            if (value.length < 6) {
                              return 'Password must be at least 6 characters';
                            }
                            return null;
                          },
                        ),
                        const SizedBox(height: 16),

                        // Confirm password field
                        TextFormField(
                          controller: _confirmPasswordController,
                          obscureText: _obscureConfirmPassword,
                          decoration: InputDecoration(
                            labelText: 'Confirm Password',
                            hintText: 'Confirm your password',
                            prefixIcon: const Icon(Icons.lock_outline),
                            suffixIcon: IconButton(
                              icon: Icon(
                                _obscureConfirmPassword
                                    ? Icons.visibility_off
                                    : Icons.visibility,
                              ),
                              onPressed: () {
                                setState(() {
                                  _obscureConfirmPassword =
                                      !_obscureConfirmPassword;
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
                            if (value != _passwordController.text) {
                              return 'Passwords do not match';
                            }
                            return null;
                          },
                        ),
                        const SizedBox(height: 24),

                        // Sign up button
                        Consumer<AuthProvider>(
                          builder: (context, auth, child) {
                            return Container(
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
                                onPressed:
                                    auth.isLoading ? null : _handleSignup,
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: Colors.transparent,
                                  shadowColor: Colors.transparent,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                ),
                                child: auth.isLoading
                                    ? const SizedBox(
                                        height: 20,
                                        width: 20,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                          color: Colors.white,
                                        ),
                                      )
                                    : const Text(
                                        'Create Account',
                                        style: TextStyle(
                                          fontSize: 16,
                                          fontWeight: FontWeight.w600,
                                          color: Colors.white,
                                        ),
                                      ),
                              ),
                            );
                          },
                        ),
                        const SizedBox(height: 16),

                        // Bonus message
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: AppTheme.primary.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                                color: AppTheme.primary.withOpacity(0.2)),
                          ),
                          child: const Row(
                            children: [
                              Icon(Icons.card_giftcard,
                                  color: AppTheme.primary),
                              SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  'Get 50 free credits when you sign up!',
                                  style: TextStyle(
                                    color: AppTheme.primary,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 24),

                        // Login link
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Text(
                              'Already have an account? ',
                              style: TextStyle(color: AppTheme.muted),
                            ),
                            TextButton(
                              onPressed: () => context.go('/login'),
                              style: TextButton.styleFrom(
                                padding: EdgeInsets.zero,
                                minimumSize: Size.zero,
                                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                              ),
                              child: const Text(
                                'Sign In',
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
      ),
    );
  }

  Widget _buildOAuthButton({
    required IconData icon,
    required String label,
    required VoidCallback onPressed,
  }) {
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
          onTap: onPressed,
          borderRadius: BorderRadius.circular(12),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(icon, size: 24),
                const SizedBox(width: 12),
                Text(
                  label,
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
    );
  }
}
