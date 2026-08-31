import 'package:dio/dio.dart';
import 'package:injectable/injectable.dart';

import '../../../../core/api/api_client.dart';
import '../../../../core/api/api_endpoints.dart';
import '../models/training_model.dart';

abstract class TrainingRemoteDataSource {
  Future<TrainingSetModel> getTrainingByLesson(String lessonSlug);
  Future<TrainingSetModel> getTrainingByChapter(
      String bookSlug, int chapterOrder);
  Future<List<FlashcardModel>> getFlashcards(String activityId);
  Future<ExamModel> getExam(String activityId);
}

@Injectable(as: TrainingRemoteDataSource)
class TrainingRemoteDataSourceImpl
    implements TrainingRemoteDataSource {
  final ApiClient _apiClient;

  TrainingRemoteDataSourceImpl(this._apiClient);

  @override
  Future<TrainingSetModel> getTrainingByLesson(
      String lessonSlug) async {
    try {
      final resp = await _apiClient
          .get(ApiEndpoints.trainingByLesson(lessonSlug));
      return TrainingSetModel.fromJson(
          resp.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw parseDioError(e);
    }
  }

  @override
  Future<TrainingSetModel> getTrainingByChapter(
      String bookSlug, int chapterOrder) async {
    try {
      final resp = await _apiClient
          .get(ApiEndpoints.trainingByChapter(bookSlug, chapterOrder));
      return TrainingSetModel.fromJson(
          resp.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw parseDioError(e);
    }
  }

  @override
  Future<List<FlashcardModel>> getFlashcards(
      String activityId) async {
    try {
      final resp = await _apiClient
          .get(ApiEndpoints.activityFlashcards(activityId));
      final data = resp.data;
      final List<dynamic> list = data is Map
          ? (data['cards'] as List<dynamic>? ??
              data['flashcards'] as List<dynamic>? ?? [])
          : data as List<dynamic>;
      return list
          .map((e) =>
              FlashcardModel.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw parseDioError(e);
    }
  }

  @override
  Future<ExamModel> getExam(String activityId) async {
    try {
      final resp = await _apiClient
          .get(ApiEndpoints.activityExam(activityId));
      return ExamModel.fromJson(resp.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw parseDioError(e);
    }
  }
}
