<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>Subscription Confirmed</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            background-color: #f0f4f8;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: #1e293b;
        }
        .wrapper {
            max-width: 600px;
            margin: 40px auto;
            background-color: #ffffff;
            border-radius: 16px;
            border: 1px solid #e2e8f0;
            overflow: hidden;
            box-shadow: 0 8px 32px rgba(31, 38, 135, 0.1);
        }
        .header {
            background-color: #11998e;
            background: linear-gradient(to right, #11998e, #38ef7d);
            padding: 40px 32px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 700;
            color: #ffffff;
            letter-spacing: -0.5px;
        }
        .header p {
            margin: 8px 0 0;
            color: rgba(255,255,255,0.9);
            font-size: 15px;
        }
        .body {
            padding: 40px 32px;
        }
        .body p {
            font-size: 16px;
            line-height: 1.7;
            color: #64748b;
            margin: 0 0 20px;
        }
        .details-table {
            width: 100%;
            border-collapse: collapse;
            margin: 24px 0;
        }
        .details-table td {
            padding: 12px 16px;
            font-size: 15px;
            border-bottom: 1px solid #e2e8f0;
        }
        .details-table td:first-child {
            font-weight: 600;
            color: #1e293b;
            width: 40%;
        }
        .details-table td:last-child {
            color: #64748b;
        }
        .badge {
            display: inline-block;
            background-color: #11998e;
            background: linear-gradient(to right, #11998e, #38ef7d);
            color: #ffffff;
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 13px;
            font-weight: 600;
            letter-spacing: 0.3px;
        }
        .success-box {
            background-color: #e6fffa;
            border: 1px solid #38ef7d;
            border-radius: 8px;
            padding: 14px 18px;
            font-size: 14px;
            color: #0d8a7a;
            margin-top: 8px;
            text-align: center;
        }
        .footer {
            text-align: center;
            padding: 24px 32px;
            border-top: 1px solid #e2e8f0;
            font-size: 13px;
            color: #64748b;
        }
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="header">
            <h1>⚡ Momentum</h1>
            <p>Habit Tracker — Subscription Confirmed</p>
        </div>
        <div class="body">
            <p>Hello {{ $subscription->user->name }},</p>
            <p>
                Great news! Your subscription has been successfully activated.
                Here are the details of your purchase:
            </p>

            <table class="details-table">
                <tr>
                    <td>Plan</td>
                    <td><span class="badge">{{ $plan->name }}</span></td>
                </tr>
                <tr>
                    <td>Amount Paid</td>
                    <td>${{ number_format($payment->amount, 2) }} {{ $payment->currency }}</td>
                </tr>
                <tr>
                    <td>Start Date</td>
                    <td>{{ $subscription->starts_at->format('M d, Y — h:i A') }}</td>
                </tr>
                @if($subscription->expires_at)
                <tr>
                    <td>Expires</td>
                    <td>{{ $subscription->expires_at->format('M d, Y — h:i A') }}</td>
                </tr>
                @else
                <tr>
                    <td>Expires</td>
                    <td>Never — Lifetime Access</td>
                </tr>
                @endif
                <tr>
                    <td>Transaction Ref</td>
                    <td style="font-size: 12px;">{{ $subscription->transaction_ref }}</td>
                </tr>
            </table>

            <div class="success-box">
                ✅ Your {{ $plan->name }} features are now active. Enjoy your upgraded experience!
            </div>
        </div>
        <div class="footer">
            &copy; {{ date('Y') }} {{ config('app.name') }}. All rights reserved.
        </div>
    </div>
</body>
</html>