<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductImage extends Model
{
    protected $table = 'product_images';

    public $timestamps = false;
    const CREATED_AT = 'created_at';
    const UPDATED_AT = null;

    protected $fillable = ['variant_id', 'image_url', 'display_order', 'is_primary'];

    protected $casts = [
        'is_primary'     => 'boolean',
        'display_order'  => 'integer',
    ];
}
