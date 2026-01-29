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

/// Wizard steps - 9 slides with onboarding images
/// First 2 slides: content aligned to bottom
/// Remaining slides: content aligned to top
const List<WizardStepData> wizardSteps = [
  // Slide 1 - Welcome (bottom aligned)
  WizardStepData(
    imagePath: 'assets/images/onboarding/1AI_APPSTORE-21-25.jpg',
    title: 'Welcome to Timeless',
    description: 'Your intelligent AI companion that helps you create, organize, and thrive — all in one powerful app.',
  ),
  // Slide 2 - Hollywood (bottom aligned)
  WizardStepData(
    imagePath: 'assets/images/onboarding/1AI_APPSTORE-21-24.jpg',
    title: 'MAKE\nHOLLYWOOD MOVIES',
    description: '',
  ),
  // Slide 3 - Skin AI (top aligned)
  WizardStepData(
    imagePath: 'assets/images/onboarding/1AI_APPSTORE-21-20.jpg',
    title: 'SKIN AI',
    description: 'Receive smart, personalized skincare insights powered by AI to improve skin health and daily care routines.',
  ),
  // Slide 4 - Calorie AI (top aligned)
  WizardStepData(
    imagePath: 'assets/images/onboarding/1AI_APPSTORE-21-21.jpg',
    title: 'CALORIE AI',
    description: 'Track calories accurately and receive AI-based nutrition guidance tailored to your lifestyle and goals.',
  ),
  // Slide 5 - Brain AI (top aligned)
  WizardStepData(
    imagePath: 'assets/images/onboarding/1AI_APPSTORE-21-22.jpg',
    title: 'BRAIN AI',
    description: 'Enhance focus, memory, and mental performance through AI-powered cognitive training and analysis.',
  ),
  // Slide 6 - Sleep AI (top aligned)
  WizardStepData(
    imagePath: 'assets/images/onboarding/1AI_APPSTORE-21-23.jpg',
    title: 'SLEEP AI',
    description: 'Improve sleep quality with AI insights that analyze patterns and help you build healthier sleep habits.',
  ),
  // Slide 7 - TimeFarm (top aligned)
  WizardStepData(
    imagePath: 'assets/images/onboarding/1AI_APPSTORE-21-26.jpg',
    title: 'TIMEFARM',
    description: 'Turn your device into a source of passive income by leveraging AI-powered computational farming.',
  ),
  // Slide 8 - Music AI (top aligned)
  WizardStepData(
    imagePath: 'assets/images/onboarding/1AI_APPSTORE-21-27.jpg',
    title: 'MUSIC AI',
    description: 'Create, compose, and edit music using AI tools designed for both beginners and professional creators.',
  ),
  // Slide 9 - Notify AI (top aligned)
  WizardStepData(
    imagePath: 'assets/images/onboarding/1AI_APPSTORE-21-28.jpg',
    title: 'NOTIFY AI',
    description: 'Receive smart, real-time notifications tailored to your interests and priorities using AI.',
  ),
];
