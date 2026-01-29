import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import '../../../core/theme.dart';

class SpeedMathGameScreen extends StatefulWidget {
  const SpeedMathGameScreen({super.key});

  @override
  State<SpeedMathGameScreen> createState() => _SpeedMathGameScreenState();
}

class _SpeedMathGameScreenState extends State<SpeedMathGameScreen> {
  static const gameDuration = 60;

  _MathProblem? currentProblem;
  int score = 0;
  int streak = 0;
  int timeLeft = gameDuration;
  bool isComplete = false;
  bool gameStarted = false;
  String? feedback;
  Timer? timer;

  void _startGame() {
    setState(() {
      gameStarted = true;
      score = 0;
      streak = 0;
      timeLeft = gameDuration;
      isComplete = false;
      feedback = null;
      currentProblem = _generateProblem();
    });

    timer?.cancel();
    timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (timeLeft > 0) {
        setState(() => timeLeft--);
      } else {
        timer?.cancel();
        setState(() => isComplete = true);
      }
    });
  }

  @override
  void dispose() {
    timer?.cancel();
    super.dispose();
  }

  _MathProblem _generateProblem() {
    final random = Random();
    final operations = ['+', '-', '×'];
    final operation = operations[random.nextInt(operations.length)];

    int num1, num2, answer;

    switch (operation) {
      case '+':
        num1 = random.nextInt(50) + 1;
        num2 = random.nextInt(50) + 1;
        answer = num1 + num2;
        break;
      case '-':
        num1 = random.nextInt(50) + 20;
        num2 = random.nextInt(num1) + 1;
        answer = num1 - num2;
        break;
      case '×':
        num1 = random.nextInt(12) + 1;
        num2 = random.nextInt(12) + 1;
        answer = num1 * num2;
        break;
      default:
        num1 = 1;
        num2 = 1;
        answer = 2;
    }

    // Generate wrong options
    final wrongOptions = <int>{};
    while (wrongOptions.length < 3) {
      final offset = random.nextInt(10) - 5;
      final wrongAnswer = answer + offset;
      if (wrongAnswer != answer && wrongAnswer > 0) {
        wrongOptions.add(wrongAnswer);
      }
    }

    final options = [...wrongOptions, answer]..shuffle();

    return _MathProblem(
      question: '$num1 $operation $num2',
      answer: answer,
      options: options,
    );
  }

  void _handleAnswer(int selectedAnswer) {
    if (currentProblem == null || feedback != null) return;

    final isCorrect = selectedAnswer == currentProblem!.answer;

    setState(() {
      if (isCorrect) {
        final points = 10 + streak * 2;
        score += points;
        streak++;
        feedback = 'correct';
      } else {
        streak = 0;
        feedback = 'wrong';
      }
    });

    Future.delayed(const Duration(milliseconds: 500), () {
      if (!mounted) return;
      setState(() {
        feedback = null;
        currentProblem = _generateProblem();
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    if (!gameStarted) {
      return Scaffold(
        appBar: AppBar(title: const Text('Speed Math')),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: AppTheme.secondary,
                    shape: BoxShape.circle,
                  ),
                  child: Icon(Icons.timer, size: 48, color: AppTheme.muted),
                ),
                const SizedBox(height: 24),
                const Text(
                  'Ready to Test Your Speed?',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 12),
                const Text(
                  'Solve as many math problems as you can in 60 seconds!',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: AppTheme.muted),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Build streaks for bonus points',
                  style: TextStyle(color: AppTheme.muted, fontSize: 13),
                ),
                const SizedBox(height: 32),
                ElevatedButton(
                  onPressed: _startGame,
                  child: const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                    child: Text('Start Game'),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Speed Math'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _startGame,
          ),
        ],
      ),
      body: Column(
        children: [
          // Stats bar
          Container(
            padding: const EdgeInsets.symmetric(vertical: 16),
            color: AppTheme.secondary.withOpacity(0.5),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildStat('$score', 'Score'),
                _buildStat('$streak🔥', 'Streak'),
                _buildStat(
                  '${timeLeft}s',
                  'Time',
                  isWarning: timeLeft <= 10,
                ),
              ],
            ),
          ),

          // Problem
          Expanded(
            child: Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(32),
                      decoration: BoxDecoration(
                        color: feedback == 'correct'
                            ? Colors.green.withOpacity(0.1)
                            : feedback == 'wrong'
                                ? Colors.red.withOpacity(0.1)
                                : AppTheme.secondary,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: feedback == 'correct'
                              ? Colors.green.withOpacity(0.5)
                              : feedback == 'wrong'
                                  ? Colors.red.withOpacity(0.5)
                                  : AppTheme.border,
                        ),
                      ),
                      child: Column(
                        children: [
                          Text(
                            currentProblem?.question ?? '',
                            style: const TextStyle(
                              fontSize: 36,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 8),
                          const Text(
                            '= ?',
                            style: TextStyle(color: AppTheme.muted),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 32),

                    // Options grid
                    GridView.count(
                      shrinkWrap: true,
                      crossAxisCount: 2,
                      mainAxisSpacing: 12,
                      crossAxisSpacing: 12,
                      childAspectRatio: 2,
                      children: (currentProblem?.options ?? []).map((option) {
                        final isCorrectAnswer = feedback != null &&
                            option == currentProblem?.answer;
                        return GestureDetector(
                          onTap: () => _handleAnswer(option),
                          child: Container(
                            decoration: BoxDecoration(
                              color: isCorrectAnswer
                                  ? Colors.green.withOpacity(0.2)
                                  : AppTheme.card,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: isCorrectAnswer
                                    ? Colors.green
                                    : AppTheme.border,
                                width: isCorrectAnswer ? 2 : 1,
                              ),
                            ),
                            child: Center(
                              child: Text(
                                '$option',
                                style: TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.bold,
                                  color: isCorrectAnswer ? Colors.green : null,
                                ),
                              ),
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),

      // Completion dialog
      bottomSheet: isComplete
          ? Container(
              width: double.infinity,
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: AppTheme.card,
                borderRadius:
                    const BorderRadius.vertical(top: Radius.circular(24)),
                border: Border.all(color: AppTheme.border),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppTheme.primary.withOpacity(0.1),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(Icons.emoji_events,
                        size: 40, color: AppTheme.primary),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    "Time's Up!",
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '$score points',
                    style: TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.primary,
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Great job! Keep practicing to improve your score.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: AppTheme.muted),
                  ),
                  const SizedBox(height: 24),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () => Navigator.pop(context),
                          child: const Text('Exit'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: ElevatedButton(
                          onPressed: _startGame,
                          child: const Text('Play Again'),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            )
          : null,
    );
  }

  Widget _buildStat(String value, String label, {bool isWarning = false}) {
    return Column(
      children: [
        Text(
          value,
          style: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.bold,
            color: isWarning ? Colors.red : null,
          ),
        ),
        Text(label,
            style: const TextStyle(color: AppTheme.muted, fontSize: 12)),
      ],
    );
  }
}

class _MathProblem {
  final String question;
  final int answer;
  final List<int> options;

  _MathProblem({
    required this.question,
    required this.answer,
    required this.options,
  });
}
