import 'package:flutter/foundation.dart';
import '../models/product_model.dart';
import '../services/api_service.dart';

class ProductProvider with ChangeNotifier {
  List<Product> _products = [];
  List<Product> _farmerProducts = [];
  bool _isLoading = false;
  String? _error;

  List<Product> get products => _products;
  List<Product> get farmerProducts => _farmerProducts;
  bool get isLoading => _isLoading;
  String? get error => _error;

  final ApiService _apiService = ApiService();

  Future<void> fetchProducts({
    String? category,
    double? minPrice,
    double? maxPrice,
    String? location,
    List<String>? preferences,
    String? sortBy,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final data = await _apiService.getProducts(
        category: category,
        minPrice: minPrice,
        maxPrice: maxPrice,
        location: location,
        preferences: preferences,
        sortBy: sortBy,
      );
      
      _products = data.map((json) => Product.fromJson(json)).toList();
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> fetchFarmerProducts(String farmerId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final data = await _apiService.getFarmerProducts(farmerId);
      _farmerProducts = data.map((json) => Product.fromJson(json)).toList();
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> addProduct({
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
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await _apiService.addProduct(
        farmerId: farmerId,
        name: name,
        category: category,
        price: price,
        quantity: quantity,
        location: location,
        harvestDate: harvestDate,
        moisture: moisture,
        protein: protein,
        pesticide: pesticide,
        ph: ph,
        preferences: preferences,
        imagePath: imagePath,
        labReportPath: labReportPath,
      );

      if (response['status'] == 'success') {
        await fetchFarmerProducts(farmerId);
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        _error = response['message'] ?? 'Failed to add product';
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> deleteProduct(String productId, String farmerId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await _apiService.deleteProduct(productId);
      if (response['success'] == true) {
        await fetchFarmerProducts(farmerId);
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        _error = response['message'] ?? 'Failed to delete product';
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }
}










