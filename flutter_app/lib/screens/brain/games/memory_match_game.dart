import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import '../../core/theme.dart';

class MemoryMatchGameScreen extends StatefulWidget {
  const MemoryMatchGameScreen({super.key});

  @override
  State<MemoryMatchGameScreen> createState() => _MemoryMatchGameScreenState();
}

class _MemoryMatchGameScreenState extends State<MemoryMatchGameScreen> {
  static const symbols = ['🎯', '⭐', '💎', '🔥', '🌙', '⚡', '🎨', '🎵'];
  
  List<_MemoryCard> cards = [];
  List<int> flippedCards = [];
  int moves = 0;
  int matches = 0;
  bool isComplete = false;
  int elapsedSeconds = 0;
  Timer? timer;

  @override
  void initState() {
    super.initState();
    _initializeGame();
  }

  @override
  void dispose() {
    timer?.cancel();
    super.dispose();
  }

  void _initializeGame() {
    final allSymbols = [...symbols, ...symbols];
    allSymbols.shuffle();
    
    setState(() {
      cards = allSymbols.asMap().entries.map((e) => _MemoryCard(
        id: e.key,
        symbol: e.value,
        isFlipped: false,
        isMatched: false,
      )).toList();
      flippedCards = [];
      moves = 0;
      matches = 0;
      isComplete = false;
      elapsedSeconds = 0;
    });

    timer?.cancel();
    timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!isComplete) {
        setState(() => elapsedSeconds++);
      }
    });
  }

  void _handleCardTap(int cardId) {
    if (flippedCards.length == 2) return;
    
    final cardIndex = cards.indexWhere((c) => c.id == cardId);
    if (cardIndex == -1) return;
    
    final card = cards[cardIndex];
    if (card.isFlipped || card.isMatched) return;

    setState(() {
      cards[cardIndex] = card.copyWith(isFlipped: true);
      flippedCards.add(cardId);
    });

    if (flippedCards.length == 2) {
      setState(() => moves++);
      
      final firstCard = cards.firstWhere((c) => c.id == flippedCards[0]);
      final secondCard = cards.firstWhere((c) => c.id == flippedCards[1]);

      if (firstCard.symbol == secondCard.symbol) {
        Future.delayed(const Duration(milliseconds: 500), () {
          if (!mounted) return;
          setState(() {
            cards = cards.map((c) {
              if (c.id == flippedCards[0] || c.id == flippedCards[1]) {
                return c.copyWith(isMatched: true);
              }
              return c;
            }).toList();
            matches++;
            flippedCards.clear();
            
            if (matches == symbols.length) {
              isComplete = true;
              timer?.cancel();
            }
          });
        });
      } else {
        Future.delayed(const Duration(milliseconds: 1000), () {
          if (!mounted) return;
          setState(() {
            cards = cards.map((c) {
              if (c.id == flippedCards[0] || c.id == flippedCards[1]) {
                return c.copyWith(isFlipped: false);
              }
              return c;
            }).toList();
            flippedCards.clear();
          });
        });
      }
    }
  }

  String _formatTime(int seconds) {
    final mins = seconds ~/ 60;
    final secs = seconds % 60;
    return '$mins:${secs.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Memory Match'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _initializeGame,
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
                _buildStat('$moves', 'Moves'),
                _buildStat('$matches/${symbols.length}', 'Matches'),
                _buildStat(_formatTime(elapsedSeconds), 'Time'),
              ],
            ),
          ),
          
          // Game grid
          Expanded(
            child: Center(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: AspectRatio(
                  aspectRatio: 1,
                  child: GridView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 4,
                      mainAxisSpacing: 8,
                      crossAxisSpacing: 8,
                    ),
                    itemCount: cards.length,
                    itemBuilder: (context, index) {
                      final card = cards[index];
                      return GestureDetector(
                        onTap: () => _handleCardTap(card.id),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 300),
                          decoration: BoxDecoration(
                            color: card.isFlipped || card.isMatched
                                ? AppTheme.secondary
                                : AppTheme.card,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: card.isFlipped || card.isMatched
                                  ? AppTheme.primary.withOpacity(0.5)
                                  : AppTheme.border,
                              width: card.isFlipped || card.isMatched ? 2 : 1,
                            ),
                          ),
                          child: Center(
                            child: Text(
                              card.isFlipped || card.isMatched ? card.symbol : '?',
                              style: TextStyle(
                                fontSize: 28,
                                color: card.isMatched 
                                    ? AppTheme.muted 
                                    : null,
                              ),
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
      
      // Completion dialog
      bottomSheet: isComplete ? Container(
        width: double.infinity,
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: AppTheme.card,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
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
              child: Icon(Icons.emoji_events, size: 40, color: AppTheme.primary),
            ),
            const SizedBox(height: 16),
            const Text(
              'Congratulations!',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              'You completed the game in $moves moves and ${_formatTime(elapsedSeconds)}!',
              textAlign: TextAlign.center,
              style: const TextStyle(color: AppTheme.muted),
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
                    onPressed: _initializeGame,
                    child: const Text('Play Again'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ) : null,
    );
  }

  Widget _buildStat(String value, String label) {
    return Column(
      children: [
        Text(
          value,
          style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
        ),
        Text(label, style: const TextStyle(color: AppTheme.muted, fontSize: 12)),
      ],
    );
  }
}

class _MemoryCard {
  final int id;
  final String symbol;
  final bool isFlipped;
  final bool isMatched;

  _MemoryCard({
    required this.id,
    required this.symbol,
    required this.isFlipped,
    required this.isMatched,
  });

  _MemoryCard copyWith({
    int? id,
    String? symbol,
    bool? isFlipped,
    bool? isMatched,
  }) {
    return _MemoryCard(
      id: id ?? this.id,
      symbol: symbol ?? this.symbol,
      isFlipped: isFlipped ?? this.isFlipped,
      isMatched: isMatched ?? this.isMatched,
    );
  }
}
