import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/order_provider.dart';

class DistributorOrdersScreen extends StatefulWidget {
  const DistributorOrdersScreen({super.key});

  @override
  State<DistributorOrdersScreen> createState() => _DistributorOrdersScreenState();
}

class _DistributorOrdersScreenState extends State<DistributorOrdersScreen> {
  @override
  void initState() {
    super.initState();
    _loadOrders();
  }

  Future<void> _loadOrders() async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final orderProvider = Provider.of<OrderProvider>(context, listen: false);
    if (authProvider.user != null) {
      await orderProvider.fetchDistributorOrders(authProvider.user!.id);
    }
  }

  @override
  Widget build(BuildContext context) {
    final orderProvider = Provider.of<OrderProvider>(context);

    if (orderProvider.isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (orderProvider.orders.isEmpty) {
      return const Center(
        child: Text('No orders yet'),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadOrders,
      child: ListView.builder(
        padding: const EdgeInsets.all(16.0),
        itemCount: orderProvider.orders.length,
        itemBuilder: (context, index) {
          final order = orderProvider.orders[index];
          return Card(
            margin: const EdgeInsets.only(bottom: 16),
            child: ListTile(
              title: Text(order.productName),
              subtitle: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Quantity: ${order.quantity} kg'),
                  Text('Total: ₹${order.totalPrice.toStringAsFixed(2)}'),
                  Text('Address: ${order.address}'),
                  Text('Date: ${order.orderDate.toLocal().toString().split(' ')[0]}'),
                ],
              ),
              trailing: Chip(
                label: Text(order.paymentMethod.toUpperCase()),
                backgroundColor: order.paymentMethod == 'cod'
                    ? Colors.orange.shade100
                    : Colors.blue.shade100,
              ),
            ),
          );
        },
      ),
    );
  }
}










