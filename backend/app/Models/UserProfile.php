<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserProfile extends Model
{
    protected $table = 'user_profiles';

    public $timestamps = false;

    const CREATED_AT = 'created_at';
    const UPDATED_AT = 'updated_at';

    protected $fillable = [
        'user_id',
        'full_name',
        'phone',
        'address',
        'city',
        'postal_code',
        'country',
        'avatar_url',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}