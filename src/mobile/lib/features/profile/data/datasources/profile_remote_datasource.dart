import 'package:dio/dio.dart';
import 'package:injectable/injectable.dart';

import '../../../../core/api/api_client.dart';
import '../../../../core/api/api_endpoints.dart';
import '../../../auth/data/models/user_model.dart';

abstract class ProfileRemoteDataSource {
  Future<UserModel> getMe();
  Future<UserModel> updateName(String name);
  Future<void> changePassword(String oldPassword, String newPassword);
  Future<Map<String, dynamic>> getDeviceStatus();
  Future<UserModel> updateAvatar(String filePath);
}

@Injectable(as: ProfileRemoteDataSource)
class ProfileRemoteDataSourceImpl implements ProfileRemoteDataSource {
  final ApiClient _apiClient;

  ProfileRemoteDataSourceImpl(this._apiClient);

  @override
  Future<UserModel> getMe() async {
    try {
      final resp = await _apiClient.get(ApiEndpoints.me);
      return UserModel.fromJson(resp.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw parseDioError(e);
    }
  }

  @override
  Future<UserModel> updateName(String name) async {
    try {
      final resp = await _apiClient.patch(ApiEndpoints.me,
          data: {'full_name': name});
      return UserModel.fromJson(resp.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw parseDioError(e);
    }
  }

  @override
  Future<void> changePassword(
      String oldPassword, String newPassword) async {
    try {
      await _apiClient.post(ApiEndpoints.changePassword, data: {
        'old_password': oldPassword,
        'new_password': newPassword,
      });
    } on DioException catch (e) {
      throw parseDioError(e);
    }
  }

  @override
  Future<Map<String, dynamic>> getDeviceStatus() async {
    try {
      final resp =
          await _apiClient.get(ApiEndpoints.deviceStatus);
      return resp.data as Map<String, dynamic>;
    } on DioException catch (e) {
      throw parseDioError(e);
    }
  }


  @override
  Future<UserModel> updateAvatar(String filePath) async {
    try {
      final formData = FormData.fromMap({
        'avatar': await MultipartFile.fromFile(filePath),
      });
      final resp = await _apiClient.patch(
        ApiEndpoints.avatar,
        data: formData,
        options: Options(contentType: 'multipart/form-data'),
      );
      return UserModel.fromJson(resp.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw parseDioError(e);
    }
  }
}
