// The update dialog itself, in both its dismissible and blocking form
// (feature-36 §7.6).

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../domain/update_models.dart';
import 'update_cubit.dart';

class UpdateView extends StatelessWidget {
  const UpdateView({super.key, required this.info, required this.blocking});

  final AppVersionInfo info;
  final bool blocking;

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<UpdateCubit, UpdateState>(
      builder: (context, state) {
        final cubit = context.read<UpdateCubit>();
        final busy = state.phase == DownloadPhase.downloading ||
            state.phase == DownloadPhase.verifying;

        return AlertDialog(
          title: Text(blocking ? 'Cần cập nhật ứng dụng' : 'Đã có bản mới'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (info.versionName.isNotEmpty)
                Text('Phiên bản ${info.versionName}',
                    style: Theme.of(context).textTheme.titleSmall),
              if (blocking) ...[
                const SizedBox(height: 8),
                const Text(
                  'Phiên bản đang dùng không còn được hỗ trợ. '
                  'Vui lòng cập nhật để tiếp tục sử dụng.',
                ),
              ],
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

    // A stale block came from the stored verdict, so there is no download link
    // to offer — only a retry (feature-36 §7.5).
    final isStale = blocking && info.downloadUrl.isEmpty;

    return [
      if (!blocking)
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
        onPressed: () {
          if (isStale) {
            cubit.check();
          } else {
            cubit.startUpdate(info);
          }
        },
        child: Text(isStale ? 'Thử lại' : 'Cập nhật'),
      ),
    ];
  }
}
