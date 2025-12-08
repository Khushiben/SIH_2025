# AgriDirect Flutter Project Structure

## Complete Project Tree

```
SIH_2025/
│
├── 📱 FLUTTER APP FILES
│   │
│   ├── lib/                                    # Main Flutter source code
│   │   ├── main.dart                          # App entry point & splash screen
│   │   │
│   │   ├── models/                            # Data models
│   │   │   ├── user_model.dart                # User data model
│   │   │   ├── product_model.dart             # Product data model
│   │   │   └── order_model.dart               # Order data model
│   │   │
│   │   ├── providers/                         # State management (Provider pattern)
│   │   │   ├── auth_provider.dart             # Authentication state
│   │   │   ├── product_provider.dart          # Product state management
│   │   │   └── order_provider.dart            # Order state management
│   │   │
│   │   ├── services/                          # API & external services
│   │   │   └── api_service.dart               # HTTP client & API calls
│   │   │
│   │   └── screens/                           # UI Screens
│   │       │
│   │       ├── auth/                          # Authentication screens
│   │       │   ├── role_selection_screen.dart # Role selection (Farmer/Consumer/etc)
│   │       │   ├── login_screen.dart          # Login screen for all roles
│   │       │   └── signup_screen.dart         # Registration screen
│   │       │
│   │       ├── home/                          # Dashboard screens
│   │       │   ├── home_screen.dart          # Main home/router screen
│   │       │   ├── farmer_dashboard.dart      # Farmer dashboard
│   │       │   ├── consumer_dashboard.dart   # Consumer dashboard
│   │       │   ├── distributor_dashboard.dart # Distributor dashboard
│   │       │   └── retailer_dashboard.dart    # Retailer dashboard
│   │       │
│   │       ├── products/                      # Product management
│   │       │   ├── add_product_screen.dart    # Add new product (Farmer)
│   │       │   ├── my_products_screen.dart    # View farmer's products
│   │       │   └── product_list_screen.dart  # Browse all products (Consumer)
│   │       │
│   │       ├── orders/                       # Order management
│   │       │   ├── checkout_screen.dart      # Place order screen
│   │       │   └── distributor_orders_screen.dart # View orders (Distributor)
│   │       │
│   │       └── marketplace/                  # Marketplace features
│   │           ├── marketplace_screen.dart     # Browse marketplace
│   │           └── add_marketplace_product_screen.dart # Add to marketplace
│   │
│   ├── android/                               # Android platform files
│   │   ├── app/
│   │   │   ├── build.gradle                   # App-level Gradle config
│   │   │   └── src/
│   │   │       └── main/
│   │   │           ├── AndroidManifest.xml   # Android permissions & config
│   │   │           └── kotlin/
│   │   │               └── com/
│   │   │                   └── agridirect/
│   │   │                       └── app/
│   │   │                           └── MainActivity.kt # Android entry point
│   │   ├── build.gradle                      # Project-level Gradle config
│   │   ├── settings.gradle                   # Gradle settings
│   │   └── gradle.properties                  # Gradle properties
│   │
│   ├── pubspec.yaml                           # Flutter dependencies & config
│   ├── .gitignore                             # Git ignore rules
│   │
│   └── 📄 DOCUMENTATION
│       ├── README_FLUTTER.md                  # Main Flutter documentation
│       ├── SETUP_INSTRUCTIONS.md              # Step-by-step setup guide
│       ├── DEPLOYMENT_GUIDE.md                # Deployment instructions
│       └── PROJECT_STRUCTURE.md               # This file
│
└── 🌐 ORIGINAL WEB PROJECT FILES (unchanged)
    ├── server.js                              # Express backend server
    ├── app.js                                 # Frontend server
    ├── package.json                           # Node.js dependencies
    ├── public/                                # Web frontend files
    ├── routes/                                # API routes
    ├── services/                              # Backend services
    ├── models/                                # Database models
    └── blockchain/                            # Blockchain contracts
```

## File Count Summary

### Flutter App Files
- **Dart Files**: 23 files
  - 1 main entry point
  - 3 models
  - 3 providers
  - 1 service
  - 15 screens

- **Android Files**: 5 files
  - 1 manifest
  - 1 MainActivity
  - 3 Gradle configs

- **Config Files**: 3 files
  - pubspec.yaml
  - .gitignore
  - Documentation files

## Directory Breakdown

### `/lib` - Main Application Code
```
lib/
├── main.dart                    # App initialization, splash, routing
├── models/                      # Data structures
├── providers/                   # State management
├── services/                    # API communication
└── screens/                     # User interface
    ├── auth/                   # Authentication flow
    ├── home/                   # Dashboards
    ├── products/              # Product management
    ├── orders/                 # Order processing
    └── marketplace/           # Marketplace features
```

### `/android` - Android Platform
```
android/
├── app/                        # App-specific Android code
│   ├── build.gradle           # App build configuration
│   └── src/main/
│       ├── AndroidManifest.xml # Permissions, app config
│       └── kotlin/            # Kotlin entry point
├── build.gradle               # Project build config
├── settings.gradle            # Gradle settings
└── gradle.properties          # Gradle properties
```

## Key Files Explained

### Core Files
- **`lib/main.dart`**: App entry point, initializes providers, handles routing
- **`lib/services/api_service.dart`**: All HTTP requests to backend API
- **`pubspec.yaml`**: Flutter dependencies and project metadata

### Models
- **`user_model.dart`**: User data structure (all roles)
- **`product_model.dart`**: Product information structure
- **`order_model.dart`**: Order data structure

### Providers (State Management)
- **`auth_provider.dart`**: Handles login, signup, session management
- **`product_provider.dart`**: Manages product list, add/delete operations
- **`order_provider.dart`**: Handles order placement and retrieval

### Screens by Feature

#### Authentication (`lib/screens/auth/`)
- Role selection → Login → Signup flow
- Supports all 4 user types

#### Dashboards (`lib/screens/home/`)
- Role-specific dashboards with navigation
- Quick actions and overview

#### Products (`lib/screens/products/`)
- Add products (Farmer)
- View own products (Farmer)
- Browse all products (Consumer)

#### Orders (`lib/screens/orders/`)
- Checkout process
- Order viewing (Distributor)

#### Marketplace (`lib/screens/marketplace/`)
- Browse marketplace products
- Add products to marketplace

## Dependencies (from pubspec.yaml)

### UI & Navigation
- `flutter` (SDK)
- `cupertino_icons`
- `flutter_svg`

### State Management
- `provider`

### HTTP & API
- `http`
- `dio`

### Storage
- `shared_preferences`

### Image Handling
- `image_picker`
- `cached_network_image`

### QR Code
- `qr_flutter`
- `qr_code_scanner`

### Utilities
- `intl`
- `url_launcher`
- `file_picker`
- `path_provider`

## Android Configuration

### Permissions (AndroidManifest.xml)
- ✅ Internet access
- ✅ Camera access
- ✅ Read/Write external storage
- ✅ Network state access

### Build Configuration
- **Min SDK**: 21 (Android 5.0+)
- **Target SDK**: 34 (Android 14)
- **Package**: `com.agridirect.app`
- **Kotlin**: Enabled

## Project Statistics

- **Total Dart Files**: 23
- **Total Screens**: 15
- **Models**: 3
- **Providers**: 3
- **Services**: 1
- **Android Files**: 5
- **Documentation Files**: 4

## Navigation Flow

```
Splash Screen
    ↓
Role Selection
    ↓
Login/Signup
    ↓
Home Screen (Role-based routing)
    ↓
├── Farmer Dashboard
│   ├── Add Product
│   └── My Products
│
├── Consumer Dashboard
│   ├── Browse Products
│   └── Marketplace
│
├── Distributor Dashboard
│   ├── View Orders
│   └── Add to Marketplace
│
└── Retailer Dashboard
    └── (Features coming soon)
```

## Backend Integration

The Flutter app connects to your existing Node.js backend:
- **Base URL**: `http://10.0.2.2:5000` (emulator)
- **Base URL**: `http://YOUR_IP:5000` (physical device)
- **API Endpoints**: All endpoints from `server.js` are accessible via `api_service.dart`

## Next Steps

1. Run `flutter pub get` to install dependencies
2. Update backend URL in `lib/services/api_service.dart` if using physical device
3. Run `flutter run` to launch the app
4. See `SETUP_INSTRUCTIONS.md` for detailed setup

---

**Note**: Your original web project files remain untouched. The Flutter app is a parallel implementation that uses the same backend API.










