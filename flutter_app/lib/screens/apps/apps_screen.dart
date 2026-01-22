import 'package:flutter/material.dart';
import '../../core/theme.dart';
import '../../services/tools_service.dart';

class AppsScreen extends StatelessWidget {
  const AppsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 3,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('AI Apps'),
          bottom: const TabBar(
            tabs: [
              Tab(text: 'Image'),
              Tab(text: 'Video'),
              Tab(text: 'Audio'),
            ],
          ),
        ),
        body: TabBarView(
          children: [
            _ToolsGrid(tools: imageTools, category: 'image'),
            _ToolsGrid(tools: videoTools, category: 'video'),
            _ToolsGrid(tools: audioTools, category: 'audio'),
          ],
        ),
      ),
    );
  }
}

class _ToolsGrid extends StatelessWidget {
  final List<ToolDefinition> tools;
  final String category;

  const _ToolsGrid({required this.tools, required this.category});

  @override
  Widget build(BuildContext context) {
    return GridView.builder(
      padding: const EdgeInsets.all(16),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        mainAxisSpacing: 12,
        crossAxisSpacing: 12,
        childAspectRatio: 1.1,
      ),
      itemCount: tools.length,
      itemBuilder: (context, index) {
        return _ToolCard(tool: tools[index]);
      },
    );
  }
}

class _ToolCard extends StatelessWidget {
  final ToolDefinition tool;

  const _ToolCard({required this.tool});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => _openTool(context),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppTheme.card,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppTheme.border),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(tool.icon, style: const TextStyle(fontSize: 36)),
            const SizedBox(height: 12),
            Text(
              tool.name,
              style: const TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 16,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 4),
            Text(
              tool.description,
              style: const TextStyle(
                color: AppTheme.muted,
                fontSize: 12,
              ),
              textAlign: TextAlign.center,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: AppTheme.accent.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                '${tool.credits}c',
                style: const TextStyle(
                  color: AppTheme.accent,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _openTool(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppTheme.card,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.7,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        expand: false,
        builder: (context, scrollController) {
          return _ToolDetailSheet(tool: tool, scrollController: scrollController);
        },
      ),
    );
  }
}

class _ToolDetailSheet extends StatefulWidget {
  final ToolDefinition tool;
  final ScrollController scrollController;

  const _ToolDetailSheet({
    required this.tool,
    required this.scrollController,
  });

  @override
  State<_ToolDetailSheet> createState() => _ToolDetailSheetState();
}

class _ToolDetailSheetState extends State<_ToolDetailSheet> {
  String? _selectedFileUrl;
  bool _isProcessing = false;
  String? _resultUrl;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      controller: widget.scrollController,
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Handle
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: AppTheme.border,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 24),

          // Tool header
          Row(
            children: [
              Text(widget.tool.icon, style: const TextStyle(fontSize: 48)),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      widget.tool.name,
                      style: const TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      widget.tool.description,
                      style: const TextStyle(color: AppTheme.muted),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Upload area
          GestureDetector(
            onTap: _pickFile,
            child: Container(
              height: 200,
              decoration: BoxDecoration(
                color: AppTheme.secondary,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: AppTheme.border,
                  style: BorderStyle.solid,
                ),
              ),
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      _selectedFileUrl != null ? Icons.check_circle : Icons.upload_file,
                      size: 48,
                      color: _selectedFileUrl != null ? AppTheme.success : AppTheme.muted,
                    ),
                    const SizedBox(height: 12),
                    Text(
                      _selectedFileUrl != null ? 'File selected' : 'Tap to upload file',
                      style: TextStyle(
                        color: _selectedFileUrl != null ? AppTheme.success : AppTheme.muted,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: 24),

          // Result preview
          if (_resultUrl != null) ...[
            const Text(
              'Result',
              style: TextStyle(fontWeight: FontWeight.w600, fontSize: 18),
            ),
            const SizedBox(height: 12),
            Container(
              height: 200,
              decoration: BoxDecoration(
                color: AppTheme.secondary,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppTheme.border),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: Image.network(_resultUrl!, fit: BoxFit.contain),
              ),
            ),
            const SizedBox(height: 24),
          ],

          // Process button
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _selectedFileUrl == null || _isProcessing ? null : _processTool,
              child: _isProcessing
                  ? const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        ),
                        SizedBox(width: 12),
                        Text('Processing...'),
                      ],
                    )
                  : Text('Process (${widget.tool.credits} credits)'),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _pickFile() async {
    // In a real implementation, use file_picker or image_picker
    // For now, just simulate
    setState(() {
      _selectedFileUrl = 'https://example.com/file.jpg';
    });
  }

  Future<void> _processTool() async {
    if (_selectedFileUrl == null) return;

    setState(() {
      _isProcessing = true;
    });

    try {
      // Call the appropriate tool service
      final toolsService = ToolsService();
      
      Map<String, dynamic> result;
      
      switch (widget.tool.category) {
        case 'image':
          result = await toolsService.runImageTool(
            tool: widget.tool.id,
            imageUrl: _selectedFileUrl!,
          );
          break;
        case 'video':
          result = await toolsService.runVideoTool(
            tool: widget.tool.id,
            videoUrl: _selectedFileUrl!,
          );
          break;
        case 'audio':
          result = await toolsService.runMusicTool(
            tool: widget.tool.id,
            audioUrl: _selectedFileUrl!,
          );
          break;
        default:
          throw Exception('Unknown tool category');
      }

      setState(() {
        _resultUrl = result['outputUrl'] as String?;
      });
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e')),
      );
    } finally {
      setState(() {
        _isProcessing = false;
      });
    }
  }
}
