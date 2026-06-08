<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>Verify Your Email</title>
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
            background-color: #ffffff; /* Fallback for glass-bg */
            border-radius: 16px;
            border: 1px solid #e2e8f0; /* Simulating glass-border */
            overflow: hidden;
            box-shadow: 0 8px 32px rgba(31, 38, 135, 0.1); /* --glass-shadow */
        }
        .header {
            /* Gradient with fallback for Outlook */
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
        .btn-wrapper {
            text-align: center;
            margin: 32px 0;
        }
        .btn {
            display: inline-block;
            /* Gradient with fallback for Outlook */
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
        .url-fallback {
            background-color: #f0f4f8; /* --bg-body */
            border: 1px solid #e2e8f0; /* --input-border */
            border-radius: 8px;
            padding: 14px 18px;
            font-size: 13px;
            color: #64748b; /* --text-muted */
            word-break: break-all;
            margin-top: 24px;
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
            <p>Habit Tracker — Email Verification</p>
        </div>
        <div class="body">
            <p>Hello,</p>
            <p>
                Thank you for creating your Momentum account. To activate your account and start
                building powerful habits, please verify your email address by clicking the button below.
            </p>
            <div class="btn-wrapper">
                <a href="{{ $verificationUrl }}" class="btn">Verify My Email</a>
            </div>
            <p>
                This verification link will expire in
                <strong>{{ config('auth.verification.expire', 60) }} minutes</strong>.
                If you did not create an account, you can safely ignore this email.
            </p>
            <div class="url-fallback">
                <strong>Can't click the button?</strong> Copy and paste this URL into your browser:<br/>
                <span>{{ $verificationUrl }}</span>
            </div>
        </div>
        <div class="footer">
            &copy; {{ date('Y') }} {{ config('app.name') }}. All rights reserved.
        </div>
    </div>
</body>
</html>