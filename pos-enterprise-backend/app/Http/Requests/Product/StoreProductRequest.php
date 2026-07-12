<?php
namespace App\Http\Requests\Product;
use Illuminate\Foundation\Http\FormRequest;
class StoreProductRequest extends FormRequest {
    public function authorize(): bool { return true; }
    public function rules(): array {
        return [
            'name'           => ['required', 'string', 'max:200'],
            'category_id'    => ['nullable', 'uuid'],
            'sku'            => ['nullable', 'string', 'max:50'],
            'barcode'        => ['nullable', 'string', 'max:50'],
            'base_price'     => ['required', 'numeric', 'min:0'],
            'cost_price'     => ['nullable', 'numeric', 'min:0'],
            'unit'           => ['nullable', 'string', 'max:20'],
            'is_track_stock' => ['boolean'],
            'has_variants'   => ['boolean'],
            'description'    => ['nullable', 'string'],
        ];
    }
}
