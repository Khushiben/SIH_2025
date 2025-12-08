class User {
  final String id;
  final String name;
  final String email;
  final String? mobile;
  final String role; // 'farmer', 'consumer', 'distributor', 'retailer'
  
  // Farmer specific
  final String? farmName;
  final String? location;
  final int? experience;
  
  // Distributor specific
  final String? companyName;
  
  // Retailer specific
  final String? shopName;

  User({
    required this.id,
    required this.name,
    required this.email,
    this.mobile,
    required this.role,
    this.farmName,
    this.location,
    this.experience,
    this.companyName,
    this.shopName,
  });

  factory User.fromJson(Map<String, dynamic> json, String role) {
    return User(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      name: json['name'] ?? '',
      email: json['email'] ?? '',
      mobile: json['mobile'],
      role: role,
      farmName: json['farmName'],
      location: json['location'],
      experience: json['experience'],
      companyName: json['companyName'],
      shopName: json['shopName'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'email': email,
      'mobile': mobile,
      'role': role,
      'farmName': farmName,
      'location': location,
      'experience': experience,
      'companyName': companyName,
      'shopName': shopName,
    };
  }
}










