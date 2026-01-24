import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../services/calorie_service.dart';

class CalorieWrapperScreen extends StatefulWidget {
  const CalorieWrapperScreen({super.key});

  @override
  State<CalorieWrapperScreen> createState() => _CalorieWrapperScreenState();
}

class _CalorieWrapperScreenState extends State<CalorieWrapperScreen> {
  @override
  void initState() {
    super.initState();
    _checkProfile();
  }

  Future<void> _checkProfile() async {
    final hasProfile = await CalorieService.hasProfile();
    if (mounted) {
      if (hasProfile) {
        context.go('/calorie-dashboard');
      } else {
        context.go('/calorie-onboarding');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: CircularProgressIndicator(),
      ),
    );
  }
}
