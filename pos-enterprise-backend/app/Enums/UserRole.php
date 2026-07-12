<?php
namespace App\Enums;
enum UserRole: string {
    case SuperAdmin = 'super_admin';
    case Admin      = 'admin';
    case Manager    = 'manager';
    case Cashier    = 'cashier';
    public function label(): string {
        return match($this) {
            self::SuperAdmin => 'Super Admin',
            self::Admin      => 'Admin',
            self::Manager    => 'Manager',
            self::Cashier    => 'Kasir',
        };
    }
    public function abilities(): array {
        return match($this) {
            self::SuperAdmin => ['*'],
            self::Admin      => ['outlet:*', 'product:*', 'user:*', 'report:*', 'sync:*'],
            self::Manager    => ['outlet:read', 'product:*', 'report:*', 'sync:*', 'shift:*', 'transaction:*'],
            self::Cashier    => ['sync:*', 'shift:*', 'transaction:create', 'transaction:read', 'product:read', 'member:read', 'member:create'],
        };
    }
}
