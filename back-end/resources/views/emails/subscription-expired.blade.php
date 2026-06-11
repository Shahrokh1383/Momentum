<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>Subscription Expired</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            background-color: #f0f4f8; /* --bg-body */
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: #1e293b; /* --text-main */
        }
        .wrapper {
            max-width: 600px;
            margin: 40px auto;
            background-color: #ffffff;
            border-radius: 16px;
            border: 1px solid #e2e8f0; /* Simulating glass-border */
            overflow: hidden;
            box-shadow: 0 8px 32px rgba(31, 38, 135, 0.1); /* --glass-shadow */
        }
        .header {
            background-color: #11998e; /* --primary */
            background: linear-gradient(to right, #11998e, #38ef7d); /* --gradient-btn */
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
            color: #64748b; /* --text-muted */
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
            background-color: #ef4444; /* Red for expired */
            color: #ffffff;
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 13px;
            font-weight: 600;
            letter-spacing: 0.3px;
        }
        .btn-wrapper {
            text-align: center;
            margin: 32px 0;
        }
        .btn {
            display: inline-block;
            background-color: #11998e; /* --primary */
            background: linear-gradient(to right, #11998e, #38ef7d); /* --gradient-btn */
            color: #ffffff !important;
            text-decoration: none;
            padding: 14px 36px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            letter-spacing: 0.3px;
        }
        .warning {
            background-color: #fff7ed; /* Orange tint for warning */
            border: 1px solid #fb923c;
            border-radius: 8px;
            padding: 14px 18px;
            font-size: 14px;
            color: #9a3412;
            margin-top: 8px;
        }
        .footer {
            text-align: center;
            padding: 24px 32px;
            border-top: 1px solid #e2e8f0;
            font-size: 13px;
            color: #64748b; /* --text-muted */
        }
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="header">
            <h1>⚡ Momentum</h1>
            <p>Habit Tracker — Subscription Expired</p>
        </div>
        <div class="body">
            <p>Hello {{ $subscription->user->name }},</p>
            <p>
                We noticed that your subscription has expired. Your account has been safely downgraded to the <strong>Free</strong> plan, but your data is securely saved and waiting for you.
            </p>

            <table class="details-table">
                <tr>
                    <td>Status</td>
                    <td><span class="badge">Expired</span></td>
                </tr>
                <tr>
                    <td>Expired On</td>
                    <td>{{ $subscription->expires_at ? $subscription->expires_at->format('M d, Y — h:i A') : 'N/A' }}</td>
                </tr>
            </table>

            <div class="btn-wrapper">
                <a href="{{ config('app.frontend_url') }}/plans" class="btn">Renew Your Plan</a>
            </div>

            <div class="warning">
                ⚠️ If you believe this is a mistake or need assistance, please contact our support team.
            </div>
        </div>
        <div class="footer">
            &copy; {{ date('Y') }} {{ config('app.name') }}. All rights reserved.
        </div>
    </div>
</body>
</html>