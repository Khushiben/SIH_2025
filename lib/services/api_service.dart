import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ApiService {
  static const String baseUrl = 'http://10.0.2.2:5000'; // Android emulator
  // For physical device, use your computer's IP: 'http://192.168.x.x:5000'
  
  late Dio _dio;

  ApiService() {
    _dio = Dio(BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(seconds: 30),
      headers: {
        'Content-Type': 'application/json',
      },
    ));

    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final prefs = await SharedPreferences.getInstance();
        final token = prefs.getString('authToken');
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
      },
      onError: (error, handler) {
        print('API Error: ${error.message}');
        return handler.next(error);
      },
    ));
  }

  // Update base URL for physical device
  void updateBaseUrl(String newUrl) {
    _dio.options.baseUrl = newUrl;
  }

  // ==================== AUTHENTICATION ====================
  
  // Farmer Auth
  Future<Map<String, dynamic>> farmerRegister({
    required String name,
    required String farmName,
    required String location,
    required String mobile,
    required int experience,
    required String email,
    required String password,
    String? certificatePath,
    String? qrCodePath,
  }) async {
    try {
      FormData formData = FormData.fromMap({
        'name': name,
        'farmName': farmName,
        'location': location,
        'mobile': mobile,
        'experience': experience,
        'email': email,
        'password': password,
      });

      if (certificatePath != null) {
        formData.files.add(MapEntry(
          'certificate',
          await MultipartFile.fromFile(certificatePath),
        ));
      }

      if (qrCodePath != null) {
        formData.files.add(MapEntry(
          'qrCode',
          await MultipartFile.fromFile(qrCodePath),
        ));
      }

      final response = await _dio.post('/farmer/register', data: formData);
      return response.data;
    } catch (e) {
      throw _handleError(e);
    }
  }

  Future<Map<String, dynamic>> farmerLogin(String email, String password) async {
    try {
      final response = await _dio.post('/farmer/login', data: {
        'email': email,
        'password': password,
      });
      return response.data;
    } catch (e) {
      throw _handleError(e);
    }
  }

  // Consumer Auth
  Future<Map<String, dynamic>> consumerRegister({
    required String name,
    required String email,
    required String mobile,
    required String password,
  }) async {
    try {
      final response = await _dio.post('/consumer/register', data: {
        'name': name,
        'email': email,
        'mobile': mobile,
        'password': password,
      });
      return response.data;
    } catch (e) {
      throw _handleError(e);
    }
  }

  Future<Map<String, dynamic>> consumerLogin(String name, String email, String password) async {
    try {
      final response = await _dio.post('/consumer/login', data: {
        'name': name,
        'email': email,
        'password': password,
      });
      return response.data;
    } catch (e) {
      throw _handleError(e);
    }
  }

  // Distributor Auth
  Future<Map<String, dynamic>> distributorRegister({
    required String name,
    required String companyName,
    required String location,
    required String email,
    required String mobile,
    required String password,
    String? qrCodePath,
  }) async {
    try {
      FormData formData = FormData.fromMap({
        'name': name,
        'companyName': companyName,
        'location': location,
        'email': email,
        'mobile': mobile,
        'password': password,
      });

      if (qrCodePath != null) {
        formData.files.add(MapEntry(
          'qrCode',
          await MultipartFile.fromFile(qrCodePath),
        ));
      }

      final response = await _dio.post('/distributor/register', data: formData);
      return response.data;
    } catch (e) {
      throw _handleError(e);
    }
  }

  Future<Map<String, dynamic>> distributorLogin(String email, String password) async {
    try {
      final response = await _dio.post('/distributor/login', data: {
        'email': email,
        'password': password,
      });
      return response.data;
    } catch (e) {
      throw _handleError(e);
    }
  }

  // Retailer Auth
  Future<Map<String, dynamic>> retailerRegister({
    required String name,
    required String shopName,
    required String location,
    required String email,
    required String mobile,
    required String password,
  }) async {
    try {
      final response = await _dio.post('/retailer/register', data: {
        'name': name,
        'shopName': shopName,
        'location': location,
        'email': email,
        'mobile': mobile,
        'password': password,
      });
      return response.data;
    } catch (e) {
      throw _handleError(e);
    }
  }

  Future<Map<String, dynamic>> retailerLogin(String email, String password) async {
    try {
      final response = await _dio.post('/retailer/login', data: {
        'email': email,
        'password': password,
      });
      return response.data;
    } catch (e) {
      throw _handleError(e);
    }
  }

  // ==================== PRODUCTS ====================

  Future<Map<String, dynamic>> addProduct({
    required String farmerId,
    required String name,
    required String category,
    required double price,
    required double quantity,
    required String location,
    String? harvestDate,
    double? moisture,
    double? protein,
    double? pesticide,
    double? ph,
    List<String>? preferences,
    String? imagePath,
    String? labReportPath,
  }) async {
    try {
      FormData formData = FormData.fromMap({
        'name': name,
        'category': category,
        'price': price,
        'quantity': quantity,
        'location': location,
        if (harvestDate != null) 'harvestDate': harvestDate,
        if (moisture != null) 'moisture': moisture,
        if (protein != null) 'protein': protein,
        if (pesticide != null) 'pesticide': pesticide,
        if (ph != null) 'ph': ph,
        if (preferences != null) 'preferences': jsonEncode(preferences),
      });

      if (imagePath != null) {
        formData.files.add(MapEntry(
          'image',
          await MultipartFile.fromFile(imagePath),
        ));
      }

      if (labReportPath != null) {
        formData.files.add(MapEntry(
          'labReport',
          await MultipartFile.fromFile(labReportPath),
        ));
      }

      final response = await _dio.post(
        '/farmer/addProduct/$farmerId',
        data: formData,
      );
      return response.data;
    } catch (e) {
      throw _handleError(e);
    }
  }

  Future<List<dynamic>> getProducts({
    String? category,
    double? minPrice,
    double? maxPrice,
    String? location,
    List<String>? preferences,
    String? sortBy,
  }) async {
    try {
      final queryParams = <String, dynamic>{};
      if (category != null) queryParams['category'] = category;
      if (minPrice != null) queryParams['minPrice'] = minPrice;
      if (maxPrice != null) queryParams['maxPrice'] = maxPrice;
      if (location != null) queryParams['location'] = location;
      if (preferences != null) queryParams['preferences'] = preferences.join(',');
      if (sortBy != null) queryParams['sortBy'] = sortBy;

      final response = await _dio.get('/products', queryParameters: queryParams);
      return response.data['products'] ?? [];
    } catch (e) {
      throw _handleError(e);
    }
  }

  Future<List<dynamic>> getFarmerProducts(String farmerId) async {
    try {
      final response = await _dio.get('/farmer/getProducts/$farmerId');
      return response.data['products'] ?? [];
    } catch (e) {
      throw _handleError(e);
    }
  }

  Future<Map<String, dynamic>> deleteProduct(String productId) async {
    try {
      final response = await _dio.delete('/farmer/deleteProduct/$productId');
      return response.data;
    } catch (e) {
      throw _handleError(e);
    }
  }

  // ==================== ORDERS ====================

  Future<Map<String, dynamic>> placeOrder({
    required String distributorId,
    required String distributorName,
    required String distributorEmail,
    required String farmerId,
    required String productId,
    required String productName,
    required double unitPrice,
    required double quantity,
    required double totalPrice,
    required String address,
    required String paymentMethod,
  }) async {
    try {
      final response = await _dio.post('/orders', data: {
        'distributorId': distributorId,
        'distributorName': distributorName,
        'distributorEmail': distributorEmail,
        'farmerId': farmerId,
        'productId': productId,
        'productName': productName,
        'unitPrice': unitPrice,
        'quantity': quantity,
        'totalPrice': totalPrice,
        'address': address,
        'paymentMethod': paymentMethod,
      });
      return response.data;
    } catch (e) {
      throw _handleError(e);
    }
  }

  Future<List<dynamic>> getDistributorOrders(String distributorId) async {
    try {
      final response = await _dio.get('/distributor/ordersToFarmer/$distributorId');
      return response.data['orders'] ?? [];
    } catch (e) {
      throw _handleError(e);
    }
  }

  // ==================== DISTRIBUTORS ====================

  Future<List<dynamic>> getDistributors() async {
    try {
      final response = await _dio.get('/distributors');
      return response.data['distributors'] ?? [];
    } catch (e) {
      throw _handleError(e);
    }
  }

  // ==================== MARKETPLACE ====================

  Future<List<dynamic>> getMarketplaceProducts() async {
    try {
      final response = await _dio.get('/marketplace/all');
      return response.data['products'] ?? [];
    } catch (e) {
      throw _handleError(e);
    }
  }

  // ==================== AI CHAT ====================

  Future<Map<String, dynamic>> aiChat({
    required String query,
    String? imagePath,
    String? translate,
  }) async {
    try {
      FormData formData = FormData.fromMap({
        'query': query,
        if (translate != null) 'translate': translate,
      });

      if (imagePath != null) {
        formData.files.add(MapEntry(
          'image',
          await MultipartFile.fromFile(imagePath),
        ));
      }

      final response = await _dio.post('/api/ai/chat', data: formData);
      return response.data;
    } catch (e) {
      throw _handleError(e);
    }
  }

  // ==================== UTILITIES ====================

  String _handleError(dynamic error) {
    if (error is DioException) {
      if (error.response != null) {
        return error.response?.data['message'] ?? 'An error occurred';
      } else {
        return error.message ?? 'Network error. Please check your connection.';
      }
    }
    return error.toString();
  }
}

