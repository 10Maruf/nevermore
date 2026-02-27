<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductVariant extends Model
{
    protected $table = 'product_variants';

    public $timestamps = false;
    const CREATED_AT = 'created_at';
    const UPDATED_AT = null;

    protected $fillable = ['product_id', 'color', 'color_code', 'sku'];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function images()
    {
        return $this->hasMany(ProductImage::class, 'variant_id')
            ->orderBy('display_order');
    }

    public function primaryImage()
    {
        return $this->hasOne(ProductImage::class, 'variant_id')
            ->orderByDesc('is_primary')
            ->orderBy('display_order');
    }

    public function inventory()
    {
        return $this->hasMany(ProductInventory::class, 'variant_id')
            ->orderByRaw("FIELD(size,'XS','S','M','L','XL','XXL','XXXL')");
    }
}
