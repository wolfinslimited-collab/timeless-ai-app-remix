import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import '../../../core/theme.dart';

class NBackGame extends StatefulWidget {
  final Function(Map<String, dynamic>) onComplete;
  final VoidCallback onClose;

  const NBackGame({
    super.key,
    required this.onComplete,
    required this.onClose,
  });

  @override
  State<NBackGame> createState() => _NBackGameState();
}

enum GamePhase { intro, playing, feedback, finished }

class _NBackGameState extends State<NBackGame> {
  static const List<String> _letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'K', 'L'];
  static const int _totalTrials = 20;
  static const int _nBack = 2;
  static const double _matchProbability = 0.3;
  static const int _displayTime = 2000;
  static const int _interTrialTime = 500;

  GamePhase _phase = GamePhase.intro;
  String? _currentLetter;
  List<String> _sequence = [];
  int _trialIndex = 0;
  int _correct = 0;
  int _incorrect = 0;
  bool _responded = false;
  String? _lastFeedback;
  DateTime? _startTime;
  Timer? _timer;

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  List<String> _generateSequence() {
    final seq = <String>[];
    final random = Random();

    for (int i = 0; i < _totalTrials; i++) {
      if (i >= _nBack && random.nextDouble() < _matchProbability) {
        // Create a match
        seq.add(seq[i - _nBack]);
      } else {
        // Random letter (avoiding unintended matches when possible)
        var letter = _letters[random.nextInt(_letters.length)];
        if (i >= _nBack) {
          int attempts = 0;
          while (letter == seq[i - _nBack] && attempts < 5) {
            letter = _letters[random.nextInt(_letters.length)];
            attempts++;
          }
        }
        seq.add(letter);
      }
    }
    return seq;
  }

  void _startGame() {
    final seq = _generateSequence();
    setState(() {
      _sequence = seq;
      _trialIndex = 0;
      _correct = 0;
      _incorrect = 0;
      _startTime = DateTime.now();
      _phase = GamePhase.playing;
    });
    _showTrial(0);
  }

  void _showTrial(int index) {
    if (index >= _sequence.length) {
      setState(() => _phase = GamePhase.finished);
      return;
    }

    setState(() {
      _currentLetter = _sequence[index];
      _responded = false;
      _lastFeedback = null;
    });

    _timer = Timer(const Duration(milliseconds: _displayTime), () {
      if (!mounted) return;

      // If no response, check if it was a miss
      if (!_responded) {
        final isMatch = index >= _nBack && _sequence[index] == _sequence[index - _nBack];
        if (isMatch) {
          setState(() {
            _incorrect++;
            _lastFeedback = 'incorrect';
          });
        }
      }

      setState(() {
        _currentLetter = null;
        _phase = GamePhase.feedback;
      });

      Timer(const Duration(milliseconds: _interTrialTime), () {
        if (!mounted) return;
        setState(() {
          _trialIndex++;
          _phase = GamePhase.playing;
        });
        _showTrial(index + 1);
      });
    });
  }

  void _handleResponse(bool isMatchResponse) {
    if (_responded || _trialIndex < _nBack) return;

    setState(() => _responded = true);
    final isActualMatch = _sequence[_trialIndex] == _sequence[_trialIndex - _nBack];

    if (isMatchResponse == isActualMatch) {
      setState(() {
        _correct++;
        _lastFeedback = 'correct';
      });
    } else {
      setState(() {
        _incorrect++;
        _lastFeedback = 'incorrect';
      });
    }
  }

  void _resetGame() {
    _timer?.cancel();
    setState(() {
      _phase = GamePhase.intro;
      _currentLetter = null;
      _sequence = [];
      _trialIndex = 0;
      _correct = 0;
      _incorrect = 0;
      _responded = false;
      _lastFeedback = null;
      _startTime = null;
    });
  }

  void _finishGame() {
    final duration = _startTime != null
        ? DateTime.now().difference(_startTime!).inSeconds
        : 0;
    final totalResponses = _correct + _incorrect;
    final accuracy = totalResponses > 0 ? ((_correct / totalResponses) * 100).round() : 0;

    widget.onComplete({
      'game_type': 'n_back',
      'score': accuracy,
      'accuracy': accuracy,
      'level_reached': _nBack,
      'correct_responses': _correct,
      'incorrect_responses': _incorrect,
      'duration_seconds': duration,
      'metadata': {'n_level': _nBack, 'total_trials': _totalTrials},
    });
  }

  double get _progress => _trialIndex / _totalTrials;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Icon(Icons.psychology, color: Colors.cyan),
            const SizedBox(width: 8),
            Text('N-Back ($_nBack-Back)'),
          ],
        ),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: widget.onClose,
        ),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            if (_phase == GamePhase.intro) _buildIntro(),
            if (_phase == GamePhase.playing || _phase == GamePhase.feedback) _buildGame(),
            if (_phase == GamePhase.finished) _buildFinished(),
          ],
        ),
      ),
    );
  }

  Widget _buildIntro() {
    return Expanded(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: AppTheme.secondary.withOpacity(0.3),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              children: [
                const Text(
                  'How to Play',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 16),
                RichText(
                  textAlign: TextAlign.center,
                  text: TextSpan(
                    style: TextStyle(color: Theme.of(context).textTheme.bodyLarge?.color),
                    children: [
                      const TextSpan(text: 'Press '),
                      const TextSpan(
                        text: 'Match',
                        style: TextStyle(fontWeight: FontWeight.bold),
                      ),
                      const TextSpan(text: ' when the current letter is the same as the one shown '),
                      TextSpan(
                        text: '$_nBack letters ago',
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                      const TextSpan(text: '.'),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppTheme.secondary,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Text(
                    'Example: A → B → A (Match!)',
                    style: TextStyle(fontSize: 13),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 32),
          ElevatedButton.icon(
            onPressed: _startGame,
            icon: const Icon(Icons.play_arrow),
            label: const Text('Start Game'),
          ),
        ],
      ),
    );
  }

  Widget _buildGame() {
    return Expanded(
      child: Column(
        children: [
          // Progress bar
          LinearProgressIndicator(
            value: _progress,
            backgroundColor: AppTheme.secondary,
            minHeight: 8,
            borderRadius: BorderRadius.circular(4),
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Trial ${_trialIndex + 1}/$_totalTrials', style: const TextStyle(color: AppTheme.muted)),
              Text('Correct: $_correct', style: const TextStyle(color: AppTheme.muted)),
            ],
          ),
          const SizedBox(height: 24),

          // Letter display
          Expanded(
            child: Container(
              decoration: BoxDecoration(
                color: _lastFeedback == 'correct'
                    ? Colors.green.withOpacity(0.2)
                    : _lastFeedback == 'incorrect'
                        ? Colors.red.withOpacity(0.2)
                        : AppTheme.secondary.withOpacity(0.3),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Center(
                child: Text(
                  _currentLetter ?? (_lastFeedback == 'correct' ? '✓' : _lastFeedback == 'incorrect' ? '✗' : ''),
                  style: const TextStyle(
                    fontSize: 72,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(height: 24),

          // Response buttons
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: _responded || _trialIndex < _nBack
                      ? null
                      : () => _handleResponse(false),
                  child: const Text('No Match'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton(
                  onPressed: _responded || _trialIndex < _nBack
                      ? null
                      : () => _handleResponse(true),
                  child: const Text('Match!'),
                ),
              ),
            ],
          ),

          if (_trialIndex < _nBack)
            Padding(
              padding: const EdgeInsets.only(top: 12),
              child: Text(
                'Watch the letters... (wait for $_nBack letters)',
                style: const TextStyle(color: AppTheme.muted),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildFinished() {
    final totalResponses = _correct + _incorrect;
    final accuracy = totalResponses > 0 ? ((_correct / totalResponses) * 100).round() : 0;

    return Expanded(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            '$accuracy%',
            style: const TextStyle(fontSize: 56, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          Text(
            '$_correct correct · $_incorrect incorrect',
            style: const TextStyle(color: AppTheme.muted),
          ),
          const SizedBox(height: 32),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              OutlinedButton.icon(
                onPressed: _resetGame,
                icon: const Icon(Icons.refresh),
                label: const Text('Play Again'),
              ),
              const SizedBox(width: 12),
              ElevatedButton(
                onPressed: _finishGame,
                child: const Text('Save Results'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
