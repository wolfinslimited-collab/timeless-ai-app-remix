import 'package:flutter/material.dart';
import 'inpainting_tool_screen.dart';

class ObjectEraseToolScreen extends StatelessWidget {
  const ObjectEraseToolScreen({super.key});

  @override
  Widget build(BuildContext context) {
    // Object Erase uses the same canvas-based masking system as Inpainting
    // but with mode='object-erase' which changes the tool behavior
    return const InpaintingToolScreen(mode: 'object-erase');
  }
}
