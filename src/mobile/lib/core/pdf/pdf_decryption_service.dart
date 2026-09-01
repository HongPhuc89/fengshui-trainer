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
  /// [ivBytes] — raw 12-byte nonce from the same /decrypt-key/ response.
  ///   The server derives (key, iv) together from chapter id + encryption
  ///   version and never writes the iv into the file it uploads — the file
  ///   is exactly ciphertext+tag, nothing prepended. An iv extracted from
  ///   the file's own first 12 bytes would just be the start of the real
  ///   ciphertext, guaranteeing a GCM tag mismatch on every chapter.
  Future<Uint8List> decrypt({
    required String encryptedCdnUrl,
    required Uint8List keyBytes,
    required Uint8List ivBytes,
  }) async {
    // 1. Fetch encrypted PDF bytes from CDN (no auth header needed — presigned URL)
    final dio = Dio();
    final response = await dio.get<List<int>>(
      encryptedCdnUrl,
      options: Options(responseType: ResponseType.bytes),
    );
    // The whole body is ciphertext+tag (AESGCM.encrypt()'s own output,
    // uploaded as-is server-side) — nothing to strip off the front.
    final ciphertext = Uint8List.fromList(response.data!);
    final iv = ivBytes;

    // 2. Decrypt with pointycastle AES-256-GCM
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
    final len = cipher.processBytes(
      ciphertext,
      0,
      ciphertext.length,
      decrypted,
      0,
    );
    cipher.doFinal(decrypted, len);

    return decrypted;
  }
}
