import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/user_model.dart';
import '../services/api_service.dart';

class AuthProvider with ChangeNotifier {
  User? _user;
  bool _isLoading = false;
  String? _error;

  User? get user => _user;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get isAuthenticated => _user != null;

  final ApiService _apiService = ApiService();

  Future<bool> login({
    required String role,
    required String email,
    required String password,
    String? name,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      Map<String, dynamic> response;

      switch (role) {
        case 'farmer':
          response = await _apiService.farmerLogin(email, password);
          if (response['status'] == 'success') {
            _user = User(
              id: response['farmerId'],
              name: response['farmerName'] ?? '',
              email: email,
              role: 'farmer',
            );
          }
          break;
        case 'consumer':
          response = await _apiService.consumerLogin(
            name ?? '',
            email,
            password,
          );
          if (response['success'] == true) {
            _user = User.fromJson(response['consumer'], 'consumer');
          }
          break;
        case 'distributor':
          response = await _apiService.distributorLogin(email, password);
          if (response['status'] == 'success') {
            _user = User(
              id: response['distributorId'],
              name: response['distributorName'] ?? '',
              email: email,
              role: 'distributor',
            );
          }
          break;
        case 'retailer':
          response = await _apiService.retailerLogin(email, password);
          if (response['status'] == 'success') {
            _user = User(
              id: response['retailerId'],
              name: response['retailerName'] ?? '',
              email: email,
              role: 'retailer',
            );
          }
          break;
        default:
          throw Exception('Invalid role');
      }

      if (_user != null) {
        await _saveSession();
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        _error = response['message'] ?? 'Login failed';
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

  Future<bool> register({
    required String role,
    required String name,
    required String email,
    required String password,
    String? mobile,
    String? farmName,
    String? location,
    int? experience,
    String? companyName,
    String? shopName,
    String? certificatePath,
    String? qrCodePath,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      Map<String, dynamic> response;

      switch (role) {
        case 'farmer':
          response = await _apiService.farmerRegister(
            name: name,
            farmName: farmName ?? '',
            location: location ?? '',
            mobile: mobile ?? '',
            experience: experience ?? 0,
            email: email,
            password: password,
            certificatePath: certificatePath,
            qrCodePath: qrCodePath,
          );
          break;
        case 'consumer':
          response = await _apiService.consumerRegister(
            name: name,
            email: email,
            mobile: mobile ?? '',
            password: password,
          );
          break;
        case 'distributor':
          response = await _apiService.distributorRegister(
            name: name,
            companyName: companyName ?? '',
            location: location ?? '',
            email: email,
            mobile: mobile ?? '',
            password: password,
            qrCodePath: qrCodePath,
          );
          break;
        case 'retailer':
          response = await _apiService.retailerRegister(
            name: name,
            shopName: shopName ?? '',
            location: location ?? '',
            email: email,
            mobile: mobile ?? '',
            password: password,
          );
          break;
        default:
          throw Exception('Invalid role');
      }

      if (response['status'] == 'success' || response['success'] == true) {
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        _error = response['message'] ?? 'Registration failed';
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

  Future<void> logout() async {
    _user = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
    notifyListeners();
  }

  Future<void> _saveSession() async {
    if (_user == null) return;
    
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('isLoggedIn', true);
    await prefs.setString('userId', _user!.id);
    await prefs.setString('userRole', _user!.role);
    await prefs.setString('userName', _user!.name);
    await prefs.setString('userEmail', _user!.email);
  }

  Future<void> restoreSession(String userId, String role) async {
    final prefs = await SharedPreferences.getInstance();
    _user = User(
      id: userId,
      name: prefs.getString('userName') ?? '',
      email: prefs.getString('userEmail') ?? '',
      role: role,
    );
    notifyListeners();
  }
}










