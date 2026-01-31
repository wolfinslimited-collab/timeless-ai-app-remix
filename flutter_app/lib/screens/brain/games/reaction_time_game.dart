import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import '../../../core/theme.dart';

class ReactionTimeGame extends StatefulWidget {
  final Function(Map<String, dynamic>) onComplete;
  final VoidCallback onClose;

  const ReactionTimeGame({
    super.key,
    required this.onComplete,
    required this.onClose,
  });

  @override
  State<ReactionTimeGame> createState() => _ReactionTimeGameState();
}

enum GameState { idle, waiting, ready, clicked, tooEarly, finished }

class _ReactionTimeGameState extends State<ReactionTimeGame> {
  GameState _gameState = GameState.idle;
  List<int> _reactionTimes = [];
  int _currentRound = 0;
  int? _lastReaction;
  DateTime? _startTime;
  Timer? _timer;
  final int _totalRounds = 5;

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _startRound() {
    setState(() {
      _gameState = GameState.waiting;
      _lastReaction = null;
    });

    // Random delay between 1-4 seconds
    final delay = 1000 + Random().nextInt(3000);
    _timer = Timer(Duration(milliseconds: delay), () {
      if (mounted && _gameState == GameState.waiting) {
        setState(() {
          _gameState = GameState.ready;
          _startTime = DateTime.now();
        });
      }
    });
  }

  void _handleTap() {
    if (_gameState == GameState.idle) {
      _startRound();
      return;
    }

    if (_gameState == GameState.waiting) {
      // Clicked too early
      _timer?.cancel();
      setState(() => _gameState = GameState.tooEarly);
      return;
    }

    if (_gameState == GameState.ready && _startTime != null) {
      final reactionTime = DateTime.now().difference(_startTime!).inMilliseconds;
      setState(() {
        _lastReaction = reactionTime;
        _reactionTimes.add(reactionTime);
        _gameState = GameState.clicked;
        
        if (_currentRound + 1 >= _totalRounds) {
          _gameState = GameState.finished;
        }
      });
    }
  }

  void _continueGame() {
    setState(() => _currentRound++);
    _startRound();
  }

  void _retryAfterEarly() {
    _startRound();
  }

  void _resetGame() {
    _timer?.cancel();
    setState(() {
      _gameState = GameState.idle;
      _reactionTimes = [];
      _currentRound = 0;
      _lastReaction = null;
      _startTime = null;
    });
  }

  void _finishGame() {
    if (_reactionTimes.isEmpty) return;

    final avgTime = _reactionTimes.reduce((a, b) => a + b) / _reactionTimes.length;
    final bestTime = _reactionTimes.reduce(min);

    // Score based on reaction time (lower is better)
    // 200ms = 100 points, 400ms = 50 points, 600ms+ = 0 points
    final score = max(0, (100 - ((avgTime - 200) / 4)).round());

    widget.onComplete({
      'game_type': 'reaction_time',
      'score': score,
      'avg_reaction_time_ms': avgTime.round(),
      'best_reaction_time_ms': bestTime,
      'correct_responses': _reactionTimes.length,
      'duration_seconds': (_reactionTimes.reduce((a, b) => a + b) / 1000).round(),
    });
  }

  Color _getBackgroundColor() {
    switch (_gameState) {
      case GameState.waiting:
        return Colors.red.withOpacity(0.2);
      case GameState.ready:
        return Colors.green.withOpacity(0.2);
      case GameState.tooEarly:
        return Colors.amber.withOpacity(0.2);
      case GameState.clicked:
        return Colors.blue.withOpacity(0.2);
      default:
        return AppTheme.secondary.withOpacity(0.3);
    }
  }

  String _getMessage() {
    switch (_gameState) {
      case GameState.idle:
        return 'Tap to Start';
      case GameState.waiting:
        return 'Wait for Green...';
      case GameState.ready:
        return 'TAP NOW!';
      case GameState.tooEarly:
        return 'Too Early!';
      case GameState.clicked:
        return '${_lastReaction}ms';
      case GameState.finished:
        return 'Complete!';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Icon(Icons.flash_on, color: Colors.amber),
            const SizedBox(width: 8),
            const Text('Reaction Time'),
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
            // Round indicator
            Text(
              'Round ${min(_currentRound + 1, _totalRounds)} of $_totalRounds',
              style: const TextStyle(color: AppTheme.muted),
            ),
            const SizedBox(height: 16),

            // Game area
            Expanded(
              child: GestureDetector(
                onTap: _handleTap,
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  decoration: BoxDecoration(
                    color: _getBackgroundColor(),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Center(
                    child: Text(
                      _getMessage(),
                      style: const TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Reaction times display
            if (_reactionTimes.isNotEmpty)
              Wrap(
                spacing: 8,
                runSpacing: 8,
                alignment: WrapAlignment.center,
                children: _reactionTimes.map((time) => Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: AppTheme.secondary.withOpacity(0.5),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Text('${time}ms', style: const TextStyle(fontSize: 13)),
                )).toList(),
              ),
            const SizedBox(height: 16),

            // Actions
            if (_gameState == GameState.tooEarly)
              ElevatedButton.icon(
                onPressed: _retryAfterEarly,
                icon: const Icon(Icons.refresh),
                label: const Text('Try Again'),
              ),

            if (_gameState == GameState.clicked && _currentRound + 1 < _totalRounds)
              ElevatedButton.icon(
                onPressed: _continueGame,
                icon: const Icon(Icons.play_arrow),
                label: const Text('Next Round'),
              ),

            if (_gameState == GameState.finished) ...[
              if (_reactionTimes.isNotEmpty) ...[
                Text(
                  'Average: ${(_reactionTimes.reduce((a, b) => a + b) / _reactionTimes.length).round()}ms',
                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 4),
                Text(
                  'Best: ${_reactionTimes.reduce(min)}ms',
                  style: const TextStyle(color: AppTheme.muted),
                ),
              ],
              const SizedBox(height: 16),
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
          ],
        ),
      ),
    );
  }
}
