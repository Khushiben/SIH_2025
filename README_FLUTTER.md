# AgriDirect Flutter Android App

This is the Flutter Android version of the AgriDirect agricultural supply chain management system.

## Prerequisites

1. **Flutter SDK**: Install Flutter from [flutter.dev](https://flutter.dev/docs/get-started/install)
2. **Android Studio**: For Android development
3. **Backend Server**: Make sure your Node.js backend server is running on `http://localhost:5000`

## Setup Instructions

### 1. Install Dependencies

```bash
flutter pub get
```

### 2. Configure Backend URL

The app is configured to connect to `http://10.0.2.2:5000` by default (Android emulator).

**For Physical Device:**
1. Find your computer's IP address:
   - Windows: `ipconfig` in Command Prompt
   - Mac/Linux: `ifconfig` in Terminal
2. Update the base URL in `lib/services/api_service.dart`:
   ```dart
   static const String baseUrl = 'http://YOUR_IP_ADDRESS:5000';
   ```
3. Make sure your phone and computer are on the same WiFi network
4. Ensure your backend server allows connections from your network

### 3. Update Android Configuration

The Android manifest is already configured with necessary permissions. Make sure:
- Internet permission is enabled (already done)
- Camera permission is enabled (already done)
- Storage permissions are enabled (already done)

### 4. Run the App

**For Android Emulator:**
```bash
flutter run
```

**For Physical Device via USB:**
1. Enable Developer Options on your Android phone:
   - Go to Settings > About Phone
   - Tap "Build Number" 7 times
2. Enable USB Debugging:
   - Settings > Developer Options > USB Debugging
3. Connect your phone via USB cable
4. Run:
   ```bash
   flutter devices  # Verify device is detected
   flutter run
   ```

## Project Structure

```
lib/
├── main.dart                 # App entry point
├── models/                   # Data models
│   ├── user_model.dart
│   ├── product_model.dart
│   └── order_model.dart
├── providers/                # State management
│   ├── auth_provider.dart
│   ├── product_provider.dart
│   └── order_provider.dart
├── screens/                  # UI screens
│   ├── auth/                 # Authentication screens
│   ├── home/                 # Dashboard screens
│   ├── products/             # Product management
│   ├── orders/               # Order management
│   └── marketplace/          # Marketplace screens
└── services/                 # API services
    └── api_service.dart
```

## Features

### User Roles
- **Farmer**: Add products, manage inventory, view orders
- **Consumer**: Browse products, place orders, view marketplace
- **Distributor**: View orders, add products to marketplace
- **Retailer**: Manage shop inventory

### Key Features
- User authentication (Login/Signup)
- Product management with images
- Order placement and tracking
- Marketplace browsing
- QR code support
- Image uploads

## Troubleshooting

### Connection Issues
- **Emulator**: Use `http://10.0.2.2:5000`
- **Physical Device**: Use your computer's IP address
- Ensure backend server is running
- Check firewall settings

### Build Issues
```bash
flutter clean
flutter pub get
flutter run
```

### Permission Issues
- Check AndroidManifest.xml has all required permissions
- Grant permissions manually in device settings if needed

## Building APK for Distribution

```bash
flutter build apk --release
```

The APK will be in: `build/app/outputs/flutter-apk/app-release.apk`

## Notes

- The app uses Provider for state management
- Images are cached using `cached_network_image`
- File uploads use `image_picker` and `dio` for multipart requests
- Backend API must be running and accessible from the device

## Backend Requirements

Make sure your backend server:
1. Is running on port 5000
2. Has CORS enabled for mobile requests
3. Has all the API endpoints implemented
4. MongoDB is running and connected

## Support

For issues or questions, check:
- Flutter documentation: https://flutter.dev/docs
- Backend API documentation in the original project










