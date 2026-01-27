/// Wizard step data model
class WizardStepData {
  final String imagePath;
  final String title;
  final String description;

  const WizardStepData({
    required this.imagePath,
    required this.title,
    required this.description,
  });
}

/// Wizard steps - Add your actual images to flutter_app/assets/images/wizard/
const List<WizardStepData> wizardSteps = [
  WizardStepData(
    imagePath: 'assets/images/wizard/wizard_1.jpg',
    title: 'Unlimited AI Creations',
    description: 'Generate stunning images, videos, and music without limits. Your creativity has no boundaries.',
  ),
  WizardStepData(
    imagePath: 'assets/images/wizard/wizard_2.jpg',
    title: 'Priority Processing',
    description: 'Skip the queue and get your creations faster with priority access to our AI models.',
  ),
  WizardStepData(
    imagePath: 'assets/images/wizard/wizard_3.jpg',
    title: '4K Quality Exports',
    description: 'Export your creations in stunning 4K resolution. Perfect for professional use.',
  ),
  WizardStepData(
    imagePath: 'assets/images/wizard/wizard_4.jpg',
    title: 'Advanced AI Models',
    description: 'Access our most powerful AI models for even more impressive results.',
  ),
];
