<?php
namespace App\Enums;
enum PaymentMethod: string {
    case Cash = 'cash';
    case Qris = 'qris';
    case Transfer = 'transfer';
    case Voucher = 'voucher';
    case Points = 'points';
    public function label(): string {
        return match($this) {
            self::Cash => 'Tunai',
            self::Qris => 'QRIS',
            self::Transfer => 'Transfer Bank',
            self::Voucher => 'Voucher',
            self::Points => 'Poin',
        };
    }
}
