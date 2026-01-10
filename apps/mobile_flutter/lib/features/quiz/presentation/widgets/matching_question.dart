import 'dart:math';
import 'package:flutter/material.dart';

class MatchingPair {
  final String left;
  final String right;

  MatchingPair({required this.left, required this.right});

  factory MatchingPair.fromJson(Map<String, dynamic> json) {
    return MatchingPair(
      left: json['left'] as String? ?? '',
      right: json['right'] as String? ?? '',
    );
  }
}

/// Matching question widget - connect left items to right items
class MatchingQuestion extends StatefulWidget {
  const MatchingQuestion({
    required this.pairs,
    required this.selectedMatches,
    required this.onAnswer,
    this.disabled = false,
    super.key,
  });

  final List<MatchingPair> pairs;
  final Map<String, String> selectedMatches; // leftItem -> rightItem
  final Function(Map<String, String>) onAnswer;
  final bool disabled;

  @override
  State<MatchingQuestion> createState() => _MatchingQuestionState();
}

class _MatchingQuestionState extends State<MatchingQuestion> {
  late Map<String, String> matches;
  String? selectedLeft;
  late List<String> shuffledRightItems;

  @override
  void initState() {
    super.initState();
    matches = Map.from(widget.selectedMatches);
    // Shuffle right items once on init
    shuffledRightItems = widget.pairs.map((p) => p.right).toList();
    if (!widget.disabled) {
      shuffledRightItems.shuffle(Random());
    }
  }

  @override
  void didUpdateWidget(MatchingQuestion oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.selectedMatches != matches) {
      matches = Map.from(widget.selectedMatches);
    }
  }

  @override
  Widget build(BuildContext context) {
    final leftItems = widget.pairs.map((p) => p.left).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Hint banner
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: const Color(0xFF6366f1).withOpacity(0.1),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: const Color(0xFF6366f1).withOpacity(0.3),
            ),
          ),
          child: Row(
            children: [
              Icon(
                widget.disabled ? Icons.lock_outline : Icons.link,
                size: 16,
                color: const Color(0xFF6366f1),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  widget.disabled
                      ? 'Đã xác nhận các cặp'
                      : 'Chọn mục bên trái, sau đó chọn mục bên phải để nối',
                  style: const TextStyle(
                    fontSize: 12,
                    color: Color(0xFF93c5fd),
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),

        // Matching items
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Left column
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: leftItems.asMap().entries.map((entry) {
                  final index = entry.key;
                  final item = entry.value;
                  final isSelected = selectedLeft == item;
                  final matchedRight = matches[item];
                  final color = _getLeftColor(index);

                  return Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: GestureDetector(
                      onTap: widget.disabled ? null : () => _handleLeftClick(item),
                      child: Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: isSelected
                              ? color.withOpacity(0.2)
                              : matchedRight != null
                                  ? color.withOpacity(0.3)
                                  : Colors.white.withOpacity(0.05),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: isSelected || matchedRight != null
                                ? color
                                : Colors.white.withOpacity(0.1),
                            width: 2,
                          ),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: Text(
                                item,
                                style: TextStyle(
                                  fontSize: 14,
                                  color: isSelected || matchedRight != null
                                      ? Colors.white
                                      : const Color(0xFFe2e8f0),
                                  fontWeight: isSelected || matchedRight != null
                                      ? FontWeight.w600
                                      : FontWeight.normal,
                                ),
                              ),
                            ),
                            if (matchedRight != null)
                              Icon(
                                Icons.link,
                                color: color,
                                size: 16,
                              ),
                          ],
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),

            const SizedBox(width: 12),
            Container(
              width: 2,
              height: leftItems.length * 68.0, // Rough estimate
              color: Colors.white.withOpacity(0.1),
            ),
            const SizedBox(width: 12),

            // Right column
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: shuffledRightItems.asMap().entries.map((entry) {
                  final item = entry.value;
                  final matchedLeft = _getMatchedLeft(item);
                  final isMatched = matchedLeft != null;
                  final color = isMatched ? _getLeftColor(leftItems.indexOf(matchedLeft)) : null;

                  return Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: GestureDetector(
                      onTap: widget.disabled ? null : () => _handleRightClick(item),
                      child: Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: isMatched
                              ? color!.withOpacity(0.3)
                              : Colors.white.withOpacity(0.05),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: color ?? Colors.white.withOpacity(0.1),
                            width: 2,
                          ),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: Text(
                                item,
                                style: TextStyle(
                                  fontSize: 14,
                                  color: isMatched
                                      ? Colors.white
                                      : const Color(0xFFe2e8f0),
                                  fontWeight: isMatched
                                      ? FontWeight.w600
                                      : FontWeight.normal,
                                ),
                              ),
                            ),
                            if (isMatched)
                              const Icon(
                                Icons.check_circle,
                                color: Color(0xFF10b981),
                                size: 16,
                              ),
                          ],
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
          ],
        ),

        const SizedBox(height: 16),

        // Clear button
        if (!widget.disabled && matches.isNotEmpty)
          TextButton.icon(
            onPressed: () {
              setState(() {
                matches.clear();
                selectedLeft = null;
              });
              widget.onAnswer(matches);
            },
            icon: const Icon(Icons.clear_all, color: Colors.white70),
            label: const Text(
              'Xóa tất cả',
              style: TextStyle(color: Colors.white70),
            ),
          ),
      ],
    );
  }

  void _handleLeftClick(String item) {
    setState(() {
      selectedLeft = item;
    });
  }

  void _handleRightClick(String item) {
    if (selectedLeft != null) {
      final newMatches = Map<String, String>.from(matches);
      newMatches[selectedLeft!] = item;
      setState(() {
        matches = newMatches;
        selectedLeft = null;
      });
      widget.onAnswer(newMatches);
    }
  }

  String? _getMatchedLeft(String rightItem) {
    for (final entry in matches.entries) {
      if (entry.value == rightItem) {
        return entry.key;
      }
    }
    return null;
  }

  Color _getLeftColor(int index) {
    const pairColors = [
      Color(0xFFef4444), // red
      Color(0xFF3b82f6), // blue
      Color(0xFF10b981), // green
      Color(0xFFf59e0b), // amber
      Color(0xFF8b5cf6), // purple
      Color(0xFFec4899), // pink
      Color(0xFF14b8a6), // teal
      Color(0xFFf97316), // orange
    ];
    return pairColors[index % pairColors.length];
  }
}
