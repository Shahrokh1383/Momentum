<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>Habit Reminder</title>
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
            background-color: #11998e;
            background: linear-gradient(to right, #11998e, #38ef7d);
            color: #ffffff !important;
            text-decoration: none;
            padding: 14px 36px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            letter-spacing: 0.3px;
        }
        .quote-box {
            background-color: #f8fafc;
            border-left: 4px solid #11998e;
            padding: 16px 18px;
            border-radius: 8px;
            margin: 24px 0;
            font-style: italic;
            color: #334155;
            font-size: 15px;
            line-height: 1.6;
        }
        .info-box {
            background-color: #f0fdf4;
            border: 1px solid #86efac;
            border-radius: 8px;
            padding: 14px 18px;
            font-size: 14px;
            color: #166534;
            margin-top: 8px;
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
            <p>Habit Tracker — Scheduled Reminder</p>
        </div>
        <div class="body">
            <p>Hello {{ $habit->user->name }},</p>
            <p>
                This is your scheduled reminder for <strong style="color: #11998e;">{{ $habit->title }}</strong>.
                It's time to stay consistent and build your routine!
            </p>

            @if($habit->description)
                <div class="quote-box">
                    "{{ $habit->description }}"
                </div>
            @endif

            <table class="details-table">
                <tr>
                    <td>Reminder Time</td>
                    <td><span class="badge">{{ $scheduledTime }}</span></td>
                </tr>
                <tr>
                    <td>Frequency</td>
                    <td>{{ ucfirst($habit->frequency) }}</td>
                </tr>
                <tr>
                    <td>Type</td>
                    <td>{{ ucfirst($habit->type) }}</td>
                </tr>
                @if($habit->category)
                <tr>
                    <td>Category</td>
                    <td>{{ $habit->category->name }}</td>
                </tr>
                @endif
                <tr>
                    <td>Timezone</td>
                    <td>{{ $habit->timezone ?? 'UTC' }}</td>
                </tr>
            </table>

            <div class="btn-wrapper">
                <a href="{{ config('app.frontend_url') }}/habits" class="btn">Track Progress Now</a>
            </div>

            <div class="info-box">
                💡 Tip: Consistency is the key to building lasting habits. Even small progress counts!
            </div>
        </div>
        <div class="footer">
            You received this email because you scheduled a reminder for this habit.<br>
            &copy; {{ date('Y') }} {{ config('app.name') }}. All rights reserved.
        </div>
    </div>
</body>
</html>