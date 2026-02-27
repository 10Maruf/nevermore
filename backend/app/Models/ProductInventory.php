<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductInventory extends Model
{
    protected $table = 'product_inventory';

    protected $fillable = ['variant_id', 'size', 'quantity', 'reserved_quantity'];

    protected $casts = [
        'quantity'          => 'integer',
        'reserved_quantity' => 'integer',
    ];

    public function getAvailableAttribute(): int
    {
        return max(0, $this->quantity - $this->reserved_quantity);
    }

    public function getInStockAttribute(): bool
    {
        return $this->available > 0;
    }
}
