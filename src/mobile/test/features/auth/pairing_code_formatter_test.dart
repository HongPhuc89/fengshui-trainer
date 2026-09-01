import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:huyenhoc/features/auth/presentation/widgets/pairing_code_field.dart';

/// M6 / feature-38: the field has to accept a code the way a person types it
/// after hearing it read out — lowercase, ungrouped, with the glyphs the
/// alphabet excludes. Shortened from 12 chars (groups of four) to 6 (groups
/// of three). A code minted before feature-38 deploys is still redeemable
/// server-side (normalize_code compares by value, not length), but the app
/// does not need to accept typing one in — see feature-38 §3.3: refreshing
/// the slot (feature-35) always mints a fresh 6-char code.
void main() {
  late TextInputFormatter formatter;

  TextEditingValue format(String input) => formatter.formatEditUpdate(
        TextEditingValue.empty,
        TextEditingValue(text: input),
      );

  setUp(() => formatter = pairingCodeFormatterForTest());

  test('groups the body in threes and uppercases it', () {
    expect(format('4km9x7').text, '4KM-9X7');
  });

  test('strips the TT prefix when the whole code is pasted', () {
    expect(format('TT-4KM-9X7').text, '4KM-9X7');
    expect(format('tt4km9x7').text, '4KM-9X7');
  });

  test('strips the prefix while it is being typed one character at a time', () {
    // Typing never shows the formatter the whole code at once, so a rule based
    // on total length would keep TT as part of the body and truncate the tail.
    expect(format('TTY').text, 'Y');
    expect(format('TTY41P7A').text, 'Y41-P7A');
  });

  test('folds look-alike glyphs onto the alphabet', () {
    // I and L are not in the alphabet and read as 1; O reads as 0.
    expect(format('OIL1').text, '011-1');
  });

  test('drops characters outside the alphabet', () {
    expect(format('4K!M 9@#').text, '4KM-9');
  });

  test('stops at six characters', () {
    expect(format('4KM9X7QPZZZZ').text, '4KM-9X7');
  });

  test('partial input is grouped as it grows', () {
    expect(format('4KM').text, '4KM');
    expect(format('4KM9').text, '4KM-9');
  });
}
