<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductPopularityDaily extends Model
{
    protected $table = 'product_popularity_daily';

    public $incrementing = false;
    protected $primaryKey = null;

    public $timestamps = false;
    const UPDATED_AT = 'updated_at';

    protected $fillable = ['product_id', 'date', 'clicks'];
}
