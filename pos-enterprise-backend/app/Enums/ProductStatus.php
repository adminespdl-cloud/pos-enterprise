<?php
namespace App\Enums;
enum ProductStatus: string {
    case Active = 'active';
    case Inactive = 'inactive';
    case Deleted = 'deleted';
    public function label(): string {
        return match($this) {
            self::Active => 'Aktif',
            self::Inactive => 'Nonaktif',
            self::Deleted => 'Dihapus',
        };
    }
}
