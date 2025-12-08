import 'package:flutter/foundation.dart';
import '../models/order_model.dart';
import '../services/api_service.dart';

class OrderProvider with ChangeNotifier {
  List<Order> _orders = [];
  bool _isLoading = false;
  String? _error;

  List<Order> get orders => _orders;
  bool get isLoading => _isLoading;
  String? get error => _error;

  final ApiService _apiService = ApiService();

  Future<bool> placeOrder({
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
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await _apiService.placeOrder(
        distributorId: distributorId,
        distributorName: distributorName,
        distributorEmail: distributorEmail,
        farmerId: farmerId,
        productId: productId,
        productName: productName,
        unitPrice: unitPrice,
        quantity: quantity,
        totalPrice: totalPrice,
        address: address,
        paymentMethod: paymentMethod,
      );

      if (response['success'] == true) {
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        _error = response['message'] ?? 'Failed to place order';
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

  Future<void> fetchDistributorOrders(String distributorId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final data = await _apiService.getDistributorOrders(distributorId);
      _orders = data.map((json) => Order.fromJson(json)).toList();
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }
}










