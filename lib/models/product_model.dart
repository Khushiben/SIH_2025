class Product {
  final String id;
  final String farmerId;
  final String name;
  final String category;
  final double price;
  final double quantity;
  final String location;
  final String? image;
  final String? ipfsHash;
  final DateTime? harvestDate;
  final double? moisture;
  final double? protein;
  final double? pesticideResidue;
  final double? soilPh;
  final String? labReport;
  final String? qrPath;
  final List<String>? preferences;
  final String? farmerName;

  Product({
    required this.id,
    required this.farmerId,
    required this.name,
    required this.category,
    required this.price,
    required this.quantity,
    required this.location,
    this.image,
    this.ipfsHash,
    this.harvestDate,
    this.moisture,
    this.protein,
    this.pesticideResidue,
    this.soilPh,
    this.labReport,
    this.qrPath,
    this.preferences,
    this.farmerName,
  });

  factory Product.fromJson(Map<String, dynamic> json) {
    return Product(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      farmerId: json['farmerId']?.toString() ?? 
                (json['farmerId'] is Map ? (json['farmerId']['_id']?.toString() ?? '') : ''),
      name: json['name'] ?? '',
      category: json['category'] ?? '',
      price: (json['price'] is num) ? json['price'].toDouble() : 0.0,
      quantity: (json['quantity'] is num) ? json['quantity'].toDouble() : 0.0,
      location: json['location'] ?? '',
      image: json['image'],
      ipfsHash: json['ipfsHash'],
      harvestDate: json['harvestDate'] != null 
          ? DateTime.parse(json['harvestDate']) 
          : null,
      moisture: json['moisture']?.toDouble(),
      protein: json['protein']?.toDouble(),
      pesticideResidue: json['pesticideResidue']?.toDouble(),
      soilPh: json['soilPh']?.toDouble(),
      labReport: json['labReport'],
      qrPath: json['qrPath'],
      preferences: json['preferences'] != null 
          ? List<String>.from(json['preferences']) 
          : null,
      farmerName: json['farmerId'] is Map ? json['farmerId']['name'] : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'farmerId': farmerId,
      'name': name,
      'category': category,
      'price': price,
      'quantity': quantity,
      'location': location,
      'image': image,
      'ipfsHash': ipfsHash,
      'harvestDate': harvestDate?.toIso8601String(),
      'moisture': moisture,
      'protein': protein,
      'pesticideResidue': pesticideResidue,
      'soilPh': soilPh,
      'labReport': labReport,
      'qrPath': qrPath,
      'preferences': preferences,
    };
  }
}

