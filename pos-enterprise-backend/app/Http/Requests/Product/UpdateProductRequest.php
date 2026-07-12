<?php
namespace App\Http\Requests\Product;
use Illuminate\Foundation\Http\FormRequest;
class UpdateProductRequest extends FormRequest {
    public function authorize(): bool { return true; }
    public function rules(): array {
        return [
            'name'           => ['sometimes', 'string', 'max:200'],
            'category_id'    => ['nullable', 'uuid'],
            'sku'            => ['nullable', 'string', 'max:50'],
            'barcode'        => ['nullable', 'string', 'max:50'],
            'base_price'     => ['sometimes', 'numeric', 'min:0'],
            'cost_price'     => ['nullable', 'numeric', 'min:0'],
            'unit'           => ['nullable', 'string', 'max:20'],
            'is_track_stock' => ['boolean'],
            'description'    => ['nullable', 'string'],
            'status'         => ['sometimes', 'string', 'in:active,inactive'],
        ];
    }
}
