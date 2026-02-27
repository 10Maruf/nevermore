<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Category extends Model
{
    protected $table = 'categories';

    protected $fillable = ['name', 'slug', 'parent_category'];

    public function products()
    {
        return $this->hasMany(Product::class);
    }

    public function image()
    {
        return $this->hasOne(CategoryImage::class, 'category_slug', 'slug');
    }
}
