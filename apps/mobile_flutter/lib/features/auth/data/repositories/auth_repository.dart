import '../../../../core/network/api_client.dart';
import '../../../../core/network/api_endpoints.dart';
import '../../../../core/storage/secure_storage.dart';
import '../models/auth_models.dart';

class AuthRepository {

  AuthRepository(this._apiClient, this._storage);
  final ApiClient _apiClient;
  final SecureStorage _storage;

  Future<AuthResponse> login(LoginRequest request) async {
    final response = await _apiClient.post<Map<String, dynamic>>(
      ApiEndpoints.login,
      data: request.toJson(),
    );

    final authResponse = AuthResponse.fromJson(response);

    // Save tokens
    await _storage.saveToken(authResponse.accessToken);
    await _storage.saveRefreshToken(authResponse.refreshToken);
    await _storage.saveUserId(authResponse.user.id.toString());

    return authResponse;
  }

  Future<AuthResponse> register(RegisterRequest request) async {
    final response = await _apiClient.post<Map<String, dynamic>>(
      ApiEndpoints.register,
      data: request.toJson(),
    );

    final authResponse = AuthResponse.fromJson(response);

    // Save tokens
    await _storage.saveToken(authResponse.accessToken);
    await _storage.saveRefreshToken(authResponse.refreshToken);
    await _storage.saveUserId(authResponse.user.id.toString());

    return authResponse;
  }

  Future<User> getCurrentUser() async {
    final response = await _apiClient.get<Map<String, dynamic>>(
      ApiEndpoints.profile,
    );

    return User.fromJson(response);
  }

  Future<void> logout() async {
    await _storage.clearAll();
  }

  Future<bool> isLoggedIn() async {
    final token = await _storage.getToken();
    return token != null;
  }
}
