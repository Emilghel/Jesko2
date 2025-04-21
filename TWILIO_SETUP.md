# Twilio Configuration Guide

## Problem: Calls Going to Voicemail
If your Twilio phone number is sending calls directly to voicemail, it means that Twilio doesn't know where to send the call data (to our application).

## Solution: Configure Twilio Webhooks

Follow these steps to properly configure your Twilio phone number:

1. **Log in to your Twilio Console** at https://www.twilio.com/console

2. **Navigate to Phone Numbers**
   - Click on "Phone Numbers" in the left menu
   - Select "Manage" → "Active numbers"
   - Click on your phone number that you want to use for the AI agent (+12185271227)

3. **Configure Voice Settings**
   - Scroll down to the "Voice & Fax" section
   - Under "A CALL COMES IN", select "Webhook" from the dropdown
   - In the URL field, enter your application's webhook URL:
     ```
     https://[YOUR-REPLIT-URL]/api/twilio/voice
     ```
     Replace `[YOUR-REPLIT-URL]` with your actual Replit app URL
     
     For example, if your Replit URL is "warm-leadnetwork-ai-production.username.repl.co", then your webhook URL should be:
     ```
     https://warm-leadnetwork-ai-production.username.repl.co/api/twilio/voice
     ```
   - Make sure the HTTP method is set to "POST"
   - **IMPORTANT**: Make sure this exact URL is entered in Twilio, with no trailing slashes

4. **Save Your Changes**
   - Click "Save" at the bottom of the page

5. **Test Your Configuration**
   - Call your Twilio phone number (+12185271227)
   - You should now hear your AI agent respond instead of going to voicemail
   
## IMPORTANT NOTE ABOUT REPLIT URLS

When running your app on Replit, your application URL will look like:
```
https://workspace-emilghelmeci.repl.co
```

The exact URL of your Replit deployment is what needs to go in your Twilio webhook configuration. 

Here's how to find your exact Replit URL:
1. Look at the browser address bar when viewing your Replit project
2. Usually it will be in the format: `https://[repl-name]-[username].repl.co`
3. For this project, it would be `https://workspace-emilghelmeci.repl.co`

Your complete webhook URL should be this URL with `/api/twilio/voice` appended:
```
https://workspace-emilghelmeci.repl.co/api/twilio/voice
```

### Test Your Setup Before Making Real Calls

After configuring your Twilio webhook, you can verify it's working by:
1. Making a test cURL request to your Replit app URL:
```
curl https://workspace-emilghelmeci.repl.co/api/twilio/voice -d "From=+18001234567&To=+12185271227&CallSid=test123" -H "Content-Type: application/x-www-form-urlencoded"
```
2. Looking at the logs in the application dashboard
3. Checking the Twilio console logs for any errors in the webhook communication

## Troubleshooting

If calls still go to voicemail after configuration:

1. **Check Your Replit URL**
   - Make sure your Replit application is running
   - Confirm the URL is accessible from the internet
   - Your Replit needs to be public and online

2. **Verify Webhook Format**
   - The webhook URL should be exactly:
     ```
     https://[YOUR-REPLIT-URL]/api/twilio/voice
     ```
   - No trailing slashes or additional path segments

3. **Check Twilio Logs**
   - In the Twilio Console, go to "Monitor" → "Logs" → "Error Logs"
   - Look for errors related to your phone number or webhook

4. **Verify API Keys**
   - Ensure your Twilio Account SID and Auth Token are correctly configured in your application

5. **Review Server Logs**
   - Check your application logs for any errors related to Twilio webhook requests

## Additional Information

- **Voice URL vs Messaging URL**: Make sure you're configuring the Voice URL, not the Messaging URL
- **HTTP vs HTTPS**: Twilio requires HTTPS for production, which Replit provides automatically
- **Call Forwarding**: If you have any call forwarding set up in Twilio, it will override your webhook settings