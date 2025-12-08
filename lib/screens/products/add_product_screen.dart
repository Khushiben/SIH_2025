import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import 'dart:io';
import '../../providers/auth_provider.dart';
import '../../providers/product_provider.dart';

class AddProductScreen extends StatefulWidget {
  const AddProductScreen({super.key});

  @override
  State<AddProductScreen> createState() => _AddProductScreenState();
}

class _AddProductScreenState extends State<AddProductScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _priceController = TextEditingController();
  final _quantityController = TextEditingController();
  final _locationController = TextEditingController();
  final _moistureController = TextEditingController();
  final _proteinController = TextEditingController();
  final _pesticideController = TextEditingController();
  final _phController = TextEditingController();

  String? _selectedCategory;
  DateTime? _harvestDate;
  File? _imageFile;
  File? _labReportFile;
  final ImagePicker _picker = ImagePicker();

  final List<String> _categories = [
    'Fruits',
    'Vegetables',
    'Grains',
    'Crops',
  ];

  @override
  void dispose() {
    _nameController.dispose();
    _priceController.dispose();
    _quantityController.dispose();
    _locationController.dispose();
    _moistureController.dispose();
    _proteinController.dispose();
    _pesticideController.dispose();
    _phController.dispose();
    super.dispose();
  }

  Future<void> _pickImage() async {
    final XFile? file = await _picker.pickImage(source: ImageSource.gallery);
    if (file != null) {
      setState(() {
        _imageFile = File(file.path);
      });
    }
  }

  Future<void> _pickLabReport() async {
    final XFile? file = await _picker.pickImage(source: ImageSource.gallery);
    if (file != null) {
      setState(() {
        _labReportFile = File(file.path);
      });
    }
  }

  Future<void> _selectHarvestDate() async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: DateTime.now(),
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
    );
    if (picked != null) {
      setState(() {
        _harvestDate = picked;
      });
    }
  }

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedCategory == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a category')),
      );
      return;
    }
    if (_imageFile == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a product image')),
      );
      return;
    }

    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final productProvider = Provider.of<ProductProvider>(context, listen: false);

    final success = await productProvider.addProduct(
      farmerId: authProvider.user!.id,
      name: _nameController.text.trim(),
      category: _selectedCategory!,
      price: double.parse(_priceController.text),
      quantity: double.parse(_quantityController.text),
      location: _locationController.text.trim(),
      harvestDate: _harvestDate?.toIso8601String(),
      moisture: _moistureController.text.isNotEmpty
          ? double.tryParse(_moistureController.text)
          : null,
      protein: _proteinController.text.isNotEmpty
          ? double.tryParse(_proteinController.text)
          : null,
      pesticide: _pesticideController.text.isNotEmpty
          ? double.tryParse(_pesticideController.text)
          : null,
      ph: _phController.text.isNotEmpty
          ? double.tryParse(_phController.text)
          : null,
      imagePath: _imageFile!.path,
      labReportPath: _labReportFile?.path,
    );

    if (mounted) {
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Product added successfully!'),
            backgroundColor: Colors.green,
          ),
        );
        Navigator.of(context).pop();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(productProvider.error ?? 'Failed to add product'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final productProvider = Provider.of<ProductProvider>(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Add Product'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              TextFormField(
                controller: _nameController,
                decoration: const InputDecoration(
                  labelText: 'Product Name',
                  border: OutlineInputBorder(),
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Please enter product name';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                value: _selectedCategory,
                decoration: const InputDecoration(
                  labelText: 'Category',
                  border: OutlineInputBorder(),
                ),
                items: _categories.map((category) {
                  return DropdownMenuItem(
                    value: category,
                    child: Text(category),
                  );
                }).toList(),
                onChanged: (value) {
                  setState(() {
                    _selectedCategory = value;
                  });
                },
                validator: (value) {
                  if (value == null) {
                    return 'Please select a category';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _priceController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        labelText: 'Price (₹)',
                        border: OutlineInputBorder(),
                      ),
                      validator: (value) {
                        if (value == null || value.isEmpty) {
                          return 'Please enter price';
                        }
                        if (double.tryParse(value) == null) {
                          return 'Please enter a valid number';
                        }
                        return null;
                      },
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: TextFormField(
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
                        if (double.tryParse(value) == null) {
                          return 'Please enter a valid number';
                        }
                        return null;
                      },
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _locationController,
                decoration: const InputDecoration(
                  labelText: 'Location',
                  border: OutlineInputBorder(),
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Please enter location';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              OutlinedButton.icon(
                onPressed: _selectHarvestDate,
                icon: const Icon(Icons.calendar_today),
                label: Text(
                  _harvestDate == null
                      ? 'Select Harvest Date'
                      : 'Harvest Date: ${_harvestDate!.toLocal().toString().split(' ')[0]}',
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _moistureController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        labelText: 'Moisture %',
                        border: OutlineInputBorder(),
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: TextFormField(
                      controller: _proteinController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        labelText: 'Protein %',
                        border: OutlineInputBorder(),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _pesticideController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        labelText: 'Pesticide (ppm)',
                        border: OutlineInputBorder(),
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: TextFormField(
                      controller: _phController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        labelText: 'Soil pH',
                        border: OutlineInputBorder(),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              OutlinedButton.icon(
                onPressed: _pickImage,
                icon: const Icon(Icons.image),
                label: const Text('Select Product Image'),
              ),
              if (_imageFile != null)
                Padding(
                  padding: const EdgeInsets.only(top: 8.0),
                  child: Image.file(_imageFile!, height: 100),
                ),
              const SizedBox(height: 16),
              OutlinedButton.icon(
                onPressed: _pickLabReport,
                icon: const Icon(Icons.description),
                label: const Text('Select Lab Report (Optional)'),
              ),
              if (_labReportFile != null)
                Padding(
                  padding: const EdgeInsets.only(top: 8.0),
                  child: Text('Selected: ${_labReportFile!.path.split('/').last}'),
                ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: productProvider.isLoading ? null : _handleSubmit,
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
                child: productProvider.isLoading
                    ? const CircularProgressIndicator()
                    : const Text('Add Product'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}










