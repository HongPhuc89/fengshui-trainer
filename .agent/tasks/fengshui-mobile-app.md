# Task: Feng Shui Mobile App - React Native

## Mục tiêu

Xây dựng ứng dụng mobile theo phong cách phong thủy/xin xăm với React Native, hỗ trợ build development cho web với giao diện mobile-first.

## Thiết kế tham khảo

- **Phong cách**: Phong thủy Việt Nam, màu đỏ vàng may mắn
- **Tính năng chính**: Xin xăm ngày Tết, xem quẻ, lời khuyên phong thủy
- **UI/UX**: Giao diện đẹp mắt với hiệu ứng 3D, animation mượt mà

## Tech Stack

- **Framework**: React Native + Expo
- **Web Support**: React Native Web (cho development build)
- **Styling**: NativeWind (TailwindCSS for React Native) hoặc Styled Components
- **Animation**: React Native Reanimated, Lottie
- **State Management**: Zustand hoặc Redux Toolkit
- **Backend**: Firebase (Firestore, Authentication, Storage)
- **3D Graphics**: React Native Skia hoặc Three.js (cho web)

## Cấu trúc dự án

```
fengshui-app/
├── src/
│   ├── screens/
│   │   ├── HomeScreen.tsx           # Màn hình chính với ống tre xin xăm
│   │   ├── DrawStickScreen.tsx      # Màn hình rút xăm
│   │   ├── ResultScreen.tsx         # Màn hình kết quả quẻ
│   │   └── HistoryScreen.tsx        # Lịch sử xin xăm
│   ├── components/
│   │   ├── BambooStick.tsx          # Component que xăm 3D
│   │   ├── BambooContainer.tsx      # Component ống tre
│   │   ├── FortuneCard.tsx          # Card hiển thị quẻ
│   │   └── AnimatedBackground.tsx   # Background động
│   ├── services/
│   │   ├── firebase.ts              # Firebase config
│   │   └── fortune.service.ts       # Logic xin xăm
│   ├── stores/
│   │   └── fortuneStore.ts          # State management
│   ├── constants/
│   │   ├── colors.ts                # Màu sắc phong thủy
│   │   ├── fortunes.ts              # Database các quẻ
│   │   └── animations.ts            # Animation configs
│   └── utils/
│       ├── haptics.ts               # Haptic feedback
│       └── sound.ts                 # Sound effects
├── assets/
│   ├── images/
│   ├── sounds/
│   └── fonts/
├── app.json
├── package.json
└── README.md
```

## Tính năng chi tiết

### 1. Màn hình chính (HomeScreen)

- [ ] Hiển thị ống tre vàng với các que xăm
- [ ] Animation lắc ống tre khi người dùng tương tác
- [ ] Haptic feedback khi lắc
- [ ] Sound effect âm thanh tre
- [ ] Button "Lắc để điện thoại để xin xăm"
- [ ] Background gradient đỏ may mắn

### 2. Màn hình rút xăm (DrawStickScreen)

- [ ] Animation một que xăm bay ra
- [ ] Hiệu ứng xoay que xăm
- [ ] Transition mượt mà sang màn hình kết quả
- [ ] Particle effects vàng óng ánh

### 3. Màn hình kết quả (ResultScreen)

- [ ] Card hiển thị quẻ với:
  - Số quẻ (VD: SỐ 053 - TRUNG HẠ)
  - Hình ảnh minh họa (thuyền buồm, rồng, phượng...)
  - Lời giải quẻ chi tiết
  - Đánh giá sao (1-5 sao)
- [ ] Button "Xem một sơ" để xem chi tiết
- [ ] Button "Xin quẻ mới"
- [ ] Button "Chọ sẻ" để chia sẻ
- [ ] Lưu vào lịch sử

### 4. Tính năng bổ sung

- [ ] Lịch sử xin xăm
- [ ] Chia sẻ kết quả lên mạng xã hội
- [ ] Thông báo hàng ngày
- [ ] Dark mode (nền đen vàng)
- [ ] Đa ngôn ngữ (Tiếng Việt, English)

## Design System

### Màu sắc phong thủy

```typescript
const colors = {
  // Màu chính
  primary: {
    red: '#C41E3A', // Đỏ may mắn
    gold: '#FFD700', // Vàng kim
    darkRed: '#8B0000', // Đỏ đậm
  },
  // Màu phụ
  secondary: {
    jade: '#00A86B', // Xanh ngọc
    cream: '#FFF8DC', // Kem
    brown: '#8B4513', // Nâu gỗ
  },
  // Gradient
  gradients: {
    lucky: ['#C41E3A', '#8B0000'],
    gold: ['#FFD700', '#FFA500'],
    jade: ['#00A86B', '#006B4E'],
  },
};
```

### Typography

```typescript
const fonts = {
  heading: 'UTM-Avo', // Font chữ Việt đẹp
  body: 'SVN-Gilroy',
  decorative: 'UTM-Cookies', // Font trang trí
};
```

### Animations

- **Lắc ống tre**: Shake animation với rotation
- **Rút xăm**: Slide up + fade in
- **Card flip**: 3D flip animation
- **Particle**: Confetti/sparkle effects

## Database - Quẻ xăm

### Schema Firestore

```typescript
interface Fortune {
  id: string; // VD: "053"
  number: string; // "SỐ 053"
  title: string; // "TRUNG HẠ"
  rating: number; // 1-5 sao
  description: string; // Lời giải quẻ
  advice: string; // Lời khuyên
  imageUrl: string; // URL hình minh họa
  category: string; // "love" | "career" | "health" | "wealth"
  tags: string[]; // ["may_mắn", "cẩn_thận"]
}

interface UserFortune {
  userId: string;
  fortuneId: string;
  timestamp: Date;
  question?: string; // Câu hỏi người dùng
}
```

### Sample Data (100 quẻ)

- Cần tạo database 100 quẻ xăm truyền thống
- Mỗi quẻ có hình ảnh minh họa đẹp mắt
- Lời giải chi tiết, dễ hiểu

## Implementation Steps

### Phase 1: Setup & Foundation (Week 1)

- [ ] Init Expo project với React Native Web support

```bash
npx create-expo-app fengshui-app --template blank-typescript
cd fengshui-app
npx expo install react-native-web react-dom @expo/webpack-config
```

- [ ] Setup NativeWind/Styled Components
- [ ] Setup Firebase
- [ ] Create design system (colors, fonts, spacing)
- [ ] Setup navigation (React Navigation)

### Phase 2: Core UI Components (Week 2)

- [ ] BambooContainer component với 3D effect
- [ ] BambooStick component
- [ ] FortuneCard component với flip animation
- [ ] AnimatedBackground component
- [ ] Setup Reanimated cho animations

### Phase 3: Screens Implementation (Week 2-3)

- [ ] HomeScreen với shake animation
- [ ] DrawStickScreen với pull-out animation
- [ ] ResultScreen với card reveal
- [ ] HistoryScreen với list view

### Phase 4: Logic & Integration (Week 3)

- [ ] Fortune service (random selection logic)
- [ ] Firebase integration
- [ ] State management setup
- [ ] Haptic & sound effects
- [ ] Share functionality

### Phase 5: Polish & Testing (Week 4)

- [ ] Optimize animations
- [ ] Add micro-interactions
- [ ] Test on iOS/Android/Web
- [ ] Performance optimization
- [ ] Add loading states
- [ ] Error handling

### Phase 6: Content & Launch (Week 4)

- [ ] Create 100 fortune entries
- [ ] Generate/design fortune images
- [ ] Write fortune descriptions
- [ ] Final testing
- [ ] Deploy web version
- [ ] Submit to App Store/Play Store

## Development Commands

### Start development

```bash
# Web (mobile viewport)
npm run web

# iOS
npm run ios

# Android
npm run android
```

### Build

```bash
# Web production
npx expo export:web

# Native builds
eas build --platform ios
eas build --platform android
```

## Web Configuration (Mobile View)

### app.json

```json
{
  "expo": {
    "web": {
      "bundler": "metro",
      "viewport": {
        "width": 375,
        "height": 812,
        "initialScale": 1,
        "maximumScale": 1,
        "userScalable": false
      }
    }
  }
}
```

### index.html meta tags

```html
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-capable" content="yes" />
```

## Design References

- Màu sắc: Đỏ (#C41E3A) + Vàng (#FFD700) - may mắn
- Font: UTM-Avo, SVN-Gilroy cho tiếng Việt
- Animation: Smooth, playful, celebratory
- Sound: Bamboo shake, success chime
- Haptic: Medium impact on shake, light on tap

## Success Metrics

- [ ] Smooth 60fps animations
- [ ] Load time < 2s on web
- [ ] App size < 50MB
- [ ] Works on iOS 13+, Android 8+
- [ ] Responsive web view (mobile-first)
- [ ] Accessibility score > 90

## Notes

- Ưu tiên trải nghiệm người dùng mượt mà
- Animation phải có ý nghĩa, không làm phiền người dùng
- Màu sắc phải hài hòa, mang lại cảm giác may mắn
- Content phải chất lượng, lời giải quẻ phải có giá trị
- Web version phải giống native app (mobile-first)

## Resources

- [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/)
- [Expo Documentation](https://docs.expo.dev/)
- [NativeWind](https://www.nativewind.dev/)
- [React Native Skia](https://shopify.github.io/react-native-skia/)
- [Firebase for React Native](https://rnfirebase.io/)

---

**Created**: 2025-12-08
**Status**: Planning
**Priority**: High
**Estimated Time**: 4 weeks
