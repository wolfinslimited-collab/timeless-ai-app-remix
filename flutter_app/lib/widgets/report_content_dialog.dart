import 'package:flutter/material.dart';
import '../core/theme.dart';

enum ReportReason {
  inappropriate('Inappropriate or offensive content', Icons.block),
  misleading('Misleading or inaccurate', Icons.warning_amber_rounded),
  copyright('Copyright or intellectual property', Icons.copyright),
  violence('Violence or harmful content', Icons.dangerous_outlined),
  spam('Spam or low quality', Icons.report_gmailerrorred),
  other('Other', Icons.more_horiz);

  final String label;
  final IconData icon;
  const ReportReason(this.label, this.icon);
}

class ReportContentDialog extends StatefulWidget {
  final String? contentType;

  const ReportContentDialog({super.key, this.contentType});

  static Future<void> show(BuildContext context, {String? contentType}) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => ReportContentDialog(contentType: contentType),
    );
  }

  @override
  State<ReportContentDialog> createState() => _ReportContentDialogState();
}

class _ReportContentDialogState extends State<ReportContentDialog> {
  ReportReason? _selectedReason;
  final _detailsController = TextEditingController();
  bool _isSubmitting = false;

  @override
  void dispose() {
    _detailsController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_selectedReason == null) return;

    setState(() => _isSubmitting = true);

    // Simulate network delay
    await Future.delayed(const Duration(milliseconds: 1200));

    if (!mounted) return;

    Navigator.of(context).pop();

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Row(
          children: [
            Icon(Icons.check_circle, color: Colors.white, size: 20),
            SizedBox(width: 10),
            Expanded(
              child: Text(
                'Thank you for your report. Our team will review this content within 24 hours.',
                style: TextStyle(color: Colors.white),
              ),
            ),
          ],
        ),
        backgroundColor: AppTheme.success,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        duration: const Duration(seconds: 4),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final bottomPadding = MediaQuery.of(context).viewInsets.bottom;

    return Container(
      padding: EdgeInsets.only(bottom: bottomPadding),
      decoration: const BoxDecoration(
        color: AppTheme.card,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppTheme.muted.withValues(alpha: 0.5),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 20),

              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AppTheme.destructive.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.flag_outlined, color: AppTheme.destructive, size: 20),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Report ${widget.contentType ?? 'Content'}',
                          style: const TextStyle(
                            color: AppTheme.foreground,
                            fontSize: 18,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 2),
                        const Text(
                          'Help us keep the community safe',
                          style: TextStyle(color: AppTheme.muted, fontSize: 13),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),

              const Text(
                'Why are you reporting this content?',
                style: TextStyle(
                  color: AppTheme.mutedForeground,
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 10),

              ...ReportReason.values.map((reason) => _buildReasonTile(reason)),

              const SizedBox(height: 16),

              TextField(
                controller: _detailsController,
                maxLines: 3,
                style: const TextStyle(color: AppTheme.foreground, fontSize: 14),
                decoration: InputDecoration(
                  hintText: 'Additional details (optional)',
                  hintStyle: TextStyle(color: AppTheme.muted.withValues(alpha: 0.7)),
                  filled: true,
                  fillColor: AppTheme.secondary,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: AppTheme.border),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: AppTheme.border),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: AppTheme.primary),
                  ),
                  contentPadding: const EdgeInsets.all(14),
                ),
              ),
              const SizedBox(height: 20),

              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton(
                  onPressed: _selectedReason != null && !_isSubmitting ? _submit : null,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.destructive,
                    foregroundColor: Colors.white,
                    disabledBackgroundColor: AppTheme.destructive.withValues(alpha: 0.3),
                    disabledForegroundColor: Colors.white54,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: _isSubmitting
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Text(
                          'Submit Report',
                          style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
                        ),
                ),
              ),

              const SizedBox(height: 12),
              const Center(
                child: Text(
                  'Reports are reviewed by our moderation team.',
                  style: TextStyle(color: AppTheme.muted, fontSize: 12),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildReasonTile(ReportReason reason) {
    final selected = _selectedReason == reason;
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => setState(() => _selectedReason = reason),
          borderRadius: BorderRadius.circular(12),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: BoxDecoration(
              color: selected ? AppTheme.primary.withValues(alpha: 0.12) : AppTheme.secondary,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: selected ? AppTheme.primary : AppTheme.border,
                width: selected ? 1.5 : 1,
              ),
            ),
            child: Row(
              children: [
                Icon(reason.icon, size: 20, color: selected ? AppTheme.primary : AppTheme.muted),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    reason.label,
                    style: TextStyle(
                      color: selected ? AppTheme.foreground : AppTheme.mutedForeground,
                      fontSize: 14,
                      fontWeight: selected ? FontWeight.w500 : FontWeight.w400,
                    ),
                  ),
                ),
                if (selected)
                  const Icon(Icons.check_circle, size: 20, color: AppTheme.primary),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
