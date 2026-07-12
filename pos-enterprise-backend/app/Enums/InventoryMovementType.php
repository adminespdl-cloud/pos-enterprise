<?php
namespace App\Enums;
enum InventoryMovementType: string {
    case Purchase = 'purchase';
    case Sale = 'sale';
    case Void = 'void';
    case TransferIn = 'transfer_in';
    case TransferOut = 'transfer_out';
    case Adjustment = 'adjustment';
    case Opname = 'opname';
    case OpeningStock = 'opening_stock';
}
