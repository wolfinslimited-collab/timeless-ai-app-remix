import 'package:flutter/material.dart';
import '../../core/theme.dart';
import '../../widgets/model_brand_logo.dart';

class VideoModelSelector extends StatefulWidget {
  final String selectedModel;
  final List<Map<String, dynamic>> models;
  final Function(String) onSelect;

  const VideoModelSelector({
    super.key,
    required this.selectedModel,
    required this.models,
    required this.onSelect,
  });

  @override
  State<VideoModelSelector> createState() => _VideoModelSelectorState();
}

class _VideoModelSelectorState extends State<VideoModelSelector> {
  String _searchQuery = '';
  String _selectedTier = 'all'; // all, economy, hq
  late TextEditingController _searchController;

  @override
  void initState() {
    super.initState();
    _searchController = TextEditingController();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  List<Map<String, dynamic>> get _filteredModels {
    return widget.models.where((model) {
      final matchesSearch = _searchQuery.isEmpty ||
          (model['name'] as String).toLowerCase().contains(_searchQuery.toLowerCase()) ||
          (model['description'] as String).toLowerCase().contains(_searchQuery.toLowerCase());
      
      final matchesTier = _selectedTier == 'all' || model['tier'] == _selectedTier;
      
      return matchesSearch && matchesTier;
    }).toList();
  }

  List<Map<String, dynamic>> get _economyModels =>
      _filteredModels.where((m) => m['tier'] == 'economy').toList();

  List<Map<String, dynamic>> get _hqModels =>
      _filteredModels.where((m) => m['tier'] == 'hq').toList();

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.85,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      expand: false,
      builder: (context, scrollController) {
        return Column(
          children: [
            // Handle
            Container(
              margin: const EdgeInsets.only(top: 8),
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: AppTheme.muted,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            
            // Header
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  const Icon(Icons.videocam_outlined, color: AppTheme.primary),
                  const SizedBox(width: 12),
                  const Text(
                    'Select Video Model',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  const Spacer(),
                  GestureDetector(
                    onTap: () => Navigator.pop(context),
                    child: const Icon(Icons.close, color: AppTheme.muted),
                  ),
                ],
              ),
            ),

            // Search bar
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Container(
                decoration: BoxDecoration(
                  color: AppTheme.secondary,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppTheme.primary.withOpacity(0.5)),
                ),
                child: TextField(
                  controller: _searchController,
                  onChanged: (value) => setState(() => _searchQuery = value),
                  decoration: const InputDecoration(
                    hintText: 'Search models...',
                    hintStyle: TextStyle(color: AppTheme.muted),
                    prefixIcon: Icon(Icons.search, color: AppTheme.muted),
                    border: InputBorder.none,
                    contentPadding: EdgeInsets.symmetric(vertical: 12),
                  ),
                ),
              ),
            ),

            const SizedBox(height: 12),

            // Tier filter tabs
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                children: [
                  _buildTierTab('All', 'all'),
                  const SizedBox(width: 8),
                  _buildTierTab('💰 Economy', 'economy'),
                  const SizedBox(width: 8),
                  _buildTierTab('⚡ HQ', 'hq'),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // Models list
            Expanded(
              child: ListView(
                controller: scrollController,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                children: [
                  if (_economyModels.isNotEmpty && (_selectedTier == 'all' || _selectedTier == 'economy')) ...[
                    _buildSectionHeader('💰 Economy'),
                    const SizedBox(height: 8),
                    ..._economyModels.map((model) => _buildModelTile(model)),
                    const SizedBox(height: 16),
                  ],
                  if (_hqModels.isNotEmpty && (_selectedTier == 'all' || _selectedTier == 'hq')) ...[
                    _buildSectionHeader('⚡ High Quality'),
                    const SizedBox(height: 8),
                    ..._hqModels.map((model) => _buildModelTile(model)),
                  ],
                ],
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _buildTierTab(String label, String tier) {
    final isSelected = _selectedTier == tier;
    return GestureDetector(
      onTap: () => setState(() => _selectedTier = tier),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? AppTheme.primary : AppTheme.secondary,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? Colors.white : AppTheme.mutedForeground,
            fontSize: 13,
            fontWeight: FontWeight.w500,
          ),
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: AppTheme.card,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppTheme.border),
      ),
      child: Text(
        title,
        style: const TextStyle(
          color: AppTheme.mutedForeground,
          fontSize: 12,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }

  Widget _buildModelTile(Map<String, dynamic> model) {
    final isSelected = model['id'] == widget.selectedModel;
    final badge = model['badge'] as String?;
    
    Color getBadgeColor(String? badge) {
      switch (badge) {
        case 'HOT':
          return Colors.orange;
        case 'NEW':
          return Colors.green;
        case 'TOP':
          return Colors.purple;
        case 'PRO':
          return Colors.blue;
        case 'ECONOMY':
          return Colors.teal;
        default:
          return AppTheme.primary;
      }
    }

    return GestureDetector(
      onTap: () => widget.onSelect(model['id'] as String),
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isSelected ? AppTheme.primary.withOpacity(0.1) : AppTheme.card,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? AppTheme.primary : AppTheme.border,
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Row(
          children: [
            // Model brand logo
            ModelBrandLogo(
              modelId: model['id'] as String,
              size: 44,
            ),
            const SizedBox(width: 12),
            
            // Model info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Flexible(
                        child: Text(
                          model['name'] as String,
                          style: TextStyle(
                            fontWeight: FontWeight.w600,
                            color: isSelected ? AppTheme.primary : Colors.white,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      if (badge != null) ...[
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: getBadgeColor(badge).withOpacity(0.2),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              if (badge == 'HOT')
                                Icon(Icons.local_fire_department, size: 10, color: getBadgeColor(badge)),
                              if (badge == 'PRO')
                                Icon(Icons.star, size: 10, color: getBadgeColor(badge)),
                              if (badge == 'ECONOMY')
                                Icon(Icons.savings, size: 10, color: getBadgeColor(badge)),
                              Text(
                                badge,
                                style: TextStyle(
                                  fontSize: 9,
                                  fontWeight: FontWeight.bold,
                                  color: getBadgeColor(badge),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    model['description'] as String,
                    style: const TextStyle(color: AppTheme.muted, fontSize: 12),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
            
            // Credits
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: AppTheme.secondary,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Text(
                '${model['credits']} cr',
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
            
            if (isSelected) ...[
              const SizedBox(width: 8),
              Container(
                width: 24,
                height: 24,
                decoration: BoxDecoration(
                  color: AppTheme.primary,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.check, color: Colors.white, size: 16),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
