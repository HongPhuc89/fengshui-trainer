import 'package:flutter/material.dart';

class OrderingItem {
  final String id;
  final String text;

  OrderingItem({required this.id, required this.text});

  factory OrderingItem.fromJson(Map<String, dynamic> json) {
    return OrderingItem(
      id: json['id']?.toString() ?? '',
      text: json['text'] as String? ?? '',
    );
  }
}

/// Ordering question widget - drag and drop items into correct sequence
class OrderingQuestion extends StatefulWidget {
  const OrderingQuestion({
    required this.items,
    required this.selectedOrder,
    required this.onAnswer,
    this.disabled = false,
    super.key,
  });

  final List<OrderingItem> items;
  final List<String> selectedOrder;
  final Function(List<String>) onAnswer;
  final bool disabled;

  @override
  State<OrderingQuestion> createState() => _OrderingQuestionState();
}

class _OrderingQuestionState extends State<OrderingQuestion> {
  late List<OrderingItem> displayItems;

  @override
  void initState() {
    super.initState();
    _initializeItems();
  }

  void _initializeItems() {
    if (widget.selectedOrder.isEmpty) {
      displayItems = List.from(widget.items);
      // Notify parent of initial order
      WidgetsBinding.instance.addPostFrameCallback((_) {
        widget.onAnswer(displayItems.map((e) => e.id).toList());
      });
    } else {
      // Sort items based on selectedOrder
      displayItems = widget.selectedOrder.map((id) {
        return widget.items.firstWhere(
          (item) => item.id == id,
          orElse: () => OrderingItem(id: id, text: id),
        );
      }).toList();

      // Add any missing items from original list
      for (final item in widget.items) {
        if (!widget.selectedOrder.contains(item.id)) {
          displayItems.add(item);
        }
      }
    }
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
            color: const Color(0xFF3b82f6).withOpacity(0.1),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: const Color(0xFF3b82f6).withOpacity(0.3),
            ),
          ),
          child: Row(
            children: [
              Icon(
                widget.disabled ? Icons.lock_outline : Icons.move_up,
                size: 16,
                color: const Color(0xFF3b82f6),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  widget.disabled
                      ? 'Đã xác nhận thứ tự'
                      : 'Kéo và thả các mục để sắp xếp theo thứ tự đúng',
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
        const SizedBox(height: 16),

        // Draggable list
        ReorderableListView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: displayItems.length,
          onReorder: (oldIndex, newIndex) {
            if (widget.disabled) return;
            setState(() {
              if (newIndex > oldIndex) {
                newIndex -= 1;
              }
              final item = displayItems.removeAt(oldIndex);
              displayItems.insert(newIndex, item);
            });
            widget.onAnswer(displayItems.map((e) => e.id).toList());
          },
          itemBuilder: (context, index) {
            final item = displayItems[index];
            return Padding(
              key: ValueKey(item.id),
              padding: const EdgeInsets.only(bottom: 12),
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.05),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: Colors.white.withOpacity(0.1),
                    width: 2,
                  ),
                ),
                child: Row(
                  children: [
                    // Position number
                    Container(
                      width: 32,
                      height: 32,
                      decoration: const BoxDecoration(
                        color: Color(0xFF3b82f6),
                        shape: BoxShape.circle,
                      ),
                      child: Center(
                        child: Text(
                          '${index + 1}',
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 16),

                    // Item text
                    Expanded(
                      child: Text(
                        item.text,
                        style: const TextStyle(
                          color: Color(0xFFe2e8f0),
                          fontSize: 16,
                        ),
                      ),
                    ),

                    // Drag handle
                    if (!widget.disabled)
                      const Icon(
                        Icons.menu,
                        color: Color(0xFF94a3b8),
                      ),
                  ],
                ),
              ),
            );
          },
        ),
      ],
    );
  }
}
