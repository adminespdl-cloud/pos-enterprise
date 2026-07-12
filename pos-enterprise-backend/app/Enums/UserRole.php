<?php

namespace App\Enums;

enum UserRole: string
{
    case SuperAdmin = 'super_admin';
    case Admin      = 'admin';
    case Manager    = 'manager';
    case Cashier    = 'cashier';

    public function label(): string
    {
        return match($this) {
            self::SuperAdmin => 'Super Admin',
            self::Admin      => 'Admin',
            self::Manager    => 'Manajer',
            self::Cashier    => 'Kasir',
        };
    }

    public function canManageOutlet(): bool
    {
        return in_array($this, [self::SuperAdmin, self::Admin, self::Manager]);
    }

    public function canManageProducts(): bool
    {
        return in_array($this, [self::SuperAdmin, self::Admin, self::Manager]);
    }

    public function canViewReports(): bool
    {
        return in_array($this, [self::SuperAdmin, self::Admin, self::Manager]);
    }
}
