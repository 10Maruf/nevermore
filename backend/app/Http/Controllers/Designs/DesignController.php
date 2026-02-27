<?php

namespace App\Http\Controllers\Designs;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class DesignController extends Controller
{
    /** GET /api/designs */
    public function index(Request $request)
    {
        $designs = DB::table('custom_designs')
            ->where('user_id', $request->user()->id)
            ->orderByDesc('updated_at')
            ->get()
            ->map(function ($d) {
                $d->design_data = json_decode($d->design_data, true);
                return $d;
            });

        return response()->json(['success' => true, 'data' => ['designs' => $designs]]);
    }

    /** GET /api/designs/{id} */
    public function show(Request $request, int $id)
    {
        $design = DB::table('custom_designs')
            ->where('id', $id)
            ->where('user_id', $request->user()->id)
            ->first();

        if (!$design) {
            return response()->json(['success' => false, 'message' => 'Design not found.'], 404);
        }

        $design->design_data = json_decode($design->design_data, true);
        $assets = DB::table('design_assets')
            ->where('design_id', $id)
            ->where('user_id', $request->user()->id)
            ->get();

        return response()->json(['success' => true, 'data' => ['design' => $design, 'assets' => $assets]]);
    }

    /**
     * POST /api/designs
     * Body: { design_name, design_data, preview_image(base64)?,
     *         garment_type?, garment_color?, garment_size?, technique?,
     *         print_type?, embroidery_type?, design_id?(update existing) }
     */
    public function save(Request $request)
    {
        $request->validate([
            'design_name' => 'required|string|max:255',
            'design_data' => 'required',
        ]);

        $userId   = $request->user()->id;
        $name     = trim($request->design_name);
        $designId = $request->input('design_id');

        $previewUrl = null;
        if ($request->filled('preview_image')) {
            $previewUrl = $this->savePreviewImage($request->preview_image, $userId, $designId);
        }

        $row = [
            'design_name'     => $name,
            'garment_type'    => $request->input('garment_type', 'T-Shirt'),
            'garment_color'   => $request->input('garment_color', '#FFFFFF'),
            'garment_size'    => $request->input('garment_size', 'M'),
            'technique'       => $request->input('technique', 'Print'),
            'print_type'      => $request->input('print_type'),
            'embroidery_type' => $request->input('embroidery_type'),
            'design_data'     => is_array($request->design_data)
                                    ? json_encode($request->design_data)
                                    : $request->design_data,
            'updated_at'      => now(),
        ];
        if ($previewUrl) $row['preview_url'] = $previewUrl;

        if ($designId) {
            $updated = DB::table('custom_designs')
                ->where('id', $designId)
                ->where('user_id', $userId)
                ->update($row);

            if (!$updated) {
                return response()->json(['success' => false, 'message' => 'Design not found or unauthorized.'], 404);
            }
        } else {
            $existing = DB::table('custom_designs')
                ->where('user_id', $userId)
                ->where('design_name', $name)
                ->first();

            if ($existing) {
                $designId = $existing->id;
                DB::table('custom_designs')->where('id', $designId)->update($row);
            } else {
                $row['user_id']    = $userId;
                $row['created_at'] = now();
                $designId = DB::table('custom_designs')->insertGetId($row);
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Design saved.',
            'data'    => ['design_id' => $designId],
        ], 201);
    }

    /** POST /api/designs/upload-asset (multipart: file) */
    public function uploadAsset(Request $request)
    {
        $request->validate([
            'file'      => 'required|file|mimes:jpeg,png,jpg,gif,svg,webp|max:5120',
            'design_id' => 'sometimes|integer',
        ]);

        $userId = $request->user()->id;
        $file   = $request->file('file');
        $dir    = public_path('uploads/designs');
        if (!is_dir($dir)) mkdir($dir, 0755, true);

        $filename = $userId . '_' . time() . '_' . Str::random(8) . '.' . $file->getClientOriginalExtension();
        $file->move($dir, $filename);

        $assetUrl = url('uploads/designs/' . $filename);
        $assetId  = DB::table('design_assets')->insertGetId([
            'user_id'           => $userId,
            'design_id'         => $request->input('design_id'),
            'asset_url'         => $assetUrl,
            'original_filename' => $file->getClientOriginalName(),
            'upload_date'       => now(),
        ]);

        return response()->json([
            'success' => true,
            'data'    => ['asset_id' => $assetId, 'asset_url' => $assetUrl],
        ], 201);
    }

    private function savePreviewImage(string $base64, int $userId, ?int $designId): ?string
    {
        $base64 = preg_replace('/^data:image\/\w+;base64,/', '', $base64);
        $data   = base64_decode($base64);
        if (!$data) return null;

        $dir = public_path('uploads/previews');
        if (!is_dir($dir)) mkdir($dir, 0755, true);

        $filename = $userId . '_' . ($designId ?? time()) . '_preview.png';
        file_put_contents($dir . '/' . $filename, $data);

        return url('uploads/previews/' . $filename);
    }
}
