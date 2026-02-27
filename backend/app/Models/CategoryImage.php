<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CategoryImage extends Model
{
    protected $table = 'category_images';

    public $timestamps = false;

    protected $fillable = ['category_slug', 'image_url'];
}
