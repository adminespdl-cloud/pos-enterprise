<?php
namespace App\Enums;
enum MemberTier: string {
    case Bronze = 'bronze';
    case Silver = 'silver';
    case Gold = 'gold';
    case Platinum = 'platinum';
    public function minSpent(): int {
        return match($this) {
            self::Bronze => 0,
            self::Silver => 1_000_000,
            self::Gold => 5_000_000,
            self::Platinum => 10_000_000,
        };
    }
    public static function fromSpent(int $amount): self {
        return match(true) {
            $amount >= 10_000_000 => self::Platinum,
            $amount >= 5_000_000 => self::Gold,
            $amount >= 1_000_000 => self::Silver,
            default => self::Bronze,
        };
    }
}
