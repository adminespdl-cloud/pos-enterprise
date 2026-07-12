<?php
namespace App\Http\Requests\Sync;
use Illuminate\Foundation\Http\FormRequest;
class PushRequest extends FormRequest {
    public function authorize(): bool { return true; }
    public function rules(): array {
        return [
            'device_id'    => ['required', 'string'],
            'transactions' => ['sometimes', 'array'],
            'last_pull_at' => ['nullable', 'date'],
        ];
    }
}
