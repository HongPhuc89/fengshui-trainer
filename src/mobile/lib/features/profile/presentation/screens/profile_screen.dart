import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:image_cropper/image_cropper.dart';
import 'package:image_picker/image_picker.dart';

import '../../../../../core/di/injection.dart';
import '../../../../../shared/theme/app_colors.dart';
import '../../domain/entities/profile.dart';
import '../bloc/profile_bloc.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) =>
          getIt<ProfileBloc>()..add(const LoadProfile()),
      child: const _ProfileView(),
    );
  }
}

class _ProfileView extends StatelessWidget {
  const _ProfileView();

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<ProfileBloc, ProfileState>(
      listener: (context, state) {
        if (state is ProfileActionError) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(state.message),
              backgroundColor: AppColors.error,
            ),
          );
        }
        if (state is ProfileLoaded && state.passwordChanged) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Đổi mật khẩu thành công'),
              backgroundColor: AppColors.success,
            ),
          );
        }
      },
      builder: (context, state) {
        if (state is ProfileLoading) {
          return const Scaffold(
            body: Center(
                child: CircularProgressIndicator(
                    color: AppColors.primaryGold)),
          );
        }

        if (state is ProfileError) {
          return Scaffold(
            appBar: AppBar(title: const Text('Hồ sơ cá nhân')),
            body: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(state.message,
                      style: const TextStyle(
                          color: AppColors.textSecondary)),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () => context
                        .read<ProfileBloc>()
                        .add(const LoadProfile()),
                    child: const Text('Thử lại'),
                  ),
                ],
              ),
            ),
          );
        }

        final loaded = state is ProfileLoaded
            ? state
            : state is ProfileSaving
                ? state.previous
                : state is ProfileActionError
                    ? state.previous
                    : null;
        if (loaded == null) return const Scaffold();

        final isSaving = state is ProfileSaving;

        return Scaffold(
          body: CustomScrollView(
            slivers: [
              const SliverAppBar(
                title: Text('Hồ sơ cá nhân'),
                pinned: true,
              ),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    children: [
                      // Avatar
                      _AvatarSection(
                        avatarUrl: loaded.user.avatarUrl,
                        onTap: isSaving
                            ? null
                            : () => _pickAvatar(context),
                      ),
                      const SizedBox(height: 24),

                      // Name
                      _EditNameSection(
                        currentName: loaded.user.name,
                        isSaving: isSaving,
                        onSave: (name) => context
                            .read<ProfileBloc>()
                            .add(UpdateName(name)),
                      ),
                      const SizedBox(height: 8),

                      // Email (read-only)
                      ListTile(
                        contentPadding: EdgeInsets.zero,
                        leading: const Icon(Icons.email_outlined,
                            color: AppColors.textSecondary),
                        title: Text(
                          loaded.user.email,
                          style: const TextStyle(
                              color: AppColors.textSecondary,
                              fontSize: 14),
                        ),
                        subtitle: const Text('Email (không thể sửa)',
                            style: TextStyle(
                                color: AppColors.lockGray,
                                fontSize: 12)),
                      ),

                      const Divider(height: 32),

                      // Change password
                      _ChangePasswordSection(
                        isSaving: isSaving,
                        onSave: (old, newPw) => context
                            .read<ProfileBloc>()
                            .add(ChangePassword(old, newPw)),
                      ),

                      const Divider(height: 32),

                      // Device section
                      if (loaded.deviceStatus != null)
                        _DeviceSection(deviceStatus: loaded.deviceStatus!),

                      const SizedBox(height: 32),

                      // Logout
                      SizedBox(
                        width: double.infinity,
                        child: OutlinedButton(
                          style: OutlinedButton.styleFrom(
                            foregroundColor: AppColors.error,
                            side: const BorderSide(
                                color: AppColors.error),
                          ),
                          onPressed: isSaving
                              ? null
                              : () => context
                                  .read<ProfileBloc>()
                                  .add(const Logout()),
                          child: const Text('Đăng xuất'),
                        ),
                      ),
                      const SizedBox(height: 32),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Future<void> _pickAvatar(BuildContext context) async {
    final picker = ImagePicker();
    final picked =
        await picker.pickImage(source: ImageSource.gallery);
    if (picked == null) return;

    final cropped = await ImageCropper().cropImage(
      sourcePath: picked.path,
      aspectRatio: const CropAspectRatio(ratioX: 1, ratioY: 1),
      uiSettings: [
        AndroidUiSettings(
          toolbarTitle: 'Cắt ảnh',
          toolbarColor: AppColors.surface,
          toolbarWidgetColor: AppColors.primaryGold,
          initAspectRatio: CropAspectRatioPreset.square,
          lockAspectRatio: true,
          backgroundColor: AppColors.background,
        ),
        IOSUiSettings(title: 'Cắt ảnh', aspectRatioLockEnabled: true),
      ],
    );

    if (cropped == null || !context.mounted) return;
    context
        .read<ProfileBloc>()
        .add(UpdateAvatar(cropped.path));
  }
}

class _AvatarSection extends StatelessWidget {
  final String? avatarUrl;
  final VoidCallback? onTap;

  const _AvatarSection({this.avatarUrl, this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Stack(
        children: [
          CircleAvatar(
            radius: 52,
            backgroundColor: AppColors.surfaceAlt,
            backgroundImage: avatarUrl != null
                ? CachedNetworkImageProvider(avatarUrl!)
                : null,
            child: avatarUrl == null
                ? const Icon(Icons.person,
                    size: 52, color: AppColors.textSecondary)
                : null,
          ),
          Positioned(
            bottom: 0,
            right: 0,
            child: Container(
              padding: const EdgeInsets.all(6),
              decoration: const BoxDecoration(
                color: AppColors.primaryGold,
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.camera_alt,
                  size: 16, color: Colors.black87),
            ),
          ),
        ],
      ),
    );
  }
}

class _EditNameSection extends StatefulWidget {
  final String currentName;
  final bool isSaving;
  final Function(String) onSave;

  const _EditNameSection({
    required this.currentName,
    required this.isSaving,
    required this.onSave,
  });

  @override
  State<_EditNameSection> createState() => _EditNameSectionState();
}

class _EditNameSectionState extends State<_EditNameSection> {
  late final TextEditingController _ctrl;
  bool _editing = false;

  @override
  void initState() {
    super.initState();
    _ctrl = TextEditingController(text: widget.currentName);
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: TextFormField(
            controller: _ctrl,
            readOnly: !_editing || widget.isSaving,
            decoration: InputDecoration(
              labelText: 'Tên hiển thị',
              suffixIcon: _editing
                  ? IconButton(
                      icon: const Icon(Icons.check,
                          color: AppColors.primaryGold),
                      onPressed: widget.isSaving
                          ? null
                          : () {
                              widget.onSave(_ctrl.text.trim());
                              setState(() => _editing = false);
                            },
                    )
                  : IconButton(
                      icon: const Icon(Icons.edit,
                          color: AppColors.textSecondary),
                      onPressed: () =>
                          setState(() => _editing = true),
                    ),
            ),
          ),
        ),
      ],
    );
  }
}

class _ChangePasswordSection extends StatefulWidget {
  final bool isSaving;
  final Function(String, String) onSave;

  const _ChangePasswordSection({
    required this.isSaving,
    required this.onSave,
  });

  @override
  State<_ChangePasswordSection> createState() =>
      _ChangePasswordSectionState();
}

class _ChangePasswordSectionState
    extends State<_ChangePasswordSection> {
  final _oldCtrl = TextEditingController();
  final _newCtrl = TextEditingController();
  final _confirmCtrl = TextEditingController();
  bool _expanded = false;

  @override
  void dispose() {
    _oldCtrl.dispose();
    _newCtrl.dispose();
    _confirmCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        ListTile(
          contentPadding: EdgeInsets.zero,
          title: const Text('Đổi mật khẩu',
              style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textPrimary)),
          trailing: Icon(
            _expanded
                ? Icons.keyboard_arrow_up
                : Icons.keyboard_arrow_down,
            color: AppColors.textSecondary,
          ),
          onTap: () =>
              setState(() => _expanded = !_expanded),
        ),
        if (_expanded) ...[
          TextField(
            controller: _oldCtrl,
            obscureText: true,
            decoration: const InputDecoration(
                labelText: 'Mật khẩu hiện tại'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _newCtrl,
            obscureText: true,
            decoration:
                const InputDecoration(labelText: 'Mật khẩu mới'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _confirmCtrl,
            obscureText: true,
            decoration: const InputDecoration(
                labelText: 'Xác nhận mật khẩu mới'),
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: widget.isSaving
                  ? null
                  : () {
                      if (_newCtrl.text != _confirmCtrl.text) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text(
                                'Mật khẩu mới không khớp'),
                            backgroundColor: AppColors.error,
                          ),
                        );
                        return;
                      }
                      widget.onSave(
                          _oldCtrl.text, _newCtrl.text);
                      _oldCtrl.clear();
                      _newCtrl.clear();
                      _confirmCtrl.clear();
                      setState(() => _expanded = false);
                    },
              child: const Text('Lưu mật khẩu'),
            ),
          ),
        ],
      ],
    );
  }
}

class _DeviceSection extends StatelessWidget {
  final DeviceStatus deviceStatus;

  const _DeviceSection({required this.deviceStatus});

  @override
  Widget build(BuildContext context) {
    final code = deviceStatus.clientCode;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Thiết bị',
          style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w600,
              color: AppColors.textPrimary),
        ),
        const SizedBox(height: 8),
        ListTile(
          contentPadding: EdgeInsets.zero,
          leading: const Icon(Icons.phone_android, color: AppColors.primaryGold),
          title: Text(
            deviceStatus.deviceName,
            style: const TextStyle(color: AppColors.textPrimary, fontSize: 14),
          ),
          subtitle: const Text('Thiết bị đang sử dụng',
              style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
        ),
        if (code != null)
          // Shown so the user can read it out when asking support to move the
          // account to another handset — the only way that happens.
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.qr_code_2, color: AppColors.primaryGold),
            title: Text(
              'Mã thiết bị: $code',
              style: const TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 14,
                  fontFamily: 'monospace'),
            ),
            subtitle: const Text('Cung cấp mã này khi liên hệ hỗ trợ',
                style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
            trailing: IconButton(
              icon: const Icon(Icons.copy, size: 18),
              tooltip: 'Sao chép mã thiết bị',
              onPressed: () async {
                await Clipboard.setData(ClipboardData(text: code));
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Đã sao chép mã thiết bị')),
                  );
                }
              },
            ),
          ),
        const Text(
          'Mỗi tài khoản chỉ dùng được trên một thiết bị. Để đổi sang máy khác, '
          'vui lòng liên hệ quản trị viên để nhận mã kích hoạt.',
          style: TextStyle(color: AppColors.textSecondary, fontSize: 12),
        ),
      ],
    );
  }
}
