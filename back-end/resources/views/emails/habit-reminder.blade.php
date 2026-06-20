<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Habit Reminder</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f0f4f8; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="100%" style="max-width: 600px; background: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.05); overflow: hidden;">
                    
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(to right, #11998e, #38ef7d); padding: 32px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800;">Momentum</h1>
                        </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                        <td style="padding: 40px 32px;">
                            <h2 style="color: #1e293b; margin-top: 0; font-size: 22px;">Time to build your routine!</h2>
                            <p style="color: #64748b; font-size: 16px; line-height: 1.6;">
                                This is your scheduled reminder for <strong style="color: #11998e;">{{ $habit->title }}</strong>.
                            </p>
                            
                            @if($habit->description)
                                <div style="background: #f8fafc; border-left: 4px solid #11998e; padding: 16px; border-radius: 8px; margin: 24px 0;">
                                    <p style="margin: 0; color: #334155; font-style: italic;">"{{ $habit->description }}"</p>
                                </div>
                            @endif

                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 32px 0;">
                                <tr>
                                    <td align="center">
                                        <a href="{{ config('app.frontend_url', 'http://localhost:5173') }}/habits" 
                                           style="background: linear-gradient(to right, #11998e, #38ef7d); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 16px; display: inline-block; box-shadow: 0 4px 12px rgba(17, 153, 142, 0.25);">
                                            Track Progress Now
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
                            <p style="margin: 0; color: #94a3b8; font-size: 13px;">
                                You received this email because you scheduled a reminder for this habit.<br>
                                &copy; {{ date('Y') }} Momentum. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>