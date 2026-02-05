 import 'package:flutter/material.dart';
 import 'package:go_router/go_router.dart';
 import '../../core/theme.dart';
 
 /// A lock screen widget that shows when users without Premium Plus
 /// try to access Premium Plus-only features.
 class PremiumPlusLockScreen extends StatelessWidget {
   final String feature;
   final String description;
   final VoidCallback? onBack;
 
   const PremiumPlusLockScreen({
     super.key,
     required this.feature,
     required this.description,
     this.onBack,
   });
 
   @override
   Widget build(BuildContext context) {
     return Scaffold(
       backgroundColor: AppTheme.background,
       body: SafeArea(
         child: Padding(
           padding: const EdgeInsets.all(24),
           child: Column(
             children: [
               // Back button
               Align(
                 alignment: Alignment.centerLeft,
                 child: GestureDetector(
                   onTap: onBack ?? () => Navigator.of(context).pop(),
                   child: Container(
                     padding: const EdgeInsets.all(8),
                     decoration: BoxDecoration(
                       color: AppTheme.secondary,
                       borderRadius: BorderRadius.circular(10),
                     ),
                     child: const Icon(
                       Icons.arrow_back_ios_new,
                       size: 18,
                       color: AppTheme.muted,
                     ),
                   ),
                 ),
               ),
               
               const Spacer(),
               
               // Lock icon with gradient
               Container(
                 width: 80,
                 height: 80,
                 decoration: BoxDecoration(
                   gradient: LinearGradient(
                     colors: [
                       AppTheme.primary,
                       AppTheme.primary.withOpacity(0.7),
                     ],
                     begin: Alignment.topLeft,
                     end: Alignment.bottomRight,
                   ),
                   borderRadius: BorderRadius.circular(24),
                 ),
                 child: const Icon(
                   Icons.lock_outline,
                   size: 40,
                   color: Colors.white,
                 ),
               ),
               
               const SizedBox(height: 24),
               
               // Badge
               Container(
                 padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                 decoration: BoxDecoration(
                   color: AppTheme.primary.withOpacity(0.15),
                   borderRadius: BorderRadius.circular(20),
                 ),
                 child: const Row(
                   mainAxisSize: MainAxisSize.min,
                   children: [
                     Icon(
                       Icons.workspace_premium,
                       size: 14,
                       color: AppTheme.primary,
                     ),
                     SizedBox(width: 4),
                     Text(
                       'PREMIUM+ REQUIRED',
                       style: TextStyle(
                         color: AppTheme.primary,
                         fontSize: 11,
                         fontWeight: FontWeight.w700,
                         letterSpacing: 0.5,
                       ),
                     ),
                   ],
                 ),
               ),
               
               const SizedBox(height: 16),
               
               // Title
               Text(
                 'Unlock $feature',
                 style: const TextStyle(
                   fontSize: 24,
                   fontWeight: FontWeight.bold,
                   color: AppTheme.foreground,
                 ),
                 textAlign: TextAlign.center,
               ),
               
               const SizedBox(height: 12),
               
               // Description
               Text(
                 description,
                 style: const TextStyle(
                   fontSize: 14,
                   color: AppTheme.muted,
                   height: 1.4,
                 ),
                 textAlign: TextAlign.center,
               ),
               
               const Spacer(),
               
               // Upgrade button
               SizedBox(
                 width: double.infinity,
                 child: ElevatedButton(
                   onPressed: () => context.push('/pricing'),
                   style: ElevatedButton.styleFrom(
                     backgroundColor: AppTheme.primary,
                     foregroundColor: Colors.white,
                     padding: const EdgeInsets.symmetric(vertical: 16),
                     shape: RoundedRectangleBorder(
                       borderRadius: BorderRadius.circular(12),
                     ),
                   ),
                   child: const Row(
                     mainAxisAlignment: MainAxisAlignment.center,
                     children: [
                       Icon(Icons.workspace_premium, size: 20),
                       SizedBox(width: 8),
                       Text(
                         'Upgrade to Premium+',
                         style: TextStyle(
                           fontSize: 16,
                           fontWeight: FontWeight.w600,
                         ),
                       ),
                     ],
                   ),
                 ),
               ),
               
               const SizedBox(height: 16),
               
               // Go back text button
               TextButton(
                 onPressed: onBack ?? () => Navigator.of(context).pop(),
                 child: Text(
                   'Go Back',
                   style: TextStyle(
                     color: AppTheme.muted,
                     fontSize: 14,
                   ),
                 ),
               ),
               
               const SizedBox(height: 24),
             ],
           ),
         ),
       ),
     );
   }
 }