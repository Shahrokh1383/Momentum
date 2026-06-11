**This is manual testing commands for expired subscription**

run :  php artisan tinker

enter below commands


```
// 1. Get the subscription
 $sub = App\Models\Subscription::where('user_id', Our_User_ID)->first();

// 2. Set expiration to the past, BUT KEEP STATUS ACTIVE
 $sub->expires_at = now()->subDay();
 $sub->status = App\Enums\SubscriptionStatus::ACTIVE;
 $sub->save();

 ```