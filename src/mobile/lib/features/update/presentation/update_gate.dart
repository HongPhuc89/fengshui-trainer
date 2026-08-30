// Shows the nudge dialog or the blocking screen (feature-36 §7.6).

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/router/app_router.dart';
import '../domain/update_models.dart';
import 'update_cubit.dart';
import 'update_view.dart';

/// Wraps the app and reacts to whatever the last check decided.
///
/// Listens rather than builds: the dialog is pushed over the router so a blocked
/// client cannot keep using the screen it was already on. It goes through
/// rootNavigatorKey because this widget lives in MaterialApp.router's builder,
/// above the Navigator, so its own context cannot open a route.
class UpdateGate extends StatefulWidget {
  const UpdateGate({super.key, required this.child});

  final Widget child;

  @override
  State<UpdateGate> createState() => _UpdateGateState();
}

class _UpdateGateState extends State<UpdateGate> {
  bool _showing = false;

  @override
  Widget build(BuildContext context) {
    return BlocListener<UpdateCubit, UpdateState>(
      listenWhen: (a, b) => a.decision.runtimeType != b.decision.runtimeType,
      listener: (context, state) => _present(state.decision),
      child: widget.child,
    );
  }

  Future<void> _present(UpdateDecision decision) async {
    if (_showing) return;
    final context = rootNavigatorKey.currentContext;
    if (context == null) return;

    switch (decision) {
      case BlockUpdate(:final info):
        _showing = true;
        await showDialog<void>(
          context: context,
          barrierDismissible: false,
          // A blocked build has nothing else to offer, so back must not escape.
          builder: (_) => PopScope(
            canPop: false,
            child: UpdateView(info: info, blocking: true),
          ),
        );
        _showing = false;
      case NudgeUpdate(:final info):
        _showing = true;
        await showDialog<void>(
          context: context,
          builder: (_) => UpdateView(info: info, blocking: false),
        );
        _showing = false;
      case NoUpdate():
        break;
    }
  }
}
