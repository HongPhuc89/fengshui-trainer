// The update nudge dialog — always dismissible (feature-37 §3.4, §6.4).

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../domain/update_models.dart';
import 'update_cubit.dart';

class UpdateView extends StatelessWidget {
  const UpdateView({super.key, required this.info});

  final AppVersionInfo info;

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
              if (info.versionName.isNotEmpty)
                Text('Phiên bản ${info.versionName}',
                    style: Theme.of(context).textTheme.titleSmall),
              if (info.releaseNotes.isNotEmpty) ...[
                const SizedBox(height: 12),
                Text(info.releaseNotes),
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
          cubit.skip(info.versionCode);
          Navigator.of(context).pop();
        },
        child: const Text('Bỏ qua'),
      ),
      if (state.needsInstallPermission)
        TextButton(
          onPressed: cubit.openInstallSettings,
          child: const Text('Mở cài đặt'),
        ),
      FilledButton(
        onPressed: () => cubit.startUpdate(info),
        child: const Text('Cập nhật'),
      ),
    ];
  }
}
