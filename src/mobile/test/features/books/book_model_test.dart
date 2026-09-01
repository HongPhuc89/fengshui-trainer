import 'package:flutter_test/flutter_test.dart';
import 'package:huyenhoc/features/books/data/models/book_model.dart';

/// Regression, two rounds:
///
/// 1. This used to read keyJson['key'] and chapterJson['encrypted_file_url']
///    /['file_url'] — none of which the backend ever sends (it sends
///    key_b64, and the encrypted URL under encrypted_cdn_url). Every chapter
///    open crashed with a null-cast TypeError inside fromJson, which the
///    repository's generic catch-all then reported to the user as "Không có
///    kết nối mạng" — nothing to do with the network at all.
/// 2. Fixing that surfaced a second, deeper bug: the iv was never read from
///    anywhere — PdfDecryptionService instead sliced it off the first 12
///    bytes of the downloaded file. The server (books/services/
///    pdf_encryption.py) derives (key, iv) together and uploads only
///    ciphertext+tag, no iv prepended — so every chapter failed GCM tag
///    verification (InvalidCipherTextException). The iv only ever exists on
///    the /decrypt-key/ response, under iv_b64.
void main() {
  test('reads the decrypt key from key_b64, not key', () {
    final content = BookChapterContentModel.fromJson(
      {
        'order': 1,
        'title': 'Chương 1',
        'page_count': 68,
        'has_training_set': false,
        'encrypted_cdn_url': 'https://cdn.example.test/ch1.bin',
      },
      {'key_b64': 'c29tZS1rZXk=', 'iv_b64': 'aXY=', 'file_url': 'ignored'},
    );

    expect(content.decryptKeyBase64, 'c29tZS1rZXk=');
  });

  test('reads the iv from iv_b64, not the file itself', () {
    final content = BookChapterContentModel.fromJson(
      {
        'order': 1,
        'title': 'Chương 1',
        'page_count': 68,
        'has_training_set': false,
        'encrypted_cdn_url': 'https://cdn.example.test/ch1.bin',
      },
      {'key_b64': 'c29tZS1rZXk=', 'iv_b64': 'c29tZS1pdg=='},
    );

    expect(content.ivBase64, 'c29tZS1pdg==');
  });

  test('reads the encrypted file URL from encrypted_cdn_url, not file_url', () {
    final content = BookChapterContentModel.fromJson(
      {
        'order': 1,
        'title': 'Chương 1',
        'page_count': 68,
        'has_training_set': false,
        // file_url here is the PLAIN, unencrypted file_path — must not be
        // picked up as the URL to feed the AES-GCM decryptor.
        'file_url': 'https://cdn.example.test/plain.pdf',
        'encrypted_cdn_url': 'https://cdn.example.test/ch1.bin',
      },
      {'key_b64': 'c29tZS1rZXk=', 'iv_b64': 'c29tZS1pdg=='},
    );

    expect(content.encryptedFileUrl, 'https://cdn.example.test/ch1.bin');
  });
}
