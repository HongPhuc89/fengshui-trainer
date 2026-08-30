import 'dart:typed_data';
import 'package:dio/dio.dart';
import 'package:injectable/injectable.dart';
import 'package:pointycastle/export.dart';

@singleton
class PdfDecryptionService {
  /// Fetches and decrypts an AES-256-GCM encrypted PDF from CDN.
  /// PDF bytes are kept in memory only — never written to disk.
  ///
  /// [encryptedCdnUrl] — presigned Supabase URL of the encrypted PDF
  /// [keyBytes] — raw 32-byte key from /decrypt-key/ API endpoint
  Future<Uint8List> decrypt({
    required String encryptedCdnUrl,
    required Uint8List keyBytes,
  }) async {
    // 1. Fetch encrypted PDF bytes from CDN (no auth header needed — presigned URL)
    final dio = Dio();
    final response = await dio.get<List<int>>(
      encryptedCdnUrl,
      options: Options(responseType: ResponseType.bytes),
    );
    final encrypted = Uint8List.fromList(response.data!);

    // 2. Extract IV (first 12 bytes per AES-256-GCM spec)
    if (encrypted.length < 12) {
      throw Exception('Invalid encrypted PDF: too short');
    }
    final iv = encrypted.sublist(0, 12);
    final ciphertext = encrypted.sublist(12);

    // 3. Decrypt with pointycastle AES-256-GCM
    final cipher = GCMBlockCipher(AESEngine())
      ..init(
        false, // decrypt
        AEADParameters(
          KeyParameter(keyBytes),
          128, // tag length in bits
          iv,
          Uint8List(0), // no additional authenticated data
        ),
      );

    final decrypted = Uint8List(cipher.getOutputSize(ciphertext.length));
    final len =
        cipher.processBytes(ciphertext, 0, ciphertext.length, decrypted, 0);
    cipher.doFinal(decrypted, len);

    return decrypted;
  }
}
