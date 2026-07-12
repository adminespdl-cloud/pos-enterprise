<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\{Member};
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;

class MemberController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $companyId = $request->user()->company_id;

        $members = Member::where('company_id', $companyId)
            ->where('is_active', true)
            ->when($request->search, fn($q) => $q->where(function ($q2) use ($request) {
                $q2->where('name', 'ilike', "%{$request->search}%")
                   ->orWhere('phone', 'like', "%{$request->search}%");
            }))
            ->when($request->tier, fn($q) => $q->where('tier', $request->tier))
            ->orderBy('name')
            ->paginate($request->integer('per_page', 20));

        return response()->json(['status' => 'success', 'data' => $members]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name'       => 'required|string|max:100',
            'phone'      => 'required|string|max:20',
            'email'      => 'nullable|email|max:100',
            'birth_date' => 'nullable|date',
        ]);

        $companyId = $request->user()->company_id;
        $outletId  = $request->attributes->get('current_outlet_id');

        // Cek duplikasi nomor HP
        $existing = Member::where('company_id', $companyId)
            ->where('phone', $request->phone)
            ->first();

        if ($existing) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Nomor telepon sudah terdaftar.',
                'code'    => 'PHONE_EXISTS',
                'data'    => ['existing_member_id' => $existing->id],
            ], 409);
        }

        $member = Member::create([
            'company_id'             => $companyId,
            'name'                   => $request->name,
            'phone'                  => $request->phone,
            'email'                  => $request->email,
            'birth_date'             => $request->birth_date,
            'registered_at_outlet_id' => $outletId,
        ]);

        return response()->json([
            'status'  => 'success',
            'message' => 'Member berhasil didaftarkan.',
            'data'    => $member,
        ], 201);
    }

    public function show(string $id): JsonResponse
    {
        $member = Member::with(['transactions' => fn($q) => $q->latest()->limit(10)])->findOrFail($id);

        return response()->json(['status' => 'success', 'data' => $member]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $member = Member::findOrFail($id);
        $request->validate([
            'name'       => 'sometimes|string|max:100',
            'email'      => 'nullable|email|max:100',
            'birth_date' => 'nullable|date',
        ]);

        $member->update($request->only(['name', 'email', 'birth_date']));

        return response()->json(['status' => 'success', 'message' => 'Member diperbarui.', 'data' => $member]);
    }

    public function search(Request $request): JsonResponse
    {
        $request->validate(['phone' => 'required|string|min:4']);

        $companyId = $request->user()->company_id;
        $member    = Member::where('company_id', $companyId)
            ->where('phone', 'like', "%{$request->phone}%")
            ->where('is_active', true)
            ->first();

        return response()->json([
            'status' => 'success',
            'data'   => $member,
        ]);
    }
}
