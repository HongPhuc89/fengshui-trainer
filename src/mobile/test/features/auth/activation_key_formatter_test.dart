import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:huyenhoc/features/auth/presentation/screens/device_activation_screen.dart';

/// M6: the field has to accept a code the way a person types it after hearing it
/// read out — lowercase, ungrouped, with the glyphs the alphabet excludes.
void main() {
  late TextInputFormatter formatter;

  TextEditingValue format(String input) => formatter.formatEditUpdate(
        TextEditingValue.empty,
        TextEditingValue(text: input),
      );

  setUp(() => formatter = activationKeyFormatterForTest());

  test('groups the body in fours and uppercases it', () {
    expect(format('4km9x7qp2n5r').text, '4KM9-X7QP-2N5R');
  });

  test('strips the TT prefix when the whole code is pasted', () {
    expect(format('TT-4KM9-X7QP-2N5R').text, '4KM9-X7QP-2N5R');
    expect(format('tt4km9x7qp2n5r').text, '4KM9-X7QP-2N5R');
  });

  test('keeps a body that legitimately starts with TT', () {
    // Only a full 14-character paste is treated as prefixed, so a 12-character
    // body beginning with TT survives intact.
    expect(format('TTAB-CDEF-GHJK').text, 'TTAB-CDEF-GHJK');
  });

  test('folds look-alike glyphs onto the alphabet', () {
    // I and L are not in the alphabet and read as 1; O reads as 0.
    expect(format('OIL1').text, '0111');
  });

  test('drops characters outside the alphabet', () {
    expect(format('4K!M 9@#').text, '4KM9');
  });

  test('stops at twelve characters', () {
    expect(format('4KM9X7QP2N5RZZZZ').text, '4KM9-X7QP-2N5R');
  });

  test('partial input is grouped as it grows', () {
    expect(format('4KM').text, '4KM');
    expect(format('4KM9X').text, '4KM9-X');
  });
}
