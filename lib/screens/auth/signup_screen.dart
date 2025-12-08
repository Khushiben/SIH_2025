import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import 'dart:io';
import '../../providers/auth_provider.dart';
import '../../theme/app_theme.dart';

class SignupScreen extends StatefulWidget {
  final String role;

  const SignupScreen({super.key, required this.role});

  @override
  State<SignupScreen> createState() => _SignupScreenState();
}

class _SignupScreenState extends State<SignupScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  final _mobileController = TextEditingController();
  final _farmNameController = TextEditingController();
  final _locationController = TextEditingController();
  final _experienceController = TextEditingController();
  final _companyNameController = TextEditingController();
  final _shopNameController = TextEditingController();

  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;
  File? _certificateFile;
  File? _qrCodeFile;

  final ImagePicker _picker = ImagePicker();

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    _mobileController.dispose();
    _farmNameController.dispose();
    _locationController.dispose();
    _experienceController.dispose();
    _companyNameController.dispose();
    _shopNameController.dispose();
    super.dispose();
  }

  Future<void> _pickFile(bool isCertificate) async {
    final XFile? file = await _picker.pickImage(source: ImageSource.gallery);
    if (file != null) {
      setState(() {
        if (isCertificate) {
          _certificateFile = File(file.path);
        } else {
          _qrCodeFile = File(file.path);
        }
      });
    }
  }

  Future<void> _handleSignup() async {
    if (!_formKey.currentState!.validate()) return;

    if (_passwordController.text != _confirmPasswordController.text) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Passwords do not match'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    final authProvider = Provider.of<AuthProvider>(context, listen: false);

    final success = await authProvider.register(
      role: widget.role,
      name: _nameController.text.trim(),
      email: _emailController.text.trim(),
      password: _passwordController.text,
      mobile: _mobileController.text.trim().isEmpty
          ? null
          : _mobileController.text.trim(),
      farmName: widget.role == 'farmer'
          ? _farmNameController.text.trim()
          : null,
      location: _locationController.text.trim().isEmpty
          ? null
          : _locationController.text.trim(),
      experience: widget.role == 'farmer' &&
              _experienceController.text.trim().isNotEmpty
          ? int.tryParse(_experienceController.text.trim())
          : null,
      companyName: widget.role == 'distributor'
          ? _companyNameController.text.trim()
          : null,
      shopName:
          widget.role == 'retailer' ? _shopNameController.text.trim() : null,
      certificatePath: _certificateFile?.path,
      qrCodePath: _qrCodeFile?.path,
    );

    if (mounted) {
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Registration successful! Please login.'),
            backgroundColor: Colors.green,
          ),
        );
        Navigator.of(context).pop();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(authProvider.error ?? 'Registration failed'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);

    return Scaffold(
      backgroundColor: AppTheme.backgroundLight,
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              width: 50,
              height: 50,
              decoration: BoxDecoration(
                color: AppTheme.darkGreen,
                borderRadius: BorderRadius.circular(5),
              ),
              child: const Icon(Icons.eco, color: Colors.white),
            ),
            const SizedBox(width: 10),
            const Text(
              'AgriDirect',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
          ],
        ),
      ),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Container(
            constraints: const BoxConstraints(maxWidth: 450),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.2),
                  blurRadius: 20,
                  offset: const Offset(0, 6),
                ),
              ],
            ),
            padding: const EdgeInsets.all(30.0),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    '${widget.role[0].toUpperCase()}${widget.role.substring(1)} Sign Up',
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.darkGreen,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 20),
              TextFormField(
                controller: _nameController,
                decoration: AppTheme.inputDecoration.copyWith(
                  labelText: 'Name',
                  prefixIcon: const Icon(Icons.person),
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Please enter your name';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              if (widget.role == 'farmer')
                TextFormField(
                  controller: _farmNameController,
                  decoration: AppTheme.inputDecoration.copyWith(
                    labelText: 'Farm Name',
                    prefixIcon: const Icon(Icons.agriculture),
                  ),
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'Please enter farm name';
                    }
                    return null;
                  },
                ),
              if (widget.role == 'farmer') const SizedBox(height: 16),
              if (widget.role == 'distributor')
                TextFormField(
                  controller: _companyNameController,
                  decoration: AppTheme.inputDecoration.copyWith(
                    labelText: 'Company Name',
                    prefixIcon: const Icon(Icons.business),
                  ),
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'Please enter company name';
                    }
                    return null;
                  },
                ),
              if (widget.role == 'distributor') const SizedBox(height: 16),
              if (widget.role == 'retailer')
                TextFormField(
                  controller: _shopNameController,
                  decoration: AppTheme.inputDecoration.copyWith(
                    labelText: 'Shop Name',
                    prefixIcon: const Icon(Icons.store),
                  ),
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'Please enter shop name';
                    }
                    return null;
                  },
                ),
              if (widget.role == 'retailer') const SizedBox(height: 16),
              TextFormField(
                controller: _emailController,
                keyboardType: TextInputType.emailAddress,
                decoration: AppTheme.inputDecoration.copyWith(
                  labelText: 'Email',
                  prefixIcon: const Icon(Icons.email),
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Please enter your email';
                  }
                  if (!value.contains('@')) {
                    return 'Please enter a valid email';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _mobileController,
                keyboardType: TextInputType.phone,
                decoration: AppTheme.inputDecoration.copyWith(
                  labelText: 'Mobile (Optional)',
                  prefixIcon: const Icon(Icons.phone),
                ),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _locationController,
                decoration: AppTheme.inputDecoration.copyWith(
                  labelText: 'Location (Optional)',
                  prefixIcon: const Icon(Icons.location_on),
                ),
              ),
              if (widget.role == 'farmer') ...[
                const SizedBox(height: 16),
                TextFormField(
                  controller: _experienceController,
                  keyboardType: TextInputType.number,
                  decoration: AppTheme.inputDecoration.copyWith(
                    labelText: 'Years of Experience',
                    prefixIcon: const Icon(Icons.calendar_today),
                  ),
                ),
              ],
              if (widget.role == 'farmer') ...[
                const SizedBox(height: 16),
                OutlinedButton.icon(
                  onPressed: () => _pickFile(true),
                  icon: const Icon(Icons.upload_file),
                  label: const Text('Upload Certificate (Optional)'),
                ),
                if (_certificateFile != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 8.0),
                    child: Text(
                      'Selected: ${_certificateFile!.path.split('/').last}',
                      style: TextStyle(color: Colors.green.shade700),
                    ),
                  ),
              ],
              if (widget.role == 'farmer' || widget.role == 'distributor') ...[
                const SizedBox(height: 16),
                OutlinedButton.icon(
                  onPressed: () => _pickFile(false),
                  icon: const Icon(Icons.qr_code),
                  label: const Text('Upload QR Code (Optional)'),
                ),
                if (_qrCodeFile != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 8.0),
                    child: Text(
                      'Selected: ${_qrCodeFile!.path.split('/').last}',
                      style: TextStyle(color: Colors.green.shade700),
                    ),
                  ),
              ],
              const SizedBox(height: 16),
              TextFormField(
                controller: _passwordController,
                obscureText: _obscurePassword,
                decoration: AppTheme.inputDecoration.copyWith(
                  labelText: 'Password',
                  prefixIcon: const Icon(Icons.lock),
                  suffixIcon: IconButton(
                    icon: Icon(
                      _obscurePassword ? Icons.visibility : Icons.visibility_off,
                    ),
                    onPressed: () {
                      setState(() {
                        _obscurePassword = !_obscurePassword;
                      });
                    },
                  ),
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Please enter your password';
                  }
                  if (value.length < 6) {
                    return 'Password must be at least 6 characters';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _confirmPasswordController,
                obscureText: _obscureConfirmPassword,
                decoration: AppTheme.inputDecoration.copyWith(
                  labelText: 'Confirm Password',
                  prefixIcon: const Icon(Icons.lock_outline),
                  suffixIcon: IconButton(
                    icon: Icon(
                      _obscureConfirmPassword
                          ? Icons.visibility
                          : Icons.visibility_off,
                    ),
                    onPressed: () {
                      setState(() {
                        _obscureConfirmPassword = !_obscureConfirmPassword;
                      });
                    },
                  ),
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Please confirm your password';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: authProvider.isLoading ? null : _handleSignup,
                style: AppTheme.primaryButtonStyle.copyWith(
                  padding: WidgetStateProperty.all(
                    const EdgeInsets.symmetric(vertical: 12),
                  ),
                ),
                child: authProvider.isLoading
                    ? const CircularProgressIndicator(color: Colors.white)
                    : const Text(
                        'Sign Up',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
              ),
            ],
          ),
        ),
      )
            );
  }
}

