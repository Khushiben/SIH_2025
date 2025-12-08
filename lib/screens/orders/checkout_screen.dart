import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/product_model.dart';
import '../../providers/order_provider.dart';
import '../../services/api_service.dart';

class CheckoutScreen extends StatefulWidget {
  final Product product;

  const CheckoutScreen({super.key, required this.product});

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  final _formKey = GlobalKey<FormState>();
  final _quantityController = TextEditingController(text: '1');
  final _addressController = TextEditingController();
  String _paymentMethod = 'cod';
  String? _selectedDistributorId;
  List<dynamic> _distributors = [];

  final ApiService _apiService = ApiService();

  @override
  void initState() {
    super.initState();
    _loadDistributors();
  }

  @override
  void dispose() {
    _quantityController.dispose();
    _addressController.dispose();
    super.dispose();
  }

  Future<void> _loadDistributors() async {
    try {
      final distributors = await _apiService.getDistributors();
      setState(() {
        _distributors = distributors;
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading distributors: $e')),
        );
      }
    }
  }

  Future<void> _handleCheckout() async {
    if (!_formKey.currentState!.validate()) return;

    final quantity = double.parse(_quantityController.text);
    if (quantity > widget.product.quantity) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Quantity exceeds available stock')),
      );
      return;
    }

    if (_selectedDistributorId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a distributor')),
      );
      return;
    }

    final selectedDistributor = _distributors.firstWhere(
      (d) => d['_id'] == _selectedDistributorId,
    );

    final orderProvider = Provider.of<OrderProvider>(context, listen: false);

    final success = await orderProvider.placeOrder(
      distributorId: _selectedDistributorId!,
      distributorName: selectedDistributor['name'] ?? '',
      distributorEmail: selectedDistributor['email'] ?? '',
      farmerId: widget.product.farmerId,
      productId: widget.product.id,
      productName: widget.product.name,
      unitPrice: widget.product.price,
      quantity: quantity,
      totalPrice: widget.product.price * quantity,
      address: _addressController.text.trim(),
      paymentMethod: _paymentMethod,
    );

    if (mounted) {
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Order placed successfully!'),
            backgroundColor: Colors.green,
          ),
        );
        Navigator.of(context).pop();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(orderProvider.error ?? 'Failed to place order'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final quantity = double.tryParse(_quantityController.text) ?? 1;
    final totalPrice = widget.product.price * quantity;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Checkout'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        widget.product.name,
                        style: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text('Price: ₹${widget.product.price.toStringAsFixed(2)} per kg'),
                      Text('Available: ${widget.product.quantity} kg'),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _quantityController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'Quantity (kg)',
                  border: OutlineInputBorder(),
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Please enter quantity';
                  }
                  final qty = double.tryParse(value);
                  if (qty == null || qty <= 0) {
                    return 'Please enter a valid quantity';
                  }
                  if (qty > widget.product.quantity) {
                    return 'Quantity exceeds available stock';
                  }
                  return null;
                },
                onChanged: (_) => setState(() {}),
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                value: _selectedDistributorId,
                decoration: const InputDecoration(
                  labelText: 'Select Distributor',
                  border: OutlineInputBorder(),
                ),
                items: _distributors.map((distributor) {
                  return DropdownMenuItem(
                    value: distributor['_id']?.toString(),
                    child: Text(distributor['name'] ?? 'Unknown'),
                  );
                }).toList(),
                onChanged: (value) {
                  setState(() {
                    _selectedDistributorId = value;
                  });
                },
                validator: (value) {
                  if (value == null) {
                    return 'Please select a distributor';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _addressController,
                maxLines: 3,
                decoration: const InputDecoration(
                  labelText: 'Delivery Address',
                  border: OutlineInputBorder(),
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Please enter delivery address';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              const Text('Payment Method'),
              RadioListTile<String>(
                title: const Text('Cash on Delivery'),
                value: 'cod',
                groupValue: _paymentMethod,
                onChanged: (value) {
                  setState(() {
                    _paymentMethod = value!;
                  });
                },
              ),
              RadioListTile<String>(
                title: const Text('QR Code'),
                value: 'qr',
                groupValue: _paymentMethod,
                onChanged: (value) {
                  setState(() {
                    _paymentMethod = value!;
                  });
                },
              ),
              const SizedBox(height: 24),
              Card(
                color: Colors.green.shade50,
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Total Amount:',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        '₹${totalPrice.toStringAsFixed(2)}',
                        style: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: Colors.green,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: _handleCheckout,
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
                child: const Text('Place Order'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

