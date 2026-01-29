import 'dart:io';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import '../../core/theme.dart';
import '../../services/character_service.dart';
import '../../widgets/common/smart_media_image.dart';

class CharacterScreen extends StatefulWidget {
  const CharacterScreen({super.key});

  @override
  State<CharacterScreen> createState() => _CharacterScreenState();
}

class _CharacterScreenState extends State<CharacterScreen> {
  final CharacterService _service = CharacterService();
  final ImagePicker _picker = ImagePicker();
  final TextEditingController _nameController = TextEditingController();

  String _viewState = 'landing'; // 'landing', 'upload', 'characters'
  List<CharacterModel> _characters = [];
  List<CharacterImageModel> _uploadedImages = [];
  String? _currentCharacterId;
  bool _loading = true;
  bool _uploading = false;

  @override
  void initState() {
    super.initState();
    _nameController.text = 'My Character';
    _loadCharacters();
  }

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  Future<void> _loadCharacters() async {
    setState(() => _loading = true);
    final characters = await _service.getCharacters();
    setState(() {
      _characters = characters;
      _loading = false;
      if (characters.isNotEmpty) {
        _viewState = 'characters';
      }
    });
  }

  Future<void> _pickImages() async {
    try {
      final images = await _picker.pickMultiImage(
        maxWidth: 2048,
        maxHeight: 2048,
        imageQuality: 90,
      );

      if (images.isEmpty) return;

      setState(() => _uploading = true);

      // Create character if needed
      String? characterId = _currentCharacterId;
      if (characterId == null) {
        final character = await _service.createCharacter(_nameController.text);
        if (character == null) {
          _showSnackBar('Failed to create character');
          setState(() => _uploading = false);
          return;
        }
        characterId = character.id;
        setState(() => _currentCharacterId = characterId);
      }

      // Upload images
      for (final image in images) {
        final file = File(image.path);
        final uploaded =
            await _service.uploadCharacterImage(characterId!, file);

        if (uploaded != null) {
          setState(() => _uploadedImages.add(uploaded));

          // Set first image as thumbnail
          if (_uploadedImages.length == 1) {
            await _service.setThumbnail(characterId!, uploaded.imageUrl);
          }
        }
      }

      // Update image count
      await _service.updateImageCount(characterId!, _uploadedImages.length);

      _showSnackBar('${images.length} image(s) uploaded');
    } catch (e) {
      _showSnackBar('Upload failed: $e');
    } finally {
      setState(() => _uploading = false);
    }
  }

  Future<void> _removeImage(String imageId) async {
    await _service.deleteCharacterImage(imageId);
    setState(() {
      _uploadedImages.removeWhere((img) => img.id == imageId);
    });
  }

  Future<void> _deleteCharacter(String characterId) async {
    await _service.deleteCharacter(characterId);
    _showSnackBar('Character deleted');
    _loadCharacters();
  }

  Future<void> _stopTraining(String characterId) async {
    await _service.stopTraining(characterId);
    _showSnackBar('Training stopped');
    _loadCharacters();
  }

  Future<void> _startTraining() async {
    if (_currentCharacterId == null || _uploadedImages.isEmpty) {
      _showSnackBar('Please upload at least 1 photo');
      return;
    }

    await _service.startTraining(
      _currentCharacterId!,
      _nameController.text,
      _uploadedImages.length,
    );

    _showSnackBar('Training started!');

    // Reset state
    setState(() {
      _currentCharacterId = null;
      _uploadedImages.clear();
      _nameController.text = 'My Character';
    });

    _loadCharacters();
    setState(() => _viewState = 'characters');
  }

  void _showSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => FocusScope.of(context).unfocus(),
      child: Scaffold(
        appBar: AppBar(
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () {
              if (_viewState == 'upload') {
                setState(() {
                  _viewState =
                      _characters.isNotEmpty ? 'characters' : 'landing';
                  _uploadedImages.clear();
                  _currentCharacterId = null;
                });
              } else {
                context.go('/create');
              }
            },
          ),
          title: const Text('Character'),
        ),
        body: _loading
            ? const Center(child: CircularProgressIndicator())
            : _buildContent(),
      ),
    );
  }

  Widget _buildContent() {
    switch (_viewState) {
      case 'landing':
        return _buildLandingView();
      case 'upload':
        return _buildUploadView();
      case 'characters':
        return _buildCharactersView();
      default:
        return _buildLandingView();
    }
  }

  Widget _buildLandingView() {
    if (_characters.isNotEmpty) {
      return _buildCharactersView();
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          const SizedBox(height: 40),
          // Hero placeholder images
          SizedBox(
            height: 200,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(4, (i) {
                return Container(
                  width: 80,
                  height: 80 + (i % 2 == 0 ? 20.0 : 0.0),
                  margin: const EdgeInsets.symmetric(horizontal: 4),
                  decoration: BoxDecoration(
                    color: AppTheme.secondary,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppTheme.border),
                  ),
                  child: Icon(
                    Icons.person,
                    color: AppTheme.muted,
                    size: 32,
                  ),
                );
              }),
            ),
          ),
          const SizedBox(height: 32),
          const Text(
            'MAKE YOUR OWN CHARACTER',
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              letterSpacing: 1.2,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          Text(
            'Generate infinite selfies in different styles using your own photos.',
            style: TextStyle(
              color: AppTheme.muted,
              fontSize: 16,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          Text(
            'We analyze your images to learn your unique look in minutes.',
            style: TextStyle(
              color: AppTheme.muted,
              fontSize: 14,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 32),
          ElevatedButton.icon(
            onPressed: () => setState(() => _viewState = 'upload'),
            icon: const Icon(Icons.auto_awesome),
            label: const Text('Create Character'),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.accent,
              foregroundColor: const Color.fromARGB(255, 134, 87, 6),
              padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildUploadView() {
    final quality = CharacterService.getQualityLabel(_uploadedImages.length);

    return Column(
      children: [
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Good photos section
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppTheme.card,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppTheme.border),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 48,
                        height: 48,
                        decoration: BoxDecoration(
                          color: const Color(0xFF22C55E).withOpacity(0.2),
                          borderRadius: BorderRadius.circular(24),
                        ),
                        child: const Icon(
                          Icons.check,
                          color: Color(0xFF22C55E),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'UPLOAD 20+ PHOTOS FOR BEST RESULTS',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 12,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Upload high-quality images of one person with different angles and expressions',
                              style: TextStyle(
                                color: AppTheme.muted,
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                // Bad photos section
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppTheme.card,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppTheme.border),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 48,
                        height: 48,
                        decoration: BoxDecoration(
                          color: const Color(0xFFEF4444).withOpacity(0.2),
                          borderRadius: BorderRadius.circular(24),
                        ),
                        child: const Icon(
                          Icons.close,
                          color: Color(0xFFEF4444),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'AVOID THESE TYPES OF PHOTOS',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 12,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'No duplicates, group shots, pets, filters, or face-covering accessories',
                              style: TextStyle(
                                color: AppTheme.muted,
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                // Upload zone
                GestureDetector(
                  onTap: _uploading ? null : _pickImages,
                  child: Container(
                    height: 150,
                    width: double.infinity,
                    decoration: BoxDecoration(
                      color: AppTheme.secondary,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: AppTheme.border,
                        style: BorderStyle.solid,
                      ),
                    ),
                    child: _uploading
                        ? const Center(child: CircularProgressIndicator())
                        : Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.cloud_upload_outlined,
                                size: 48,
                                color: AppTheme.muted,
                              ),
                              const SizedBox(height: 12),
                              const Text(
                                'Tap to upload images',
                                style: TextStyle(
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'Select multiple photos',
                                style: TextStyle(
                                  color: AppTheme.muted,
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                  ),
                ),
                const SizedBox(height: 20),
                // Uploaded images grid
                if (_uploadedImages.isNotEmpty) ...[
                  GridView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    gridDelegate:
                        const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 4,
                      crossAxisSpacing: 8,
                      mainAxisSpacing: 8,
                    ),
                    itemCount: _uploadedImages.length,
                    itemBuilder: (context, index) {
                      final img = _uploadedImages[index];
                      return Stack(
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: SmartMediaImage(
                              imageUrl: img.imageUrl,
                              fit: BoxFit.cover,
                              width: 100,
                              height: 100,
                            ),
                          ),
                          Positioned(
                            top: 4,
                            right: 4,
                            child: GestureDetector(
                              onTap: () => _removeImage(img.id),
                              child: Container(
                                width: 24,
                                height: 24,
                                decoration: BoxDecoration(
                                  color: Colors.red,
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: const Icon(
                                  Icons.close,
                                  size: 14,
                                  color: Colors.white,
                                ),
                              ),
                            ),
                          ),
                        ],
                      );
                    },
                  ),
                ],
              ],
            ),
          ),
        ),
        // Bottom bar
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppTheme.card,
            border: Border(top: BorderSide(color: AppTheme.border)),
          ),
          child: Column(
            children: [
              Row(
                children: [
                  // Quality indicator
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 2,
                              ),
                              decoration: BoxDecoration(
                                color: quality.color.withOpacity(0.2),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                quality.label,
                                style: TextStyle(
                                  color: quality.color,
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              '${_uploadedImages.length} of 70',
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Images count',
                          style: TextStyle(
                            color: AppTheme.muted,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                  // Name input
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Character name',
                          style: TextStyle(
                            color: AppTheme.muted,
                            fontSize: 12,
                          ),
                        ),
                        TextField(
                          controller: _nameController,
                          style: const TextStyle(fontWeight: FontWeight.w500),
                          decoration: const InputDecoration(
                            border: InputBorder.none,
                            isDense: true,
                            contentPadding: EdgeInsets.zero,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: _uploadedImages.isEmpty ? null : _startTraining,
                  icon: const Icon(Icons.auto_awesome),
                  label: const Text('Train Character'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primary,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildCharactersView() {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'My Characters',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
              ),
              ElevatedButton.icon(
                onPressed: () => setState(() => _viewState = 'upload'),
                icon: const Icon(Icons.add, size: 18),
                label: const Text('New'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primary,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 8,
                  ),
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: _characters.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.person_outline,
                        size: 64,
                        color: AppTheme.muted,
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        'No characters yet',
                        style: TextStyle(fontSize: 18),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Create your first AI character',
                        style: TextStyle(color: AppTheme.muted),
                      ),
                      const SizedBox(height: 24),
                      ElevatedButton.icon(
                        onPressed: () => setState(() => _viewState = 'upload'),
                        icon: const Icon(Icons.add),
                        label: const Text('Create Character'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.primary,
                        ),
                      ),
                    ],
                  ),
                )
              : GridView.builder(
                  padding: const EdgeInsets.all(16),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                    childAspectRatio: 0.8,
                  ),
                  itemCount: _characters.length,
                  itemBuilder: (context, index) {
                    final char = _characters[index];
                    return _buildCharacterCard(char);
                  },
                ),
        ),
      ],
    );
  }

  Widget _buildCharacterCard(CharacterModel char) {
    return GestureDetector(
      onTap: char.isReady
          ? () => context.go('/create/image?character=${char.id}')
          : null,
      child: Container(
        decoration: BoxDecoration(
          color: AppTheme.card,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppTheme.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Image area
            Expanded(
              child: Stack(
                children: [
                  ClipRRect(
                    borderRadius:
                        const BorderRadius.vertical(top: Radius.circular(16)),
                    child: char.thumbnailUrl != null
                        ? SmartMediaImage(
                            imageUrl: char.thumbnailUrl!,
                            fit: BoxFit.cover,
                            width: double.infinity,
                            height: double.infinity,
                          )
                        : Container(
                            color: AppTheme.secondary,
                            child: Center(
                              child: Icon(
                                Icons.person,
                                size: 48,
                                color: AppTheme.muted,
                              ),
                            ),
                          ),
                  ),
                  // Status badge
                  Positioned(
                    top: 8,
                    left: 8,
                    child: _buildStatusBadge(char),
                  ),
                  // Action buttons
                  Positioned(
                    top: 8,
                    right: 8,
                    child: Row(
                      children: [
                        if (char.isTraining)
                          GestureDetector(
                            onTap: () => _stopTraining(char.id),
                            child: Container(
                              width: 32,
                              height: 32,
                              decoration: BoxDecoration(
                                color: Colors.orange,
                                borderRadius: BorderRadius.circular(16),
                              ),
                              child: const Icon(
                                Icons.stop,
                                size: 18,
                                color: Colors.white,
                              ),
                            ),
                          ),
                        const SizedBox(width: 4),
                        GestureDetector(
                          onTap: () => _deleteCharacter(char.id),
                          child: Container(
                            width: 32,
                            height: 32,
                            decoration: BoxDecoration(
                              color: Colors.red,
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: const Icon(
                              Icons.delete,
                              size: 18,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            // Info area
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '${char.imageCount} photos',
                    style: TextStyle(
                      color: AppTheme.muted,
                      fontSize: 12,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    char.name,
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusBadge(CharacterModel char) {
    Color color;
    String label;
    IconData? icon;

    if (char.isTraining) {
      color = Colors.blue;
      label = '${char.trainingProgress}%';
      icon = Icons.sync;
    } else if (char.isReady) {
      color = Colors.green;
      label = 'Ready';
      icon = Icons.check;
    } else if (char.isUploading) {
      color = Colors.orange;
      label = 'Uploading';
      icon = Icons.upload;
    } else if (char.isStopped) {
      color = Colors.red;
      label = 'Stopped';
      icon = Icons.error;
    } else {
      return const SizedBox.shrink();
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.9),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 12, color: Colors.white),
            const SizedBox(width: 4),
          ],
          Text(
            label,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 10,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }
}
