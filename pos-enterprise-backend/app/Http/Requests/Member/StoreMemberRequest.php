<?php
namespace App\Http\Requests\Member;
use Illuminate\Foundation\Http\FormRequest;
class StoreMemberRequest extends FormRequest {
    public function authorize(): bool { return true; }
    public function rules(): array {
        return [
            'name'       => ['required', 'string', 'max:100'],
            'phone'      => ['nullable', 'string', 'max:20'],
            'email'      => ['nullable', 'email', 'max:100'],
            'birth_date' => ['nullable', 'date'],
        ];
    }
}
