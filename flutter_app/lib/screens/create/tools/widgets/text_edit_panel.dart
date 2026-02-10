import 'package:flutter/material.dart';
import '../../../../core/theme.dart';

/// Text style preset model
class TextStylePreset {
  final String id;
  final String name;
  final String fontFamily;
  final FontWeight fontWeight;
  final Color color;
  final bool hasStroke;
  final Color? strokeColor;
  final bool hasGlow;
  final Color? glowColor;
  final bool hasShadow;
  final Color? shadowColor;

  const TextStylePreset({
    required this.id,
    required this.name,
    required this.fontFamily,
    required this.fontWeight,
    required this.color,
    this.hasStroke = false,
    this.strokeColor,
    this.hasGlow = false,
    this.glowColor,
    this.hasShadow = false,
    this.shadowColor,
  });
}

/// Default style presets
const List<TextStylePreset> kTextStylePresets = [
  TextStylePreset(id: 'default', name: 'Default', fontFamily: 'Roboto', fontWeight: FontWeight.w600, color: Colors.white),
  TextStylePreset(id: 'bold-white', name: 'Bold', fontFamily: 'Roboto', fontWeight: FontWeight.w900, color: Colors.white, hasStroke: true, strokeColor: Colors.black),
  TextStylePreset(id: 'neon', name: 'Neon', fontFamily: 'Roboto', fontWeight: FontWeight.w700, color: Color(0xFFFF00FF), hasGlow: true, glowColor: Color(0xFFFF00FF)),
  TextStylePreset(id: 'shadow', name: 'Shadow', fontFamily: 'Roboto', fontWeight: FontWeight.w700, color: Colors.white, hasShadow: true, shadowColor: Colors.black),
  TextStylePreset(id: 'outline', name: 'Outline', fontFamily: 'Roboto', fontWeight: FontWeight.w700, color: Colors.transparent, hasStroke: true, strokeColor: Colors.white),
  TextStylePreset(id: 'gradient', name: 'Gradient', fontFamily: 'Roboto', fontWeight: FontWeight.w800, color: Color(0xFFFF6B6B), hasGlow: true, glowColor: Color(0xFF4ECDC4)),
  TextStylePreset(id: 'retro', name: 'Retro', fontFamily: 'Georgia', fontWeight: FontWeight.w700, color: Color(0xFFFFD700), hasStroke: true, strokeColor: Color(0xFF8B4513), hasShadow: true, shadowColor: Colors.black),
  TextStylePreset(id: 'minimal', name: 'Minimal', fontFamily: 'Roboto', fontWeight: FontWeight.w300, color: Colors.white),
];

/// Font options
const List<Map<String, String>> kFontOptions = [
  {'id': 'roboto', 'name': 'Roboto', 'family': 'Roboto'},
  {'id': 'inter', 'name': 'Inter', 'family': 'Inter'},
  {'id': 'arial', 'name': 'Arial', 'family': 'Arial'},
  {'id': 'georgia', 'name': 'Georgia', 'family': 'Georgia'},
  {'id': 'times', 'name': 'Times', 'family': 'Times New Roman'},
  {'id': 'courier', 'name': 'Courier', 'family': 'Courier New'},
];

/// Color presets
const List<Color> kColorPresets = [
  Colors.white, Colors.black, Colors.red, Colors.green, Colors.blue,
  Colors.yellow, Color(0xFFFF00FF), Colors.cyan, Color(0xFFFF6B6B), Color(0xFF4ECDC4),
  Color(0xFF45B7D1), Color(0xFF96CEB4), Color(0xFFFFEAA7), Color(0xFFDDA0DD), Color(0xFFF39C12),
];

/// Animation presets
const List<Map<String, String>> kAnimationPresets = [
  {'id': 'none', 'name': 'None', 'icon': '—'},
  {'id': 'fade', 'name': 'Fade', 'icon': '◐'},
  {'id': 'slide-up', 'name': 'Slide Up', 'icon': '↑'},
  {'id': 'slide-down', 'name': 'Slide Down', 'icon': '↓'},
  {'id': 'scale', 'name': 'Scale', 'icon': '⊕'},
  {'id': 'bounce', 'name': 'Bounce', 'icon': '⌒'},
  {'id': 'typewriter', 'name': 'Typewriter', 'icon': '▯'},
  {'id': 'wave', 'name': 'Wave', 'icon': '∿'},
];

/// Bubble presets
const List<Map<String, String>> kBubblePresets = [
  {'id': 'none', 'name': 'None', 'shape': 'none'},
  {'id': 'rect', 'name': 'Rectangle', 'shape': 'rect'},
  {'id': 'rounded', 'name': 'Rounded', 'shape': 'rounded'},
  {'id': 'pill', 'name': 'Pill', 'shape': 'pill'},
  {'id': 'speech', 'name': 'Speech', 'shape': 'speech'},
  {'id': 'thought', 'name': 'Thought', 'shape': 'thought'},
];

enum TextEditTab { templates, fonts, styles, effects, animations, bubbles }

class TextEditPanel extends StatefulWidget {
  final VoidCallback onBack;
  final VoidCallback? onDelete;
  final String text;
  final ValueChanged<String> onTextChange;
  final double fontSize;
  final ValueChanged<double> onFontSizeChange;
  final Color textColor;
  final ValueChanged<Color> onTextColorChange;
  final String fontFamily;
  final ValueChanged<String> onFontFamilyChange;
  // Text formatting
  final bool bold;
  final ValueChanged<bool>? onBoldChange;
  final bool italic;
  final ValueChanged<bool>? onItalicChange;
  final bool underline;
  final ValueChanged<bool>? onUnderlineChange;
  final double lineHeight;
  final ValueChanged<double>? onLineHeightChange;
  final TextAlign alignment;
  final ValueChanged<TextAlign>? onAlignmentChange;
  final double opacity;
  final ValueChanged<double> onOpacityChange;
  // Extended properties
  final bool strokeEnabled;
  final ValueChanged<bool>? onStrokeEnabledChange;
  final Color strokeColor;
  final ValueChanged<Color>? onStrokeColorChange;
  final double strokeWidth;
  final ValueChanged<double>? onStrokeWidthChange;
  final bool glowEnabled;
  final ValueChanged<bool>? onGlowEnabledChange;
  final Color glowColor;
  final ValueChanged<Color>? onGlowColorChange;
  final double glowIntensity;
  final ValueChanged<double>? onGlowIntensityChange;
  final bool shadowEnabled;
  final ValueChanged<bool>? onShadowEnabledChange;
  final Color shadowColor;
  final ValueChanged<Color>? onShadowColorChange;
  final double letterSpacing;
  final ValueChanged<double>? onLetterSpacingChange;
  final double curveAmount;
  final ValueChanged<double>? onCurveAmountChange;
  final String animation;
  final ValueChanged<String>? onAnimationChange;
  final String bubbleStyle;
  final ValueChanged<String>? onBubbleStyleChange;

  const TextEditPanel({
    super.key,
    required this.onBack,
    this.onDelete,
    required this.text,
    required this.onTextChange,
    required this.fontSize,
    required this.onFontSizeChange,
    required this.textColor,
    required this.onTextColorChange,
    required this.fontFamily,
    required this.onFontFamilyChange,
    this.bold = false,
    this.onBoldChange,
    this.italic = false,
    this.onItalicChange,
    this.underline = false,
    this.onUnderlineChange,
    this.lineHeight = 1.4,
    this.onLineHeightChange,
    this.alignment = TextAlign.center,
    this.onAlignmentChange,
    required this.opacity,
    required this.onOpacityChange,
    this.strokeEnabled = false,
    this.onStrokeEnabledChange,
    this.strokeColor = Colors.black,
    this.onStrokeColorChange,
    this.strokeWidth = 2.0,
    this.onStrokeWidthChange,
    this.glowEnabled = false,
    this.onGlowEnabledChange,
    this.glowColor = Colors.white,
    this.onGlowColorChange,
    this.glowIntensity = 10.0,
    this.onGlowIntensityChange,
    this.shadowEnabled = false,
    this.onShadowEnabledChange,
    this.shadowColor = Colors.black,
    this.onShadowColorChange,
    this.letterSpacing = 0.0,
    this.onLetterSpacingChange,
    this.curveAmount = 0.0,
    this.onCurveAmountChange,
    this.animation = 'none',
    this.onAnimationChange,
    this.bubbleStyle = 'none',
    this.onBubbleStyleChange,
  });

  @override
  State<TextEditPanel> createState() => _TextEditPanelState();
}

class _TextEditPanelState extends State<TextEditPanel> {
  TextEditTab _activeTab = TextEditTab.styles;
  String? _selectedPreset;
  String? _showColorPicker; // 'text', 'stroke', 'glow', 'shadow', 'bg'

  void _applyPreset(TextStylePreset preset) {
    setState(() => _selectedPreset = preset.id);
    widget.onFontFamilyChange(preset.fontFamily);
    widget.onTextColorChange(preset.color);
    widget.onStrokeEnabledChange?.call(preset.hasStroke);
    if (preset.strokeColor != null) widget.onStrokeColorChange?.call(preset.strokeColor!);
    widget.onGlowEnabledChange?.call(preset.hasGlow);
    if (preset.glowColor != null) widget.onGlowColorChange?.call(preset.glowColor!);
    widget.onShadowEnabledChange?.call(preset.hasShadow);
    if (preset.shadowColor != null) widget.onShadowColorChange?.call(preset.shadowColor!);
  }

  Widget _buildTabContent() {
    switch (_activeTab) {
      case TextEditTab.templates:
        return _buildTemplatesTab();
      case TextEditTab.fonts:
        return _buildFontsTab();
      case TextEditTab.styles:
        return _buildStylesTab();
      case TextEditTab.effects:
        return _buildEffectsTab();
      case TextEditTab.animations:
        return _buildAnimationsTab();
      case TextEditTab.bubbles:
        return _buildBubblesTab();
    }
  }

  Widget _buildTemplatesTab() {
    final templates = ['Title', 'Subtitle', 'Caption', 'Quote', 'Heading', 'Label'];
    return Padding(
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Text Templates', style: TextStyle(fontSize: 11, color: AppTheme.muted)),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: templates.map((template) => GestureDetector(
              onTap: () => widget.onTextChange(template),
              child: Container(
                width: (MediaQuery.of(context).size.width - 56) / 2,
                height: 56,
                decoration: BoxDecoration(
                  color: AppTheme.secondary.withOpacity(0.5),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppTheme.border.withOpacity(0.3)),
                ),
                alignment: Alignment.center,
                child: Text(template, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: Colors.white)),
              ),
            )).toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildFontsTab() {
    return Padding(
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Font Size slider at top of Fonts tab
          _buildSliderRow('Font Size', widget.fontSize, 12, 120, widget.onFontSizeChange, suffix: 'px'),
          const SizedBox(height: 16),
          Text('Select Font', style: TextStyle(fontSize: 11, color: AppTheme.muted)),
          const SizedBox(height: 12),
          ...kFontOptions.map((font) {
            final isSelected = widget.fontFamily == font['family'];
            return GestureDetector(
              onTap: () => widget.onFontFamilyChange(font['family']!),
              child: Container(
                margin: const EdgeInsets.only(bottom: 4),
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                decoration: BoxDecoration(
                  color: isSelected ? AppTheme.primary.withOpacity(0.2) : AppTheme.secondary.withOpacity(0.3),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: isSelected ? AppTheme.primary.withOpacity(0.5) : Colors.transparent),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(font['name']!, style: TextStyle(fontSize: 13, color: Colors.white, fontFamily: font['family'])),
                    if (isSelected) Icon(Icons.check, size: 18, color: AppTheme.primary),
                  ],
                ),
              ),
            );
          }),
        ],
      ),
    );
  }

  Widget _buildStylesTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Alignment
          Text('Alignment', style: TextStyle(fontSize: 11, color: AppTheme.muted)),
          const SizedBox(height: 8),
          Row(
            children: [
              _buildToggleButton('Left', Icons.format_align_left, widget.alignment == TextAlign.left, () => widget.onAlignmentChange?.call(TextAlign.left)),
              const SizedBox(width: 8),
              _buildToggleButton('Center', Icons.format_align_center, widget.alignment == TextAlign.center, () => widget.onAlignmentChange?.call(TextAlign.center)),
              const SizedBox(width: 8),
              _buildToggleButton('Right', Icons.format_align_right, widget.alignment == TextAlign.right, () => widget.onAlignmentChange?.call(TextAlign.right)),
            ],
          ),
          const SizedBox(height: 16),

          // Bold / Italic / Underline
          Text('Formatting', style: TextStyle(fontSize: 11, color: AppTheme.muted)),
          const SizedBox(height: 8),
          Row(
            children: [
              _buildToggleButton('Bold', Icons.format_bold, widget.bold, () => widget.onBoldChange?.call(!widget.bold)),
              const SizedBox(width: 8),
              _buildToggleButton('Italic', Icons.format_italic, widget.italic, () => widget.onItalicChange?.call(!widget.italic)),
              const SizedBox(width: 8),
              _buildToggleButton('Underline', Icons.format_underlined, widget.underline, () => widget.onUnderlineChange?.call(!widget.underline)),
            ],
          ),
          const SizedBox(height: 16),

          // Line Height
          _buildSliderRow('Line Height', widget.lineHeight, 0.8, 3.0, (v) => widget.onLineHeightChange?.call(v), suffix: 'x'),
          const SizedBox(height: 16),

          // Style Presets Row
          Text('Style Presets', style: TextStyle(fontSize: 11, color: AppTheme.muted)),
          const SizedBox(height: 8),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: kTextStylePresets.map((preset) {
                final isSelected = _selectedPreset == preset.id;
                return GestureDetector(
                  onTap: () => _applyPreset(preset),
                  child: Container(
                    width: 52,
                    height: 52,
                    margin: const EdgeInsets.only(right: 8),
                    decoration: BoxDecoration(
                      color: AppTheme.secondary.withOpacity(0.3),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: isSelected ? AppTheme.primary : AppTheme.border.withOpacity(0.3),
                        width: isSelected ? 2 : 1,
                      ),
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      'Aa',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: preset.fontWeight,
                        fontFamily: preset.fontFamily,
                        color: preset.color == Colors.transparent ? Colors.white : preset.color,
                        shadows: preset.hasGlow ? [Shadow(color: preset.glowColor!, blurRadius: 10)] : null,
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 16),
          
          // Text Properties Row
          Text('Properties', style: TextStyle(fontSize: 11, color: AppTheme.muted)),
          const SizedBox(height: 8),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _buildPropertyButton('Color', Icons.palette_outlined, _showColorPicker == 'text', () {
                  setState(() => _showColorPicker = _showColorPicker == 'text' ? null : 'text');
                }, colorIndicator: widget.textColor),
                _buildPropertyButton('Stroke', Icons.circle_outlined, widget.strokeEnabled, () {
                  widget.onStrokeEnabledChange?.call(!widget.strokeEnabled);
                  if (!widget.strokeEnabled) setState(() => _showColorPicker = 'stroke');
                }),
                _buildPropertyButton('Glow', Icons.auto_awesome_outlined, widget.glowEnabled, () {
                  widget.onGlowEnabledChange?.call(!widget.glowEnabled);
                  if (!widget.glowEnabled) setState(() => _showColorPicker = 'glow');
                }),
                _buildPropertyButton('BG', Icons.square_outlined, false, () {
                  setState(() => _showColorPicker = _showColorPicker == 'bg' ? null : 'bg');
                }),
                _buildPropertyButton('Shadow', Icons.blur_on_outlined, widget.shadowEnabled, () {
                  widget.onShadowEnabledChange?.call(!widget.shadowEnabled);
                  if (!widget.shadowEnabled) setState(() => _showColorPicker = 'shadow');
                }),
                _buildPropertyButton('Curve', Icons.swap_vert, widget.curveAmount != 0, () {
                  widget.onCurveAmountChange?.call(widget.curveAmount == 0 ? 20 : 0);
                }),
                _buildPropertyButton('Spacing', Icons.format_line_spacing, widget.letterSpacing != 0, () {
                  widget.onLetterSpacingChange?.call(widget.letterSpacing == 0 ? 2 : 0);
                }),
              ],
            ),
          ),
          
          // Color Picker
          if (_showColorPicker != null) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppTheme.secondary.withOpacity(0.5),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppTheme.border.withOpacity(0.3)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('${_showColorPicker!.substring(0, 1).toUpperCase()}${_showColorPicker!.substring(1)} Color', 
                       style: TextStyle(fontSize: 11, color: AppTheme.muted)),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: kColorPresets.map((color) => GestureDetector(
                      onTap: () {
                        if (_showColorPicker == 'text') widget.onTextColorChange(color);
                        else if (_showColorPicker == 'stroke') widget.onStrokeColorChange?.call(color);
                        else if (_showColorPicker == 'glow') widget.onGlowColorChange?.call(color);
                        else if (_showColorPicker == 'shadow') widget.onShadowColorChange?.call(color);
                        setState(() => _showColorPicker = null);
                      },
                      child: Container(
                        width: 32,
                        height: 32,
                        decoration: BoxDecoration(
                          color: color,
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white.withOpacity(0.2), width: 2),
                        ),
                      ),
                    )).toList(),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildToggleButton(String label, IconData icon, bool isActive, VoidCallback onTap) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: isActive ? AppTheme.primary.withOpacity(0.15) : AppTheme.secondary.withOpacity(0.3),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: isActive ? AppTheme.primary : AppTheme.border.withOpacity(0.3)),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 18, color: isActive ? AppTheme.primary : Colors.white.withOpacity(0.7)),
              const SizedBox(width: 4),
              Text(label, style: TextStyle(fontSize: 10, color: isActive ? AppTheme.primary : AppTheme.muted)),
            ],
          ),
        ),
      ),
    );
  }

    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 52,
        padding: const EdgeInsets.symmetric(vertical: 8),
        margin: const EdgeInsets.only(right: 8),
        decoration: BoxDecoration(
          color: isActive ? AppTheme.primary.withOpacity(0.1) : AppTheme.secondary.withOpacity(0.3),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: isActive ? AppTheme.primary : AppTheme.border.withOpacity(0.3)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (colorIndicator != null)
              Container(
                width: 24,
                height: 24,
                decoration: BoxDecoration(
                  color: colorIndicator,
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white.withOpacity(0.3)),
                ),
              )
            else
              Icon(icon, size: 22, color: isActive ? AppTheme.primary : Colors.white.withOpacity(0.7)),
            const SizedBox(height: 4),
            Text(label, style: TextStyle(fontSize: 9, color: AppTheme.muted)),
          ],
        ),
      ),
    );
  }

  Widget _buildEffectsTab() {
    return Padding(
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Stroke Width
          if (widget.strokeEnabled) ...[
            _buildSliderRow('Stroke Width', widget.strokeWidth, 1, 10, (v) => widget.onStrokeWidthChange?.call(v), suffix: 'px'),
            const SizedBox(height: 16),
          ],
          
          // Glow Intensity
          if (widget.glowEnabled) ...[
            _buildSliderRow('Glow Intensity', widget.glowIntensity, 5, 50, (v) => widget.onGlowIntensityChange?.call(v), suffix: 'px'),
            const SizedBox(height: 16),
          ],
          
          // Letter Spacing
          _buildSliderRow('Letter Spacing', widget.letterSpacing, -5, 20, (v) => widget.onLetterSpacingChange?.call(v), suffix: 'px'),
          const SizedBox(height: 16),
          
          // Curve Amount
          _buildSliderRow('Curve', widget.curveAmount, -45, 45, (v) => widget.onCurveAmountChange?.call(v), suffix: '°'),
        ],
      ),
    );
  }

  Widget _buildAnimationsTab() {
    return Padding(
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Animation Style', style: TextStyle(fontSize: 11, color: AppTheme.muted)),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: kAnimationPresets.map((anim) {
              final isSelected = widget.animation == anim['id'];
              return GestureDetector(
                onTap: () => widget.onAnimationChange?.call(anim['id']!),
                child: Container(
                  width: (MediaQuery.of(context).size.width - 72) / 4,
                  height: 60,
                  decoration: BoxDecoration(
                    color: isSelected ? AppTheme.primary.withOpacity(0.2) : AppTheme.secondary.withOpacity(0.3),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: isSelected ? AppTheme.primary : AppTheme.border.withOpacity(0.3)),
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(anim['icon']!, style: const TextStyle(fontSize: 20)),
                      const SizedBox(height: 4),
                      Text(anim['name']!, style: TextStyle(fontSize: 9, color: AppTheme.muted)),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildBubblesTab() {
    return Padding(
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Text Bubble Style', style: TextStyle(fontSize: 11, color: AppTheme.muted)),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: kBubblePresets.map((bubble) {
              final isSelected = widget.bubbleStyle == bubble['id'];
              return GestureDetector(
                onTap: () => widget.onBubbleStyleChange?.call(bubble['id']!),
                child: Container(
                  width: (MediaQuery.of(context).size.width - 60) / 3,
                  height: 72,
                  decoration: BoxDecoration(
                    color: isSelected ? AppTheme.primary.withOpacity(0.2) : AppTheme.secondary.withOpacity(0.3),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: isSelected ? AppTheme.primary : AppTheme.border.withOpacity(0.3)),
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        width: 48,
                        height: 28,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: bubble['shape'] == 'none' ? Colors.transparent : Colors.white.withOpacity(0.1),
                          border: bubble['shape'] == 'none' ? null : Border.all(color: Colors.white.withOpacity(0.3)),
                          borderRadius: bubble['shape'] == 'pill' ? BorderRadius.circular(14)
                              : bubble['shape'] == 'rounded' ? BorderRadius.circular(6)
                              : bubble['shape'] == 'thought' ? BorderRadius.circular(14)
                              : BorderRadius.circular(2),
                        ),
                        child: const Text('Aa', style: TextStyle(fontSize: 12, color: Colors.white)),
                      ),
                      const SizedBox(height: 8),
                      Text(bubble['name']!, style: TextStyle(fontSize: 9, color: AppTheme.muted)),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildSliderRow(String label, double value, double min, double max, ValueChanged<double> onChanged, {String suffix = ''}) {
    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label, style: TextStyle(fontSize: 11, color: AppTheme.muted)),
            Text('${suffix == 'x' ? value.toStringAsFixed(1) : value.toStringAsFixed(0)}$suffix', style: const TextStyle(fontSize: 11, color: Colors.white)),
          ],
        ),
        const SizedBox(height: 8),
        SliderTheme(
          data: SliderThemeData(
            trackHeight: 4,
            thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 8),
            activeTrackColor: AppTheme.primary,
            inactiveTrackColor: AppTheme.secondary,
            thumbColor: Colors.white,
            overlayColor: AppTheme.primary.withOpacity(0.2),
          ),
          child: Slider(
            value: value.clamp(min, max),
            min: min,
            max: max,
            onChanged: onChanged,
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final tabs = TextEditTab.values;
    
    return Container(
      decoration: BoxDecoration(
        color: AppTheme.background,
        border: Border(top: BorderSide(color: AppTheme.border.withOpacity(0.2))),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Header with back and confirm buttons
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              border: Border(bottom: BorderSide(color: AppTheme.border.withOpacity(0.2))),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    GestureDetector(
                      onTap: widget.onBack,
                      child: Container(
                        width: 32,
                        height: 36,
                        decoration: BoxDecoration(
                          color: AppTheme.primary.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: AppTheme.primary.withOpacity(0.2)),
                        ),
                        child: Icon(Icons.chevron_left, size: 22, color: AppTheme.primary),
                      ),
                    ),
                    const SizedBox(width: 12),
                    const Text('Edit Text', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: Colors.white)),
                  ],
                ),
                Row(
                  children: [
                    // Delete Button
                    if (widget.onDelete != null)
                      GestureDetector(
                        onTap: widget.onDelete,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          decoration: BoxDecoration(
                            color: Colors.red.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: Colors.red.withOpacity(0.2)),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.delete_outline, size: 16, color: Colors.red),
                              const SizedBox(width: 4),
                              Text('Delete', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w500, color: Colors.red)),
                            ],
                          ),
                        ),
                      ),
                    const SizedBox(width: 8),
                    GestureDetector(
                      onTap: widget.onBack,
                      child: Container(
                        width: 32,
                        height: 32,
                        decoration: BoxDecoration(
                          color: AppTheme.primary,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.check, size: 18, color: Colors.white),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          
          // Text Input
          Padding(
            padding: const EdgeInsets.all(12),
            child: TextField(
              controller: TextEditingController(text: widget.text),
              onChanged: widget.onTextChange,
              style: const TextStyle(fontSize: 14, color: Colors.white),
              decoration: InputDecoration(
                hintText: 'Enter text...',
                hintStyle: TextStyle(color: AppTheme.muted),
                filled: true,
                fillColor: AppTheme.secondary.withOpacity(0.5),
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: AppTheme.border.withOpacity(0.3)),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: AppTheme.border.withOpacity(0.3)),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: AppTheme.primary.withOpacity(0.5)),
                ),
              ),
            ),
          ),
          
          // Tab Bar
          Container(
            decoration: BoxDecoration(
              color: AppTheme.secondary.withOpacity(0.2),
              border: Border(bottom: BorderSide(color: AppTheme.border.withOpacity(0.2))),
            ),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: tabs.map((tab) {
                  final isActive = _activeTab == tab;
                  final label = tab.name.substring(0, 1).toUpperCase() + tab.name.substring(1);
                  return GestureDetector(
                    onTap: () => setState(() => _activeTab = tab),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      decoration: BoxDecoration(
                        border: Border(
                          bottom: BorderSide(
                            color: isActive ? AppTheme.primary : Colors.transparent,
                            width: 2,
                          ),
                        ),
                      ),
                      child: Text(
                        label,
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                          color: isActive ? AppTheme.primary : AppTheme.muted,
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
          ),
          
          // Tab Content (constrained height with scroll)
          ConstrainedBox(
            constraints: const BoxConstraints(maxHeight: 220),
            child: SingleChildScrollView(child: _buildTabContent()),
          ),
          
          // Size and Opacity Sliders
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              border: Border(top: BorderSide(color: AppTheme.border.withOpacity(0.2))),
            ),
            child: Column(
              children: [
                _buildSliderRow('Size', widget.fontSize, 12, 120, widget.onFontSizeChange, suffix: 'px'),
                const SizedBox(height: 12),
                _buildSliderRow('Opacity', widget.opacity * 100, 0, 100, (v) => widget.onOpacityChange(v / 100), suffix: '%'),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
