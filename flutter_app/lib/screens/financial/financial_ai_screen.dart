import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../../core/theme.dart';
import '../../services/financial_service.dart';

class FinancialAIScreen extends StatefulWidget {
  const FinancialAIScreen({super.key});

  @override
  State<FinancialAIScreen> createState() => _FinancialAIScreenState();
}

class _FinancialAIScreenState extends State<FinancialAIScreen> {
  final _queryController = TextEditingController();
  final _financialService = FinancialService();
  
  bool _isLoading = false;
  bool _deepMode = false;
  String _searchMode = 'text'; // 'text' or 'image'
  File? _selectedImage;
  FinancialAnalysis? _analysis;

  @override
  void dispose() {
    _queryController.dispose();
    super.dispose();
  }

  Future<void> _pickImage() async {
    final picker = ImagePicker();
    final image = await picker.pickImage(source: ImageSource.gallery);
    if (image != null) {
      setState(() {
        _selectedImage = File(image.path);
        _searchMode = 'image';
      });
    }
  }

  Future<void> _takePhoto() async {
    final picker = ImagePicker();
    final image = await picker.pickImage(source: ImageSource.camera);
    if (image != null) {
      setState(() {
        _selectedImage = File(image.path);
        _searchMode = 'image';
      });
    }
  }

  Future<void> _analyze() async {
    if (_searchMode == 'text' && _queryController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a symbol or asset name')),
      );
      return;
    }

    if (_searchMode == 'image' && _selectedImage == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a chart image')),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      FinancialAnalysis analysis;

      if (_searchMode == 'image' && _selectedImage != null) {
        final bytes = await _selectedImage!.readAsBytes();
        final base64 = base64Encode(bytes);
        final imageData = 'data:image/jpeg;base64,$base64';

        analysis = await _financialService.analyzeChart(
          imageBase64: imageData,
          context: _queryController.text.trim().isNotEmpty
              ? _queryController.text.trim()
              : null,
          deepMode: _deepMode,
        );
      } else {
        analysis = await _financialService.analyzeAsset(
          query: _queryController.text.trim(),
          deepMode: _deepMode,
        );
      }

      setState(() => _analysis = analysis);
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: ${e.toString()}')),
      );
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Color _getSentimentColor(String sentiment) {
    switch (sentiment.toLowerCase()) {
      case 'bullish':
        return const Color(0xFF22C55E);
      case 'bearish':
        return const Color(0xFFEF4444);
      default:
        return const Color(0xFFF59E0B);
    }
  }

  IconData _getSentimentIcon(String sentiment) {
    switch (sentiment.toLowerCase()) {
      case 'bullish':
        return Icons.trending_up;
      case 'bearish':
        return Icons.trending_down;
      default:
        return Icons.trending_flat;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: const Text('Financial AI'),
        actions: [
          if (_analysis != null)
            IconButton(
              icon: const Icon(Icons.bookmark_border),
              onPressed: () {
                // Save report
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Report saved!')),
                );
              },
            ),
        ],
      ),
      body: _analysis != null ? _buildResults() : _buildSearchUI(),
    );
  }

  Widget _buildSearchUI() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF10B981), Color(0xFF22C55E)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(
                        Icons.analytics,
                        color: Colors.white,
                        size: 28,
                      ),
                    ),
                    const SizedBox(width: 16),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Financial AI',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 22,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          Text(
                            'AI-powered market analysis',
                            style: TextStyle(
                              color: Colors.white70,
                              fontSize: 14,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    _deepMode ? '🔬 Deep Research: 15 credits' : '📊 Standard: 5 credits',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Search Mode Toggle
          Container(
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              color: AppTheme.secondary,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                Expanded(
                  child: _ModeButton(
                    icon: Icons.search,
                    label: 'Symbol Search',
                    isSelected: _searchMode == 'text',
                    onTap: () => setState(() {
                      _searchMode = 'text';
                      _selectedImage = null;
                    }),
                  ),
                ),
                Expanded(
                  child: _ModeButton(
                    icon: Icons.photo_camera,
                    label: 'Chart Analysis',
                    isSelected: _searchMode == 'image',
                    onTap: () => setState(() => _searchMode = 'image'),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Search Input
          if (_searchMode == 'text') ...[
            TextField(
              controller: _queryController,
              style: const TextStyle(color: Colors.white),
              decoration: InputDecoration(
                hintText: 'Enter symbol (e.g., BTC, ETH, AAPL)',
                hintStyle: TextStyle(color: AppTheme.muted),
                prefixIcon: Icon(Icons.search, color: AppTheme.muted),
                filled: true,
                fillColor: AppTheme.card,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: AppTheme.border),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: AppTheme.border),
                ),
              ),
              textCapitalization: TextCapitalization.characters,
            ),
          ] else ...[
            // Image Upload
            if (_selectedImage != null) ...[
              Stack(
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(16),
                    child: Image.file(
                      _selectedImage!,
                      width: double.infinity,
                      height: 200,
                      fit: BoxFit.cover,
                    ),
                  ),
                  Positioned(
                    top: 8,
                    right: 8,
                    child: GestureDetector(
                      onTap: () => setState(() => _selectedImage = null),
                      child: Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: Colors.black54,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: const Icon(Icons.close, color: Colors.white, size: 20),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _queryController,
                style: const TextStyle(color: Colors.white),
                decoration: InputDecoration(
                  hintText: 'Add context (optional)',
                  hintStyle: TextStyle(color: AppTheme.muted),
                  filled: true,
                  fillColor: AppTheme.card,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(color: AppTheme.border),
                  ),
                ),
              ),
            ] else ...[
              Row(
                children: [
                  Expanded(
                    child: _UploadButton(
                      icon: Icons.photo_library,
                      label: 'Gallery',
                      onTap: _pickImage,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _UploadButton(
                      icon: Icons.camera_alt,
                      label: 'Camera',
                      onTap: _takePhoto,
                    ),
                  ),
                ],
              ),
            ],
          ],
          const SizedBox(height: 20),

          // Deep Mode Toggle
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppTheme.card,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: _deepMode ? AppTheme.primary : AppTheme.border,
              ),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFF8B5CF6).withOpacity(0.15),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(
                    Icons.science,
                    color: Color(0xFF8B5CF6),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Deep Research Mode',
                        style: TextStyle(
                          fontWeight: FontWeight.w600,
                          fontSize: 15,
                        ),
                      ),
                      Text(
                        'Institutional-grade analysis with advanced indicators',
                        style: TextStyle(
                          color: AppTheme.muted,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
                Switch(
                  value: _deepMode,
                  onChanged: (v) => setState(() => _deepMode = v),
                  activeColor: AppTheme.primary,
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Analyze Button
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _isLoading ? null : _analyze,
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: _isLoading
                  ? const SizedBox(
                      width: 24,
                      height: 24,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation(Colors.white),
                      ),
                    )
                  : const Text(
                      'Generate Analysis',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
            ),
          ),
          const SizedBox(height: 24),

          // Quick Assets
          const Text(
            'Popular Assets',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _QuickAssetChip(
                label: '₿ Bitcoin',
                onTap: () {
                  _queryController.text = 'BTC';
                  setState(() => _searchMode = 'text');
                },
              ),
              _QuickAssetChip(
                label: 'Ξ Ethereum',
                onTap: () {
                  _queryController.text = 'ETH';
                  setState(() => _searchMode = 'text');
                },
              ),
              _QuickAssetChip(
                label: '◎ Solana',
                onTap: () {
                  _queryController.text = 'SOL';
                  setState(() => _searchMode = 'text');
                },
              ),
              _QuickAssetChip(
                label: '🍎 Apple',
                onTap: () {
                  _queryController.text = 'AAPL';
                  setState(() => _searchMode = 'text');
                },
              ),
              _QuickAssetChip(
                label: '📈 Tesla',
                onTap: () {
                  _queryController.text = 'TSLA';
                  setState(() => _searchMode = 'text');
                },
              ),
              _QuickAssetChip(
                label: '🔍 Nvidia',
                onTap: () {
                  _queryController.text = 'NVDA';
                  setState(() => _searchMode = 'text');
                },
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildResults() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Overall Sentiment Card
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  _getSentimentColor(_analysis!.overallSentiment).withOpacity(0.3),
                  _getSentimentColor(_analysis!.overallSentiment).withOpacity(0.1),
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: _getSentimentColor(_analysis!.overallSentiment).withOpacity(0.3),
              ),
            ),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      _getSentimentIcon(_analysis!.overallSentiment),
                      color: _getSentimentColor(_analysis!.overallSentiment),
                      size: 32,
                    ),
                    const SizedBox(width: 12),
                    Text(
                      _analysis!.overallSentiment.toUpperCase(),
                      style: TextStyle(
                        color: _getSentimentColor(_analysis!.overallSentiment),
                        fontSize: 28,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
                if (_analysis!.priceTarget.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      'Price Target: ${_analysis!.priceTarget}',
                      style: const TextStyle(
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Section Cards
          ..._analysis!.allSections.map((entry) => _SectionCard(
                title: entry.key,
                section: entry.value,
                sentimentColor: _getSentimentColor(entry.value.sentiment),
              )),

          const SizedBox(height: 24),

          // New Analysis Button
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: () => setState(() => _analysis = null),
              icon: const Icon(Icons.refresh),
              label: const Text('New Analysis'),
              style: OutlinedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ModeButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  const _ModeButton({
    required this.icon,
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: isSelected ? AppTheme.primary : Colors.transparent,
          borderRadius: BorderRadius.circular(10),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: 18,
              color: isSelected ? Colors.white : AppTheme.muted,
            ),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                color: isSelected ? Colors.white : AppTheme.muted,
                fontWeight: FontWeight.w500,
                fontSize: 13,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _UploadButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _UploadButton({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 40),
        decoration: BoxDecoration(
          color: AppTheme.card,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppTheme.border),
        ),
        child: Column(
          children: [
            Icon(icon, color: AppTheme.primary, size: 32),
            const SizedBox(height: 8),
            Text(
              label,
              style: TextStyle(
                color: AppTheme.muted,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _QuickAssetChip extends StatelessWidget {
  final String label;
  final VoidCallback onTap;

  const _QuickAssetChip({required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: AppTheme.secondary,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AppTheme.border),
        ),
        child: Text(
          label,
          style: const TextStyle(fontSize: 13),
        ),
      ),
    );
  }
}

class _SectionCard extends StatefulWidget {
  final String title;
  final FinancialSection section;
  final Color sentimentColor;

  const _SectionCard({
    required this.title,
    required this.section,
    required this.sentimentColor,
  });

  @override
  State<_SectionCard> createState() => _SectionCardState();
}

class _SectionCardState extends State<_SectionCard> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: AppTheme.card,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          GestureDetector(
            onTap: () => setState(() => _expanded = !_expanded),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Container(
                    width: 4,
                    height: 24,
                    decoration: BoxDecoration(
                      color: widget.sentimentColor,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      widget.title,
                      style: const TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 15,
                      ),
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: widget.sentimentColor.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      widget.section.sentiment.toUpperCase(),
                      style: TextStyle(
                        color: widget.sentimentColor,
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Icon(
                    _expanded ? Icons.expand_less : Icons.expand_more,
                    color: AppTheme.muted,
                  ),
                ],
              ),
            ),
          ),

          // Key Points (always visible)
          if (widget.section.keyPoints.isNotEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
              child: Wrap(
                spacing: 6,
                runSpacing: 6,
                children: widget.section.keyPoints.take(3).map((point) {
                  return Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: AppTheme.secondary,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      point,
                      style: TextStyle(
                        color: AppTheme.muted,
                        fontSize: 11,
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),

          // Expanded Content
          if (_expanded)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              child: Text(
                widget.section.content,
                style: TextStyle(
                  color: AppTheme.muted,
                  fontSize: 13,
                  height: 1.5,
                ),
              ),
            ),
        ],
      ),
    );
  }
}
