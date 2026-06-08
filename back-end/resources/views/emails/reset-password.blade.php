<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>Reset Your Password</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            background-color: #0f0f1a;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: #e2e8f0;
        }
        .wrapper {
            max-width: 600px;
            margin: 40px auto;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            border-radius: 16px;
            border: 1px solid rgba(99, 102, 241, 0.3);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
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
            color: rgba(255,255,255,0.85);
            font-size: 15px;
        }
        .body {
            padding: 40px 32px;
        }
        .body p {
            font-size: 16px;
            line-height: 1.7;
            color: #cbd5e1;
            margin: 0 0 20px;
        }
        .btn-wrapper {
            text-align: center;
            margin: 32px 0;
        }
        .btn {
            display: inline-block;
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            color: #ffffff !important;
            text-decoration: none;
            padding: 14px 36px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            letter-spacing: 0.3px;
        }
        .warning {
            background: rgba(234, 179, 8, 0.1);
            border: 1px solid rgba(234, 179, 8, 0.3);
            border-radius: 8px;
            padding: 14px 18px;
            font-size: 14px;
            color: #fbbf24;
            margin-top: 8px;
        }
        .url-fallback {
            background: rgba(99, 102, 241, 0.1);
            border: 1px solid rgba(99, 102, 241, 0.2);
            border-radius: 8px;
            padding: 14px 18px;
            font-size: 13px;
            color: #94a3b8;
            word-break: break-all;
            margin-top: 24px;
        }
        .footer {
            text-align: center;
            padding: 24px 32px;
            border-top: 1px solid rgba(99, 102, 241, 0.15);
            font-size: 13px;
            color: #64748b;
        }
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="header">
            <h1>⚡ Momentum</h1>
            <p>Habit Tracker — Password Reset</p>
        </div>
        <div class="body">
            <p>Hello,</p>
            <p>
                We received a request to reset the password for your Momentum account.
                Click the button below to set a new password.
            </p>
            <div class="btn-wrapper">
                <a href="{{ $resetUrl }}" class="btn">Reset My Password</a>
            </div>
            <div class="warning">
                ⚠️ This link will expire in
                <strong>{{ config('auth.passwords.users.expire', 60) }} minutes</strong>.
                If you did not request a password reset, no action is required —
                your account remains secure.
            </div>
            <div class="url-fallback">
                <strong>Can't click the button?</strong> Copy and paste this URL into your browser:<br/>
                <span>{{ $resetUrl }}</span>
            </div>
        </div>
        <div class="footer">
            &copy; {{ date('Y') }} {{ config('app.name') }}. All rights reserved.
        </div>
    </div>
</body>
</html>