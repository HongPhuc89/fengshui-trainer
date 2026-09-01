import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../theme/app_colors.dart';

/// The Linh Thạch gem, drawn from the same path as the web's GemIcon.vue so
/// both surfaces show an identical mark.
class GemIcon extends StatelessWidget {
  const GemIcon({super.key, this.size = 16, this.color});

  final double size;
  final Color? color;

  static const _path =
      'M6 2L2 8l10 14L22 8l-4-6H6zm1.5 2h9l2.5 4H5L6.5 4zM5.5 10h13l-8.5 12L5.5 10z';

  @override
  Widget build(BuildContext context) {
    final fill = color ?? AppColors.primaryGold;
    return SvgPicture.string(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">'
      '<path fill="#${fill.toARGB32().toRadixString(16).substring(2)}" d="$_path"/>'
      '</svg>',
      width: size,
      height: size,
    );
  }
}
