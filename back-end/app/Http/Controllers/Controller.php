<?php

namespace App\Http\Controllers;

use App\Traits\HasApiResponse;
use Illuminate\Routing\Controller as BaseController;

abstract class Controller extends BaseController
{
    use HasApiResponse;
}