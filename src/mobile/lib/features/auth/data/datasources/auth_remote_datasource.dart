import 'package:dio/dio.dart';
import 'package:injectable/injectable.dart';

import '../../../../core/api/api_client.dart';
import '../../../../core/api/api_endpoints.dart';
import '../../../../core/device/device_service.dart';
import '../models/user_model.dart';

abstract class AuthRemoteDataSource {
  /// [pairingCode] is only needed the first time this handset appears.
  Future<Map<String, dynamic>> login({
    required String email,
    required String password,
    String? pairingCode,
  });


  Future<void> logout(String refreshToken);
  Future<UserModel> getMe();
}

@Injectable(as: AuthRemoteDataSource)
class AuthRemoteDataSourceImpl implements AuthRemoteDataSource {
  final ApiClient _apiClient;
  final DeviceService _deviceService;

  AuthRemoteDataSourceImpl(this._apiClient, this._deviceService);

  @override
  Future<Map<String, dynamic>> login({
    required String email,
    required String password,
    String? pairingCode,
  }) async {
    try {
      final meta = await _deviceService.getMeta();
      final resp = await _apiClient.post(ApiEndpoints.login, data: {
        'email': email,
        'password': password,
        ...meta.toJson(),
        if (pairingCode != null && pairingCode.isNotEmpty)
          'pairing_code': pairingCode,
      });
      return resp.data as Map<String, dynamic>;
    } on DioException catch (e) {
      throw parseDioError(e);
    }
  }


  @override
  Future<void> logout(String refreshToken) async {
    try {
      await _apiClient.post(ApiEndpoints.logout, data: {'refresh': refreshToken});
    } on DioException catch (e) {
      throw parseDioError(e);
    }
  }

  @override
  Future<UserModel> getMe() async {
    try {
      final resp = await _apiClient.get(ApiEndpoints.me);
      return UserModel.fromJson(resp.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw parseDioError(e);
    }
  }
}
