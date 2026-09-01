// GENERATED CODE - DO NOT MODIFY BY HAND
// dart format width=80

// **************************************************************************
// InjectableConfigGenerator
// **************************************************************************

// ignore_for_file: type=lint
// coverage:ignore-file

// ignore_for_file: no_leading_underscores_for_library_prefixes
import 'package:flutter_secure_storage/flutter_secure_storage.dart' as _i558;
import 'package:get_it/get_it.dart' as _i174;
import 'package:injectable/injectable.dart' as _i526;

import '../../features/auth/data/datasources/auth_remote_datasource.dart'
    as _i161;
import '../../features/auth/data/repositories/auth_repository_impl.dart'
    as _i153;
import '../../features/auth/domain/repositories/auth_repository.dart' as _i787;
import '../../features/auth/presentation/bloc/auth_bloc.dart' as _i797;
import '../../features/books/data/datasources/books_remote_datasource.dart'
    as _i776;
import '../../features/books/data/repositories/books_repository_impl.dart'
    as _i997;
import '../../features/books/domain/repositories/books_repository.dart'
    as _i831;
import '../../features/books/presentation/bloc/book_detail_bloc.dart' as _i288;
import '../../features/books/presentation/bloc/book_reader_bloc.dart' as _i420;
import '../../features/books/presentation/bloc/books_bloc.dart' as _i815;
import '../../features/home/presentation/bloc/home_bloc.dart' as _i202;
import '../../features/profile/data/datasources/profile_remote_datasource.dart'
    as _i327;
import '../../features/profile/data/repositories/profile_repository_impl.dart'
    as _i334;
import '../../features/profile/domain/repositories/profile_repository.dart'
    as _i894;
import '../../features/profile/presentation/bloc/profile_bloc.dart' as _i469;
import '../../features/store/data/datasources/wallet_remote_datasource.dart'
    as _i314;
import '../../features/store/data/repositories/wallet_repository_impl.dart'
    as _i27;
import '../../features/store/domain/repositories/wallet_repository.dart'
    as _i601;
import '../../features/store/presentation/bloc/store_bloc.dart' as _i68;
import '../../features/training/data/datasources/training_remote_datasource.dart'
    as _i302;
import '../../features/training/data/repositories/training_repository_impl.dart'
    as _i550;
import '../../features/training/domain/repositories/training_repository.dart'
    as _i580;
import '../../features/training/presentation/bloc/flashcard_bloc.dart' as _i344;
import '../../features/training/presentation/bloc/quiz_bloc.dart' as _i240;
import '../../features/training/presentation/bloc/training_bloc.dart' as _i669;
import '../../features/update/data/update_repository.dart' as _i11;
import '../../features/update/data/update_store.dart' as _i968;
import '../../features/update/presentation/update_cubit.dart' as _i128;
import '../../features/videos/data/datasources/videos_remote_datasource.dart'
    as _i888;
import '../../features/videos/data/repositories/videos_repository_impl.dart'
    as _i867;
import '../../features/videos/domain/repositories/videos_repository.dart'
    as _i836;
import '../../features/videos/presentation/bloc/video_detail_bloc.dart'
    as _i587;
import '../../features/videos/presentation/bloc/video_player_bloc.dart'
    as _i306;
import '../../features/videos/presentation/bloc/videos_bloc.dart' as _i135;
import '../api/api_client.dart' as _i277;
import '../auth/auth_cubit.dart' as _i761;
import '../cache/cache_service.dart' as _i981;
import '../device/device_service.dart' as _i202;
import '../pdf/pdf_decryption_service.dart' as _i367;
import '../update/apk_downloader.dart' as _i763;
import '../update/installer.dart' as _i393;

extension GetItInjectableX on _i174.GetIt {
  // initializes the registration of main-scope dependencies inside of GetIt
  Future<_i174.GetIt> init({
    String? environment,
    _i526.EnvironmentFilter? environmentFilter,
  }) async {
    final gh = _i526.GetItHelper(this, environment, environmentFilter);
    await gh.singletonAsync<_i981.CacheService>(() {
      final i = _i981.CacheService();
      return i.init().then((_) => i);
    }, preResolve: true);
    gh.singleton<_i367.PdfDecryptionService>(
      () => _i367.PdfDecryptionService(),
    );
    gh.singleton<_i763.ApkDownloader>(() => const _i763.ApkDownloader());
    gh.singleton<_i393.AndroidInstaller>(() => const _i393.AndroidInstaller());
    await gh.singletonAsync<_i968.UpdateStore>(() {
      final i = _i968.UpdateStore();
      return i.init().then((_) => i);
    }, preResolve: true);
    gh.singleton<_i761.AuthCubit>(
      () => _i761.AuthCubit(
        gh<_i558.FlutterSecureStorage>(),
        gh<_i981.CacheService>(),
      ),
    );
    gh.singleton<_i277.ApiClient>(() => _i277.ApiClient(gh<_i761.AuthCubit>()));
    gh.singleton<_i11.UpdateRepository>(
      () => _i11.UpdateRepository(gh<_i277.ApiClient>()),
    );
    gh.singleton<_i202.DeviceService>(
      () => _i202.DeviceService(gh<_i558.FlutterSecureStorage>()),
    );
    gh.factory<_i161.AuthRemoteDataSource>(
      () => _i161.AuthRemoteDataSourceImpl(
        gh<_i277.ApiClient>(),
        gh<_i202.DeviceService>(),
      ),
    );
    gh.singleton<_i128.UpdateCubit>(
      () => _i128.UpdateCubit(
        gh<_i11.UpdateRepository>(),
        gh<_i968.UpdateStore>(),
        gh<_i393.AndroidInstaller>(),
        gh<_i763.ApkDownloader>(),
      ),
    );
    gh.factory<_i787.AuthRepository>(
      () => _i153.AuthRepositoryImpl(
        gh<_i161.AuthRemoteDataSource>(),
        gh<_i761.AuthCubit>(),
        gh<_i202.DeviceService>(),
      ),
    );
    gh.factory<_i327.ProfileRemoteDataSource>(
      () => _i327.ProfileRemoteDataSourceImpl(gh<_i277.ApiClient>()),
    );
    gh.factory<_i302.TrainingRemoteDataSource>(
      () => _i302.TrainingRemoteDataSourceImpl(gh<_i277.ApiClient>()),
    );
    gh.factory<_i314.WalletRemoteDataSource>(
      () => _i314.WalletRemoteDataSourceImpl(gh<_i277.ApiClient>()),
    );
    gh.factory<_i888.VideosRemoteDataSource>(
      () => _i888.VideosRemoteDataSourceImpl(gh<_i277.ApiClient>()),
    );
    gh.factory<_i776.BooksRemoteDataSource>(
      () => _i776.BooksRemoteDataSourceImpl(gh<_i277.ApiClient>()),
    );
    gh.factory<_i831.BooksRepository>(
      () => _i997.BooksRepositoryImpl(
        gh<_i776.BooksRemoteDataSource>(),
        gh<_i981.CacheService>(),
      ),
    );
    gh.factory<_i836.VideosRepository>(
      () => _i867.VideosRepositoryImpl(
        gh<_i888.VideosRemoteDataSource>(),
        gh<_i981.CacheService>(),
      ),
    );
    gh.factory<_i587.VideoDetailBloc>(
      () => _i587.VideoDetailBloc(gh<_i836.VideosRepository>()),
    );
    gh.factory<_i306.VideoPlayerBloc>(
      () => _i306.VideoPlayerBloc(gh<_i836.VideosRepository>()),
    );
    gh.factory<_i135.VideosBloc>(
      () => _i135.VideosBloc(gh<_i836.VideosRepository>()),
    );
    gh.factory<_i601.WalletRepository>(
      () => _i27.WalletRepositoryImpl(gh<_i314.WalletRemoteDataSource>()),
    );
    gh.factory<_i420.BookReaderBloc>(
      () => _i420.BookReaderBloc(
        gh<_i831.BooksRepository>(),
        gh<_i367.PdfDecryptionService>(),
      ),
    );
    gh.factory<_i68.StoreBloc>(
      () => _i68.StoreBloc(gh<_i601.WalletRepository>()),
    );
    gh.factory<_i580.TrainingRepository>(
      () => _i550.TrainingRepositoryImpl(
        gh<_i302.TrainingRemoteDataSource>(),
        gh<_i981.CacheService>(),
      ),
    );
    gh.factory<_i797.AuthBloc>(
      () => _i797.AuthBloc(gh<_i787.AuthRepository>()),
    );
    gh.factory<_i894.ProfileRepository>(
      () => _i334.ProfileRepositoryImpl(
        gh<_i327.ProfileRemoteDataSource>(),
        gh<_i761.AuthCubit>(),
      ),
    );
    gh.factory<_i815.BooksBloc>(
      () => _i815.BooksBloc(gh<_i831.BooksRepository>()),
    );
    gh.factory<_i202.HomeBloc>(
      () => _i202.HomeBloc(
        gh<_i831.BooksRepository>(),
        gh<_i836.VideosRepository>(),
      ),
    );
    gh.factory<_i344.FlashcardBloc>(
      () => _i344.FlashcardBloc(gh<_i580.TrainingRepository>()),
    );
    gh.factory<_i240.QuizBloc>(
      () => _i240.QuizBloc(gh<_i580.TrainingRepository>()),
    );
    gh.factory<_i669.TrainingBloc>(
      () => _i669.TrainingBloc(gh<_i580.TrainingRepository>()),
    );
    gh.factory<_i288.BookDetailBloc>(
      () => _i288.BookDetailBloc(
        gh<_i831.BooksRepository>(),
        gh<_i761.AuthCubit>(),
      ),
    );
    gh.factory<_i469.ProfileBloc>(
      () => _i469.ProfileBloc(
        gh<_i894.ProfileRepository>(),
        gh<_i761.AuthCubit>(),
      ),
    );
    return this;
  }
}
