# Quick Setup Guide for AgriDirect Flutter App

## Step-by-Step Setup

### 1. Prerequisites Check
- [ ] Flutter installed (check with `flutter doctor`)
- [ ] Android Studio installed
- [ ] Backend server running on port 5000
- [ ] Android device connected via USB OR Android emulator running

### 2. Install Dependencies
```bash
cd SIH_2025
flutter pub get
```

### 3. Configure Backend Connection

**Option A: Using Android Emulator**
- No changes needed - uses `http://10.0.2.2:5000`

**Option B: Using Physical Device**
1. Find your computer's IP:
   - Windows: Open Command Prompt, type `ipconfig`, find IPv4 Address
   - Mac/Linux: Open Terminal, type `ifconfig`, find inet address
2. Edit `lib/services/api_service.dart`:
   ```dart
   static const String baseUrl = 'http://YOUR_IP_HERE:5000';
   ```
   Example: `http://192.168.1.100:5000`

### 4. Enable USB Debugging (Physical Device Only)
1. On your Android phone:
   - Settings > About Phone
   - Tap "Build Number" 7 times
   - Go back to Settings > Developer Options
   - Enable "USB Debugging"
2. Connect phone via USB
3. Accept the USB debugging prompt on your phone

### 5. Run the App

```bash
# Check if device is detected
flutter devices

# Run the app
flutter run
```

### 6. First Launch
- The app will show a splash screen
- Select your role (Farmer, Consumer, Distributor, or Retailer)
- Sign up or login
- Start using the app!

## Troubleshooting

### "No devices found"
- Make sure USB debugging is enabled
- Try different USB cable/port
- Run `adb devices` to check device connection

### "Connection refused" or "Network error"
- Check backend server is running: `npm start` in your backend directory
- Verify IP address is correct (for physical device)
- Check firewall isn't blocking port 5000
- Ensure phone and computer are on same WiFi network

### Build Errors
```bash
flutter clean
flutter pub get
flutter run
```

### Permission Denied
- Grant permissions manually in phone Settings > Apps > AgriDirect > Permissions

## Testing the Connection

1. Start your backend server:
   ```bash
   cd SIH_2025
   npm start
   ```

2. Verify server is accessible:
   - Emulator: Open browser in emulator, go to `http://10.0.2.2:5000`
   - Physical device: Open browser on phone, go to `http://YOUR_IP:5000`

3. If you see your backend response, connection is working!

## Building APK for Installation

To create an APK file you can install directly:

```bash
flutter build apk --release
```

APK location: `build/app/outputs/flutter-apk/app-release.apk`

Transfer this file to your phone and install it.

## Need Help?

- Check Flutter docs: https://flutter.dev/docs
- Check backend is running and accessible
- Verify all dependencies are installed: `flutter pub get`










