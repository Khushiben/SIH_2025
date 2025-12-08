import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../auth/role_selection_screen.dart';
import 'farmer_dashboard.dart';
import 'consumer_dashboard.dart';
import 'distributor_dashboard.dart';
import 'retailer_dashboard.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final user = authProvider.user;

    if (user == null) {
      return const RoleSelectionScreen();
    }

    Widget dashboard;
    switch (user.role) {
      case 'farmer':
        dashboard = const FarmerDashboard();
        break;
      case 'consumer':
        dashboard = const ConsumerDashboard();
        break;
      case 'distributor':
        dashboard = const DistributorDashboard();
        break;
      case 'retailer':
        dashboard = const RetailerDashboard();
        break;
      default:
        dashboard = const RoleSelectionScreen();
    }

    return dashboard;
  }
}










