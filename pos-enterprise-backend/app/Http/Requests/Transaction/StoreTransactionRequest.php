<?php
namespace App\Http\Requests\Transaction;
use Illuminate\Foundation\Http\FormRequest;
class StoreTransactionRequest extends FormRequest {
    public function authorize(): bool { return true; }
    public function rules(): array {
        return [
            'shift_id'                => ['nullable', 'uuid'],
            'member_id'               => ['nullable', 'uuid'],
            'items'                   => ['required', 'array', 'min:1'],
            'items.*.product_id'      => ['required', 'uuid'],
            'items.*.variant_id'      => ['nullable', 'uuid'],
            'items.*.qty'             => ['required', 'numeric', 'min:0.001'],
            'items.*.unit_price'      => ['required', 'numeric', 'min:0'],
            'items.*.discount'        => ['nullable', 'numeric', 'min:0'],
            'payments'                => ['required', 'array', 'min:1'],
            'payments.*.method'       => ['required', 'string', 'in:cash,qris,transfer,voucher,points'],
            'payments.*.amount'       => ['required', 'numeric', 'min:0'],
            'payments.*.voucher_code' => ['nullable', 'string'],
            'discount_amount'         => ['nullable', 'numeric', 'min:0'],
            'notes'                   => ['nullable', 'string'],
            'device_id'               => ['nullable', 'string'],
        ];
    }
}
