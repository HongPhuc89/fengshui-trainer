import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:pdfx/pdfx.dart';

import '../../../../core/security/screen_guard.dart';
import '../../../../../core/auth/auth_cubit.dart';
import '../../../../../core/di/injection.dart';
import '../../../../../shared/theme/app_colors.dart';
import '../bloc/book_reader_bloc.dart';
import '../widgets/reader_bars.dart';
import '../widgets/watermark_overlay.dart';

class BookReaderScreen extends StatefulWidget {
  final String slug;
  final int? startChapter;

  const BookReaderScreen({
    super.key,
    required this.slug,
    this.startChapter,
  });

  @override
  State<BookReaderScreen> createState() => _BookReaderScreenState();
}

class _BookReaderScreenState extends State<BookReaderScreen>
    with WidgetsBindingObserver {
  late final BookReaderBloc _bloc;
  bool _controlsVisible = true;
  Timer? _hideTimer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _bloc = getIt<BookReaderBloc>();
    _bloc.add(LoadChapter(
      bookSlug: widget.slug,
      chapterOrder: widget.startChapter ?? 1,
    ));

    // Enable screenshot prevention for this screen
    ScreenGuard.preventCapture();
    ScreenGuard.protectDataLeakage();

    // Full screen immersive
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    _scheduleHide();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _hideTimer?.cancel();
    _bloc.close();
    // Restore system UI
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    ScreenGuard.allowDataLeakage();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused ||
        state == AppLifecycleState.inactive) {
      _bloc.add(const AppBackgrounded());
    } else if (state == AppLifecycleState.resumed) {
      _bloc.add(const AppForegrounded());
    }
  }

  void _toggleControls() {
    setState(() => _controlsVisible = !_controlsVisible);
    if (_controlsVisible) _scheduleHide();
  }

  void _scheduleHide() {
    _hideTimer?.cancel();
    _hideTimer = Timer(const Duration(seconds: 3), () {
      if (mounted) setState(() => _controlsVisible = false);
    });
  }

  @override
  Widget build(BuildContext context) {
    final user = getIt<AuthCubit>().currentUser;
    final watermarkText =
        '${user?.name ?? ''}\n${user?.phone ?? user?.email ?? ''}';

    return BlocProvider.value(
      value: _bloc,
      child: BlocBuilder<BookReaderBloc, BookReaderState>(
        builder: (context, state) {
          return Scaffold(
            backgroundColor: Colors.black,
            body: Stack(
              children: [
                // Layer 1: PDF Viewer
                Positioned.fill(
                  child: GestureDetector(
                    onTap: _toggleControls,
                    onHorizontalDragEnd: (details) {
                      if (state is BookReaderLoaded) {
                        if (details.primaryVelocity! < -300) {
                          // Swipe left → next page
                          if (state.currentPage < state.totalPages) {
                            _bloc.add(ChangePage(state.currentPage + 1));
                          }
                        } else if (details.primaryVelocity! > 300) {
                          // Swipe right → prev page
                          if (state.currentPage > 1) {
                            _bloc.add(ChangePage(state.currentPage - 1));
                          }
                        }
                      }
                    },
                    child: state is BookReaderLoaded && _bloc.pdfController != null
                        ? PdfView(controller: _bloc.pdfController!)
                        : state is BookReaderLoading
                            ? const Center(
                                child: CircularProgressIndicator(
                                    color: AppColors.primaryGold),
                              )
                            : state is BookReaderError
                                ? Center(
                                    child: Column(
                                      mainAxisAlignment:
                                          MainAxisAlignment.center,
                                      children: [
                                        const Icon(Icons.error_outline,
                                            color: AppColors.error,
                                            size: 48),
                                        const SizedBox(height: 12),
                                        Text(
                                          (state as BookReaderError).message,
                                          style: const TextStyle(
                                              color: AppColors.textSecondary),
                                          textAlign: TextAlign.center,
                                        ),
                                        const SizedBox(height: 16),
                                        ElevatedButton(
                                          onPressed: () => _bloc.add(
                                              LoadChapter(
                                            bookSlug: widget.slug,
                                            chapterOrder:
                                                widget.startChapter ?? 1,
                                          )),
                                          child: const Text('Thử lại'),
                                        ),
                                      ],
                                    ),
                                  )
                                : const SizedBox.shrink(),
                  ),
                ),

                // Layer 2: Watermark (always visible)
                if (state is BookReaderLoaded)
                  Positioned.fill(
                      child: WatermarkOverlay(text: watermarkText)),

                // Layer 3: DRM Blur (when app backgrounded)
                if (state is BookReaderLoaded && state.isBlurred)
                  const Positioned.fill(child: BlurOverlay()),

                // Layer 4: TOC Overlay
                if (state is BookReaderLoaded && state.tocVisible) ...[
                  // Backdrop
                  Positioned.fill(
                    child: GestureDetector(
                      onTap: () => _bloc.add(const ToggleToc()),
                      child:
                          Container(color: Colors.black54),
                    ),
                  ),
                  // TOC Panel
                  AnimatedPositioned(
                    duration: const Duration(milliseconds: 250),
                    curve: Curves.easeOut,
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width:
                        MediaQuery.of(context).size.width * 0.75,
                    child: TocPanel(
                      chapters: const [], // Will be populated from BookDetail
                      currentOrder: state.chapter.order,
                      bookSlug: widget.slug,
                    ),
                  ),
                ],

                // Layer 5: Top Bar (auto-hide)
                if (state is BookReaderLoaded)
                  AnimatedPositioned(
                    duration: const Duration(milliseconds: 200),
                    top: _controlsVisible ? 0 : -120,
                    left: 0,
                    right: 0,
                    child: ReaderTopBar(
                      bookTitle: widget.slug,
                      chapter: state.chapter,
                      bookSlug: widget.slug,
                      bloc: _bloc,
                    ),
                  ),

                // Layer 6: Bottom Bar (auto-hide)
                if (state is BookReaderLoaded)
                  AnimatedPositioned(
                    duration: const Duration(milliseconds: 200),
                    bottom: _controlsVisible ? 0 : -100,
                    left: 0,
                    right: 0,
                    child: ReaderBottomBar(
                      currentPage: state.currentPage,
                      totalPages: state.totalPages,
                      bloc: _bloc,
                    ),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }
}
