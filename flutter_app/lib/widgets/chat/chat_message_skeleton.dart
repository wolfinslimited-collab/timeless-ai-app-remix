import 'package:flutter/material.dart';
import '../../core/theme.dart';
import 'model_logo.dart';

class ChatMessageSkeleton extends StatefulWidget {
  final String modelId;

  const ChatMessageSkeleton({
    super.key,
    required this.modelId,
  });

  @override
  State<ChatMessageSkeleton> createState() => _ChatMessageSkeletonState();
}

class _ChatMessageSkeletonState extends State<ChatMessageSkeleton>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    )..repeat();
    _animation = Tween<double>(begin: 0.3, end: 0.7).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ModelLogo(modelId: widget.modelId, size: 32),
          const SizedBox(width: 12),
          Flexible(
            child: Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppTheme.secondary.withOpacity(0.5),
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(4),
                  topRight: Radius.circular(16),
                  bottomLeft: Radius.circular(16),
                  bottomRight: Radius.circular(16),
                ),
              ),
              child: AnimatedBuilder(
                animation: _animation,
                builder: (context, child) {
                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _SkeletonLine(width: 250, opacity: _animation.value),
                      const SizedBox(height: 8),
                      _SkeletonLine(width: 200, opacity: _animation.value),
                      const SizedBox(height: 8),
                      _SkeletonLine(width: 180, opacity: _animation.value),
                    ],
                  );
                },
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SkeletonLine extends StatelessWidget {
  final double width;
  final double opacity;

  const _SkeletonLine({required this.width, required this.opacity});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      height: 16,
      decoration: BoxDecoration(
        color: AppTheme.muted.withOpacity(opacity),
        borderRadius: BorderRadius.circular(4),
      ),
    );
  }
}
