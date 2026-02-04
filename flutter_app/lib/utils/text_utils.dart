/// Utility functions for text processing

/// Clean markdown formatting from text for display or speech
/// 
/// This removes markdown syntax while preserving the core text content.
/// Useful for voice chat displays and text-to-speech output.
String cleanMarkdown(String text) {
  return text
      // Remove bold/italic markers
      .replaceAllMapped(RegExp(r'\*\*([^*]+)\*\*'), (m) => m.group(1) ?? '')
      .replaceAllMapped(RegExp(r'\*([^*]+)\*'), (m) => m.group(1) ?? '')
      .replaceAllMapped(RegExp(r'__([^_]+)__'), (m) => m.group(1) ?? '')
      .replaceAllMapped(RegExp(r'_([^_]+)_'), (m) => m.group(1) ?? '')
      // Remove headers
      .replaceAll(RegExp(r'^#{1,6}\s+', multiLine: true), '')
      // Normalize bullet points
      .replaceAll(RegExp(r'^\s*[-*+]\s+', multiLine: true), '• ')
      // Remove numbered list markers
      .replaceAll(RegExp(r'^\s*\d+\.\s+', multiLine: true), '')
      // Remove code backticks
      .replaceAllMapped(RegExp(r'`([^`]+)`'), (m) => m.group(1) ?? '')
      // Remove code blocks
      .replaceAll(RegExp(r'```[\s\S]*?```'), '[code block]')
      // Remove links, keep text
      .replaceAllMapped(RegExp(r'\[([^\]]+)\]\([^)]+\)'), (m) => m.group(1) ?? '')
      // Clean up extra whitespace
      .replaceAll(RegExp(r'\n{3,}'), '\n\n')
      .trim();
}

/// Prepare text for speech synthesis
/// 
/// Cleans markdown and makes additional adjustments for natural speech
String prepareForSpeech(String text) {
  return cleanMarkdown(text)
      // Replace code blocks with spoken description
      .replaceAll('[code block]', 'code block')
      // Remove URLs
      .replaceAll(RegExp(r'https?://\S+'), '')
      // Normalize whitespace
      .replaceAll(RegExp(r'\s+'), ' ')
      .trim();
}
