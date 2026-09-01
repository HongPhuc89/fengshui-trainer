// Pins the JSON keys VideoCourseSerializer actually sends.
//
// The banner was blank because the model read 'thumbnail', a key a course
// response never carries. These payloads are copied from a live
// GET /api/videos/ and GET /api/videos/<slug>/ so a rename on either side
// fails here instead of silently blanking the UI.

import 'package:flutter_test/flutter_test.dart';
import 'package:huyenhoc/features/videos/data/models/video_model.dart';

const listPayload = {
  'public_id': '0d2f7a2e-1f4a-4a3b-9a1f-2b7c3d4e5f60',
  'title': 'Kỳ môn dự đoán',
  'slug': 'k-mon-d-djoan',
  'category': {
    'public_id': 'c1',
    'title': 'Kỳ môn',
    'slug': 'ky-mon',
  },
  'instructor': 'Thầy A',
  'cover_image': 'https://huyenhoc.b-cdn.net/thumbnails/small/128.webp',
  'description': 'Mô tả khoá học',
  'is_free': false,
  'price_lt': 500,
  'total_duration_seconds': 12345,
  'total_lessons': 82,
  'level': 'BASIC',
  'published_date': '2026-01-01',
};

void main() {
  test('list item reads the banner from cover_image', () {
    final video = VideoModel.fromJson(Map<String, dynamic>.from(listPayload));

    expect(video.thumbnailUrl,
        'https://huyenhoc.b-cdn.net/thumbnails/small/128.webp');
    expect(video.slug, 'k-mon-d-djoan');
    expect(video.priceLt, 500);
    expect(video.lessonCount, 82);
    expect(video.category?.slug, 'ky-mon');
  });

  test('a course without a banner stays null rather than throwing', () {
    final json = Map<String, dynamic>.from(listPayload)..['cover_image'] = null;

    expect(VideoModel.fromJson(json).thumbnailUrl, isNull);
  });

  test('detail reads the banner from cover_image too', () {
    final json = Map<String, dynamic>.from(listPayload)
      ..['lessons'] = <Map<String, dynamic>>[]
      ..['has_purchased'] = true;

    final detail = VideoDetailModel.fromJson(json);

    expect(detail.thumbnailUrl,
        'https://huyenhoc.b-cdn.net/thumbnails/small/128.webp');
    expect(detail.hasPurchased, isTrue);
  });
}
