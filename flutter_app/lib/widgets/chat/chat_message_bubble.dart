import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import '../../core/theme.dart';
import '../common/smart_media_image.dart';
import 'model_logo.dart';

class ChatMessageBubble extends StatefulWidget {
  final String content;
  final bool isUser;
  final String? modelId;
  final List<String>? images;

  const ChatMessageBubble({
    super.key,
    required this.content,
    required this.isUser,
    this.modelId,
    this.images,
  });

  @override
  State<ChatMessageBubble> createState() => _ChatMessageBubbleState();
}

class _ChatMessageBubbleState extends State<ChatMessageBubble> {
  bool _copied = false;

  void _copyContent() async {
    await Clipboard.setData(ClipboardData(text: widget.content));
    setState(() => _copied = true);
    await Future.delayed(const Duration(seconds: 2));
    if (mounted) setState(() => _copied = false);
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        mainAxisAlignment:
            widget.isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (!widget.isUser && widget.modelId != null) ...[
            ModelLogo(modelId: widget.modelId!, size: 32),
            const SizedBox(width: 12),
          ],
          Flexible(
            child: Column(
              crossAxisAlignment: widget.isUser
                  ? CrossAxisAlignment.end
                  : CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: widget.isUser ? AppTheme.muted : AppTheme.secondary.withOpacity(0.5),
                    borderRadius: BorderRadius.only(
                      topLeft: Radius.circular(widget.isUser ? 16 : 4),
                      topRight: Radius.circular(widget.isUser ? 4 : 16),
                      bottomLeft: const Radius.circular(16),
                      bottomRight: const Radius.circular(16),
                    ),
                  ),
                  constraints: BoxConstraints(
                    maxWidth: MediaQuery.of(context).size.width * 0.8,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Images preview
                      if (widget.images != null && widget.images!.isNotEmpty) ...[
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: widget.images!.map((img) {
                            return ClipRRect(
                              borderRadius: BorderRadius.circular(8),
                              child: SmartNetworkImage(
                                img,
                                width: 150,
                                height: 150,
                                fit: BoxFit.cover,
                                errorBuilder: (_, __, ___) => Container(
                                  width: 150,
                                  height: 150,
                                  color: AppTheme.card,
                                  child: const Icon(Icons.broken_image),
                                ),
                              ),
                            );
                          }).toList(),
                        ),
                        const SizedBox(height: 8),
                      ],
                      // Message content
                      widget.isUser
                          ? Text(
                              widget.content,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 14,
                              ),
                            )
                          : MarkdownBody(
                              data: widget.content,
                              selectable: true,
                              styleSheet: _markdownStyle,
                            ),
                    ],
                  ),
                ),
                // Action buttons for assistant messages
                if (!widget.isUser && widget.content.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 4, left: 8),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        _ActionButton(
                          icon: _copied ? Icons.check : Icons.copy,
                          onTap: _copyContent,
                          tooltip: _copied ? 'Copied!' : 'Copy',
                        ),
                        const SizedBox(width: 4),
                        _ActionButton(
                          icon: Icons.share,
                          onTap: () {
                            // Share functionality
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Sharing...')),
                            );
                          },
                          tooltip: 'Share',
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
          if (widget.isUser) ...[
            const SizedBox(width: 12),
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: AppTheme.secondary,
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Icon(Icons.person, size: 18, color: AppTheme.muted),
            ),
          ],
        ],
      ),
    );
  }

  MarkdownStyleSheet get _markdownStyle => MarkdownStyleSheet(
        p: const TextStyle(
          color: AppTheme.foreground,
          fontSize: 14,
          height: 1.5,
        ),
        strong: const TextStyle(
          color: AppTheme.foreground,
          fontWeight: FontWeight.bold,
        ),
        em: const TextStyle(
          color: AppTheme.foreground,
          fontStyle: FontStyle.italic,
        ),
        listBullet: const TextStyle(
          color: AppTheme.foreground,
          fontSize: 14,
        ),
        h1: const TextStyle(
          color: AppTheme.foreground,
          fontSize: 20,
          fontWeight: FontWeight.bold,
        ),
        h2: const TextStyle(
          color: AppTheme.foreground,
          fontSize: 18,
          fontWeight: FontWeight.bold,
        ),
        h3: const TextStyle(
          color: AppTheme.foreground,
          fontSize: 16,
          fontWeight: FontWeight.bold,
        ),
        code: TextStyle(
          color: AppTheme.accent,
          backgroundColor: AppTheme.card,
          fontFamily: 'monospace',
          fontSize: 13,
        ),
        codeblockDecoration: BoxDecoration(
          color: AppTheme.card,
          borderRadius: BorderRadius.circular(8),
        ),
        blockquote: const TextStyle(
          color: AppTheme.muted,
          fontStyle: FontStyle.italic,
        ),
        a: const TextStyle(
          color: AppTheme.primary,
          decoration: TextDecoration.underline,
        ),
        tableHead: const TextStyle(
          fontWeight: FontWeight.bold,
          color: AppTheme.foreground,
        ),
        tableBody: const TextStyle(
          color: AppTheme.foreground,
        ),
        tableBorder: TableBorder.all(
          color: AppTheme.border,
          width: 1,
        ),
        tableCellsPadding: const EdgeInsets.all(8),
      );
}

class _ActionButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  final String tooltip;

  const _ActionButton({
    required this.icon,
    required this.onTap,
    required this.tooltip,
  });

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: tooltip,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(4),
        child: Padding(
          padding: const EdgeInsets.all(4),
          child: Icon(icon, size: 14, color: AppTheme.muted),
        ),
      ),
    );
  }
}
