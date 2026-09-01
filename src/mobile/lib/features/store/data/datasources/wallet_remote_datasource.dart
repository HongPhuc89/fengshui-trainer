import 'package:dio/dio.dart';
import 'package:injectable/injectable.dart';

import '../../../../core/api/api_client.dart';
import '../../../../core/api/api_endpoints.dart';
import '../models/wallet_model.dart';

abstract class WalletRemoteDataSource {
  Future<WalletModel> getBalance();
  Future<List<TransactionModel>> getTransactions();
}

@Injectable(as: WalletRemoteDataSource)
class WalletRemoteDataSourceImpl implements WalletRemoteDataSource {
  final ApiClient _apiClient;

  WalletRemoteDataSourceImpl(this._apiClient);

  @override
  Future<WalletModel> getBalance() async {
    try {
      final resp = await _apiClient.get(ApiEndpoints.walletBalance);
      return WalletModel.fromJson(resp.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw parseDioError(e);
    }
  }

  @override
  Future<List<TransactionModel>> getTransactions() async {
    try {
      final resp =
          await _apiClient.get(ApiEndpoints.walletHistory);
      final data = resp.data;
      final List<dynamic> list = data is Map
          ? (data['results'] as List<dynamic>? ?? [])
          : data as List<dynamic>;
      return list
          .map((e) =>
              TransactionModel.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw parseDioError(e);
    }
  }
}
