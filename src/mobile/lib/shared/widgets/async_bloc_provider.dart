import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../core/di/injection.dart';
import '../theme/app_colors.dart';

/// Wraps a screen that needs an async-resolved BLoC from GetIt.
/// Resolves the BLoC via [getIt.getAsync] then provides it.
class AsyncBlocProvider<B extends BlocBase<S>, S> extends StatefulWidget {
  final Widget Function(B bloc) builder;

  const AsyncBlocProvider({super.key, required this.builder});

  @override
  State<AsyncBlocProvider<B, S>> createState() =>
      _AsyncBlocProviderState<B, S>();
}

class _AsyncBlocProviderState<B extends BlocBase<S>, S>
    extends State<AsyncBlocProvider<B, S>> {
  B? _bloc;

  @override
  void initState() {
    super.initState();
    getIt.getAsync<B>().then((bloc) {
      if (mounted) setState(() => _bloc = bloc);
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_bloc == null) {
      return const Scaffold(
        body: Center(
          child: CircularProgressIndicator(color: AppColors.primaryGold),
        ),
      );
    }
    return BlocProvider.value(
      value: _bloc!,
      child: widget.builder(_bloc!),
    );
  }
}
