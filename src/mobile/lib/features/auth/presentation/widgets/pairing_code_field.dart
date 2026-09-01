import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../../shared/theme/app_colors.dart';

/// Formats a pairing code as the user types: uppercase, alphabet-only, and
/// grouped in threes so it reads the same way it was dictated over the phone
/// (feature-38 — shortened from 12 chars/groups of four).
class PairingCodeFormatter extends TextInputFormatter {
  static const _alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  static const _prefix = 'TT';
  static const _bodyLength = 6;
  static const _groupSize = 3;

  @override
  TextEditingValue formatEditUpdate(TextEditingValue _, TextEditingValue next) {
    var raw = next.text
        .toUpperCase()
        // Fold the glyphs the alphabet omits onto their look-alikes, the same
        // way the server normalises them.
        .replaceAll('I', '1')
        .replaceAll('L', '1')
        .replaceAll('O', '0')
        .split('')
        .where(_alphabet.contains)
        .join();

    // The field already shows "TT-", but people paste or type the whole code
    // anyway. Stripping unconditionally is safe because the server never issues
    // a body that starts with the prefix; a length-based rule would not work
    // here, since typing arrives one character at a time and never shows the
    // full code to the formatter at once.
    if (raw.startsWith(_prefix)) {
      raw = raw.substring(_prefix.length);
    }
    raw = raw.length > _bodyLength ? raw.substring(0, _bodyLength) : raw;

    final groups = <String>[];
    for (var i = 0; i < raw.length; i += _groupSize) {
      groups.add(raw.substring(i, i + _groupSize > raw.length ? raw.length : i + _groupSize));
    }
    final text = groups.join('-');
    return TextEditingValue(
      text: text,
      selection: TextSelection.collapsed(offset: text.length),
    );
  }
}


/// The pairing-code block shown inside the login form once the server asks for
/// one. Not a screen: from the user's point of view this is still just logging in.
class PairingCodeField extends StatelessWidget {
  const PairingCodeField({
    super.key,
    required this.controller,
    required this.hasUnclaimedSlot,
    required this.enabled,
    this.errorText,
    this.supportEmail,
  });

  final TextEditingController controller;
  final bool hasUnclaimedSlot;
  final bool enabled;
  final String? errorText;
  final String? supportEmail;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Divider(height: 32),
        Row(
          children: [
            const Icon(Icons.lock_outline, size: 18, color: AppColors.primaryGold),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                hasUnclaimedSlot
                    ? 'Thiết bị này chưa được ghép cặp'
                    : 'Thiết bị này chưa được cấp quyền sử dụng',
                style: const TextStyle(fontWeight: FontWeight.w600),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        if (hasUnclaimedSlot)
          TextField(
            controller: controller,
            enabled: enabled,
            textCapitalization: TextCapitalization.characters,
            inputFormatters: [PairingCodeFormatter()],
            textAlign: TextAlign.center,
            style: const TextStyle(
                fontFamily: 'monospace', fontSize: 18, letterSpacing: 2),
            decoration: InputDecoration(
              hintText: 'XXX-XXX',
              prefixText: 'TT-',
              labelText: 'Mã ghép cặp',
              errorText: errorText,
              border: const OutlineInputBorder(),
            ),
          )
        else
          const Text(
            'Vui lòng liên hệ quản trị viên để được cấp mã ghép cặp cho thiết bị này.',
            style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
          ),
        if (supportEmail != null) ...[
          const SizedBox(height: 8),
          Row(
            children: [
              const Text('Liên hệ: ',
                  style: TextStyle(fontSize: 13, color: AppColors.textSecondary)),
              Expanded(
                child: Text(supportEmail!,
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
              ),
              IconButton(
                icon: const Icon(Icons.copy, size: 16),
                tooltip: 'Sao chép email hỗ trợ',
                onPressed: () =>
                    Clipboard.setData(ClipboardData(text: supportEmail!)),
              ),
            ],
          ),
        ],
      ],
    );
  }
}

/// Exposed for tests: the formatter is pure logic and worth covering on its own.
TextInputFormatter pairingCodeFormatterForTest() => PairingCodeFormatter();
