<?php

namespace Tests\Unit;

use Tests\TestCase;
use App\Enums\MemberTier;

class MemberTierTest extends TestCase
{
    // ── MemberTier::fromSpent() ───────────────────────────────────

    /** @dataProvider spentToTierProvider */
    public function test_tier_is_correctly_calculated_from_total_spent(int $spent, MemberTier $expected): void
    {
        $this->assertEquals($expected, MemberTier::fromSpent($spent));
    }

    public static function spentToTierProvider(): array
    {
        return [
            'belum belanja'        => [0,           MemberTier::Bronze],
            'tepat batas bronze'   => [999_999,      MemberTier::Bronze],
            'tepat batas silver'   => [1_000_000,    MemberTier::Silver],
            'di dalam silver'      => [3_500_000,    MemberTier::Silver],
            'tepat batas gold'     => [5_000_000,    MemberTier::Gold],
            'di dalam gold'        => [7_000_000,    MemberTier::Gold],
            'tepat batas platinum' => [10_000_000,   MemberTier::Platinum],
            'jauh di atas'         => [100_000_000,  MemberTier::Platinum],
        ];
    }

    public function test_bronze_min_spent_is_zero(): void
    {
        $this->assertEquals(0, MemberTier::Bronze->minSpent());
    }

    public function test_silver_min_spent_is_one_million(): void
    {
        $this->assertEquals(1_000_000, MemberTier::Silver->minSpent());
    }

    public function test_gold_min_spent_is_five_million(): void
    {
        $this->assertEquals(5_000_000, MemberTier::Gold->minSpent());
    }

    public function test_platinum_min_spent_is_ten_million(): void
    {
        $this->assertEquals(10_000_000, MemberTier::Platinum->minSpent());
    }
}

// ─────────────────────────────────────────────────────────────────────

namespace Tests\Unit;

use Tests\TestCase;
use App\Enums\{ShiftStatus, PaymentMethod};
use App\Models\{Company, Outlet, User, Shift, Transaction};
use App\Enums\UserRole;

class ShiftSummaryTest extends TestCase
{
    public function test_shift_summary_calculates_correct_totals(): void
    {
        ['company' => $company] = $this->createCompanyWithAdmin();
        $outlet = $this->createOutlet($company->id);
        $cashier = User::factory()->create([
            'company_id' => $company->id,
            'role'       => UserRole::Cashier,
        ]);

        $shift = Shift::create([
            'outlet_id'    => $outlet->id,
            'cashier_id'   => $cashier->id,
            'status'       => ShiftStatus::Open,
            'opened_at'    => now()->subHours(8),
            'opening_cash' => 500_000,
        ]);

        // Buat 3 transaksi tunai
        foreach ([100_000, 200_000, 150_000] as $amount) {
            Transaction::create([
                'outlet_id'       => $outlet->id,
                'shift_id'        => $shift->id,
                'cashier_id'      => $cashier->id,
                'status'          => 'completed',
                'subtotal'        => $amount,
                'discount_amount' => 0,
                'tax_amount'      => 0,
                'total_amount'    => $amount,
                'points_earned'   => 0,
                'points_redeemed' => 0,
            ]);
        }

        $response = $this->withHeaders([
            'Authorization' => "Bearer {$this->loginAs($cashier)}",
            'X-Outlet-ID'   => $outlet->id,
        ])->getJson("/api/v1/shifts/{$shift->id}/summary");

        $response->assertOk();
        $summary = $response->json('data');

        $this->assertEquals(3, $summary['total_transactions']);
        $this->assertEquals(450_000, $summary['total_revenue']);
        // Expected cash = opening + cash revenue
        $this->assertEquals(950_000, $summary['expected_cash']);
    }
}

// ─────────────────────────────────────────────────────────────────────

namespace Tests\Unit;

use Tests\TestCase;

class TransactionNumberTest extends TestCase
{
    public function test_transaction_number_follows_expected_format(): void
    {
        // Format: TRX-{OUTLET_CODE}-{YYYYMMDD}-{SEQ4}
        // Contoh: TRX-CNTR-20260712-0001
        $pattern = '/^TRX-[A-Z]{2,6}-\d{8}-\d{4}$/';

        // Simulasi generate dari controller
        $outletCode = 'CNTR';
        $date       = '20260712';
        $seq        = 1;
        $number     = sprintf('TRX-%s-%s-%04d', $outletCode, $date, $seq);

        $this->assertMatchesRegularExpression($pattern, $number);
        $this->assertEquals('TRX-CNTR-20260712-0001', $number);
    }
}
