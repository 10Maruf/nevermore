<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    protected $table = 'products';

    protected $fillable = [
        'category_id', 'name', 'description',
        'base_price', 'size_fit', 'care_maintenance',
    ];

    protected $casts = [
        'base_price' => 'float',
    ];

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function variants()
    {
        return $this->hasMany(ProductVariant::class);
    }
}
