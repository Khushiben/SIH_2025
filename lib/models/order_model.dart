class Order {
  final String id;
  final String productId;
  final String productName;
  final double unitPrice;
  final double quantity;
  final double totalPrice;
  final String address;
  final String paymentMethod;
  final String? distributorId;
  final String? distributorName;
  final String? distributorEmail;
  final String? farmerId;
  final String? retailerId;
  final String? retailerName;
  final DateTime orderDate;
  final String? status;

  Order({
    required this.id,
    required this.productId,
    required this.productName,
    required this.unitPrice,
    required this.quantity,
    required this.totalPrice,
    required this.address,
    required this.paymentMethod,
    this.distributorId,
    this.distributorName,
    this.distributorEmail,
    this.farmerId,
    this.retailerId,
    this.retailerName,
    required this.orderDate,
    this.status,
  });

  factory Order.fromJson(Map<String, dynamic> json) {
    return Order(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      productId: json['productId']?.toString() ?? '',
      productName: json['productName'] ?? '',
      unitPrice: (json['unitPrice'] is num) ? json['unitPrice'].toDouble() : 0.0,
      quantity: (json['quantity'] is num) ? json['quantity'].toDouble() : 0.0,
      totalPrice: (json['totalPrice'] is num) ? json['totalPrice'].toDouble() : 0.0,
      address: json['address'] ?? '',
      paymentMethod: json['paymentMethod'] ?? '',
      distributorId: json['distributorId']?.toString(),
      distributorName: json['distributorName'],
      distributorEmail: json['distributorEmail'],
      farmerId: json['farmerId']?.toString(),
      retailerId: json['retailerId']?.toString(),
      retailerName: json['retailerName'],
      orderDate: json['orderDate'] != null 
          ? DateTime.parse(json['orderDate']) 
          : DateTime.now(),
      status: json['status'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'productId': productId,
      'productName': productName,
      'unitPrice': unitPrice,
      'quantity': quantity,
      'totalPrice': totalPrice,
      'address': address,
      'paymentMethod': paymentMethod,
      'distributorId': distributorId,
      'distributorName': distributorName,
      'distributorEmail': distributorEmail,
      'farmerId': farmerId,
      'retailerId': retailerId,
      'retailerName': retailerName,
      'orderDate': orderDate.toIso8601String(),
      'status': status,
    };
  }
}










