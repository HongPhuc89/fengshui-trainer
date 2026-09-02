// Fetches the currently published version_code from the backend
// (GET /api/app/version/, feature-37) and bumps pubspec.yaml's build number
// past it, so a prod APK build never risks colliding with a version_code
// already live — Android refuses installing over a lower version_code, and
// AppRelease's admin upload flow never reuses a published version_code
// (see AppRelease design, feature-34 consolidated §"Không bao giờ tái sử
// dụng một version_code đã publish").
//
// Usage (run from src/mobile/):
//   dart run scripts/bump_version.dart              # keep version name, bump build number only
//   dart run scripts/bump_version.dart 1.0.4         # also set a new version name
//
// The server base URL defaults to the prod API. Override for other
// environments with APP_VERSION_API_BASE_URL, e.g.:
//   APP_VERSION_API_BASE_URL=https://api-staging.huyenhoc.pro/api dart run scripts/bump_version.dart
import 'dart:convert';
import 'dart:io';

const _defaultBaseUrl = 'https://api.huyenhoc.pro/api';

Future<void> main(List<String> args) async {
  final baseUrl =
      Platform.environment['APP_VERSION_API_BASE_URL'] ?? _defaultBaseUrl;

  final pubspecFile = File('pubspec.yaml');
  if (!pubspecFile.existsSync()) {
    stderr.writeln(
      'pubspec.yaml not found — run this script from src/mobile/.',
    );
    exit(1);
  }

  final content = await pubspecFile.readAsString();
  final versionLine =
      RegExp(r'^version:\s*(\S+)\+(\d+)\s*$', multiLine: true)
          .firstMatch(content);
  if (versionLine == null) {
    stderr.writeln('Could not find a "version: x.y.z+n" line in pubspec.yaml');
    exit(1);
  }

  final localVersionName = versionLine.group(1)!;
  final localVersionCode = int.parse(versionLine.group(2)!);

  final serverVersionCode = await _fetchServerVersionCode(baseUrl);

  // Never reuse a published version_code — take the higher of "local" and
  // "server" as the floor, then bump past it. This protects against both a
  // stale local pubspec.yaml (server is ahead) and an already-bumped local
  // one that has not been published yet (local is ahead).
  final floor = [
    localVersionCode,
    if (serverVersionCode != null) serverVersionCode,
  ].reduce((a, b) => a > b ? a : b);
  final nextVersionCode = floor + 1;

  final nextVersionName = args.isNotEmpty ? args[0] : localVersionName;

  final updated = content.replaceFirst(
    versionLine.group(0)!,
    'version: $nextVersionName+$nextVersionCode',
  );
  await pubspecFile.writeAsString(updated);

  stdout.writeln(
    'pubspec.yaml: $localVersionName+$localVersionCode -> '
    '$nextVersionName+$nextVersionCode '
    '(server currently at ${serverVersionCode?.toString() ?? "none published"})',
  );
}

/// Returns the version_code currently published on the server, or null if
/// nothing is published yet (204) or the server could not be reached — in
/// either case the caller falls back to the local pubspec.yaml value.
Future<int?> _fetchServerVersionCode(String baseUrl) async {
  final client = HttpClient();
  client.connectionTimeout = const Duration(seconds: 5);
  try {
    final uri = Uri.parse('$baseUrl/app/version/');
    final request = await client.getUrl(uri);
    final response = await request.close();

    if (response.statusCode == 204) {
      return null;
    }
    if (response.statusCode != 200) {
      stderr.writeln(
        'Warning: GET $uri returned ${response.statusCode}, '
        'falling back to local pubspec.yaml version.',
      );
      await response.drain();
      return null;
    }

    final body = jsonDecode(await response.transform(utf8.decoder).join());
    return body['version_code'] as int;
  } catch (e) {
    stderr.writeln(
      'Warning: could not reach $baseUrl/app/version/ ($e), '
      'falling back to local pubspec.yaml version.',
    );
    return null;
  } finally {
    client.close();
  }
}
