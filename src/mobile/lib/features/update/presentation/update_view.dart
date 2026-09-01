// The update nudge dialog — always dismissible (feature-37 §3.4, §6.4).

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../domain/update_models.dart';
import 'update_cubit.dart';

class UpdateView extends StatefulWidget {
  const UpdateView({super.key, required this.info});

  final AppVersionInfo info;

  @override
  State<UpdateView> createState() => _UpdateViewState();
}

class _UpdateViewState extends State<UpdateView> with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance
        .addPostFrameCallback((_) => _checkInstallPermission());
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  // The dialog is never popped while the user is away in the system Settings
  // screen granting the install permission — resuming is the only signal that
  // it may be worth checking again (feature-35 §5.5).
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _checkInstallPermission();
    }
  }

  void _checkInstallPermission() {
    if (!mounted) return;
    context.read<UpdateCubit>().checkInstallPermission();
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<UpdateCubit, UpdateState>(
      builder: (context, state) {
        final cubit = context.read<UpdateCubit>();
        final busy = state.phase == DownloadPhase.downloading ||
            state.phase == DownloadPhase.verifying;

        return AlertDialog(
          title: const Text('Đã có bản mới'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (widget.info.versionName.isNotEmpty)
                Text('Phiên bản ${widget.info.versionName}',
                    style: Theme.of(context).textTheme.titleSmall),
              if (widget.info.releaseNotes.isNotEmpty) ...[
                const SizedBox(height: 12),
                Text(widget.info.releaseNotes),
              ],
              if (busy) ...[
                const SizedBox(height: 16),
                LinearProgressIndicator(
                  value: state.phase == DownloadPhase.verifying ? null : state.progress,
                ),
                const SizedBox(height: 6),
                Text(state.phase == DownloadPhase.verifying
                    ? 'Đang kiểm tra file...'
                    : 'Đang tải ${(state.progress * 100).toStringAsFixed(0)}%'),
                const SizedBox(height: 8),
                // The download runs in the Dart isolate — closing or
                // backgrounding the app cancels it, unlike a native download.
                Text(
                  'Vui lòng không đóng ứng dụng cho đến khi tải xong.',
                  style: TextStyle(
                    color: Theme.of(context).colorScheme.error,
                    fontSize: 12,
                  ),
                ),
              ],
              if (state.error != null) ...[
                const SizedBox(height: 12),
                Text(state.error!,
                    style: TextStyle(color: Theme.of(context).colorScheme.error)),
              ],
            ],
          ),
          actions: _actions(context, cubit, state, busy),
        );
      },
    );
  }

  List<Widget> _actions(
    BuildContext context,
    UpdateCubit cubit,
    UpdateState state,
    bool busy,
  ) {
    if (busy) return const [];

    return [
      TextButton(
        onPressed: () {
          cubit.skip(widget.info.versionCode);
          Navigator.of(context).pop();
        },
        child: const Text('Bỏ qua'),
      ),
      if (state.needsInstallPermission)
        TextButton(
          onPressed: cubit.openInstallSettings,
          child: const Text('Mở cài đặt'),
        )
      else
        FilledButton(
          onPressed: () => cubit.startUpdate(widget.info),
          child: const Text('Cập nhật'),
        ),
    ];
  }
}
