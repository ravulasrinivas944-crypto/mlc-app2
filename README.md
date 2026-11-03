# mlc-app2

Common messages and Call, SMS, and WhatsApp click indicators are saved separately for each signed-in account. Contact indicators show the latest click time for each action, not confirmation that the call or message was completed. Accounts without a saved common message inherit the previous shared message once as their starting copy.

The phone or browser back button returns to the previous in-app screen.

The separate responsive team portal is published at `/portal/`; it shares the same app, Supabase accounts, and records as the main website. On iPhone, open that page in Safari and use Share → Add to Home Screen.

The configured admin account (`ravulasrinivas994@gmail.com`) can review tester sign-ins, member changes, and contact-button clicks from Settings. Before activity logging works, run `supabase/activity-monitoring.sql` in the Supabase SQL Editor. Row-level security lets each tester insert only their own action records and allows only the configured admin email to read them. The log stores tester email, action, timestamp, and counts; it does not store member names or message contents. The dashboard shows the last 30 days, but records remain in Supabase until deleted. Testers are informed on the sign-in screen.
