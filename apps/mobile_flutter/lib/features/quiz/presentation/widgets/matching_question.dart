import 'package:flutter/material.dart';

/// Matching question widget - connect left items to right items
class MatchingQuestion extends StatefulWidget {
  const MatchingQuestion({
    required this.leftItems,
    required this.rightItems,
    required this.selectedMatches,
    required this.onAnswer,
    super.key,
  });

  final List<String> leftItems;
  final List<String> rightItems;
  final Map<String, String> selectedMatches; // leftItem -> rightItem
  final Function(Map<String, String>) onAnswer;

  @override
  State<MatchingQuestion> createState() => _MatchingQuestionState();
}

class _MatchingQuestionState extends State<MatchingQuestion> {
  late Map<String, String> matches;
  String? selectedLeft;

  @override
  void initState() {
    super.initState();
    matches = Map.from(widget.selectedMatches);
  }

  @override
  Widget build(BuildContext context) {
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
                Icons.info_outline,
                size: 16,
                color: const Color(0xFF6366f1),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Chọn mục bên trái, sau đó chọn mục bên phải để nối',
                  style: TextStyle(
                    fontSize: 12,
                    color: const Color(0xFF6366f1),
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
                children: widget.leftItems.asMap().entries.map((entry) {
                  final index = entry.key;
                  final item = entry.value;
                  final isSelected = selectedLeft == item;
                  final matchedRight = matches[item];

                  return Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: GestureDetector(
                      onTap: () {
                        setState(() {
                          selectedLeft = item;
                        });
                      },
                      child: Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: isSelected
                              ? const Color(0xFF6366f1).withOpacity(0.2)
                              : Colors.white.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: isSelected
                                ? const Color(0xFF6366f1)
                                : matchedRight != null
                                    ? const Color(0xFF10b981)
                                    : Colors.white.withOpacity(0.2),
                            width: 2,
                          ),
                        ),
                        child: Row(
                          children: [
                            Container(
                              width: 32,
                              height: 32,
                              decoration: BoxDecoration(
                                color: const Color(0xFF6366f1),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Center(
                                child: Text(
                                  String.fromCharCode(65 + index), // A, B, C...
                                  style: const TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.white,
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                item,
                                style: const TextStyle(
                                  fontSize: 14,
                                  color: Colors.white,
                                ),
                              ),
                            ),
                            if (matchedRight != null)
                              Icon(
                                Icons.check_circle,
                                color: const Color(0xFF10b981),
                                size: 20,
                              ),
                          ],
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),

            // Connection indicator
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8),
              child: Column(
                children: List.generate(
                  widget.leftItems.length,
                  (index) => Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Container(
                      width: 40,
                      height: 56,
                      child: Center(
                        child: Icon(
                          Icons.arrow_forward,
                          color: Colors.white.withOpacity(0.3),
                          size: 20,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),

            // Right column
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: widget.rightItems.asMap().entries.map((entry) {
                  final index = entry.key;
                  final item = entry.value;
                  final isMatched = matches.containsValue(item);

                  return Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: GestureDetector(
                      onTap: selectedLeft != null
                          ? () {
                              setState(() {
                                matches[selectedLeft!] = item;
                                selectedLeft = null;
                              });
                              widget.onAnswer(matches);
                            }
                          : null,
                      child: Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: isMatched
                              ? const Color(0xFF10b981).withOpacity(0.2)
                              : Colors.white.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: isMatched
                                ? const Color(0xFF10b981)
                                : Colors.white.withOpacity(0.2),
                            width: 2,
                          ),
                        ),
                        child: Row(
                          children: [
                            Container(
                              width: 32,
                              height: 32,
                              decoration: BoxDecoration(
                                color: const Color(0xFF10b981),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Center(
                                child: Text(
                                  '${index + 1}', // 1, 2, 3...
                                  style: const TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.white,
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                item,
                                style: const TextStyle(
                                  fontSize: 14,
                                  color: Colors.white,
                                ),
                              ),
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
        if (matches.isNotEmpty)
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
}
