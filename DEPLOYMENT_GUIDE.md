# Deployment Guide - AgriDirect Flutter App

## Quick Start for Physical Device Deployment

### Prerequisites
1. ✅ Flutter SDK installed
2. ✅ Android device with USB debugging enabled
3. ✅ Backend server running on your computer
4. ✅ Phone and computer on same WiFi network

### Step 1: Configure Backend URL

1. Find your computer's IP address:
   ```bash
   # Windows
   ipconfig
   # Look for "IPv4 Address" under your active network adapter
   
   # Mac/Linux
   ifconfig
   # Look for "inet" address
   ```

2. Update `lib/services/api_service.dart`:
   ```dart
   static const String baseUrl = 'http://YOUR_IP:5000';
   ```
   Example: `http://192.168.1.105:5000`

### Step 2: Start Backend Server

```bash
cd SIH_2025
npm start
```

Verify it's running by opening `http://localhost:5000` in your browser.

### Step 3: Connect Your Phone

1. **Enable Developer Mode:**
   - Settings > About Phone
   - Tap "Build Number" 7 times
   - Go back to Settings > Developer Options
   - Enable "USB Debugging"

2. **Connect via USB:**
   - Connect phone to computer with USB cable
   - Accept "Allow USB Debugging" prompt on phone
   - Verify connection:
     ```bash
     flutter devices
     ```
     You should see your device listed

### Step 4: Run the App

```bash
flutter run
```

The app will install and launch on your phone!

## Alternative: Build APK for Manual Installation

### Build Release APK

```bash
flutter build apk --release
```

### Install APK

1. APK location: `build/app/outputs/flutter-apk/app-release.apk`
2. Transfer to phone (USB, email, cloud storage)
3. On phone: Settings > Security > Enable "Install from Unknown Sources"
4. Open the APK file and install

## Network Configuration

### For Emulator
- Uses `http://10.0.2.2:5000` (already configured)
- No changes needed

### For Physical Device
- Must use your computer's actual IP address
- Both devices must be on same WiFi network
- Backend must allow connections from your network

### Testing Connection

1. On your phone's browser, navigate to:
   `http://YOUR_COMPUTER_IP:5000`
2. If you see your backend response, connection works!

## Common Issues

### Issue: "Connection refused"
**Solution:**
- Check backend is running
- Verify IP address is correct
- Check firewall settings
- Ensure same WiFi network

### Issue: "Device not found"
**Solution:**
- Enable USB debugging
- Try different USB cable
- Run `adb devices` to check connection
- Restart ADB: `adb kill-server && adb start-server`

### Issue: "Build failed"
**Solution:**
```bash
flutter clean
flutter pub get
flutter run
```

### Issue: "Permission denied"
**Solution:**
- Grant permissions in phone Settings > Apps > AgriDirect
- Or grant when app requests them

## Production Build

For a production-ready APK:

```bash
flutter build apk --release --split-per-abi
```

This creates separate APKs for different architectures (smaller file size).

## App Signing (For Play Store)

If you plan to publish:

1. Generate keystore:
   ```bash
   keytool -genkey -v -keystore ~/upload-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
   ```

2. Create `android/key.properties`:
   ```
   storePassword=<password>
   keyPassword=<password>
   keyAlias=upload
   storeFile=<path-to-keystore>
   ```

3. Update `android/app/build.gradle` to use signing config

## Tips

- Keep backend server running while using app
- Use same WiFi network for best performance
- Test on emulator first, then physical device
- Check Flutter doctor: `flutter doctor -v`

## Support

- Flutter Docs: https://flutter.dev/docs
- Backend must be running and accessible
- All API endpoints must be working










