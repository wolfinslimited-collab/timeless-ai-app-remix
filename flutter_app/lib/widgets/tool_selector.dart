import 'package:flutter/material.dart';
import '../core/theme.dart';

/// Represents a tool item for the horizontal selector
class ToolItem {
  final String id;
  final String name;
  final String description;
  final IconData icon;
  final int credits;
  final String? route;
  final String? badge;
  final bool isGenerate;

  const ToolItem({
    required this.id,
    required this.name,
    required this.description,
    required this.icon,
    required this.credits,
    this.route,
    this.badge,
    this.isGenerate = false,
  });
}

/// Horizontal scrollable tool selector widget
class ToolSelector extends StatelessWidget {
  final List<ToolItem> tools;
  final String selectedToolId;
  final ValueChanged<ToolItem> onToolSelected;

  const ToolSelector({
    super.key,
    required this.tools,
    required this.selectedToolId,
    required this.onToolSelected,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 80,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: tools.length,
        separatorBuilder: (_, __) => const SizedBox(width: 12),
        itemBuilder: (context, index) {
          final tool = tools[index];
          final isSelected = tool.id == selectedToolId;

          return GestureDetector(
            onTap: () => onToolSelected(tool),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  width: 52,
                  height: 52,
                  decoration: BoxDecoration(
                    color: isSelected
                        ? AppTheme.primary
                        : AppTheme.secondary,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                      color: isSelected
                          ? AppTheme.primary
                          : AppTheme.border,
                      width: isSelected ? 2 : 1,
                    ),
                    boxShadow: isSelected
                        ? [
                            BoxShadow(
                              color: AppTheme.primary.withOpacity(0.3),
                              blurRadius: 8,
                              offset: const Offset(0, 2),
                            ),
                          ]
                        : null,
                  ),
                  child: Stack(
                    children: [
                      Center(
                        child: Icon(
                          tool.icon,
                          size: 24,
                          color: isSelected ? Colors.white : AppTheme.muted,
                        ),
                      ),
                      if (tool.badge != null)
                        Positioned(
                          top: 2,
                          right: 2,
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 4, vertical: 1),
                            decoration: BoxDecoration(
                              color: Colors.green,
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              tool.badge!,
                              style: const TextStyle(
                                fontSize: 7,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
                const SizedBox(height: 6),
                SizedBox(
                  width: 56,
                  child: Text(
                    tool.name,
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                      color: isSelected ? AppTheme.foreground : AppTheme.muted,
                    ),
                    textAlign: TextAlign.center,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
