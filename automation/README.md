# ChurnGuard n8n Automation

`workflow.json` is an n8n workflow that emails a retention message for each of the top 20 at-risk customers and logs the result to Google Sheets. It runs every day at 9am and can also be started by hand.

```
Daily Schedule ---+
                  +--> Get At-Risk Customers --> Loop Over Customers --> Generate Retention Message
Manual Trigger ---+                                     ^                           |
                                                        |                           v
                                                  Log to Sheet <------ Send Retention Email
```

Every email goes to the single address in `TEST_EMAIL`, not to customers. Each run sends up to 20 emails to that address.

## What you need

| Item | Type | Used by |
| --- | --- | --- |
| Gmail OAuth2 | n8n credential | Send Retention Email |
| Google Sheets OAuth2 | n8n credential | Log to Sheet |
| `API_BASE_URL` | Environment variable | Get At-Risk Customers, Generate Retention Message |
| `TEST_EMAIL` | Environment variable | Send Retention Email |

You also need Docker and the ChurnGuard API running on your machine.

## 1. Start the API

From the project root:

```
python api/app.py
```

The API listens on port 5053 by default. To use another port, set the `PORT` environment variable first, and use that same port in `API_BASE_URL` below.

## 2. Start n8n with Docker

Create a volume once, so your workflows and credentials survive restarts:

```
docker volume create n8n_data
```

Then start n8n. Replace `you@example.com` with the address that should receive the emails, and `Asia/Karachi` with your own time zone if it differs.

PowerShell:

```powershell
docker run -it --rm `
  --name n8n `
  -p 5678:5678 `
  --add-host=host.docker.internal:host-gateway `
  -e GENERIC_TIMEZONE="Asia/Karachi" `
  -e TZ="Asia/Karachi" `
  -e N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=true `
  -e N8N_BLOCK_ENV_ACCESS_IN_NODE=false `
  -e API_BASE_URL="http://host.docker.internal:5053" `
  -e TEST_EMAIL="you@example.com" `
  -v n8n_data:/home/node/.n8n `
  docker.n8n.io/n8nio/n8n
```

macOS or Linux:

```bash
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  --add-host=host.docker.internal:host-gateway \
  -e GENERIC_TIMEZONE="Asia/Karachi" \
  -e TZ="Asia/Karachi" \
  -e N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=true \
  -e N8N_BLOCK_ENV_ACCESS_IN_NODE=false \
  -e API_BASE_URL="http://host.docker.internal:5053" \
  -e TEST_EMAIL="you@example.com" \
  -v n8n_data:/home/node/.n8n \
  docker.n8n.io/n8nio/n8n
```

Open <http://localhost:5678> and create your owner account.

Why these settings matter:

- `API_BASE_URL` uses `host.docker.internal` because `localhost` inside the container means the container itself, not your machine.
- `N8N_BLOCK_ENV_ACCESS_IN_NODE=false` keeps `$env` available to the workflow, since recent n8n versions tighten access to environment variables by default.
- `GENERIC_TIMEZONE` decides what "9am" means for the schedule.

If n8n cannot reach the API, the Flask server may be accepting connections only from your machine itself. Stop it and start it on all interfaces instead:

```
python -m flask --app api/app.py run --host 0.0.0.0 --port 5053
```

The API has no authentication, so only do this on a network you trust.

## 3. Create the Google Sheet

Create a spreadsheet with a tab named `Sheet1`, and put these exact headers in row 1:

```
timestamp | customer_id | risk_level | churn_probability | email_subject | status
```

Copy the spreadsheet ID from its URL. It is the long value between `/d/` and `/edit`.

## 4. Create the Google OAuth2 credentials

1. In the [Google Cloud Console](https://console.cloud.google.com/), create a project.
2. Under **APIs & Services > Library**, enable the **Gmail API**, the **Google Sheets API** and the **Google Drive API**. Google Sheets needs Drive as well.
3. Under **OAuth consent screen**, create an app. If you choose **External**, add your own Google account as a test user on the **Audience** page.
4. Under **Credentials**, create an **OAuth client ID** of type **Web application**.
5. Add this as an authorized redirect URI:

   ```
   http://localhost:5678/rest/oauth2-credential/callback
   ```

6. Copy the client ID and client secret.

In n8n, create two credentials under **Credentials > Add credential**, and paste the client ID and secret into each:

- **Gmail OAuth2 API**
- **Google Sheets OAuth2 API**

Select **Sign in with Google** on each one, then save.

An External app left in Testing mode has its Google tokens expire after 7 days. When that happens the schedule starts failing until you reconnect the credentials in n8n, so publish the app if you want this to keep running unattended.

## 5. Import the workflow

1. In n8n, create a new workflow.
2. Open the **...** menu at the top right and select **Import from File**.
3. Choose `automation/workflow.json`.
4. Open **Send Retention Email** and select your Gmail credential.
5. Open **Log to Sheet**, select your Google Sheets credential, and replace `REPLACE_WITH_SPREADSHEET_ID` with your spreadsheet ID.
6. Save the workflow.

## 6. Run it

To test it, select **Execute Workflow**. This uses the Manual Trigger and runs straight away.

To turn on the daily 9am run, activate the workflow with the toggle at the top. The schedule does not fire while the workflow is inactive, and n8n must be running at 9am.

## What gets logged

Each customer adds one row to the sheet:

| Column | Value |
| --- | --- |
| `timestamp` | When the row was written |
| `customer_id` | The customer's ID |
| `risk_level` | `high`, `medium` or `low` |
| `churn_probability` | Model score from 0 to 1 |
| `email_subject` | Subject of the email |
| `status` | `sent`, or `failed` if Gmail rejected the email |

A failed email does not stop the run. It is logged as `failed` and the loop moves on to the next customer. If the API call itself fails, the run stops at that customer.

If the API cannot reach Groq, it returns a template message instead of a generated one. The email is still sent and logged as `sent`. You can recognise these because the subject starts with "A thank you from us".
